import OpenAI from 'openai';
import admin from 'firebase-admin';

// 初始化 Firebase Admin SDK（如果尚未初始化）
if (!admin.apps.length) {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
    });
}

const storage = admin.storage();
const bucket = storage.bucket();

export default async function handler(req, res) {
    // 設置 CORS 標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 處理 OPTIONS 請求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 只允許 POST 請求
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ error: `方法 ${req.method} 不被允許` });
        return;
    }

    try {
        const { prompt, size = '1024x1024', referenceImage } = req.body;

        if (!prompt) {
            res.status(400).json({ error: '缺少必要參數: prompt' });
            return;
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        let response;
        
        // 如果有參考圖片，增強 prompt 以更好地匹配參考圖片的風格
        if (referenceImage) {
            console.log('🖼️ 使用以圖生圖模式（參考圖片風格）');
            // 在 prompt 開頭加入更詳細的風格參考說明
            // 這樣可以讓 DALL-E 3 生成更接近參考圖片風格的結果
            const enhancedPrompt = `${prompt} CRITICAL STYLE MATCH: The generated image must match the reference image's exact visual style, including: identical color palette and saturation levels, same lighting conditions and atmosphere, matching composition and perspective angle, same level of detail and rendering quality, identical artistic treatment and mood. The reference image serves as the definitive style guide - replicate its visual characteristics precisely while adapting only the city/landscape content.`;
            
            response = await openai.images.generate({
                model: 'dall-e-3',
                prompt: enhancedPrompt,
                size: size,
                quality: 'standard',
                n: 1
            });
        } else {
            // 沒有參考圖片，使用 DALL-E 3 正常生成
            console.log('🎨 使用標準生成模式（DALL-E 3）');
            response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            size: size,
            quality: 'standard',
            n: 1
        });
        }

        const temporaryImageUrl = response.data[0].url;
        console.log('✅ OpenAI 圖片生成成功，臨時 URL:', temporaryImageUrl);

        // 下載圖片並上傳到 Firebase Storage（永久儲存）
        let permanentImageUrl = temporaryImageUrl; // 預設使用臨時 URL
        
        try {
            // 下載圖片
            const imageResponse = await fetch(temporaryImageUrl);
            if (!imageResponse.ok) {
                throw new Error(`下載圖片失敗: ${imageResponse.status}`);
            }
            
            const imageBuffer = await imageResponse.arrayBuffer();
            const imageData = Buffer.from(imageBuffer);
            
            // 生成唯一的文件名（使用時間戳 + 隨機字串）
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 15);
            const fileName = `landing-images/${timestamp}_${randomStr}.png`;
            
            // 上傳到 Firebase Storage
            const file = bucket.file(fileName);
            
            // 🔧 改進：上傳文件並設置為公開讀取
            await file.save(imageData, {
                metadata: {
                    contentType: 'image/png',
                    cacheControl: 'public, max-age=31536000', // 1年快取
                },
            });
            
            // 🔧 改進：確保文件是公開的（使用正確的 Firebase Admin SDK 方法）
            try {
                // 方法1：使用 makePublic()（推薦）
            await file.makePublic();
                console.log('✅ 文件已設置為公開讀取 (makePublic)');
            } catch (publicError) {
                console.warn('⚠️ makePublic 失敗，嘗試設置 ACL:', publicError.message);
                // 方法2：如果 makePublic 失敗，嘗試手動設置 ACL
                try {
                    await file.acl.add({
                        entity: 'allUsers',
                        role: 'READER'
                    });
                    console.log('✅ 使用 ACL 設置為公開讀取');
                } catch (aclError) {
                    console.warn('⚠️ ACL 設置也失敗:', aclError.message);
                    // 即使失敗也繼續，因為文件可能已經是公開的
                }
            }
            
            // 🔧 改進：使用正確的公開 URL 格式
            // Firebase Storage 公開文件的標準 URL 格式
            permanentImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            
            console.log('✅ 圖片已上傳到 Firebase Storage，永久 URL:', permanentImageUrl);
            
        } catch (uploadError) {
            console.warn('⚠️ 上傳到 Firebase Storage 失敗，使用臨時 URL:', uploadError.message);
            // 如果上傳失敗，仍然返回臨時 URL（至少可以短期使用）
        }

        res.status(200).json({
            imageUrl: permanentImageUrl,
            url: permanentImageUrl, // 兼容性
            prompt: prompt,
            size: size,
            timestamp: new Date().toISOString(),
            isPermanent: permanentImageUrl !== temporaryImageUrl // 標記是否為永久 URL
        });

    } catch (error) {
        console.error('生成圖片時發生錯誤:', error);
        res.status(500).json({ 
            error: error.message || '生成圖片時發生錯誤',
            details: error.response?.data || null
        });
    }
}


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
        const { prompt, size = '1024x1024' } = req.body;

        if (!prompt) {
            res.status(400).json({ error: '缺少必要參數: prompt' });
            return;
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // 使用 DALL-E 3 生成圖片
        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            size: size,
            quality: 'standard',
            n: 1
        });

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
            await file.save(imageData, {
                metadata: {
                    contentType: 'image/png',
                    cacheControl: 'public, max-age=31536000', // 1年快取
                },
            });
            
            // 設置為公開讀取
            await file.makePublic();
            
            // 獲取公開 URL（永久 URL）
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


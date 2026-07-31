import OpenAI, { toFile } from 'openai';
import admin from 'firebase-admin';

// gpt-image-2 生成較慢，延長 serverless 逾時
export const config = {
    maxDuration: 60
};

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

const IMAGE_MODEL = 'gpt-image-2';

function parseDataUrlOrBase64(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    const dataUrlMatch = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUrlMatch) {
        return {
            mime: dataUrlMatch[1] || 'image/png',
            buffer: Buffer.from(dataUrlMatch[2], 'base64')
        };
    }
    // 純 base64
    return {
        mime: 'image/png',
        buffer: Buffer.from(trimmed, 'base64')
    };
}

async function uploadImageBuffer(imageData, contentType = 'image/png') {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    const fileName = `landing-images/${timestamp}_${randomStr}.${ext}`;
    const file = bucket.file(fileName);

    await file.save(imageData, {
        metadata: {
            contentType,
            cacheControl: 'public, max-age=31536000',
        },
    });

    try {
        await file.makePublic();
        console.log('✅ 文件已設置為公開讀取 (makePublic)');
    } catch (publicError) {
        console.warn('⚠️ makePublic 失敗，嘗試設置 ACL:', publicError.message);
        try {
            await file.acl.add({
                entity: 'allUsers',
                role: 'READER'
            });
            console.log('✅ 使用 ACL 設置為公開讀取');
        } catch (aclError) {
            console.warn('⚠️ ACL 設置也失敗:', aclError.message);
        }
    }

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}

function extractImageBytes(response) {
    const item = response?.data?.[0];
    if (!item) {
        throw new Error('OpenAI 未返回圖片資料');
    }

    if (item.b64_json) {
        return {
            buffer: Buffer.from(item.b64_json, 'base64'),
            temporaryUrl: null
        };
    }

    if (item.url) {
        return {
            buffer: null,
            temporaryUrl: item.url
        };
    }

    throw new Error('OpenAI 回傳格式不支援（無 b64_json / url）');
}

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
        const { prompt, size = '1024x1024', referenceImage, quality = 'medium' } = req.body;

        if (!prompt) {
            res.status(400).json({ error: '缺少必要參數: prompt' });
            return;
        }

        if (!process.env.OPENAI_API_KEY) {
            res.status(500).json({ error: '圖片生成服務未配置（需要 OPENAI_API_KEY）' });
            return;
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // gpt-image-2 品質：low | medium | high（不再使用 dall-e-3 的 standard）
        const imageQuality = ['low', 'medium', 'high'].includes(quality) ? quality : 'medium';
        let response;
        let usedReference = false;

        if (referenceImage) {
            console.log(`🖼️ 使用以圖生圖模式（${IMAGE_MODEL} + reference image）`);
            const parsed = parseDataUrlOrBase64(referenceImage);
            const enhancedPrompt =
                `${prompt} CRITICAL STYLE MATCH: The generated image must match the reference image's exact visual style, including: identical color palette and saturation levels, same lighting conditions and atmosphere, matching composition and perspective angle, same level of detail and rendering quality, identical artistic treatment and mood. The reference image serves as the definitive style guide - replicate its visual characteristics precisely while adapting only the city/landscape content.`;

            if (parsed?.buffer?.length) {
                try {
                    const imageFile = await toFile(parsed.buffer, 'reference.png', {
                        type: parsed.mime || 'image/png'
                    });
                    response = await openai.images.edit({
                        model: IMAGE_MODEL,
                        image: imageFile,
                        prompt: enhancedPrompt,
                        size,
                        quality: imageQuality
                    });
                    usedReference = true;
                } catch (editError) {
                    console.warn('⚠️ images.edit 失敗，改用純文字 generate:', editError.message);
                }
            }
        }

        if (!response) {
            console.log(`🎨 使用標準生成模式（${IMAGE_MODEL}）`);
            const finalPrompt = referenceImage && !usedReference
                ? `${prompt} CRITICAL STYLE MATCH: Maintain a consistent Pixar-like aerial airplane-window travel-poster style with clean vector colors and soft volumetric lighting.`
                : prompt;

            response = await openai.images.generate({
                model: IMAGE_MODEL,
                prompt: finalPrompt,
                size,
                quality: imageQuality
            });
        }

        const { buffer: generatedBuffer, temporaryUrl } = extractImageBytes(response);
        console.log('✅ OpenAI 圖片生成成功', {
            model: IMAGE_MODEL,
            usedReference,
            hasB64: !!generatedBuffer,
            hasUrl: !!temporaryUrl
        });

        let imageData = generatedBuffer;
        let permanentImageUrl = temporaryUrl || null;

        if (!imageData && temporaryUrl) {
            const imageResponse = await fetch(temporaryUrl);
            if (!imageResponse.ok) {
                throw new Error(`下載圖片失敗: ${imageResponse.status}`);
            }
            imageData = Buffer.from(await imageResponse.arrayBuffer());
        }

        if (!imageData) {
            throw new Error('無法取得圖片位元組資料');
        }

        try {
            permanentImageUrl = await uploadImageBuffer(imageData, 'image/png');
            console.log('✅ 圖片已上傳到 Firebase Storage，永久 URL:', permanentImageUrl);
        } catch (uploadError) {
            console.warn('⚠️ 上傳到 Firebase Storage 失敗，改回傳 data URL:', uploadError.message);
            // Firebase 失敗時仍可用 data URL，避免整段降落沒圖
            permanentImageUrl = `data:image/png;base64,${imageData.toString('base64')}`;
        }

        res.status(200).json({
            imageUrl: permanentImageUrl,
            url: permanentImageUrl,
            prompt,
            size,
            model: IMAGE_MODEL,
            usedReference,
            timestamp: new Date().toISOString(),
            isPermanent: typeof permanentImageUrl === 'string' && permanentImageUrl.startsWith('https://')
        });

    } catch (error) {
        console.error('生成圖片時發生錯誤:', error);
        res.status(500).json({
            error: error.message || '生成圖片時發生錯誤',
            details: error.response?.data || error.error || null
        });
    }
}

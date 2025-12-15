import OpenAI from 'openai';

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

        const imageUrl = response.data[0].url;

        res.status(200).json({
            imageUrl: imageUrl,
            url: imageUrl, // 兼容性
            prompt: prompt,
            size: size,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('生成圖片時發生錯誤:', error);
        res.status(500).json({ 
            error: error.message || '生成圖片時發生錯誤',
            details: error.response?.data || null
        });
    }
}


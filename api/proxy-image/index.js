// 圖片代理 API - 避免 CORS 問題
// 通過 Vercel API 代理 Firebase Storage 的圖片請求

export default async function handler(req, res) {
    // 設置 CORS 標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年快取

    // 處理 OPTIONS 請求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 只允許 GET 請求
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ error: `方法 ${req.method} 不被允許` });
        return;
    }

    try {
        // 從查詢參數獲取圖片 URL
        const { url } = req.query;

        if (!url) {
            res.status(400).json({ error: '缺少必要參數: url' });
            return;
        }

        // 驗證 URL 是否為 Firebase Storage URL（安全檢查）
        const allowedDomains = [
            'storage.googleapis.com',
            'firebasestorage.googleapis.com',
            'firebasestorage.app'
        ];
        
        const imageUrl = decodeURIComponent(url);
        const urlObj = new URL(imageUrl);
        
        if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
            res.status(403).json({ error: '不允許的圖片來源' });
            return;
        }

        // 從 Firebase Storage 獲取圖片
        const imageResponse = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!imageResponse.ok) {
            res.status(imageResponse.status).json({ 
                error: `無法獲取圖片: ${imageResponse.status}` 
            });
            return;
        }

        // 獲取圖片數據
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/png';

        // 設置響應頭
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', imageBuffer.byteLength);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年快取

        // 返回圖片數據
        res.status(200).send(Buffer.from(imageBuffer));

    } catch (error) {
        console.error('圖片代理錯誤:', error);
        res.status(500).json({ 
            error: error.message || '圖片代理時發生錯誤'
        });
    }
}


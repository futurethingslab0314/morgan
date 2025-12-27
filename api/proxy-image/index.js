// 圖片代理 API - 避免 CORS 問題
// 通過 Vercel API 代理 Firebase Storage 的圖片請求

export default async function handler(req, res) {
    // 設置 CORS 標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年快取

    // 處理 OPTIONS 請求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 允許 GET 和 HEAD 請求
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', ['GET', 'HEAD']);
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
            method: req.method, // 支持 GET 和 HEAD
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

        // 獲取內容類型
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        const contentLength = imageResponse.headers.get('content-length');

        // 設置響應頭
        res.setHeader('Content-Type', contentType);
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年快取

        // 如果是 HEAD 請求，只返回標頭，不返回內容
        if (req.method === 'HEAD') {
            res.status(200).end();
            return;
        }

        // GET 請求：獲取並返回圖片數據
        const imageBuffer = await imageResponse.arrayBuffer();
        res.setHeader('Content-Length', imageBuffer.byteLength);
        res.status(200).send(Buffer.from(imageBuffer));

    } catch (error) {
        console.error('圖片代理錯誤:', error);
        res.status(500).json({ 
            error: error.message || '圖片代理時發生錯誤'
        });
    }
}


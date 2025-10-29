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
        const {
            announcementType,
            city,
            country,
            countryCode,
            currentLocation,
            flightTime,
            wakeTime
        } = req.body;

        if (!announcementType || !city || !country) {
            res.status(400).json({ error: '缺少必要參數' });
            return;
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        let prompt = '';

        if (announcementType === 'boarding') {
            // 登機廣播
            prompt = `請為 Wake Up Airlines 生成一個有趣的登機廣播，包含以下元素：
1. 歡迎詞和航空公司名稱
2. 出發地：${currentLocation || '台北'}
3. 目的地：${city} (${country})
4. 飛行時間：${flightTime || '8'}小時
5. 當地特色或有趣的事實
6. 溫馨的睡眠提醒
7. 語氣要輕鬆有趣，像真正的航空廣播

請用繁體中文，控制在100字以內。`;
        } else if (announcementType === 'landing') {
            // 降落廣播
            prompt = `請為 Wake Up Airlines 生成一個有趣的降落廣播，包含以下元素：
1. 歡迎到達目的地
2. 目的地：${city} (${country})
3. 當地時間：${wakeTime || '08:00'}
4. 當地特色或有趣的事實
5. 提醒乘客按按鈕確認降落
6. 語氣要輕鬆有趣

請用繁體中文，控制在80字以內。`;
        } else {
            res.status(400).json({ error: '無效的廣播類型' });
            return;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 200
        });

        const announcement = response.choices[0].message.content.trim();

        res.status(200).json({
            announcement,
            announcementType,
            city,
            country,
            countryCode,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('生成睡眠航班廣播時發生錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}


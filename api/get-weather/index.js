import OpenAI from 'openai';

export default async function handler(req, res) {
    // 設置 CORS 標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
        const { lat, lon } = req.query;

        // 驗證參數
        if (!lat || !lon) {
            return res.status(400).json({
                error: '缺少必要參數：lat 和 lon'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: '無效的經緯度參數'
            });
        }

        // 驗證經緯度範圍
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                error: '經緯度超出有效範圍'
            });
        }

        console.log(`🌤️ [get-weather] 獲取天氣數據 - 緯度: ${latitude}, 經度: ${longitude}`);

        // 方案一：使用 OpenWeatherMap API（如果有 API Key）
        const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

        if (OPENWEATHER_API_KEY) {
            try {
                const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_tw`;

                // 使用 AbortController 實現超時
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 秒超時

                const weatherResponse = await fetch(weatherUrl, {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (weatherResponse.ok) {
                    const weatherData = await weatherResponse.json();

                    // 轉換 OpenWeatherMap 格式到我們的格式
                    const condition = weatherData.weather[0]?.description || weatherData.weather[0]?.main || '未知';
                    const temperature = Math.round(weatherData.main?.temp || 0);
                    const description = weatherData.weather[0]?.description || '';

                    console.log('✅ [get-weather] OpenWeatherMap API 成功:', { condition, temperature, description });

                    clearTimeout(timeoutId);
                    return res.status(200).json({
                        condition: condition,
                        temperature: temperature,
                        description: description,
                        source: 'openweathermap'
                    });
                } else {
                    console.warn(`⚠️ [get-weather] OpenWeatherMap API 返回錯誤: ${weatherResponse.status}`);
                    clearTimeout(timeoutId);
                    // 繼續使用 AI 生成作為備用
                }
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    console.warn('⚠️ [get-weather] OpenWeatherMap API 請求超時');
                } else {
                    console.warn('⚠️ [get-weather] OpenWeatherMap API 請求失敗:', error.message);
                }
                // 繼續使用 AI 生成作為備用
            }
        }

        // 方案二：使用 OpenAI 根據經緯度推測天氣（備用方案）
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            return res.status(500).json({
                error: '天氣服務未配置（需要 OPENAI_API_KEY 或 OPENWEATHER_API_KEY）'
            });
        }

        console.log('🤖 [get-weather] 使用 AI 推測天氣（備用方案）');

        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY
        });

        // 根據經緯度推測天氣
        const weatherPrompt = `根據以下經緯度位置，推測當前的天氣狀況：
- 緯度：${latitude}°
- 經度：${longitude}°

請根據地理位置、季節（當前是 ${new Date().toLocaleDateString('zh-TW', { month: 'long' })}）和時間（當前是 ${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}）推測天氣。

請以 JSON 格式返回：
{
  "condition": "天氣狀況（繁體中文，例如：多雲、晴朗、陰天、小雨等）",
  "temperature": 數字（攝氏溫度，根據季節和地理位置合理推測）,
  "description": "簡短的天氣描述（繁體中文，15字以內）"
}

只返回 JSON，不要其他文字。`;

        const aiResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: weatherPrompt }],
            temperature: 0.7,
            max_tokens: 150
        });

        const aiText = aiResponse.choices[0].message.content.trim();

        try {
            // 嘗試解析 JSON
            const weatherData = JSON.parse(aiText);

            console.log('✅ [get-weather] AI 推測天氣成功:', weatherData);

            return res.status(200).json({
                condition: weatherData.condition || '未知',
                temperature: weatherData.temperature || 20,
                description: weatherData.description || '',
                source: 'ai_estimation'
            });
        } catch (parseError) {
            console.error('❌ [get-weather] AI 返回格式錯誤:', parseError);

            // 如果解析失敗，使用默認值
            return res.status(200).json({
                condition: '多雲',
                temperature: 22,
                description: '天氣溫和',
                source: 'fallback'
            });
        }

    } catch (error) {
        console.error('❌ [get-weather] 獲取天氣數據時發生錯誤:', error);
        return res.status(500).json({
            error: '獲取天氣數據失敗',
            message: error.message
        });
    }
}


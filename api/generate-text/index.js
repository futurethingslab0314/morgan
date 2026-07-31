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
        const { prompt, maxTokens = 200, temperature = 0.9 } = req.body;

        // 驗證參數
        if (!prompt) {
            return res.status(400).json({ 
                error: '缺少必要參數：prompt' 
            });
        }

        if (typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({ 
                error: 'prompt 必須是非空字符串' 
            });
        }

        // 驗證 maxTokens 和 temperature
        const tokens = parseInt(maxTokens);
        const temp = parseFloat(temperature);

        if (isNaN(tokens) || tokens < 1 || tokens > 4000) {
            return res.status(400).json({ 
                error: 'maxTokens 必須是 1-4000 之間的數字' 
            });
        }

        if (isNaN(temp) || temp < 0 || temp > 2) {
            return res.status(400).json({ 
                error: 'temperature 必須是 0-2 之間的數字' 
            });
        }

        console.log(`📝 [generate-text] 生成文本 - maxTokens: ${tokens}, temperature: ${temp}`);

        // 檢查 OpenAI API Key
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        
        if (!OPENAI_API_KEY) {
            return res.status(500).json({ 
                error: '文本生成服務未配置（需要 OPENAI_API_KEY）' 
            });
        }

        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY
        });

        // 使用 OpenAI 生成文本
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo", // 使用 GPT-4 Turbo 以獲得更好的質量
            messages: [{ 
                role: "user", 
                content: prompt 
            }],
            temperature: temp,
            max_tokens: tokens
        });

        const generatedTextRaw = response.choices[0].message.content.trim();
        // 剝離常見的 markdown code fence，避免前端 JSON.parse 失敗
        let generatedText = generatedTextRaw;
        const fenceMatch = generatedText.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
        if (fenceMatch) {
            generatedText = fenceMatch[1].trim();
        } else {
            generatedText = generatedText
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
        }

        console.log('✅ [generate-text] 文本生成成功，長度:', generatedText.length);

        return res.status(200).json({
            text: generatedText,
            model: 'gpt-4-turbo',
            tokens_used: response.usage?.total_tokens || 0
        });

    } catch (error) {
        console.error('❌ [generate-text] 生成文本時發生錯誤:', error);
        
        // 處理 OpenAI API 錯誤
        if (error.response) {
            return res.status(error.response.status || 500).json({ 
                error: 'OpenAI API 錯誤',
                message: error.response.data?.error?.message || error.message 
            });
        }

        return res.status(500).json({ 
            error: '生成文本失敗',
            message: error.message 
        });
    }
}


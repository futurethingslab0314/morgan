import OpenAI from 'openai';

const LOCAL_GREETINGS = {
    TH: 'สวัสดีครับ/ค่ะ', // 泰語 Sawasdee krub/ka
    JP: 'こんにちは',
    KR: '안녕하세요',
    CN: '大家好',
    HK: '大家好',
    MO: '大家好',
    SG: 'Hello everyone',
    MY: 'Selamat sejahtera',
    ID: 'Selamat datang',
    PH: 'Magandang araw',
    VN: 'Xin chào',
    KH: 'ជំរាបសួរ',
    LA: 'ສະບາຍດີ',
    MM: 'မင်္ဂလာပါ',
    IN: 'नमस्ते',
    NP: 'नमस्ते',
    BD: 'নমস্কার',
    LK: 'ආයුබෝවන්',
    MV: 'އަސްސަލާމު ޢަލައިކުމް',
    AE: 'مرحباً بكم',
    SA: 'أهلاً وسهلاً',
    QA: 'مرحباً',
    KW: 'مرحباً',
    OM: 'أهلاً بكم',
    BH: 'مرحباً',
    US: 'Welcome aboard',
    CA: 'Bonjour et bienvenue',
    GB: 'Good day everyone',
    FR: 'Bonjour à tous',
    ES: '¡Hola a todos!',
    IT: 'Ciao a tutti',
    DE: 'Guten Tag zusammen',
    AU: "G'day mates",
    NZ: 'Kia ora',
    BR: 'Olá, pessoal',
    MX: '¡Hola a todos!'
};

// 國家/地區對應的心理狀態（內在狀態）
const COUNTRY_MENTAL_STATE = {
    // 東亞
    'JP': { state: '專注', stateEn: 'Focus', description: '那裡的安靜，是你即將借用的專注。在這段旅程中，請讓自己的心像清晨的街道一樣乾淨、明確。' },
    'KR': { state: '平衡', stateEn: 'Balance', description: '那裡的節奏，提醒你找到內在的平衡。讓接下來的時間，成為你重新對齊自己的機會。' },
    'CN': { state: '沉穩', stateEn: 'Steadiness', description: '那裡的深度，會帶你回到內心的沉穩。讓你的思緒像古老的智慧一樣，安靜而有力。' },
    'HK': { state: '效率', stateEn: 'Efficiency', description: '那裡的節奏，會成為你的啟動訊號。在這段時間裡，把注意力放在你想前進的方向。' },
    'TW': { state: '親和', stateEn: 'Warmth', description: '那裡的親和，提醒你回到內心的溫暖。讓接下來的時間，成為你與自己重新連結的機會。' },

    // 東南亞
    'TH': { state: '放鬆', stateEn: 'Relaxation', description: '那裡的從容，會帶你回到內心的放鬆。讓你的呼吸像微風一樣輕柔、自然。' },
    'SG': { state: '清晰', stateEn: 'Clarity', description: '那裡的秩序，提醒你整理內心的空間。讓接下來的時間，成為你重新釐清方向的機會。' },
    'MY': { state: '多元', stateEn: 'Diversity', description: '那裡的包容，提醒你接納自己的不同面向。讓你的心像多元文化一樣，豐富而和諧。' },
    'ID': { state: '活力', stateEn: 'Vitality', description: '那裡的熱情，會點燃你內在的活力。讓接下來的時間，成為你重新啟動的機會。' },
    'PH': { state: '明亮', stateEn: 'Brightness', description: '陽光只是象徵——提醒你把自己調回明亮。讓心裡的空間重新亮起來。' },
    'VN': { state: '韌性', stateEn: 'Resilience', description: '那裡的堅韌，提醒你內在的力量。讓接下來的時間，成為你重新發現自己韌性的機會。' },

    // 南亞
    'IN': { state: '覺察', stateEn: 'Awareness', description: '多層次的文化提醒你，情緒可以被感受、被允許。請用幾次呼吸，回到自己的覺察。' },

    // 歐洲
    'FR': { state: '優雅從容', stateEn: 'Poise', description: '法國的步調帶著一種不慌不忙的美。在這趟旅程中，也讓你的心保持從容。' },
    'GB': { state: '沉著', stateEn: 'Composure', description: '那裡的沉穩，會帶你回到內心的平靜。讓你的思緒像午後的茶一樣，溫和而清晰。' },
    'DE': { state: '精準', stateEn: 'Precision', description: '那裡的精準，提醒你回到內心的秩序。讓接下來的時間，成為你重新對齊目標的機會。' },
    'IT': { state: '熱情', stateEn: 'Passion', description: '那裡的熱情，會點燃你內在的活力。讓你的心像藝術一樣，充滿創造力。' },
    'ES': { state: '享受', stateEn: 'Enjoyment', description: '那裡的節奏，提醒你享受當下的時刻。讓接下來的時間，成為你重新感受生活的機會。' },
    'FI': { state: '平靜', stateEn: 'Calm', description: '北歐的靜謐，會帶你回到心裡的安穩區域。讓接下來的呼吸，像雪落一樣輕。' },

    // 美洲
    'US': { state: '行動力', stateEn: 'Action', description: '那裡的節奏，會成為你的啟動訊號。在這幾分鐘裡，把注意力放在你想前進的方向。' },
    'CA': { state: '開闊', stateEn: 'Openness', description: '那裡的寬廣，提醒你打開內心的空間。讓接下來的時間，成為你重新擴展視野的機會。' },
    'BR': { state: '熱情', stateEn: 'Passion', description: '那裡的活力，會點燃你內在的熱情。讓你的心像節奏一樣，充滿生命力。' },
    'MX': { state: '慶祝', stateEn: 'Celebration', description: '那裡的色彩，提醒你慶祝當下的時刻。讓接下來的時間，成為你重新感受喜悅的機會。' },

    // 大洋洲
    'AU': { state: '自由', stateEn: 'Freedom', description: '那裡的開闊，會帶你回到內心的自由。讓你的心像天空一樣，無邊無際。' },
    'NZ': { state: '純淨', stateEn: 'Purity', description: '那裡的純淨，提醒你回到內心的本質。讓接下來的時間，成為你重新連結自己的機會。' },

    // 預設
    'DEFAULT': { state: '平靜', stateEn: 'Calm', description: '這趟旅程，會帶你回到內心的平靜。讓接下來的時間，成為你重新對齊自己的機會。' }
};

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
            wakeTime, // 舊模式保留
            timerDuration, // 計時器模式（分鐘）
            punctuality, // 準時性狀態（新增）
            localTimeInfo, // 目的地當地時間資訊（新增）
            uiLanguage // 介面語言：'zh-TW' 或 'en'
        } = req.body;

        if (!announcementType || !city || !country) {
            res.status(400).json({ error: '缺少必要參數' });
            return;
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const greeting = LOCAL_GREETINGS[(countryCode || '').toUpperCase()] || '';
        const isEnglish = uiLanguage === 'en';

        // 獲取對應的心理狀態
        const mentalState = COUNTRY_MENTAL_STATE[(countryCode || '').toUpperCase()] || COUNTRY_MENTAL_STATE['DEFAULT'];

        const greetingHint = greeting
            ? (isEnglish
                ? `Start with a short greeting in the local language: "${greeting}", then briefly explain it in English.`
                : `在開頭加入一小句當地語言問候：「${greeting}」並立刻翻譯成中文。`)
            : (isEnglish
                ? 'If you know a local greeting, you may briefly mention it and explain it in English.'
                : '若知道當地語言問候，可簡短示意並翻成中文。');

        let prompt = '';

        // 計算飛行時間描述（計時器模式優先）
        let flightTimeDesc = '';
        if (timerDuration) {
            const hours = Math.floor(timerDuration / 60);
            const minutes = timerDuration % 60;
            if (hours > 0 && minutes > 0) {
                flightTimeDesc = `${hours}小時${minutes}分鐘`;
            } else if (hours > 0) {
                flightTimeDesc = `${hours}小時`;
            } else {
                flightTimeDesc = `${minutes}分鐘`;
            }
        } else {
            flightTimeDesc = `${flightTime || '8'}小時`;
        }

        if (announcementType === 'boarding') {
            // 登機廣播 - 專注於內在狀態
            if (isEnglish) {
                prompt = `Please write a boarding announcement for Wake Up Airlines with an inner state focus, include:
1. A friendly welcome and airline name
2. Departure: ${currentLocation || 'Taipei'}
3. Destination: ${city} (${country})
4. Flight time: ${flightTimeDesc}
5. Inner state theme: The destination represents "${mentalState.stateEn}" - ${mentalState.description}
6. Focus on inner transformation and mental harvest, NOT physical travel, food, sightseeing, or activities
7. Tone: calm, grounding, with inner strength - like a meditation guide
${greetingHint}

Please respond in natural English, within 80 words. Avoid mentioning food, sightseeing, shopping, or physical activities. Focus on the inner state and psychological transformation.`;
            } else {
                prompt = `請為 Wake Up Airlines 生成一個登機廣播，重點在「內在狀態」而非外在活動，包含以下元素：
1. 歡迎詞和航空公司名稱
2. 出發地：${currentLocation || '台北'}
3. 目的地：${city} (${country})
4. 飛行時間：${flightTimeDesc}
5. 內在狀態主題：目的地象徵「${mentalState.state}」- ${mentalState.description}
6. 重點在內在轉換和心理豐收，而非實際旅行、美食、觀光或購物
7. 語氣：平靜、踏實、有內在力量，像冥想引導
${greetingHint}

請用繁體中文，控制在100字以內。避免提到美食、觀光、購物等外在活動，專注於內在狀態和心理豐收。`;
            }
        } else if (announcementType === 'landing') {
            // 降落廣播 - 專注於內在狀態和心理豐收
            const timeDesc = timerDuration ? '飛行完成' : `當地時間：${wakeTime || '08:00'}`;

            // 內在狀態提示（取代原本的城市文化資訊）
            const innerStatePrompt = `內在狀態主題：
目的地【${city}, ${country}】象徵「${mentalState.state}」。
${mentalState.description}

請在廣播中自然地融入這個內在狀態，讓乘客感受到心理的豐收，而非外在的活動。避免提到美食、觀光、購物等，專注於內在的轉換和收穫。`;

            if (punctuality && punctuality.status) {
                // 根據準時性狀態生成不同的語音
                switch (punctuality.status) {
                    case 'PERFECT': // 完美準時（±1分鐘）
                        prompt = `請為 Wake Up Airlines 生成一個「準時降落」的機長廣播，要求如下：

語氣：專業、溫柔、有點儀式感，專注於內在狀態和心理豐收

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 專業的降落宣告：「今天的航線前往【${city}】。」
3. 內在狀態引導：${innerStatePrompt}
4. 感謝詞：「感謝你堅持完成這段旅程，你的時間管理很漂亮。」
5. 心理豐收：「在這段旅程中，你已經獲得了內在的收穫。」

請用繁體中文，控制在80字以內，語氣專業但溫暖。避免提到美食、觀光、購物等外在活動，專注於內在狀態和心理豐收。`;

                    case 'EARLY': // 提早降落
                        const earlyMinutes = punctuality.minutesDiff || 0;
                        const originalDest = punctuality.originalDestination;
                        const isMidwayLanding = punctuality.isEarlyLanding && punctuality.landingCity && originalDest && punctuality.landingCity !== originalDest;

                        let earlyLandingNote = '';
                        if (isMidwayLanding) {
                            // 中途降落情況
                            const progressPercent = punctuality.flightProgress || 0;
                            earlyLandingNote = `注意：這是一次「中途降落」，原定目的地是【${originalDest}】，但因為提早結束，飛機已在【${city}】降落。已飛行約 ${progressPercent}% 的距離。請在廣播中說明這個情況，例如：「原定目的地是【${originalDest}】，但因為提早結束，我們已在【${city}】提前降落。」`;
                        }

                        prompt = `請為 Wake Up Airlines 生成一個「提早降落」的機長廣播，要求如下：

語氣：輕鬆、安慰、有點吐槽但不傷人，專注於內在狀態

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 幽默的提早宣告：「呃…我們好像提早到太多了。飛機已在【${city}】提前降落。」
${isMidwayLanding ? `3. 說明中途降落：${earlyLandingNote}` : ''}
${isMidwayLanding ? '4. 安慰語句：「沒事的，機組人員會處理後續。下次我們一起飛完全程吧。」' : '3. 安慰語句：「沒事的，機組人員會處理後續。下次我們一起飛完全程吧。」'}
${isMidwayLanding ? '5. 鼓勵語句：「雖然還沒到終點，但這段飛行仍然很棒。」' : '4. 鼓勵語句：「雖然還沒到終點，但這段飛行仍然很棒。」'}
${isMidwayLanding ? '6. ' : '5. '}內在狀態引導：${innerStatePrompt}

請用繁體中文，控制在${isMidwayLanding ? '100' : '90'}字以內，語氣輕鬆幽默。避免提到美食、觀光、購物等外在活動，專注於內在狀態和心理收穫。`;

                    case 'LATE': // 誤點降落
                        const lateMinutes = punctuality.minutesDiff || 0;
                        const originalCity = punctuality.originalDestination || city;
                        const divertedCity = punctuality.divertedCity || city;

                        // 判斷是否有改降城市
                        const hasDiversion = divertedCity && divertedCity !== originalCity && divertedCity !== city;
                        const finalCity = hasDiversion ? divertedCity : city;
                        const finalMentalState = hasDiversion
                            ? (COUNTRY_MENTAL_STATE[(countryCode || '').toUpperCase()] || COUNTRY_MENTAL_STATE['DEFAULT'])
                            : mentalState;
                        const finalInnerStatePrompt = `內在狀態主題：
目的地【${finalCity}, ${country}】象徵「${finalMentalState.state}」。
${finalMentalState.description}

請在廣播中自然地融入這個內在狀態，讓乘客感受到心理的豐收，而非外在的活動。`;

                        const destinationNote = hasDiversion
                            ? `3. 目的地說明：「原定降落於【${originalCity}】，但因時間超過，我們轉降至【${divertedCity}】。」`
                            : `3. 目的地說明：「本次航班延誤，但仍降落在【${city}】。」`;

                        prompt = `請為 Wake Up Airlines 生成一個「誤點降落」的機長廣播，要求如下：

語氣：幽默、帶歉意、有故事性，專注於內在狀態

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 帶歉意的宣告：「抱歉，我們在空中繞了幾圈…本次航班延誤。」
${destinationNote}
4. 鼓勵語句：「下次一起看看能不能準時降落吧，我相信你可以。」
5. 內在狀態引導：${finalInnerStatePrompt}

請用繁體中文，控制在100字以內，語氣幽默但不失歉意。避免提到美食、觀光、購物等外在活動，專注於內在狀態和心理收穫。`;

                    default: // ON_TIME（一般準時）
                        prompt = `請為 Wake Up Airlines 生成一個「準時降落」的機長廣播，要求如下：

語氣：專業、溫和、友善，專注於內在狀態和心理豐收

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 降落宣告：「今天的航線前往【${city}】。」
3. 內在狀態引導：${innerStatePrompt}
4. 感謝詞：「感謝你堅持完成這段旅程，你的時間管理很漂亮。」
5. 心理豐收：「在這段旅程中，你已經獲得了內在的收穫。」

請用繁體中文，控制在80字以內。避免提到美食、觀光、購物等外在活動，專注於內在狀態和心理豐收。`;
                }
            } else {
                // 沒有準時性資訊時的預設提示
                prompt = `請為 Wake Up Airlines 生成一個降落廣播，專注於內在狀態，包含以下元素：
1. 歡迎到達目的地
2. 目的地：${city} (${country})
3. ${timeDesc}
4. 內在狀態引導：${innerStatePrompt}
5. ${timerDuration ? '恭喜完成飛行任務，強調內在收穫' : '提醒乘客按按鈕確認降落'}
6. 語氣：平靜、踏實、有內在力量
${greetingHint}

請用繁體中文，控制在80字以內。避免提到美食、觀光、購物等外在活動，專注於內在狀態和心理豐收。`;
            }

            // 若 UI 為英文，請模型將上述中文廣播翻成英文口語廣播
            if (isEnglish) {
                prompt = `以下是一段為乘客撰寫的中文降落廣播腳本，請將它改寫成自然流暢的英文機長廣播（對乘客說話），保留原本的意思與氛圍，長度控制在約 70–100 個英文單字：

中文廣播內容：
${prompt}`;
            }
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
            greeting,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('生成睡眠航班廣播時發生錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}


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
    AU: 'G’day mates',
    NZ: 'Kia ora',
    BR: 'Olá, pessoal',
    MX: '¡Hola a todos!'
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
        const greetingHint = greeting
            ? (isEnglish
                ? `8. Start with a short greeting in the local language: "${greeting}", then briefly explain it in English.`
                : `8. 在開頭加入一小句當地語言問候：「${greeting}」並立刻翻譯成中文。`)
            : (isEnglish
                ? '8. If you know a local greeting, you may briefly mention it and explain it in English.'
                : '8. 若知道當地語言問候，可簡短示意並翻成中文。');

        // 根據當地時間生成時段相關的建議內容
        let timeBasedSuggestions = '';
        if (localTimeInfo && localTimeInfo.timeOfDay) {
            const { timeOfDay, timeContext, localTimeString } = localTimeInfo;
            const timeSuggestions = {
                'morning': `現在是${timeContext} ${localTimeString}，可以提到：當地早餐、晨間活動、日出美景、早市、晨跑等。例如：「現在是${timeContext} ${localTimeString}，正是品嚐當地早餐的好時機！」`,
                'noon': `現在是${timeContext} ${localTimeString}，可以提到：午餐時間、當地特色料理、午間活動、購物等。例如：「現在是${timeContext} ${localTimeString}，正是享用當地美食的好時機！」`,
                'afternoon': `現在是${timeContext} ${localTimeString}，可以提到：下午茶、購物、觀光、下午活動等。例如：「現在是${timeContext} ${localTimeString}，正是探索這座城市的好時機！」`,
                'evening': `現在是${timeContext} ${localTimeString}，可以提到：晚餐、夜景、夜生活、當地特色活動等。例如：「現在是${timeContext} ${localTimeString}，正是欣賞夜景和享受當地美食的好時機！如果飛到紐約，可以提到時代廣場的煙火；如果飛到東京，可以提到新宿的夜景。」`,
                'night': `現在是${timeContext} ${localTimeString}，可以提到：夜宵、夜間活動、夜景、當地夜生活等。例如：「現在是${timeContext} ${localTimeString}，正是體驗當地夜生活的好時機！」`
            };
            timeBasedSuggestions = timeSuggestions[timeOfDay] || '';
        }

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
            // 登機廣播
            if (isEnglish) {
                prompt = `Please write a fun boarding announcement for Wake Up Airlines, include:
1. A friendly welcome and airline name
2. Departure: ${currentLocation || 'Taipei'}
3. Destination: ${city} (${country})
4. Flight time: ${flightTimeDesc}
5. 1-2 fun facts about the destination (landmarks/food/culture)
6. ${timerDuration ? 'A reminder that this is a focus timer flight (help the passenger focus on their task)' : 'A gentle sleep reminder'}
7. Tone: casual, like a real captain or cabin announcement
${greetingHint}

Please respond in natural English, within 80 words.`;
            } else {
                prompt = `請為 Wake Up Airlines 生成一個有趣的登機廣播，包含以下元素：
1. 歡迎詞和航空公司名稱
2. 出發地：${currentLocation || '台北'}
3. 目的地：${city} (${country})
4. 飛行時間：${flightTimeDesc}
5. 當地特色或有趣的事實
6. ${timerDuration ? '提醒乘客專注完成這次飛行任務' : '溫馨的睡眠提醒'}
7. 語氣要輕鬆有趣，像真正的航空廣播
${greetingHint}

請用繁體中文，控制在100字以內。`;
            }
        } else if (announcementType === 'landing') {
            // 降落廣播 - 根據準時性狀態生成不同的語音（預設以中文撰寫，再視需要轉成英文）
            const timeDesc = timerDuration ? '飛行完成' : `當地時間：${wakeTime || '08:00'}`;

            // 城市文化資訊提示
            const cityInfoPrompt = `關於 ${city}, ${country} 的資訊（請在廣播中自然地融入1-2項）：
- 著名景點（例如：東京有淺草寺、晴空塔；曼谷有大皇宮、水上市場；首爾有明洞、景福宮）
- 美食特色（例如：日本有壽司、拉麵；泰國有泰式奶茶、冬蔭功；韓國有泡菜、烤肉）
- 文化特色（例如：日本的茶道、花見；泰國的潑水節；韓國的K-pop文化）
- 地理特色（例如：海島、山城、古城、現代都市）

請在廣播中自然地融入這些元素，讓乘客感受到這座城市的魅力。`;

            // 加入時間相關的建議
            const timeContextPrompt = localTimeInfo && timeBasedSuggestions
                ? `\n\n時間情境：${timeBasedSuggestions}\n請根據這個時間情境，自然地融入相關的活動建議或當地特色。例如：如果是晚上到達紐約，可以提到時代廣場的夜景或煙火；如果是早上到達東京，可以提到築地市場的早餐。`
                : '';

            if (punctuality && punctuality.status) {
                // 根據準時性狀態生成不同的語音
                switch (punctuality.status) {
                    case 'PERFECT': // 完美準時（±1分鐘）
                        prompt = `請為 Wake Up Airlines 生成一個「準時降落」的機長廣播，要求如下：

語氣：專業、溫柔、有點儀式感
可搭配輕微跑道聲＋塔台音效

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 專業的降落宣告：「乘客您好，本次航班順利準時降落於【${city}】。」
3. 感謝詞：「感謝你堅持完成這段旅程，你的時間管理很漂亮。」
4. 歡迎詞：「歡迎來到【${city}】，祝你今天有個順心的旅程。」
5. ${cityInfoPrompt}${timeContextPrompt}

請用繁體中文，控制在80字以內，語氣專業但溫暖。`;

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

語氣：輕鬆、安慰、有點吐槽但不傷人

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 幽默的提早宣告：「呃…我們好像提早到太多了。飛機已在【${city}】提前降落。」
${isMidwayLanding ? `3. 說明中途降落：${earlyLandingNote}` : ''}
${isMidwayLanding ? '4. 安慰語句：「沒事的，機組人員會處理後續。下次我們一起飛完全程吧。」' : '3. 安慰語句：「沒事的，機組人員會處理後續。下次我們一起飛完全程吧。」'}
${isMidwayLanding ? '5. 鼓勵語句：「雖然還沒到終點，但這段飛行仍然很棒。」' : '4. 鼓勵語句：「雖然還沒到終點，但這段飛行仍然很棒。」'}
${isMidwayLanding ? '6. ' : '5. '}${cityInfoPrompt}${timeContextPrompt}

請用繁體中文，控制在${isMidwayLanding ? '100' : '90'}字以內，語氣輕鬆幽默。`;

                    case 'LATE': // 誤點降落
                        const lateMinutes = punctuality.minutesDiff || 0;
                        const originalCity = punctuality.originalDestination || city;
                        const divertedCity = punctuality.divertedCity || city;

                        // 判斷是否有改降城市
                        const hasDiversion = divertedCity && divertedCity !== originalCity && divertedCity !== city;
                        const finalCity = hasDiversion ? divertedCity : city;
                        const finalCityInfoPrompt = hasDiversion ? cityInfoPrompt.replace(new RegExp(city, 'g'), divertedCity) : cityInfoPrompt;

                        const destinationNote = hasDiversion
                            ? `3. 目的地說明：「原定降落於【${originalCity}】，但因時間超過，我們轉降至【${divertedCity}】。」`
                            : `3. 目的地說明：「本次航班延誤，但仍降落在【${city}】。」`;

                        prompt = `請為 Wake Up Airlines 生成一個「誤點降落」的機長廣播，要求如下：

語氣：幽默、帶歉意、有故事性

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 帶歉意的宣告：「抱歉，我們在空中繞了幾圈…本次航班延誤。」
${destinationNote}
4. 鼓勵語句：「下次一起看看能不能準時降落吧，我相信你可以。」
5. ${finalCityInfoPrompt}${timeContextPrompt}

請用繁體中文，控制在100字以內，語氣幽默但不失歉意。`;

                    default: // ON_TIME（一般準時）
                        prompt = `請為 Wake Up Airlines 生成一個「準時降落」的機長廣播，要求如下：

語氣：專業、溫和、友善

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 降落宣告：「乘客您好，本次航班順利準時降落於【${city}】。」
3. 感謝詞：「感謝你堅持完成這段旅程，你的時間管理很漂亮。」
4. 歡迎詞：「歡迎來到【${city}】，祝你今天有個順心的旅程。」
5. ${cityInfoPrompt}${timeContextPrompt}

請用繁體中文，控制在80字以內。`;
                }
            } else {
                // 沒有準時性資訊時的預設提示
                prompt = `請為 Wake Up Airlines 生成一個有趣的降落廣播，包含以下元素：
1. 歡迎到達目的地
2. 目的地：${city} (${country})
3. ${timeDesc}
4. ${cityInfoPrompt}${timeContextPrompt}
5. ${timerDuration ? '恭喜完成飛行任務' : '提醒乘客按按鈕確認降落'}
6. 語氣要輕鬆有趣
${greetingHint}

請用繁體中文，控制在80字以內。`;
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


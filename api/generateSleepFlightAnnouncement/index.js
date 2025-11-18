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

// 國家/地區對應的心理狀態（內在狀態）+ 文化情緒特色
const COUNTRY_MENTAL_STATE = {
    // 東亞
    'JP': { state: '專注', stateEn: 'Focus', description: '那裡的安靜，是你即將借用的專注。在這段旅程中，請讓自己的心像清晨的街道一樣乾淨、明確。', culturalMood: '乾淨、秩序、清晰、安靜的質感' },
    'KR': { state: '平衡', stateEn: 'Balance', description: '那裡的節奏，提醒你找到內在的平衡。讓接下來的時間，成為你重新對齊自己的機會。', culturalMood: '節奏感、和諧、精緻' },
    'CN': { state: '沉穩', stateEn: 'Steadiness', description: '那裡的深度，會帶你回到內心的沉穩。讓你的思緒像古老的智慧一樣，安靜而有力。', culturalMood: '深度、古老智慧、穩重' },
    'HK': { state: '效率', stateEn: 'Efficiency', description: '那裡的節奏，會成為你的啟動訊號。在這段時間裡，把注意力放在你想前進的方向。', culturalMood: '節奏、效率、活力' },
    'TW': { state: '親和', stateEn: 'Warmth', description: '那裡的親和，提醒你回到內心的溫暖。讓接下來的時間，成為你與自己重新連結的機會。', culturalMood: '親和、溫暖、人情味' },

    // 東南亞
    'TH': { state: '放鬆', stateEn: 'Relaxation', description: '那裡的從容，會帶你回到內心的放鬆。讓你的呼吸像微風一樣輕柔、自然。', culturalMood: '柔軟、鬆弛、微笑文化、從容' },
    'SG': { state: '清晰', stateEn: 'Clarity', description: '那裡的秩序，提醒你整理內心的空間。讓接下來的時間，成為你重新釐清方向的機會。', culturalMood: '秩序、清晰、整潔' },
    'MY': { state: '多元', stateEn: 'Diversity', description: '那裡的包容，提醒你接納自己的不同面向。讓你的心像多元文化一樣，豐富而和諧。', culturalMood: '多元、包容、和諧' },
    'ID': { state: '活力', stateEn: 'Vitality', description: '那裡的熱情，會點燃你內在的活力。讓接下來的時間，成為你重新啟動的機會。', culturalMood: '熱情、活力、生命力' },
    'PH': { state: '明亮', stateEn: 'Brightness', description: '陽光只是象徵——提醒你把自己調回明亮。讓心裡的空間重新亮起來。', culturalMood: '陽光、明亮、人情、溫度' },
    'VN': { state: '韌性', stateEn: 'Resilience', description: '那裡的堅韌，提醒你內在的力量。讓接下來的時間，成為你重新發現自己韌性的機會。', culturalMood: '堅韌、生命力、韌性' },

    // 南亞
    'IN': { state: '覺察', stateEn: 'Awareness', description: '多層次的文化提醒你，情緒可以被感受、被允許。請用幾次呼吸，回到自己的覺察。', culturalMood: '多層次、豐富、覺察' },

    // 歐洲
    'FR': { state: '優雅從容', stateEn: 'Poise', description: '法國的步調帶著一種不慌不忙的美。在這趟旅程中，也讓你的心保持從容。', culturalMood: '優雅、從容、不慌不忙' },
    'GB': { state: '沉著', stateEn: 'Composure', description: '那裡的沉穩，會帶你回到內心的平靜。讓你的思緒像午後的茶一樣，溫和而清晰。', culturalMood: '霧氣、穩定、距離感、沉穩' },
    'DE': { state: '精準', stateEn: 'Precision', description: '那裡的精準，提醒你回到內心的秩序。讓接下來的時間，成為你重新對齊目標的機會。', culturalMood: '精準、秩序、嚴謹' },
    'IT': { state: '熱情', stateEn: 'Passion', description: '那裡的熱情，會點燃你內在的活力。讓你的心像藝術一樣，充滿創造力。', culturalMood: '生命感、溫度、慢活、藝術感' },
    'ES': { state: '享受', stateEn: 'Enjoyment', description: '那裡的節奏，提醒你享受當下的時刻。讓接下來的時間，成為你重新感受生活的機會。', culturalMood: '節奏、享受、當下' },
    'FI': { state: '平靜', stateEn: 'Calm', description: '北歐的靜謐，會帶你回到心裡的安穩區域。讓接下來的呼吸，像雪落一樣輕。', culturalMood: '靜謐、白、呼吸、溫柔' },

    // 美洲
    'US': { state: '行動力', stateEn: 'Action', description: '那裡的節奏，會成為你的啟動訊號。在這幾分鐘裡，把注意力放在你想前進的方向。', culturalMood: '節奏、決斷、醒來的力量、行動' },
    'CA': { state: '開闊', stateEn: 'Openness', description: '那裡的寬廣，提醒你打開內心的空間。讓接下來的時間，成為你重新擴展視野的機會。', culturalMood: '寬廣、潔淨、森林的呼吸、開闊' },
    'BR': { state: '熱情', stateEn: 'Passion', description: '那裡的活力，會點燃你內在的熱情。讓你的心像節奏一樣，充滿生命力。', culturalMood: '節奏、熱情、生命力' },
    'MX': { state: '慶祝', stateEn: 'Celebration', description: '那裡的色彩，提醒你慶祝當下的時刻。讓接下來的時間，成為你重新感受喜悅的機會。', culturalMood: '色彩、慶祝、喜悅' },

    // 大洋洲
    'AU': { state: '自由', stateEn: 'Freedom', description: '那裡的開闊，會帶你回到內心的自由。讓你的心像天空一樣，無邊無際。', culturalMood: '開闊、自由、無邊際' },
    'NZ': { state: '純淨', stateEn: 'Purity', description: '那裡的純淨，提醒你回到內心的本質。讓接下來的時間，成為你重新連結自己的機會。', culturalMood: '純淨、本質、自然' },

    // 預設
    'DEFAULT': { state: '平靜', stateEn: 'Calm', description: '這趟旅程，會帶你回到內心的平靜。讓接下來的時間，成為你重新對齊自己的機會。', culturalMood: '平靜、安穩' }
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
            // 登機廣播 - Focus Airlines 敘事風格
            if (isEnglish) {
                prompt = `You are the captain of Focus Airlines. Write a boarding announcement with the following style:
- 20% captain (use aviation language: flight route, destination, takeoff)
- 40% gentle guide (warm, steady, guiding tone)
- 40% inner narrative (focus on passenger's inner state)

Requirements:
1. Welcome passengers to Focus Airlines
2. Departure: ${currentLocation || 'Taipei'}
3. Destination: ${city} (${country})
4. Flight time: ${flightTimeDesc}
5. Inner state theme: The destination represents "${mentalState.stateEn}" - ${mentalState.description}
6. Cultural mood (NOT tourist attractions): Describe the country's "${mentalState.culturalMood}" - this is about emotional atmosphere, not physical places/activities
7. DO NOT mention: beaches, food, specific landmarks, shopping, tourist activities
8. DO mention: the country's emotional quality, cultural mood, inner atmosphere (e.g., "Japan's quiet order", "Thailand's soft relaxation", "New York's decisive rhythm")
9. Tone: natural, conversational, warm, positive - like a friendly captain + meditation guide
${greetingHint}

Write in natural English, within 80 words. Make it feel immersive and warm, without creating a sense of loss or missing out.`;
            } else {
                prompt = `你是 Focus Airlines 的機長。請生成一個登機廣播，風格如下：
- 20% 機長（使用航空語言：航線、目的地、起飛）
- 40% 溫柔導引（溫暖、穩定、有導引感）
- 40% 內在敘事（專注於乘客的內在狀態）

必須包含：
1. 歡迎乘客搭乘 Focus Airlines
2. 出發地：${currentLocation || '台北'}
3. 目的地：${city} (${country})
4. 飛行時間：${flightTimeDesc}
5. 內在狀態主題：目的地象徵「${mentalState.state}」- ${mentalState.description}
6. 文化情緒特色（非旅遊景點）：描述這個國家的「${mentalState.culturalMood}」- 這是關於情緒氛圍，不是具體地點或活動
7. 禁止提到：海灘、美食、具體景點、購物、觀光活動
8. 可以提到：國家的情緒質感、文化氛圍、內在氣氛（例如：「日本的安靜秩序」、「泰國的柔軟鬆弛」、「紐約的決斷節奏」）
9. 語氣：自然、口語、溫暖、積極，像輕鬆的機長＋冥想導師
${greetingHint}

請用繁體中文，控制在100字以內。讓乘客感覺有沉浸感、溫暖，但不會產生失落感或「沒去過」的空虛感。`;
            }
        } else if (announcementType === 'landing') {
            // 降落廣播 - 專注於內在狀態和心理豐收
            const timeDesc = timerDuration ? '飛行完成' : `當地時間：${wakeTime || '08:00'}`;

            // 內在狀態提示（文化情緒特色，非旅遊特色）
            const innerStatePrompt = `內在狀態主題：
目的地【${city}, ${country}】象徵「${mentalState.state}」。
${mentalState.description}

文化情緒特色指引：
- 可以描述這個國家的「${mentalState.culturalMood}」（文化情緒特色）
- 例如：日本→乾淨、秩序、清晰；泰國→柔軟、鬆弛、微笑文化；紐約→節奏、決斷、醒來的力量
- 這是關於「情緒質感」和「文化氛圍」，不是具體的景點、美食、活動
- 禁止提到：海灘很美、東西很好吃、景點很棒、人很多很熱鬧等會造成「沒去過」失落感的內容
- 可以提到：國家的情緒質感、文化氛圍、內在氣氛，讓乘客自然「降落」到那個情緒
- 結尾要讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」
- 語氣：自然、口語、溫暖、積極，20% 機長 + 40% 溫柔導引 + 40% 內在敘事`;

            if (punctuality && punctuality.status) {
                // 根據準時性狀態生成不同的語音
                switch (punctuality.status) {
                    case 'PERFECT': // 完美準時（±1分鐘）
                        prompt = `你是 Focus Airlines 的機長。請生成一個「準時降落」的廣播，風格如下：
- 20% 機長（使用航空語言：降落、航線、目的地）
- 40% 溫柔導引（溫暖、穩定、有導引感）
- 40% 內在敘事（專注於乘客的內在狀態）

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 專業的降落宣告：「本次航班順利準時降落於【${city}】。」
3. 內在狀態引導：${innerStatePrompt}
4. 感謝詞：感謝乘客完成這段旅程
5. 結尾：讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」

重要原則：
- 可以描述國家的「文化情緒特色」（如：日本的安靜秩序、泰國的柔軟鬆弛）
- 禁止提到具體景點、美食、觀光活動（會造成失落感）
- 讓國家特色變成心理象徵，聽起來舒服、有畫面、但不會空虛

請用繁體中文，控制在100字以內。語氣：自然、口語、溫暖、積極。`;

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

                        prompt = `你是 Focus Airlines 的機長。請生成一個「提早降落」的廣播，風格如下：
- 20% 機長（使用航空語言）
- 40% 溫柔導引（輕鬆、安慰、溫暖）
- 40% 內在敘事（專注於內在狀態）

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 幽默的提早宣告：「我們提早到達了【${city}】。」
${isMidwayLanding ? `3. 說明中途降落：${earlyLandingNote}` : ''}
${isMidwayLanding ? '4. 安慰語句：輕鬆、溫暖地說明情況' : '3. 安慰語句：輕鬆、溫暖地說明情況'}
4. 內在狀態引導：${innerStatePrompt}
5. 結尾：讓乘客感覺即使提早降落，也獲得了內在收穫

重要原則：
- 可以描述國家的「文化情緒特色」
- 禁止提到具體景點、美食、觀光活動（會造成失落感）
- 讓國家特色變成心理象徵，聽起來舒服、有畫面、但不會空虛

請用繁體中文，控制在120字以內。語氣：自然、口語、溫暖、積極。`;

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

文化情緒特色指引：
- 可以描述這個國家的「${finalMentalState.culturalMood}」（文化情緒特色）
- 這是關於「情緒質感」和「文化氛圍」，不是具體的景點、美食、活動
- 禁止提到：海灘很美、東西很好吃、景點很棒等會造成「沒去過」失落感的內容
- 可以提到：國家的情緒質感、文化氛圍、內在氣氛，讓乘客自然「降落」到那個情緒
- 結尾要讓乘客感覺「抵達了自己」同時也「抵達了【${finalCity}】的情緒氛圍」
- 語氣：自然、口語、溫暖、積極，20% 機長 + 40% 溫柔導引 + 40% 內在敘事`;

                        const destinationNote = hasDiversion
                            ? `3. 目的地說明：「原定降落於【${originalCity}】，但因時間超過，我們轉降至【${divertedCity}】。」`
                            : `3. 目的地說明：「本次航班延誤，但仍降落在【${city}】。」`;

                        prompt = `你是 Focus Airlines 的機長。請生成一個「誤點降落」的廣播，風格如下：
- 20% 機長（使用航空語言）
- 40% 溫柔導引（幽默、帶歉意、溫暖）
- 40% 內在敘事（專注於內在狀態）

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 帶歉意的宣告：「抱歉，本次航班延誤。」
${destinationNote}
3. 鼓勵語句：溫暖、積極地鼓勵乘客
4. 內在狀態引導：${finalInnerStatePrompt}
5. 結尾：讓乘客感覺即使延誤，也抵達了自己和目的地

重要原則：
- 可以描述國家的「文化情緒特色」
- 禁止提到具體景點、美食、觀光活動（會造成失落感）
- 讓國家特色變成心理象徵，聽起來舒服、有畫面、但不會空虛

請用繁體中文，控制在150字以內。語氣：自然、口語、溫暖、積極。`;

                    default: // ON_TIME（一般準時）
                        prompt = `你是 Focus Airlines 的機長。請生成一個「準時降落」的廣播，風格如下：
- 20% 機長（使用航空語言）
- 40% 溫柔導引（專業、溫和、友善）
- 40% 內在敘事（專注於內在狀態）

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 降落宣告：「本次航班順利準時降落於【${city}】。」
3. 內在狀態引導：${innerStatePrompt}
4. 感謝詞：感謝乘客完成這段旅程
5. 結尾：讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」

重要原則：
- 可以描述國家的「文化情緒特色」（如：日本的安靜秩序、泰國的柔軟鬆弛）
- 禁止提到具體景點、美食、觀光活動（會造成失落感）
- 讓國家特色變成心理象徵，聽起來舒服、有畫面、但不會空虛

請用繁體中文，控制在100字以內。語氣：自然、口語、溫暖、積極。`;
                }
            } else {
                // 沒有準時性資訊時的預設提示
                prompt = `你是 Focus Airlines 的機長。請生成一個降落廣播，風格如下：
- 20% 機長 + 40% 溫柔導引 + 40% 內在敘事

必須包含：
1. 歡迎到達目的地
2. 目的地：${city} (${country})
3. ${timeDesc}
4. 內在狀態引導：${innerStatePrompt}
5. ${timerDuration ? '恭喜完成飛行任務' : '提醒乘客確認降落'}
6. 結尾：讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」

重要原則：
- 可以描述國家的「文化情緒特色」
- 禁止提到具體景點、美食、觀光活動（會造成失落感）
- 讓國家特色變成心理象徵，聽起來舒服、有畫面、但不會空虛

請用繁體中文，控制在100字以內。語氣：自然、口語、溫暖、積極。`;
            }

            // 若 UI 為英文，請模型將上述中文廣播翻成英文口語廣播
            if (isEnglish) {
                prompt = `You are the captain of Focus Airlines. Rewrite the following Chinese announcement script into natural, conversational English captain's announcement (speaking to passengers), maintaining the original meaning and atmosphere. Style: 20% captain + 40% gentle guide + 40% inner narrative. Length: 70-100 English words. Make it warm, positive, and natural. Focus on cultural mood (emotional atmosphere) rather than tourist attractions.

Chinese script:
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


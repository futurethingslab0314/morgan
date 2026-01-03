import OpenAI from 'openai';

const LOCAL_GREETINGS = {
    TH: 'สวัสดีครับ/ค่ะ', JP: 'こんにちは', KR: '안녕하세요', CN: '大家好好',
    HK: '大家好', MO: '大家好', SG: 'Hello everyone', MY: 'Selamat sejahtera',
    ID: 'Selamat datang', PH: 'Magandang araw', VN: 'Xin chào', KH: 'ជំរាបសួរ',
    LA: 'ສະບາຍດີ', MM: 'မင်္ဂလာပါ', IN: 'नमस्ते', NP: 'नमस्ते', BD: 'নমস্কার',
    LK: 'ආයුබෝවන්', MV: 'އަސްސަލާމު ޢަލައިކުމް', AE: 'مرحباً بكم',
    SA: 'أهلاً وسهلاً', QA: 'مرحباً', KW: 'مرحباً', OM: 'أهلاً بكم', BH: 'مرحباً',
    US: 'Welcome aboard', CA: 'Bonjour et bienvenue', GB: 'Good day everyone',
    FR: 'Bonjour à tous', ES: '¡Hola a todos!', IT: 'Ciao a tutti',
    DE: 'Guten Tag zusammen', AU: "G'day mates", NZ: 'Kia ora',
    BR: 'Olá, pessoal', MX: '¡Hola a todos!'
};

const COUNTRY_MENTAL_STATE = {
    'JP': { state: '專注', stateEn: 'Focus', description: '那裡的安靜，是你即將借用的專注。在這段旅程中，請讓自己的心像清晨的街道一樣乾淨、明確。', culturalMood: '乾淨、秩序、清晰、安靜的質感' },
    'KR': { state: '平衡', stateEn: 'Balance', description: '那裡的節奏，提醒你找到內在的平衡。讓接下來的時間，成為你重新對齊自己的機會。', culturalMood: '節奏感、和諧、精緻' },
    'CN': { state: '沉穩', stateEn: 'Steadiness', description: '那裡的深度，會帶你回到內心的沉穩。讓你的思緒像古老的智慧一樣，安靜而有力。', culturalMood: '深度、古老智慧、穩重' },
    'HK': { state: '效率', stateEn: 'Efficiency', description: '那裡的節奏，會成為你的啟動訊號。在這段時間裡，把注意力放在你想前進的方向。', culturalMood: '節奏、效率、活力' },
    'TW': { state: '親和', stateEn: 'Warmth', description: '那裡的親和，提醒你回到內心的溫暖。讓接下來的時間，成為你與自己重新連結的機會。', culturalMood: '親和、溫暖、人情味' },
    'TH': { state: '放鬆', stateEn: 'Relaxation', description: '那裡的從容，會帶你回到內心的放鬆。讓你的呼吸像微風一樣輕柔、自然。', culturalMood: '柔軟、鬆弛、微笑文化、從容' },
    'SG': { state: '清晰', stateEn: 'Clarity', description: '那裡的秩序，提醒你整理內心的空間。讓接下來的時間，成為你重新釐清方向的機會。', culturalMood: '秩序、清晰、整潔' },
    'MY': { state: '多元', stateEn: 'Diversity', description: '那裡的包容，提醒你接納自己的不同面向。讓你的心像多元文化一樣，豐富而和諧。', culturalMood: '多元、包容、和諧' },
    'ID': { state: '活力', stateEn: 'Vitality', description: '那裡的熱情，會點燃你內在的活力。讓接下來的時間，成為你重新啟動的機會。', culturalMood: '熱情、活力、生命力' },
    'PH': { state: '明亮', stateEn: 'Brightness', description: '陽光只是象徵——提醒你把自己調回明亮。讓心裡的空間重新亮起來。', culturalMood: '陽光、明亮、人情、溫度' },
    'VN': { state: '韌性', stateEn: 'Resilience', description: '那裡的堅韌，提醒你內在的力量。讓接下來的時間，成為你重新發現自己韌性的機會。', culturalMood: '堅韌、生命力、韌性' },
    'IN': { state: '覺察', stateEn: 'Awareness', description: '多層次的文化提醒你，情緒可以被感受、被允許。請用幾次呼吸，回到自己的覺察。', culturalMood: '多層次、豐富、覺察' },
    'FR': { state: '優雅從容', stateEn: 'Poise', description: '法國的步調帶著一種不慌不忙的美。在這趟旅程中，也讓你的心保持從容。', culturalMood: '優雅、從容、不慌不忙' },
    'GB': { state: '沉著', stateEn: 'Composure', description: '那裡的沉穩，會帶你回到內心的平靜。讓你的思緒像午後的茶一樣，溫和而清晰。', culturalMood: '霧氣、穩定、距離感、沉穩' },
    'DE': { state: '精準', stateEn: 'Precision', description: '那裡的精準，提醒你回到內心的秩序。讓接下來的時間，成為你重新對齊目標的機會。', culturalMood: '精準、秩序、嚴謹' },
    'IT': { state: '熱情', stateEn: 'Passion', description: '那裡的熱情，會點燃你內在的活力。讓你的心像藝術一樣，充滿創造力。', culturalMood: '生命感、溫度、慢活、藝術感' },
    'ES': { state: '享受', stateEn: 'Enjoyment', description: '那裡的節奏，提醒你享受當下的時刻。讓接下來的時間，成為你重新感受生活的機會。', culturalMood: '節奏、享受、當下' },
    'FI': { state: '平靜', stateEn: 'Calm', description: '北歐的靜謐，會帶你回到心裡的安穩區域。讓接下來的呼吸，像雪落一樣輕。', culturalMood: '靜謐、白、呼吸、溫柔' },
    'US': { state: '行動力', stateEn: 'Action', description: '那裡的節奏，會成為你的啟動訊號。在這幾分鐘裡，把注意力放在你想前進的方向。', culturalMood: '節奏、決斷、醒來的力量、行動' },
    'CA': { state: '開闊', stateEn: 'Openness', description: '那裡的寬廣，提醒你打開內心的空間。讓接下來的時間，成為你重新擴展視野的機會。', culturalMood: '寬廣、潔淨、森林的呼吸、開闊' },
    'BR': { state: '熱情', stateEn: 'Passion', description: '那裡的活力，會點燃你內在的熱情。讓你的心像節奏一樣，充滿生命力。', culturalMood: '節奏、熱情、生命力' },
    'MX': { state: '慶祝', stateEn: 'Celebration', description: '那裡的色彩，提醒你慶祝當下的時刻。讓接下來的時間，成為你重新感受喜悅的機會。', culturalMood: '色彩、慶祝、喜悅' },
    'AU': { state: '自由', stateEn: 'Freedom', description: '那裡的開闊，會帶你回到內心的自由。讓你的心像天空一樣，無邊無際。', culturalMood: '開闊、自由、無邊際' },
    'NZ': { state: '純淨', stateEn: 'Purity', description: '那裡的純淨，提醒你回到內心的本質。讓接下來的時間，成為你重新連結自己的機會。', culturalMood: '純淨、本質、自然' },
    'DEFAULT': { state: '平靜', stateEn: 'Calm', description: '這趟旅程，會帶你回到內心的平靜。讓接下來的時間，成為你重新對齊自己的機會。', culturalMood: '平靜、安穩' }
};

const TASK_GUIDANCE = {
    boarding: {
        'READING': { zh: '這次飛行任務是「讀書」。請在廣播中強調：認真、專注、準備進入深度學習狀態。', en: 'The flight task is "Reading". Emphasize: seriousness, focus, preparing for deep learning.' },
        'MEDITATION': { zh: '這次飛行任務是「冥想」。請在廣播中強調：平靜、內觀、準備進入冥想狀態。', en: 'The flight task is "Meditation". Emphasize: calm, introspection, preparing for meditation.' },
        'REST': { zh: '這次飛行任務是「休息」。請在廣播中強調：放鬆、恢復、準備好好休息。', en: 'The flight task is "Rest". Emphasize: relaxation, recovery, preparing to rest well.' },
        'GAME': { zh: '這次飛行任務是「遊戲」。請在廣播中強調：愉快、享受當下、專注在飛行過程本身。', en: 'The flight task is "Game". Emphasize: joy, enjoying the moment, focusing on the flight journey itself.' },
        'WORK': { zh: '這次飛行任務是「工作」。請在廣播中強調：效率、專注、準備進入工作狀態。', en: 'The flight task is "Work". Emphasize: efficiency, focus, preparing for work mode.' },
        'CREATIVE': { zh: '這次飛行任務是「創作」。請在廣播中強調：靈感、創意、準備進入創作狀態。', en: 'The flight task is "Creative". Emphasize: inspiration, creativity, preparing for creative work.' }
    },
    landing: {
        'READING': { zh: '乘客剛完成「讀書」任務。請提醒：可以休息一下眼睛，做個簡單的放鬆。', en: 'The passenger just completed a "Reading" task. Remind them: rest your eyes, do some simple relaxation.' },
        'MEDITATION': { zh: '乘客剛完成「冥想」任務。請提醒：保持平靜。', en: 'The passenger just completed a "Meditation" task. Remind them: maintain calm.' },
        'REST': { zh: '乘客剛完成「休息」任務。請提醒：好好休息。', en: 'The passenger just completed a "Rest" task. Remind them: rest well.' },
        'GAME': { zh: '乘客剛完成「遊戲」任務。請根據目的地當地時間，提醒進入工作狀態或開始專注。', en: 'The passenger just completed a "Game" task. Based on the destination\'s local time, remind them to enter work mode or start focusing.' },
        'WORK': { zh: '乘客剛完成「工作」任務。請提醒：可以放鬆一下。', en: 'The passenger just completed a "Work" task. Remind them: relax a bit.' },
        'CREATIVE': { zh: '乘客剛完成「創作」任務。請提醒：可以休息一下，讓創意沉澱。', en: 'The passenger just completed a "Creative" task. Remind them: take a break, let creativity settle.' }
    },
    approach: {
        'READING': { zh: '乘客正在進行「讀書」任務。請提醒：慢慢合上書本，讓眼睛休息一下，準備降落。', en: 'The passenger is doing a "Reading" task. Remind them: slowly close the book, rest your eyes, prepare for landing.' },
        'MEDITATION': { zh: '乘客正在進行「冥想」任務。請提醒：慢慢睜開眼睛，保持內心的平靜，準備降落。', en: 'The passenger is doing a "Meditation" task. Remind them: slowly open your eyes, maintain inner calm, prepare for landing.' },
        'REST': { zh: '乘客正在進行「休息」任務。請提醒：慢慢調整姿勢，準備從休息中醒來，準備降落。', en: 'The passenger is doing a "Rest" task. Remind them: slowly adjust your posture, prepare to wake from rest, prepare for landing.' },
        'GAME': { zh: '乘客正在進行「遊戲」任務。請提醒：慢慢放下遊戲，準備從遊戲中轉換，準備降落。', en: 'The passenger is doing a "Game" task. Remind them: slowly put down the game, prepare to transition from gaming, prepare for landing.' },
        'WORK': { zh: '乘客正在進行「工作」任務。請提醒：慢慢整理思緒，準備從工作中轉換，準備降落。', en: 'The passenger is doing a "Work" task. Remind them: slowly organize your thoughts, prepare to transition from work, prepare for landing.' },
        'CREATIVE': { zh: '乘客正在進行「創作」任務。請提醒：慢慢整理創意，準備從創作中轉換，準備降落。', en: 'The passenger is doing a "Creative" task. Remind them: slowly organize your creativity, prepare to transition from creative work, prepare for landing.' }
    }
};

const TASK_WEATHER_MAP = {
    'READING': { zh: '可以將天氣與閱讀氛圍結合，例如：細雨適合深度閱讀、陽光透過窗戶適合專注', en: 'Connect weather with reading atmosphere, e.g., light rain suits deep reading, sunlight through windows aids focus' },
    'MEDITATION': { zh: '可以將天氣與冥想狀態結合，例如：雲層帶來內在的寧靜、微風幫助呼吸節奏', en: 'Connect weather with meditation state, e.g., clouds bring inner calm, gentle breeze aids breathing rhythm' },
    'REST': { zh: '可以將天氣與休息氛圍結合，例如：陰天適合深度休息、微風帶來放鬆', en: 'Connect weather with rest atmosphere, e.g., cloudy sky suits deep rest, gentle breeze brings relaxation' },
    'WORK': { zh: '可以將天氣與工作效率結合，例如：晴朗天氣帶來清晰思路、微風保持清醒', en: 'Connect weather with work efficiency, e.g., clear sky brings clear thinking, gentle breeze keeps alert' },
    'GAME': { zh: '可以將天氣與遊戲心情結合，例如：多變的天氣像遊戲的節奏、陽光帶來活力', en: 'Connect weather with gaming mood, e.g., changing weather like game rhythm, sunlight brings energy' },
    'CREATIVE': { zh: '可以將天氣與創作靈感結合，例如：多變的雲層激發想像、陽光帶來創意能量', en: 'Connect weather with creative inspiration, e.g., changing clouds spark imagination, sunlight brings creative energy' }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: `方法 ${req.method} 不被允許` });
        return;
    }

    try {
        const { announcementType, city, country, countryCode, currentLocation, flightTime, timerDuration, punctuality, localTimeInfo, taskType, uiLanguage, landingSituation, situationNarrative, toneAdjustment, culturalContext, timeDiffMinutes, realWeatherData } = req.body;

        if (!announcementType || !city || !country) {
            res.status(400).json({ error: '缺少必要參數' });
            return;
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const greeting = LOCAL_GREETINGS[(countryCode || '').toUpperCase()] || '';
        const isEnglish = uiLanguage === 'en';
        const mentalState = COUNTRY_MENTAL_STATE[(countryCode || '').toUpperCase()] || COUNTRY_MENTAL_STATE['DEFAULT'];
        const task = (taskType || 'REST').toUpperCase();
        const taskGuidance = TASK_GUIDANCE[announcementType]?.[task] || null;
        const taskGuidanceText = taskGuidance ? (isEnglish ? taskGuidance.en : taskGuidance.zh) : '';

        const greetingHint = greeting
            ? (isEnglish ? `Start with a short greeting in the local language: "${greeting}", then briefly explain it in English.`
                : `在開頭加入一小句當地語言問候：「${greeting}」並立刻翻譯成中文。`)
            : (isEnglish ? 'If you know a local greeting, you may briefly mention it and explain it in English.'
                : '若知道當地語言問候，可簡短示意並翻成中文。');

        const flightTimeDesc = timerDuration
            ? (Math.floor(timerDuration / 60) > 0 && timerDuration % 60 > 0
                ? `${Math.floor(timerDuration / 60)}小時${timerDuration % 60}分鐘`
                : Math.floor(timerDuration / 60) > 0
                    ? `${Math.floor(timerDuration / 60)}小時`
                    : `${timerDuration % 60}分鐘`)
            : `${flightTime || '8'}小時`;

        const flightNumber = `FA${Math.floor(Math.random() * 9000) + 1000}`;
        const month = new Date().getMonth() + 1;
        const season = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
        const seasonZh = season === 'spring' ? '春季' : season === 'summer' ? '夏季' : season === 'autumn' ? '秋季' : '冬季';
        const taskWeather = TASK_WEATHER_MAP[task] || TASK_WEATHER_MAP['REST'];
        const weatherTaskGuidance = isEnglish ? taskWeather.en : taskWeather.zh;

        let prompt = '';

        if (announcementType === 'approach') {
            prompt = isEnglish
                ? `You are a professional male captain of Focus Airlines. Generate a pre-landing approach announcement (80-100 words, 5 minutes before landing).

Style: 50% aviation professionalism + 25% warm guidance + 25% inner narrative.

Structure:
1. Start: "Ladies and gentlemen, this is your captain speaking. We will be landing in approximately 5 minutes at 【${city}】."
2. Weather: Describe current weather in ${city} (${season}), integrate with task: "${taskGuidanceText}". ${weatherTaskGuidance}. Vivid, avoid repetition.
3. Task reminder: ${taskGuidanceText}
4. Closing: "Please prepare for landing. Thank you."

${greetingHint}`
                : `你是一位經驗豐富的男性機長，Focus Airlines 的專業機長。生成「準備降落預告廣播」（80-100字，降落前5分鐘）。

【重要】必須使用繁體中文（Traditional Chinese），絕對不要使用簡體中文。

語氣 = 50% 專業航空 + 25% 溫暖導引 + 25% 內在敘事。

結構：
1. 開場：「各位乘客，我是機長。我們將在約5分鐘後降落在【${city}】。」
2. 天氣：描述【${city}】目前天氣（${seasonZh}），與任務融合。${weatherTaskGuidance}。生動有趣，避免重複詞彙。
3. 任務提醒：${taskGuidanceText}
4. 結尾：「請準備降落，謝謝。」

${greetingHint}`;

        } else if (announcementType === 'boarding') {
            prompt = isEnglish
                ? `You are a professional airline captain of Focus Airlines. Generate a boarding announcement (~200-230 words).

Tone = 40% aviation professionalism + 30% gentle guidance + 30% inner reflective narrative.
DO NOT mention: beaches, food, landmarks, shopping, tourist activities.

Structure:
1. Start: "Good morning/afternoon/evening, this is your captain speaking. Welcome aboard Focus Airlines flight ${flightNumber}..."
2. Aviation info: Flight ${flightNumber}, Route: ${currentLocation || 'Taipei'} → ${city} (${country}), Flight time: ${flightTimeDesc}
3. Airplane mode: One line requesting switch to airplane mode (safety + symbolic transition)
4. Local time: ${localTimeInfo ? `Local time at ${city} will be approximately ${localTimeInfo.localTimeString} (${localTimeInfo.timeContext}).` : 'Please note the local time at destination.'}
5. Weather: Describe weather in ${city} (${season}), integrate with task: "${taskGuidanceText}". ${weatherTaskGuidance}. Vivid, 1-2 sentences.
6. Cultural mood: Describe emotional atmosphere of ${country}: "${mentalState.culturalMood}" (NOT tourist places)
7. Inner state: "${mentalState.stateEn}" — ${mentalState.description}
8. Task guidance: ${taskGuidanceText} (include: first-minute action, focus rule, recovery line if distracted)
9. Closing: "Thank you for choosing Focus Airlines. We wish you a pleasant journey."

${greetingHint}`
                : `你是 Focus Airlines 的專業機長。生成登機廣播（約 200-230 字）。

【重要】必須使用繁體中文（Traditional Chinese），絕對不要使用簡體中文。

語氣 = 40% 專業航空 + 30% 溫柔導引 + 30% 內在敘事。
禁止提到：海灘、美食、景點、購物、觀光活動。

結構：
1. 開場：「各位乘客大家好，我是本次航班的機長，歡迎搭乘 Focus Airlines 航班 ${flightNumber}…」
2. 航空資訊：航班 ${flightNumber}，航線：${currentLocation || '台北'} → ${city}（${country}），飛行時間：${flightTimeDesc}
3. 飛航模式：一句「請將手機調為飛航模式」（安全程序 + 象徵儀式）
4. 當地時間：${localTimeInfo ? `抵達【${city}】時的當地時間約為 ${localTimeInfo.localTimeString}（${localTimeInfo.timeContext}）。` : '請留意目的地的當地時間。'}
5. 天氣：描述【${city}】天氣（${seasonZh}），與任務融合。${weatherTaskGuidance}。生動有趣，1-2句話。
6. 文化氛圍：描述${country}的「情緒氛圍」：「${mentalState.culturalMood}」（非旅遊地點）
7. 內在狀態：「${mentalState.state}」— ${mentalState.description}
8. 任務引導：${taskGuidanceText}（包含：第一分鐘微行動、專注規則、分心回神語）
9. 結尾：「感謝您選擇 Focus Airlines，祝您旅途愉快。」

${greetingHint}`;

        } else if (announcementType === 'landing') {
            const approachAvoidance = isEnglish
                ? 'IMPORTANT: A pre-landing announcement was already played 5 minutes ago. This landing announcement should be DIFFERENT, focused on welcoming and summary. Keep it concise (60-80 words), more celebratory. DO NOT repeat weather or preparation reminders.'
                : '重要：5分鐘前已播放準備降落預告。這次降落廣播應不同，重點在歡迎和總結。保持簡潔（60-80字），更偏向慶祝。不要重複天氣或準備提醒。';

            const landingTimeInfo = localTimeInfo
                ? (isEnglish ? `Local time at ${city} is now ${localTimeInfo.localTimeString} (${localTimeInfo.timeContext}).` : `目前【${city}】的當地時間是 ${localTimeInfo.localTimeString}（${localTimeInfo.timeContext}）。`)
                : '';

            const landingWeatherGuidance = {
                'READING': { zh: '天氣與閱讀後的放鬆結合', en: 'Connect weather with post-reading relaxation' },
                'MEDITATION': { zh: '天氣與冥想後的平靜結合', en: 'Connect weather with post-meditation calm' },
                'REST': { zh: '天氣與休息後的恢復結合', en: 'Connect weather with post-rest recovery' },
                'WORK': { zh: '天氣與工作完成後的轉換結合', en: 'Connect weather with post-work transition' },
                'GAME': { zh: '天氣與遊戲後的狀態轉換結合', en: 'Connect weather with post-game state transition' },
                'CREATIVE': { zh: '天氣與創作完成後的沉澱結合', en: 'Connect weather with post-creative settling' }
            }[task] || { zh: '天氣與任務完成後狀態結合', en: 'Connect weather with completed task state' };
            
            // 🔧 改進：構建天氣描述（優先使用真實天氣數據）
            let weatherDescription = '';
            if (realWeatherData && realWeatherData.condition && realWeatherData.temperature) {
                const temp = realWeatherData.temperature;
                const condition = realWeatherData.condition;
                const description = realWeatherData.description || '';
                weatherDescription = isEnglish
                    ? `Current weather at ${city}: ${condition}, temperature ${temp}°C${description ? `, ${description}` : ''}.`
                    : `目前【${city}】的天氣：${condition}，氣溫${temp}度${description ? `，${description}` : ''}。`;
            } else {
                weatherDescription = isEnglish
                    ? `Describe weather at ${city} (${season}), integrate with task. ${landingWeatherGuidance.en}. Vivid.`
                    : `描述【${city}】天氣（${seasonZh}），與任務融合。${landingWeatherGuidance.zh}。生動且具體。`;
            }

            const innerStatePrompt = `內在狀態：目的地【${city}, ${country}】象徵「${mentalState.state}」。${mentalState.description}
文化情緒特色：「${mentalState.culturalMood}」（情緒質感，非景點美食）
${taskGuidanceText ? `任務完成後指引：${taskGuidanceText}` : ''}
結尾：讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」`;

            // 🔧 結構化 Prompt 設計：如果有傳入降落狀況的轉換邏輯，優先使用
            if (landingSituation && situationNarrative && toneAdjustment) {
                const structuredPrompt = isEnglish
                    ? `Generate a landing announcement based on the following structured prompt design (60-80 words, keep it concise and engaging).

【Input Variables (Inputs)】
- Destination: ${city}, ${country}${countryCode ? ` (${countryCode})` : ''}
- Landing Situation: ${landingSituation}
- Local Time: ${landingTimeInfo || `${localTimeInfo?.localTimeString || ''} (${localTimeInfo?.timeContext || ''})`}
- Cultural Context: "${culturalContext || mentalState.culturalMood}"

【Prompt Conversion Logic (Design Logic)】
1. Landing Situation → Narrative Background: ${situationNarrative}
2. Cultural Context → Local Cultural Tone: ${culturalContext || mentalState.culturalMood}
3. Time Context → Tone Adjustment: ${toneAdjustment}

【Generation Requirements】
- Tone: ${toneAdjustment}
- Start with local greeting: "${greeting || 'Hello'}" (translate)
- Incorporate the landing situation narrative naturally
- Weather: ${weatherDescription || `Describe weather at ${city}, integrate with task. ${landingWeatherGuidance.en}. Vivid.`}
- Cultural mood: "${culturalContext || mentalState.culturalMood}"
- Inner state: "${mentalState.stateEn}" — ${mentalState.description}
- Task completion: ${taskGuidanceText}
- Closing: Make passengers feel they "arrived at themselves" and "arrived at ${city}'s emotional atmosphere"

${greetingHint}`
                    : `根據以下結構化 Prompt 設計生成降落廣播（60-80字，保持簡潔有趣且情感豐富）。

【輸入變數 (Inputs)】
- 目的地：${city}，${country}${countryCode ? ` (${countryCode})` : ''}
- 降落狀況：${landingSituation}
- 當地時間：${landingTimeInfo || `${localTimeInfo?.localTimeString || ''}（${localTimeInfo?.timeContext || ''}）`}
- 文化特色：${culturalContext || mentalState.culturalMood}

【Prompt 轉換邏輯 (Design Logic)】
1. 降落狀況 → 敘事背景：${situationNarrative}
2. 文化特色 → 當地文化語氣：${culturalContext || mentalState.culturalMood}
3. 時間情境 → 音調調整：${toneAdjustment}

【生成要求】
- 語氣：${toneAdjustment}（必須強烈且明確地表達情感，不要平淡）
- 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯（語氣要生動有活力）
- 自然地融入降落狀況的敘事背景（要讓乘客感受到情境的真實感和臨場感）
- 天氣：${weatherDescription || `描述【${city}】天氣，與任務融合。${landingWeatherGuidance.zh}。生動且具體，讓乘客能感受到天氣的質感。`}
- 文化氛圍：「${culturalContext || mentalState.culturalMood}」（要讓乘客感受到當地的文化氣息）
- 內在狀態：「${mentalState.state}」— ${mentalState.description}（要讓乘客感受到內在的轉變）
- 任務完成：${taskGuidanceText}（語氣要肯定且溫暖）
- 結尾：讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」（要有強烈的歸屬感和完成感）

【重要提醒】
- 必須使用繁體中文（Traditional Chinese），絕對不要使用簡體中文
- 必須完整表達，不要中途截斷
- 語氣要有力度和感染力，不要平淡
- 每個句子都要有情感色彩，讓乘客感受到真實的情緒
- 確保內容完整，不會因為 token 限制而被截斷
- 結尾必須完整，不能在中途停止

${greetingHint}`;

                prompt = structuredPrompt;
                console.log(`✅ [API] 使用結構化 Prompt 設計（降落狀況：${landingSituation}）`);
                console.log(`📋 [API] 完整 Prompt：\n${structuredPrompt}`);
            } else if (punctuality && punctuality.status) {
                const statusPrompts = {
                    'PERFECT': isEnglish
                        ? `Generate a "perfect on-time landing" announcement (60-80 words, keep it concise). ${approachAvoidance}
Tone = 40% aviation + 30% gentle guidance + 30% inner narrative.
1. Start: "Ladies and gentlemen, this is your captain. Focus Airlines flight ${flightNumber} has landed on time at 【${city}】."
2. Time & weather: ${landingTimeInfo} ${weatherDescription || `Describe weather, integrate with task. ${landingWeatherGuidance.en}. Vivid.`}
3. Cultural mood: "${mentalState.culturalMood}"
4. Inner state: "${mentalState.stateEn}" — ${mentalState.description}
5. Task completion: ${taskGuidanceText}
6. Closing: "Thank you for choosing Focus Airlines. We wish you a pleasant journey in 【${city}】."
${greetingHint}`
                        : `生成「完美準時降落」廣播（60-80字，保持簡潔）。${approachAvoidance}

【重要】必須使用繁體中文（Traditional Chinese），絕對不要使用簡體中文。

語氣 = 40% 專業航空 + 30% 溫柔導引 + 30% 內在敘事。
1. 開場：「各位乘客，我是機長。本次 Focus Airlines 航班 ${flightNumber} 已順利準時降落於【${city}】。」
2. 時間和天氣：${landingTimeInfo} ${weatherDescription || `描述天氣，與任務融合。${landingWeatherGuidance.zh}。生動。`}
3. 文化氛圍：「${mentalState.culturalMood}」
4. 內在狀態：「${mentalState.state}」— ${mentalState.description}
5. 任務完成：${taskGuidanceText}
6. 結尾：「感謝您選擇 Focus Airlines，祝您在【${city}】的旅程愉快。」
${greetingHint}`,

                    'EARLY': isEnglish
                        ? `Generate an "early landing" announcement (60-80 words, keep it concise). Tone: 20% captain + 40% gentle guidance + 40% inner narrative.
1. Greeting: "${greeting || 'Hello'}" (translate)
2. Early arrival: "We have arrived early at 【${city}】."
3. Weather: ${weatherDescription || `Describe weather, integrate with task. ${landingWeatherGuidance.en}. Vivid.`}
4. Inner state: ${innerStatePrompt}
5. Closing: Make passengers feel they gained inner harvest even with early landing.
${greetingHint}`
                        : `生成「提早降落」廣播（60-80字，保持簡潔）。

【重要】必須使用繁體中文（Traditional Chinese），絕對不要使用簡體中文。

語氣：20% 機長 + 40% 溫柔導引 + 40% 內在敘事。
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯
2. 提早宣告：「我們提早到達了【${city}】。」
3. 天氣：${weatherDescription || `描述天氣，與任務融合。${landingWeatherGuidance.zh}。生動。`}
4. 內在狀態：${innerStatePrompt}
5. 結尾：讓乘客感覺即使提早降落，也獲得了內在收穫。
${greetingHint}`,

                    'LATE': isEnglish
                        ? `Generate a "delayed landing" announcement (60-80 words, keep it concise). ${approachAvoidance}
Tone: 20% captain + 40% gentle guidance + 40% inner narrative.
1. Greeting: "${greeting || 'Hello'}" (translate)
2. Apology: "Sorry, this flight has been delayed."
3. Destination: ${punctuality.divertedCity && punctuality.divertedCity !== city ? `"Originally scheduled to land at 【${punctuality.originalDestination}】, we have diverted to 【${punctuality.divertedCity}】."` : `"This flight is delayed but still landing at 【${city}】."`}
4. Weather: ${weatherDescription || `Describe weather, integrate with task. ${landingWeatherGuidance.en}. Vivid.`}
5. Encouragement: Warm, positive
6. Inner state: ${innerStatePrompt}
7. Closing: Make passengers feel they arrived at themselves and destination despite delay.
${greetingHint}`
                        : `生成「誤點降落」廣播（60-80字，保持簡潔）。${approachAvoidance}

【重要】必須使用繁體中文（Traditional Chinese），絕對不要使用簡體中文。

語氣：20% 機長 + 40% 溫柔導引 + 40% 內在敘事。
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯
2. 歉意宣告：「抱歉，本次航班延誤。」
3. 目的地：${punctuality.divertedCity && punctuality.divertedCity !== city ? `「原定降落於【${punctuality.originalDestination}】，但因時間超過，我們轉降至【${punctuality.divertedCity}】。」` : `「本次航班延誤，但仍降落在【${city}】。」`}
4. 天氣：${weatherDescription || `描述天氣，與任務融合。${landingWeatherGuidance.zh}。生動。`}
5. 鼓勵：溫暖、積極
6. 內在狀態：${innerStatePrompt}
7. 結尾：讓乘客感覺即使延誤，也抵達了自己和目的地。
${greetingHint}`,

                    'ON_TIME': isEnglish
                        ? `Generate an "on-time landing" announcement (60-80 words, keep it concise). ${approachAvoidance}
Tone: 20% captain + 40% gentle guidance + 40% inner narrative.
1. Greeting: "${greeting || 'Hello'}" (translate)
2. Landing: "This flight has landed on time at 【${city}】."
3. Weather: ${weatherDescription || `Describe weather, integrate with task. ${landingWeatherGuidance.en}. Vivid.`}
4. Inner state: ${innerStatePrompt}
5. Thanks: Thank passengers for completing the journey
6. Closing: Make passengers feel they "arrived at themselves" and "arrived at 【${city}】's emotional atmosphere"
${greetingHint}`
                        : `生成「準時降落」廣播（60-80字，保持簡潔）。${approachAvoidance}

【重要】必須使用繁體中文（Traditional Chinese），絕對不要使用簡體中文。

語氣：20% 機長 + 40% 溫柔導引 + 40% 內在敘事。
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯
2. 降落宣告：「本次航班順利準時降落於【${city}】。」
3. 天氣：${weatherDescription || `描述天氣，與任務融合。${landingWeatherGuidance.zh}。生動。`}
4. 內在狀態：${innerStatePrompt}
5. 感謝：感謝乘客完成這段旅程
6. 結尾：讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」
${greetingHint}`
                };

                prompt = statusPrompts[punctuality.status] || statusPrompts['ON_TIME'];
            } else {
                prompt = isEnglish
                    ? `Generate a landing announcement (60-80 words, keep it concise). Tone: 20% captain + 40% gentle guidance + 40% inner narrative.
1. Welcome to destination
2. Destination: ${city} (${country})
3. ${landingTimeInfo || 'Time info'}
4. Weather: ${weatherDescription || `Describe weather, integrate with task. ${landingWeatherGuidance.en}. Vivid.`}
5. Inner state: ${innerStatePrompt}
6. ${timerDuration ? 'Congratulations on completing the flight task' : 'Remind passengers to confirm landing'}
7. Closing: Make passengers feel they "arrived at themselves" and "arrived at 【${city}】's emotional atmosphere"
${greetingHint}`
                    : `生成降落廣播（60-80字，保持簡潔）。語氣：20% 機長 + 40% 溫柔導引 + 40% 內在敘事。
1. 歡迎到達目的地
2. 目的地：${city} (${country})
3. ${landingTimeInfo || '時間資訊'}
4. 天氣：${weatherDescription || `描述天氣，與任務融合。${landingWeatherGuidance.zh}。生動。`}
5. 內在狀態：${innerStatePrompt}
6. ${timerDuration ? '恭喜完成飛行任務' : '提醒乘客確認降落'}
7. 結尾：讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」
${greetingHint}`;
            }

            if (isEnglish && punctuality && punctuality.status) {
                prompt = `You are the captain of Focus Airlines. Rewrite the following Chinese announcement script into natural, conversational English captain's announcement, maintaining the original meaning and atmosphere. Style: 20% captain + 40% gentle guide + 40% inner narrative. Length: 70-100 English words. Make it warm, positive, and natural. Focus on cultural mood (emotional atmosphere) rather than tourist attractions.

Chinese script:
${prompt}`;
            }
        } else {
            res.status(400).json({ error: '無效的廣播類型' });
            return;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo", // 🔧 使用 GPT-4 Turbo（穩定可用的模型）
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9,  // 🔧 提高溫度以增加創意和情感表達
            max_tokens: 500  // 🔧 大幅增加 token 限制，確保內容完整且不會被截斷（60-80字約需 200-300 tokens，預留充足緩衝）
        });

        const announcement = response.choices[0].message.content.trim();

        // 🔧 改進：如果是降落廣播，同時生成活動建議
        let activitySuggestion = null;
        if (announcementType === 'landing') {
            try {
                const activityPrompt = isEnglish
                    ? `Generate ONE engaging activity suggestion for travelers visiting ${city}, ${country}. 
                    Make it specific, encouraging, and culturally relevant. Examples: "Participate in local festivals", "Try authentic street food", "Experience traditional cultural activities", "Visit historical sites", "Explore local markets", "Attend traditional celebrations", "Taste local specialties", "Visit museums", "Stroll through old districts", "Experience local arts".
                    Format: One sentence, 15-25 words, warm and inviting tone. Focus on cultural experiences, not just tourist attractions.`
                    : `為前往【${city}，${country}】的旅客生成一個有趣的活動建議。
                    要具體、鼓勵性、符合當地文化。例如：「參與當地民族慶典，感受傳統文化」、「品嚐道地特色美食，探索味蕾新體驗」、「體驗當地文化活動，深入了解風土人情」、「參觀歷史古蹟，感受時光流轉」、「探索當地市集，發現獨特工藝品」、「參與傳統節慶，融入當地生活」、「品嚐街頭小吃，體驗在地風味」、「參觀博物館，了解文化歷史」、「漫步老城區，感受歷史氛圍」、「體驗當地藝術，欣賞文化創作」。
                    格式：一句話，15-25字，溫暖邀請的語氣。重點是文化體驗，不只是景點。`;

                const activityResponse = await openai.chat.completions.create({
                    model: "gpt-4o", // 🔧 升級到 GPT-4o（更優質的模型，生成更符合當地文化的活動建議）
                    messages: [{ role: "user", content: activityPrompt }],
                    temperature: 0.9,
                    max_tokens: 100
                });

                activitySuggestion = activityResponse.choices[0].message.content.trim();
                console.log('✅ 活動建議生成成功:', activitySuggestion);
            } catch (error) {
                console.warn('⚠️ 生成活動建議失敗:', error);
                // 如果失敗，使用預設建議
                activitySuggestion = isEnglish
                    ? `Experience the local culture and explore authentic activities in ${city}`
                    : `體驗當地文化，探索${city}的獨特魅力`;
            }
        }

        res.status(200).json({
            announcement,
            announcementType,
            city,
            country,
            countryCode,
            greeting,
            activitySuggestion, // 🔧 新增：活動建議
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('生成睡眠航班廣播時發生錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}

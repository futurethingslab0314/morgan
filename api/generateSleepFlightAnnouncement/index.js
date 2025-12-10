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

// 任務類型指引
const TASK_GUIDANCE = {
    boarding: {
        'READING': {
            zh: '這次飛行任務是「讀書」。請在廣播中強調：認真、專注、準備進入深度學習狀態。可以提到目的地能幫助專注的氛圍，例如：日本的安靜秩序可以幫助你專注閱讀。',
            en: 'The flight task is "Reading". Emphasize: seriousness, focus, preparing for deep learning. Mention how the destination\'s atmosphere can help with concentration, e.g., Japan\'s quiet order can help you focus on reading.'
        },
        'MEDITATION': {
            zh: '這次飛行任務是「冥想」。請在廣播中強調：平靜、內觀、準備進入冥想狀態。可以提到目的地能帶來平靜的氛圍。',
            en: 'The flight task is "Meditation". Emphasize: calm, introspection, preparing for meditation. Mention how the destination\'s atmosphere can bring calm.'
        },
        'REST': {
            zh: '這次飛行任務是「休息」。請在廣播中強調：放鬆、恢復、準備好好休息。可以提到目的地能帶來放鬆的氛圍。',
            en: 'The flight task is "Rest". Emphasize: relaxation, recovery, preparing to rest well. Mention how the destination\'s atmosphere can bring relaxation.'
        },
        'GAME': {
            zh: '這次飛行任務是「遊戲」。請在廣播中強調：愉快、享受當下、專注在飛行過程本身。讓乘客感覺這是一段輕鬆愉快的旅程，可以好好享受遊戲時光。',
            en: 'The flight task is "Game". Emphasize: joy, enjoying the moment, focusing on the flight journey itself. Make passengers feel this is a relaxed and enjoyable journey to enjoy gaming time.'
        },
        'WORK': {
            zh: '這次飛行任務是「工作」。請在廣播中強調：效率、專注、準備進入工作狀態。可以提到目的地能帶來效率的氛圍。',
            en: 'The flight task is "Work". Emphasize: efficiency, focus, preparing for work mode. Mention how the destination\'s atmosphere can bring efficiency.'
        },
        'CREATIVE': {
            zh: '這次飛行任務是「創作」。請在廣播中強調：靈感、創意、準備進入創作狀態。可以提到目的地能帶來靈感的氛圍，例如：異國文化可以激發創作靈感。',
            en: 'The flight task is "Creative". Emphasize: inspiration, creativity, preparing for creative work. Mention how the destination\'s atmosphere can inspire creativity.'
        }
    },
    landing: {
        'READING': {
            zh: '乘客剛完成「讀書」任務。請提醒：可以休息一下眼睛，做個簡單的放鬆，搭配【國家文化特色】的放鬆方式。例如：日本的安靜可以幫助你放鬆眼睛；泰國的柔軟可以讓你的眼睛得到休息。讓乘客感覺完成了深度學習後，需要適當的放鬆。',
            en: 'The passenger just completed a "Reading" task. Remind them: rest your eyes, do some simple relaxation, combined with the country\'s cultural relaxation style. Make them feel that after deep learning, they need proper relaxation.'
        },
        'MEDITATION': {
            zh: '乘客剛完成「冥想」任務。請提醒：保持平靜，搭配【國家文化特色】的平靜氛圍。例如：日本的安靜可以延續你的平靜；泰國的柔軟可以讓你的心保持放鬆。',
            en: 'The passenger just completed a "Meditation" task. Remind them: maintain calm, combined with the country\'s cultural calm atmosphere.'
        },
        'REST': {
            zh: '乘客剛完成「休息」任務。請提醒：好好休息，搭配【國家文化特色】的休息氛圍。例如：日本的安靜可以幫助你深度休息；泰國的柔軟可以讓你的身心得到放鬆。',
            en: 'The passenger just completed a "Rest" task. Remind them: rest well, combined with the country\'s cultural rest atmosphere.'
        },
        'GAME': {
            zh: '乘客剛完成「遊戲」任務。請根據【目的地當地時間和天氣狀況】，提醒進入工作狀態或開始專注。例如：現在是紐約的早晨，是時候開始專注工作了；現在是日本的下午，可以開始專注下一個任務。搭配【國家文化特色】的轉換氛圍，幫助乘客從遊戲模式轉換到工作/專注模式。',
            en: 'The passenger just completed a "Game" task. Based on the destination\'s local time and weather, remind them to enter work mode or start focusing. Combine with the country\'s cultural transition atmosphere to help transition from gaming to work/focus mode.'
        },
        'WORK': {
            zh: '乘客剛完成「工作」任務。請提醒：可以放鬆一下，搭配【國家文化特色】的放鬆方式。例如：日本的安靜可以幫助你放鬆；泰國的柔軟可以讓你的身心得到休息。讓乘客感覺完成了工作後，需要適當的放鬆。',
            en: 'The passenger just completed a "Work" task. Remind them: relax a bit, combined with the country\'s cultural relaxation style. Make them feel that after work, they need proper relaxation.'
        },
        'CREATIVE': {
            zh: '乘客剛完成「創作」任務。請提醒：可以休息一下，讓創意沉澱，搭配【國家文化特色】的放鬆方式。例如：日本的安靜可以幫助你整理思緒；泰國的柔軟可以讓你的創意得到休息。讓乘客感覺完成了創作後，需要適當的放鬆和沉澱。',
            en: 'The passenger just completed a "Creative" task. Remind them: take a break, let creativity settle, combined with the country\'s cultural relaxation style. Make them feel that after creative work, they need proper rest and reflection.'
        }
    },
    approach: {
        'READING': {
            zh: '乘客正在進行「讀書」任務。請提醒：慢慢合上書本，讓眼睛休息一下，準備降落。可以提到：閱讀了這麼久，眼睛需要休息，準備好從深度學習中轉換。',
            en: 'The passenger is doing a "Reading" task. Remind them: slowly close the book, rest your eyes, prepare for landing. Mention: after reading for so long, your eyes need rest, prepare to transition from deep learning.'
        },
        'MEDITATION': {
            zh: '乘客正在進行「冥想」任務。請提醒：慢慢睜開眼睛，保持內心的平靜，準備降落。可以提到：保持剛才冥想的平靜感，準備好從內在狀態中轉換。',
            en: 'The passenger is doing a "Meditation" task. Remind them: slowly open your eyes, maintain inner calm, prepare for landing. Mention: keep the calm from meditation, prepare to transition from inner state.'
        },
        'REST': {
            zh: '乘客正在進行「休息」任務。請提醒：慢慢調整姿勢，準備從休息中醒來，準備降落。可以提到：休息得很好，現在慢慢醒來，準備好迎接新的開始。',
            en: 'The passenger is doing a "Rest" task. Remind them: slowly adjust your posture, prepare to wake from rest, prepare for landing. Mention: you\'ve rested well, now slowly wake up, prepare for a new beginning.'
        },
        'GAME': {
            zh: '乘客正在進行「遊戲」任務。請提醒：慢慢放下遊戲，準備從遊戲中轉換，準備降落。可以提到：遊戲時間結束了，慢慢從遊戲模式轉換，準備好進入下一個狀態。',
            en: 'The passenger is doing a "Game" task. Remind them: slowly put down the game, prepare to transition from gaming, prepare for landing. Mention: game time is over, slowly transition from game mode, prepare for the next state.'
        },
        'WORK': {
            zh: '乘客正在進行「工作」任務。請提醒：慢慢整理思緒，準備從工作中轉換，準備降落。可以提到：工作告一段落，慢慢整理思緒，準備好從工作模式轉換。',
            en: 'The passenger is doing a "Work" task. Remind them: slowly organize your thoughts, prepare to transition from work, prepare for landing. Mention: work is done for now, slowly organize your thoughts, prepare to transition from work mode.'
        },
        'CREATIVE': {
            zh: '乘客正在進行「創作」任務。請提醒：慢慢整理創意，準備從創作中轉換，準備降落。可以提到：創意已經記錄下來，慢慢整理思緒，準備好從創作模式轉換。',
            en: 'The passenger is doing a "Creative" task. Remind them: slowly organize your creativity, prepare to transition from creative work, prepare for landing. Mention: your creativity has been recorded, slowly organize your thoughts, prepare to transition from creative mode.'
        }
    }
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
            taskType, // 任務類型（新增）
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

        // 獲取任務類型指引
        const task = (taskType || 'REST').toUpperCase();
        const taskGuidance = TASK_GUIDANCE[announcementType]?.[task] || null;
        const taskGuidanceText = taskGuidance ? (isEnglish ? taskGuidance.en : taskGuidance.zh) : '';

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

        // 生成航班號碼
        const flightNumber = `FA${Math.floor(Math.random() * 9000) + 1000}`;

        // 生成季節性天氣描述（根據當前月份和目的地緯度）
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        let seasonalWeatherLine = '';
        let weatherTaskGuidance = '';

        // 根據月份判斷季節（北半球）
        let season = '';
        if (month >= 3 && month <= 5) {
            season = 'spring';
        } else if (month >= 6 && month <= 8) {
            season = 'summer';
        } else if (month >= 9 && month <= 11) {
            season = 'autumn';
        } else {
            season = 'winter';
        }

        // 根據任務類型生成天氣與任務的融合指引
        const taskWeatherMap = {
            'READING': {
                zh: '可以將天氣與閱讀氛圍結合，例如：細雨適合深度閱讀、陽光透過窗戶適合專注、微風帶來思考的節奏',
                en: 'Connect weather with reading atmosphere, e.g., light rain suits deep reading, sunlight through windows aids focus, gentle breeze brings thinking rhythm'
            },
            'MEDITATION': {
                zh: '可以將天氣與冥想狀態結合，例如：雲層帶來內在的寧靜、微風幫助呼吸節奏、陽光帶來溫暖的專注',
                en: 'Connect weather with meditation state, e.g., clouds bring inner calm, gentle breeze aids breathing rhythm, sunlight brings warm focus'
            },
            'REST': {
                zh: '可以將天氣與休息氛圍結合，例如：陰天適合深度休息、微風帶來放鬆、溫度適中讓人感到舒適',
                en: 'Connect weather with rest atmosphere, e.g., cloudy sky suits deep rest, gentle breeze brings relaxation, moderate temperature feels comfortable'
            },
            'WORK': {
                zh: '可以將天氣與工作效率結合，例如：晴朗天氣帶來清晰思路、微風保持清醒、適中的溫度有助專注',
                en: 'Connect weather with work efficiency, e.g., clear sky brings clear thinking, gentle breeze keeps alert, moderate temperature aids focus'
            },
            'GAME': {
                zh: '可以將天氣與遊戲心情結合，例如：多變的天氣像遊戲的節奏、陽光帶來活力、微風帶來輕鬆感',
                en: 'Connect weather with gaming mood, e.g., changing weather like game rhythm, sunlight brings energy, gentle breeze brings ease'
            },
            'CREATIVE': {
                zh: '可以將天氣與創作靈感結合，例如：多變的雲層激發想像、陽光帶來創意能量、微風帶來靈感的流動',
                en: 'Connect weather with creative inspiration, e.g., changing clouds spark imagination, sunlight brings creative energy, gentle breeze brings flow of ideas'
            }
        };

        const taskWeather = taskWeatherMap[task] || taskWeatherMap['REST'];
        weatherTaskGuidance = isEnglish ? taskWeather.en : taskWeather.zh;

        // 根據季節生成天氣描述（讓 OpenAI 根據目的地和季節生成，並與任務融合）
        if (isEnglish) {
            seasonalWeatherLine = `Generate creative weather description for ${city}, ${country} in ${season} that connects with the task type. ${weatherTaskGuidance}. Make it vivid and interesting, avoid repetitive words like "calm, calm" or "peaceful, peaceful". Use varied vocabulary and create a sense of atmosphere.`;
        } else {
            seasonalWeatherLine = `請根據【${city}】在${season === 'spring' ? '春季' : season === 'summer' ? '夏季' : season === 'autumn' ? '秋季' : '冬季'}的實際氣候，生成有創意的天氣描述，並與任務類型融合。${weatherTaskGuidance}。要生動有趣，避免重複詞彙（例如：不要一直說「平靜平靜」或「安靜安靜」這種蠢話）。用多變的詞彙創造氛圍感。`;
        }

        if (announcementType === 'approach') {
            // 準備降落預告廣播（降落前5分鐘）
            if (isEnglish) {
                prompt = `You are a professional male captain of Focus Airlines. Generate a pre-landing approach announcement that will be played 5 minutes before landing. This is a gentle reminder to prepare for landing.

Style: 50% aviation professionalism (steady, authoritative, reliable) + 25% warm guidance (professional, stable, with warmth, but not overly sentimental) + 25% inner narrative (depth, imagery).

Length: ~80-100 words. Natural spoken English.

Structure:
1. Start with: "Ladies and gentlemen, this is your captain speaking. We will be landing in approximately 5 minutes at 【${city}】."

2. Weather description (integrate with task type): Describe the current weather in ${city} based on its actual climate, and cleverly integrate it with the completed task: "${taskGuidanceText || 'current task'}". ${weatherTaskGuidance}. Make it vivid and interesting, avoid repetitive words.

3. Task-specific warm reminder:
   ${taskGuidanceText || 'Give a warm reminder based on the task type, helping passengers prepare for landing.'}

4. Closing: "Please prepare for landing. Thank you."

Requirements:
- Must reflect the destination's actual climate characteristics
- Must naturally integrate with the task type
- Use varied vocabulary, avoid repetition
- Be vivid, interesting, and create a sense of atmosphere
- Warm but professional, like a caring male captain

${greetingHint}`;
            } else {
                prompt = `你是一位經驗豐富的男性機長，是 Focus Airlines 的專業機長。請生成一段「準備降落預告廣播」，這會在降落前5分鐘播放，提醒乘客準備降落。

聲音特質：沉穩、低調、有磁性，像一位經驗豐富的男性機長
說話方式：簡潔有力、不拖泥帶水，但保持溫暖
語速：適中偏慢，給人可靠、專業的感覺

語氣 = 50% 專業航空（沉穩、權威、可靠） + 25% 溫暖導引（專業、穩重、有溫度，但不油膩） + 25% 內在敘事（有深度、有畫面感）

篇幅：約 80-100 字。口語化、自然、沉穩。

結構：
1. 開場：「各位乘客，我是機長。我們將在約5分鐘後降落在【${city}】。」

2. 天氣描述（與任務融合）：請描述【${city}】目前的天氣狀況，並與剛完成的任務自然融合。${weatherTaskGuidance}。要生動有趣，避免重複詞彙（例如：不要一直說「平靜平靜」或「安靜安靜」這種蠢話）。用多變的詞彙創造氛圍感。

3. 任務相關的溫馨提醒：
   ${taskGuidanceText || '根據任務類型給予溫馨提醒，幫助乘客準備降落。'}
   
   例如：
   - 如果是讀書任務：「請慢慢合上書本，讓眼睛休息一下，準備降落。」
   - 如果是冥想任務：「請慢慢睜開眼睛，保持內心的平靜，準備降落。」
   - 如果是休息任務：「請慢慢調整姿勢，準備從休息中醒來，準備降落。」
   - 如果是工作任務：「請慢慢整理思緒，準備從工作中轉換，準備降落。」
   - 如果是遊戲任務：「請慢慢放下遊戲，準備從遊戲中轉換，準備降落。」
   - 如果是創作任務：「請慢慢整理創意，準備從創作中轉換，準備降落。」

4. 結尾：「請準備降落，謝謝。」

要求：
- 必須真實反映目的地的氣候特色
- 必須與任務類型自然融合
- 用詞多變，避免重複
- 生動有趣，有畫面感
- 溫暖但專業，像一位關心的男性機長

${greetingHint}`;
            }
        } else if (announcementType === 'boarding') {
            // 登機廣播 - 強化機長風格版本
            if (isEnglish) {
                prompt = `You are a professional airline captain of Focus Airlines. Generate a boarding announcement with a strong, steady captain's presence. 

Follow the exact structure below. Length ~200–230 words. Natural spoken English. 

Tone = 40% aviation professionalism + 30% gentle guidance + 30% inner reflective narrative.

DO NOT mention: beaches, food, landmarks, shopping, tourist activities.

====================

STRUCTURE & REQUIREMENTS

====================

[OPENING — PRO]

1. Start with: "Good morning/afternoon/evening, this is your captain speaking. Welcome aboard Focus Airlines flight ${flightNumber}..."

2. Include aviation terminology:

   - Flight number: ${flightNumber}

   - Route: ${currentLocation || 'Taipei'} → ${city} (${country})

   - Estimated flight time: ${flightTimeDesc}

   - Initial climb, cruise altitude, takeoff procedures

3. Include ONE line requesting passengers to switch devices to airplane mode.

   *Tone: part safety, part symbolic transition into focus.*

   Example vibe: "Please switch your devices to airplane mode, allowing this journey to begin without distractions."

4. Report destination local time:

   ${localTimeInfo ? `Local time at ${city} will be approximately ${localTimeInfo.localTimeString} (${localTimeInfo.timeContext}).` : 'Please note the local time at destination.'}

5. Destination weather (must integrate with task type, be vivid and interesting):

   Describe the weather in ${city} based on its actual climate and current season, and cleverly integrate it with the current task: "${taskGuidanceText || 'current task'}".
   
   Examples:
   - If reading task + light rain: "It's drizzling in ${city} right now, perfect weather for deep reading. The sound of rain acts like natural white noise, helping you enter a focused state."
   - If meditation task + cloudy: "The sky over ${city} is covered with clouds, this gentle atmosphere is perfect for meditation. The flow of clouds is like the settling of thoughts."
   - If work task + clear: "${city} has clear weather now, the clear sky brings clear thinking, perfect for focused work."
   
   Requirements:
   - Must reflect the destination's actual climate characteristics
   - Must naturally integrate with the task type
   - Use varied vocabulary, avoid repetition (don't keep saying "calm, calm" or "peaceful, peaceful")
   - Be vivid, interesting, and create a sense of atmosphere
   - Keep it to 1-2 sentences

[GUIDE — CULTURAL MOOD]

6. Describe the **emotional atmosphere** of ${country} (NOT tourist places):

   Use: "${mentalState.culturalMood}"

[INNER NARRATIVE — EMOTION → BODY → TASK]

7. Explain the symbolic meaning of the destination:

   "${mentalState.stateEn}" — ${mentalState.description}

8. Task guidance (skip emotion mapping and body grounding - they are too lengthy and unnecessary):

   ${taskGuidanceText || 'Give one clear action the passenger will do during the flight.'}

   Include:

   - One first-minute micro action

   - One simple focus rule

   - One "if distracted" recovery line

[CLOSING]

11. End with: "Thank you for choosing Focus Airlines. We wish you a pleasant journey."

====================

OUTPUT STYLE

====================

- Use soft pacing cues: [pause 0.3s], [slow], [gentle]

- Warm but not overly sentimental

- Realistic captain phrasing

${greetingHint}`;
            } else {
                prompt = `你是 Focus Airlines 的專業機長。請生成具有強烈機長風格的登機廣播。

語氣 = 40% 專業航空 + 30% 溫柔導引 + 30% 內在敘事。

篇幅：約 200–230 字。口語化、自然、沉穩。

禁止提到：海灘、美食、景點、購物、觀光活動。

====================

結構與必備內容

====================

【PRO 專業開場】

1. 開場必須以：

「各位乘客大家好，我是本次航班的機長，歡迎搭乘 Focus Airlines 航班 ${flightNumber}…」 開始。

2. 使用航空專業語句：

   - 航班：${flightNumber}

   - 航線：${currentLocation || '台北'} → ${city}（${country}）

   - 飛行時間：${flightTimeDesc}

   - 初始爬升、高度、起飛程序、安全提醒

3. 必須加入一句「請將手機調為飛航模式」，語氣需同時具有：

   - 航空安全程序

   - 進入專注狀態的象徵儀式

   例如：

   「也請將您的手機切換至飛航模式，像是把外界的吵雜暫時關上，讓自己全心投入這段旅程。」

4. 目的地當地時間：

   ${localTimeInfo ? `抵達【${city}】時的當地時間約為 ${localTimeInfo.localTimeString}（${localTimeInfo.timeContext}）。` : '請留意目的地的當地時間。'}

5. 目的地天氣（必須與任務類型融合，生動有趣）：

   請根據【${city}】的實際氣候和當前季節，描述天氣狀況，並巧妙地與「${taskGuidance ? (isEnglish ? taskGuidance.en : taskGuidance.zh) : '當前任務'}」結合。
   
   例如：
   - 如果是讀書任務 + 細雨天氣：「目前${city}正下著細雨，這種天氣最適合深度閱讀，雨聲像是自然的白噪音，幫助你進入專注狀態。」
   - 如果是冥想任務 + 多雲天氣：「${city}的天空佈滿雲層，這種柔和的氛圍很適合冥想，雲的流動就像思緒的沉澱。」
   - 如果是工作任務 + 晴朗天氣：「${city}現在是晴朗的天氣，清晰的天空帶來清晰的思路，很適合專注工作。」
   
   要求：
   - 必須真實反映目的地的氣候特色
   - 必須與任務類型自然融合
   - 用詞多變，避免重複（不要一直說「平靜」「安靜」這種詞）
   - 生動有趣，有畫面感
   - 控制在1-2句話

【GUIDE 導引段】

6. 描述該國家的「情緒氛圍」：

   「${mentalState.culturalMood}」 但不可提及任何旅遊地點。

【INNER 內在敘事：情緒 → 身體 → 任務】

7. 說明目的地象徵的內在狀態：

   「${mentalState.state}」— ${mentalState.description}

8. 任務引導（跳過情緒映射和身體校準這兩個部分，它們太冗長且沒有必要）：

   ${taskGuidanceText || '給一個明確在飛行期間要完成的任務。'}

   需包含：

   - 第一分鐘微行動

   - 一條專注規則

   - 分心時的回神語

【結尾】

11. 結尾統一：

「感謝您選擇 Focus Airlines，祝您旅途愉快。」

====================

輸出風格

====================

- 加入口語節奏：[pause 0.3s]、[slow]

- 像真實機長廣播，不油、不雞湯

- 穩定、溫暖、有畫面感

${greetingHint}`;
            }
        } else if (announcementType === 'landing') {
            // 降落廣播 - 強化機長風格版本
            // 注意：如果已經播放過準備降落預告（approach），這裡要避免重複內容
            const timeDesc = timerDuration ? '飛行完成' : `當地時間：${wakeTime || '08:00'}`;

            // 降落廣播應該更簡潔，重點在歡迎和總結，避免與準備降落預告重複
            const approachAvoidance = isEnglish
                ? 'IMPORTANT: A pre-landing announcement was already played 5 minutes ago. This landing announcement should be DIFFERENT and FOCUSED on:\n- Welcoming passengers to the destination\n- Brief summary of the journey\n- Final encouragement based on the completed task\n- DO NOT repeat weather descriptions or preparation reminders from the pre-landing announcement\n- Keep it concise (60-80 words), more celebratory and welcoming'
                : '重要：5分鐘前已經播放過準備降落預告。這次降落廣播應該不同，重點在：\n- 歡迎乘客抵達目的地\n- 簡短總結旅程\n- 根據完成的任務給予最後鼓勵\n- 不要重複準備降落預告中的天氣描述或準備提醒\n- 保持簡潔（60-80字），更偏向慶祝和歡迎';

            // 如果是 GAME 任務，需要特別處理當地時間資訊
            let gameTimeGuidance = '';
            if (task === 'GAME' && localTimeInfo) {
                const { localTimeString, timeContext, timeOfDay } = localTimeInfo;
                gameTimeGuidance = `\n\n特別注意（GAME 任務）：\n- 目的地當地時間：${timeContext} ${localTimeString}\n- 請根據這個時間和時段（${timeOfDay}），提醒乘客進入工作狀態或開始專注\n- 例如：如果是早晨，提醒「是時候開始專注工作了」；如果是下午，提醒「可以開始專注下一個任務」\n- 搭配【國家文化特色】的轉換氛圍，幫助乘客從遊戲模式轉換到工作/專注模式`;
            }

            // 降落廣播的當地時間和天氣資訊
            const landingTimeInfo = localTimeInfo ?
                (isEnglish ?
                    `Local time at ${city} is now ${localTimeInfo.localTimeString} (${localTimeInfo.timeContext}).` :
                    `目前【${city}】的當地時間是 ${localTimeInfo.localTimeString}（${localTimeInfo.timeContext}）。`) :
                '';

            // 降落廣播的天氣描述（與任務完成後狀態融合）
            const landingWeatherTaskGuidance = {
                'READING': {
                    zh: '可以將天氣與閱讀後的放鬆結合，例如：細雨後的清新適合眼睛休息、陽光帶來完成感、微風帶來思緒的整理',
                    en: 'Connect weather with post-reading relaxation, e.g., freshness after rain suits eye rest, sunlight brings sense of completion, gentle breeze helps organize thoughts'
                },
                'MEDITATION': {
                    zh: '可以將天氣與冥想後的平靜結合，例如：雲層帶來持續的寧靜、微風延續呼吸的節奏、陽光帶來內在的溫暖',
                    en: 'Connect weather with post-meditation calm, e.g., clouds bring continued peace, gentle breeze extends breathing rhythm, sunlight brings inner warmth'
                },
                'REST': {
                    zh: '可以將天氣與休息後的恢復結合，例如：陰天延續放鬆感、微風帶來身體的舒緩、適中溫度讓人感到恢復',
                    en: 'Connect weather with post-rest recovery, e.g., cloudy sky extends relaxation, gentle breeze brings physical ease, moderate temperature feels restorative'
                },
                'WORK': {
                    zh: '可以將天氣與工作完成後的轉換結合，例如：晴朗天氣帶來成就感、微風幫助從專注中放鬆、溫度變化提醒狀態轉換',
                    en: 'Connect weather with post-work transition, e.g., clear sky brings sense of achievement, gentle breeze helps relax from focus, temperature change reminds state transition'
                },
                'GAME': {
                    zh: '可以將天氣與遊戲後的狀態轉換結合，例如：多變天氣提醒進入工作模式、陽光帶來專注的能量、微風幫助從遊戲轉換到工作',
                    en: 'Connect weather with post-game state transition, e.g., changing weather reminds entering work mode, sunlight brings focus energy, gentle breeze helps transition from game to work'
                },
                'CREATIVE': {
                    zh: '可以將天氣與創作完成後的沉澱結合，例如：多變雲層像創意的延續、陽光帶來靈感的保留、微風幫助創意沉澱',
                    en: 'Connect weather with post-creative settling, e.g., changing clouds like continuation of creativity, sunlight preserves inspiration, gentle breeze helps creative settling'
                }
            };

            const landingWeatherGuidance = landingWeatherTaskGuidance[task] || landingWeatherTaskGuidance['REST'];
            const landingWeatherPrompt = isEnglish ?
                `Describe the current weather in ${city} creatively, integrating it with the completed task. ${landingWeatherGuidance.en}. Make it vivid and interesting, avoid repetitive words like "calm, calm" or "peaceful, peaceful". Use varied vocabulary and create a sense of atmosphere.` :
                `請描述【${city}】目前的天氣狀況，並與剛完成的任務自然融合。${landingWeatherGuidance.zh}。要生動有趣，避免重複詞彙（例如：不要一直說「平靜平靜」或「安靜安靜」這種蠢話）。用多變的詞彙創造氛圍感。`;

            const landingWeatherInfo = landingWeatherPrompt;

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
${taskGuidanceText ? `- 任務完成後指引：${taskGuidanceText}` : ''}${gameTimeGuidance}
- 結尾要讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」
- 語氣：自然、口語、溫暖、積極，20% 機長 + 40% 溫柔導引 + 40% 內在敘事`;

            if (punctuality && punctuality.status) {
                // 根據準時性狀態生成不同的語音
                switch (punctuality.status) {
                    case 'PERFECT': // 完美準時（±1分鐘）
                        prompt = `你是 Focus Airlines 的專業機長。請生成一個「完美準時降落」的廣播，具有強烈的機長風格。

${approachAvoidance}

語氣 = 40% 專業航空 + 30% 溫柔導引 + 30% 內在敘事。

篇幅：約 150–180 字（如果已播放準備降落預告，則更簡潔）。口語化、自然、沉穩。

====================

結構與必備內容

====================

【PRO 專業開場】

1. 開場：「各位乘客，我是機長。本次 Focus Airlines 航班 ${flightNumber} 已順利準時降落於【${city}】。」

2. 報告當地時間和天氣：

   ${landingTimeInfo}
   
   ${landingWeatherInfo}

3. 使用航空專業語句：降落程序、跑道、地面溫度等

【GUIDE 導引段】

4. 描述該國家的「情緒氛圍」：

   「${mentalState.culturalMood}」 但不可提及任何旅遊地點。

【INNER 內在敘事】

5. 說明目的地象徵的內在狀態：

   「${mentalState.state}」— ${mentalState.description}

6. 任務完成後指引：

   ${taskGuidanceText || '提醒乘客已完成飛行任務，可以放鬆或進入下一個階段。'}

【結尾】

7. 結尾：「感謝您選擇 Focus Airlines，祝您在【${city}】的旅程愉快。」

====================

輸出風格

====================

- 加入口語節奏：[pause 0.3s]、[slow]
- 像真實機長廣播，專業、溫暖、有畫面感
- 禁止提到：海灘、美食、景點、購物、觀光活動

${greetingHint}`;

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
${isMidwayLanding ? '4. 天氣描述（與任務融合）：' : '3. 天氣描述（與任務融合）：'}請描述【${city}】目前的天氣狀況，並與剛完成的任務自然融合。${landingWeatherGuidance.zh}。要生動有趣，避免重複詞彙（例如：不要一直說「平靜平靜」或「安靜安靜」這種蠢話）。用多變的詞彙創造氛圍感。
${isMidwayLanding ? '5. 安慰語句：輕鬆、溫暖地說明情況' : '4. 安慰語句：輕鬆、溫暖地說明情況'}
${isMidwayLanding ? '6. 內在狀態引導：' : '5. 內在狀態引導：'}${innerStatePrompt}
${isMidwayLanding ? '7. 結尾：' : '6. 結尾：'}讓乘客感覺即使提早降落，也獲得了內在收穫

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

                        // 如果是 GAME 任務，需要特別處理當地時間資訊
                        let finalGameTimeGuidance = '';
                        if (task === 'GAME' && localTimeInfo) {
                            const { localTimeString, timeContext, timeOfDay } = localTimeInfo;
                            finalGameTimeGuidance = `\n\n特別注意（GAME 任務）：\n- 目的地當地時間：${timeContext} ${localTimeString}\n- 請根據這個時間和時段（${timeOfDay}），提醒乘客進入工作狀態或開始專注\n- 例如：如果是早晨，提醒「是時候開始專注工作了」；如果是下午，提醒「可以開始專注下一個任務」\n- 搭配【國家文化特色】的轉換氛圍，幫助乘客從遊戲模式轉換到工作/專注模式`;
                        }

                        const finalInnerStatePrompt = `內在狀態主題：
目的地【${finalCity}, ${country}】象徵「${finalMentalState.state}」。
${finalMentalState.description}

文化情緒特色指引：
- 可以描述這個國家的「${finalMentalState.culturalMood}」（文化情緒特色）
- 這是關於「情緒質感」和「文化氛圍」，不是具體的景點、美食、活動
- 禁止提到：海灘很美、東西很好吃、景點很棒等會造成「沒去過」失落感的內容
- 可以提到：國家的情緒質感、文化氛圍、內在氣氛，讓乘客自然「降落」到那個情緒
${taskGuidanceText ? `- 任務完成後指引：${taskGuidanceText}` : ''}${finalGameTimeGuidance}
- 結尾要讓乘客感覺「抵達了自己」同時也「抵達了【${finalCity}】的情緒氛圍」
- 語氣：自然、口語、溫暖、積極，20% 機長 + 40% 溫柔導引 + 40% 內在敘事`;

                        const destinationNote = hasDiversion
                            ? `3. 目的地說明：「原定降落於【${originalCity}】，但因時間超過，我們轉降至【${divertedCity}】。」`
                            : `3. 目的地說明：「本次航班延誤，但仍降落在【${city}】。」`;

                        prompt = `你是 Focus Airlines 的機長。請生成一個「誤點降落」的廣播，風格如下：

${approachAvoidance}

- 20% 機長（使用航空語言）
- 40% 溫柔導引（幽默、帶歉意、溫暖）
- 40% 內在敘事（專注於內在狀態）

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 帶歉意的宣告：「抱歉，本次航班延誤。」
${destinationNote}
3. 天氣描述（與任務融合）：請描述【${finalCity}】目前的天氣狀況，並與剛完成的任務自然融合。${landingWeatherTaskGuidance[task]?.zh || landingWeatherTaskGuidance['REST'].zh}。要生動有趣，避免重複詞彙（例如：不要一直說「平靜平靜」或「安靜安靜」這種蠢話）。用多變的詞彙創造氛圍感。
4. 鼓勵語句：溫暖、積極地鼓勵乘客
5. 內在狀態引導：${finalInnerStatePrompt}
6. 結尾：讓乘客感覺即使延誤，也抵達了自己和目的地

重要原則：
- 可以描述國家的「文化情緒特色」
- 禁止提到具體景點、美食、觀光活動（會造成失落感）
- 讓國家特色變成心理象徵，聽起來舒服、有畫面、但不會空虛

請用繁體中文，控制在150字以內。語氣：自然、口語、溫暖、積極。`;

                    default: // ON_TIME（一般準時）
                        prompt = `你是 Focus Airlines 的機長。請生成一個「準時降落」的廣播，風格如下：

${approachAvoidance}

- 20% 機長（使用航空語言）
- 40% 溫柔導引（專業、溫和、友善）
- 40% 內在敘事（專注於內在狀態）

必須包含：
1. 開頭：當地語言問候「${greeting || 'Hello'}」並翻譯成中文
2. 降落宣告：「本次航班順利準時降落於【${city}】。」
3. 天氣描述（與任務融合）：請描述【${city}】目前的天氣狀況，並與剛完成的任務自然融合。${landingWeatherGuidance.zh}。要生動有趣，避免重複詞彙（例如：不要一直說「平靜平靜」或「安靜安靜」這種蠢話）。用多變的詞彙創造氛圍感。
4. 內在狀態引導：${innerStatePrompt}
5. 感謝詞：感謝乘客完成這段旅程
6. 結尾：讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」

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
4. 天氣描述（與任務融合）：請描述【${city}】目前的天氣狀況，並與剛完成的任務自然融合。${landingWeatherGuidance.zh}。要生動有趣，避免重複詞彙（例如：不要一直說「平靜平靜」或「安靜安靜」這種蠢話）。用多變的詞彙創造氛圍感。
5. 內在狀態引導：${innerStatePrompt}
6. ${timerDuration ? '恭喜完成飛行任務' : '提醒乘客確認降落'}
7. 結尾：讓乘客感覺「抵達了自己」同時也「抵達了【${city}】的情緒氛圍」

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
            max_tokens: 400 // 增加到 400 tokens 以支持 200-230 字的內容
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


/**
 * 🗺️ Wake-Up Map 遊戲化系統
 * 每週旅程模式 - 7天為一個週期
 */

class WakeUpMapGame {
    constructor() {
        this.gameState = {
            currentWeek: 1,
            currentDay: 1,
            selectedDestination: null,
            destinations: [], // 將由飛行計時器系統動態生成
            currentTicket: null,
            gameStarted: false,
            // 飛行計時器相關狀態（從睡眠航班改為計時器模式）
            flightTimerMode: true,
            timerDuration: 30, // 計時長度（分鐘），最短30分鐘
            timerStartTime: null, // 計時開始時間
            timerEndTime: null, // 計時結束時間
            currentLocation: null,
            actionButtonState: 'hidden', // hidden, boarding, landing
            flightCompleted: false,
            isLanding: false,
            // 任務類型：READING / EXERCISE / MEDITATION / REST / WORK
            taskType: 'REST',
            // 介面語言：'zh-TW' 或 'en'
            language: 'zh-TW'
        };

        this.usedCitiesFallback = false;
        this.citiesDataSource = 'unknown';

        // 防重複點擊標誌
        this.isProcessingAction = false;

        this.init();
    }

    // 將分鐘數轉成人類可讀的文字（依目前語言）
    formatDuration(minutes, langOverride) {
        const total = Math.max(1, Math.round(minutes || 0));
        const hours = Math.floor(total / 60);
        const mins = total % 60;
        const lang = langOverride || this.gameState.language || 'zh-TW';

        if (lang === 'en') {
            const hPart = hours > 0 ? `${hours} hr${hours > 1 ? 's' : ''}` : '';
            const mPart = mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : '';
            return [hPart, mPart].filter(Boolean).join(' ');
        } else {
            const hPart = hours > 0 ? `${hours} 小時` : '';
            const mPart = mins > 0 ? `${mins} 分鐘` : '';
            return [hPart, mPart].filter(Boolean).join('');
        }
    }

    // 設定並套用語言
    setLanguage(lang) {
        const supported = ['zh-TW', 'en'];
        const target = supported.includes(lang) ? lang : 'zh-TW';
        this.gameState.language = target;
        this.saveGameState();
        this.applyLanguage(target);
        console.log('🌐 語言已切換為:', target);
    }

    // 根據當前語言更新 UI 文字
    applyLanguage(lang) {
        const packs = {
            'zh-TW': {
                langCode: '中',
                buyText: '規劃旅程',
                buySub: '選擇任務與目的地',
                startText: '開始旅程',
                startSub: '準備啟程',
                flightInfoTitle: '飛行資訊',
                totalFlights: '總飛行次數',
                totalDistance: '總飛行距離',
                visitedCities: '訪問城市',
                timerTitle: '⏱️ 選擇計時長度',
                confirmTimer: '確認計時長度',
                minutesLabel: '分鐘',
                taskTitle: '🎯 選擇任務',
                taskSectionTitle: 'TASK 任務類型',
                confirmTask: '確認任務',
                destinationTitle: '✈️ 選擇目的地',
                destinationHint: (m) => `根據您選擇的 <strong id="selectedTimerDisplay">${m}</strong> 分鐘計時，以下是您可以飛到的目的地：`,
                statusPreparing: '準備起飛',
                statusTakingOff: '起飛中',
                statusCruising: '巡航中',
                statusApproach: '準備降落',
                statusLanding: '降落中',
                statusLanded: '已降落'
            },
            'en': {
                langCode: 'EN',
                buyText: 'PLAN JOURNEY',
                buySub: 'Choose task & destination',
                startText: 'START JOURNEY',
                startSub: 'Get ready to fly',
                flightInfoTitle: 'FLIGHT STATUS',
                totalFlights: 'Total flights',
                totalDistance: 'Total distance',
                visitedCities: 'Visited cities',
                timerTitle: '⏱️ Set Focus Time',
                confirmTimer: 'CONFIRM TIMER',
                minutesLabel: 'min',
                taskTitle: '🎯 Choose Task',
                taskSectionTitle: 'TASK TYPE',
                confirmTask: 'CONFIRM TASK',
                destinationTitle: '✈️ Choose Destination',
                destinationHint: (m) => `With <strong id="selectedTimerDisplay">${m}</strong> minutes, here are the places you can fly to:`,
                statusPreparing: 'Ready for take-off',
                statusTakingOff: 'Taking off',
                statusCruising: 'Cruising',
                statusApproach: 'Approach',
                statusLanding: 'Landing',
                statusLanded: 'Landed'
            }
        };

        const dict = packs[lang] || packs['zh-TW'];

        // 更新語系代碼顯示
        const langCodeEl = document.getElementById('langCode');
        if (langCodeEl) langCodeEl.textContent = dict.langCode;

        // 更新首頁兩顆按鈕文字
        const buyBtn = document.getElementById('buyTicketBtn');
        if (buyBtn) {
            const t = buyBtn.querySelector('.button-text');
            const s = buyBtn.querySelector('.button-subtitle');
            if (t) t.textContent = dict.buyText;
            if (s) s.textContent = dict.buySub;
        }

        const startBtn = document.getElementById('beginJourneyBtn');
        if (startBtn) {
            const t = startBtn.querySelector('.button-text');
            const s = startBtn.querySelector('.button-subtitle');
            if (t) t.textContent = dict.startText;
            if (s) s.textContent = dict.startSub;
        }

        // 更新右側飛行資訊標題與欄位
        const infoTitle = document.querySelector('.flight-info-panel .info-title');
        if (infoTitle) infoTitle.textContent = dict.flightInfoTitle;

        const infoLabels = document.querySelectorAll('.flight-info-panel .info-label');
        if (infoLabels[0]) infoLabels[0].textContent = dict.totalFlights;
        if (infoLabels[1]) infoLabels[1].textContent = dict.totalDistance;
        if (infoLabels[2]) infoLabels[2].textContent = dict.visitedCities;

        // 更新「當前位置」標題與副標
        const currentCityTitle = document.getElementById('currentCityName');
        const currentCitySubtitle = document.querySelector('.location-subtitle');
        const originName = this.gameState.currentLocation?.name || '台北';
        const originCountry = this.gameState.currentLocation?.country || 'Taiwan';
        if (currentCityTitle) {
            currentCityTitle.textContent = (lang === 'en')
                ? `Current location: ${originName}`
                : `當前位置：${originName}`;
        }
        if (currentCitySubtitle) {
            currentCitySubtitle.textContent = (lang === 'en')
                ? `${originName}, ${originCountry} 🇹🇼`
                : `${originName}, ${originCountry} 🇹🇼`;
        }

        // 計時視窗文字
        const timerTitle = document.querySelector('#timerModal .modal-title');
        if (timerTitle) timerTitle.textContent = dict.timerTitle;
        const confirmTimerBtn = document.getElementById('confirmTimerBtn');
        if (confirmTimerBtn) confirmTimerBtn.textContent = dict.confirmTimer;
        const timerLabel = document.querySelector('#timerModal .timer-label');
        if (timerLabel) timerLabel.textContent = dict.minutesLabel;

        // Task 視窗文字
        const taskTitle = document.querySelector('#taskModal .modal-title');
        if (taskTitle) taskTitle.textContent = dict.taskTitle;
        const taskSectionTitle = document.querySelector('#taskModal .task-title');
        if (taskSectionTitle) taskSectionTitle.textContent = dict.taskSectionTitle;
        const confirmTaskBtn = document.getElementById('confirmTaskBtn');
        if (confirmTaskBtn) confirmTaskBtn.textContent = dict.confirmTask;
        document.querySelectorAll('#taskModal .task-option').forEach(btn => {
            const key = btn.dataset.task;
            if (!key) return;
            const mapZh = { READING: '📚 讀書', EXERCISE: '💪 運動', MEDITATION: '🧘 冥想', REST: '😴 休息', WORK: '💻 工作', GAME: '🎮 遊戲' };
            const mapEn = { READING: '📚 READ', EXERCISE: '💪 WORKOUT', MEDITATION: '🧘 MEDITATE', REST: '😴 REST', WORK: '💻 WORK', GAME: '🎮 GAME' };
            const tMap = (lang === 'en' ? mapEn : mapZh);
            if (tMap[key]) btn.textContent = tMap[key];
        });

        // 目的地選擇視窗文字
        const destTitle = document.querySelector('#destinationModal .modal-title');
        if (destTitle) destTitle.textContent = dict.destinationTitle;
        const hintEl = document.querySelector('.destination-hint');
        const timerDisplay = document.getElementById('selectedTimerDisplay');
        const minutes = timerDisplay ? timerDisplay.textContent : (this.gameState.timerDuration || 30);
        if (hintEl && typeof dict.destinationHint === 'function') {
            hintEl.innerHTML = dict.destinationHint(minutes);
        }

        // 更新 HTML 的 lang 屬性，方便未來擴充
        if (document.documentElement) {
            document.documentElement.lang = (lang === 'en' ? 'en' : 'zh-Hant');
        }
    }

    // 載入大型城市資料（根目錄 cities_data.json），快取於記憶體
    async loadCitiesData() {
        if (this.citiesData && Array.isArray(this.citiesData) && this.citiesData.length) return this.citiesData;

        const fallbackCities = [
            { id: 'Tokyo_JP', name: 'Tokyo', country: '日本', countryCode: 'JP', latitude: 35.6762, longitude: 139.6503, population: 13960000, isCapital: true },
            { id: 'Osaka_JP', name: 'Osaka', country: '日本', countryCode: 'JP', latitude: 34.6937, longitude: 135.5023, population: 2700000, isCapital: false },
            { id: 'Seoul_KR', name: 'Seoul', country: '韓國', countryCode: 'KR', latitude: 37.5665, longitude: 126.9780, population: 9776000, isCapital: true },
            { id: 'Busan_KR', name: 'Busan', country: '韓國', countryCode: 'KR', latitude: 35.1796, longitude: 129.0756, population: 3414000, isCapital: false },
            { id: 'HongKong_HK', name: 'Hong Kong', country: '香港', countryCode: 'HK', latitude: 22.3193, longitude: 114.1694, population: 7451000, isCapital: false },
            { id: 'Macau_MO', name: 'Macau', country: '澳門', countryCode: 'MO', latitude: 22.1987, longitude: 113.5439, population: 700000, isCapital: false },
            { id: 'Singapore_SG', name: 'Singapore', country: '新加坡', countryCode: 'SG', latitude: 1.3521, longitude: 103.8198, population: 5700000, isCapital: true },
            { id: 'Bangkok_TH', name: 'Bangkok', country: '泰國', countryCode: 'TH', latitude: 13.7563, longitude: 100.5018, population: 10539000, isCapital: true },
            { id: 'ChiangMai_TH', name: 'Chiang Mai', country: '泰國', countryCode: 'TH', latitude: 18.7061, longitude: 98.9817, population: 127200, isCapital: false },
            { id: 'Manila_PH', name: 'Manila', country: '菲律賓', countryCode: 'PH', latitude: 14.5995, longitude: 120.9842, population: 1780000, isCapital: true },
            { id: 'HoChiMinh_VN', name: 'Ho Chi Minh City', country: '越南', countryCode: 'VN', latitude: 10.8231, longitude: 106.6297, population: 9000000, isCapital: false },
            { id: 'Hanoi_VN', name: 'Hanoi', country: '越南', countryCode: 'VN', latitude: 21.0278, longitude: 105.8342, population: 8000000, isCapital: true },
            { id: 'KualaLumpur_MY', name: 'Kuala Lumpur', country: '馬來西亞', countryCode: 'MY', latitude: 3.1390, longitude: 101.6869, population: 1800000, isCapital: true },
            { id: 'Jakarta_ID', name: 'Jakarta', country: '印尼', countryCode: 'ID', latitude: -6.2088, longitude: 106.8456, population: 10562000, isCapital: true },
            { id: 'Bali_ID', name: 'Denpasar', country: '印尼', countryCode: 'ID', latitude: -8.6705, longitude: 115.2126, population: 914300, isCapital: false },
            { id: 'Shanghai_CN', name: 'Shanghai', country: '中國', countryCode: 'CN', latitude: 31.2304, longitude: 121.4737, population: 24800000, isCapital: false },
            { id: 'Beijing_CN', name: 'Beijing', country: '中國', countryCode: 'CN', latitude: 39.9042, longitude: 116.4074, population: 21540000, isCapital: true },
            { id: 'Guangzhou_CN', name: 'Guangzhou', country: '中國', countryCode: 'CN', latitude: 23.1291, longitude: 113.2644, population: 15000000, isCapital: false },
            { id: 'Taipei_TW', name: 'New Taipei', country: '台灣', countryCode: 'TW', latitude: 25.0169, longitude: 121.4628, population: 4010000, isCapital: false }
        ];

        const urlCandidates = [];
        if (typeof window !== 'undefined') {
            const origin = window.location ? window.location.origin : '';
            // 優先使用 API 端點（更可靠）
            urlCandidates.push('/api/cities-data');
            if (origin) {
                urlCandidates.push(`${origin.replace(/\/$/, '')}/api/cities-data`);
            }
            // 備用：直接訪問 JSON 檔案
            urlCandidates.push('cities_data.json');
            urlCandidates.push('/cities_data.json');
            if (origin) {
                urlCandidates.push(`${origin.replace(/\/$/, '')}/cities_data.json`);
            }
        } else {
            urlCandidates.push('/api/cities-data');
            urlCandidates.push('/cities_data.json');
        }

        for (const url of [...new Set(urlCandidates)]) {
            try {
                console.log(`🔄 嘗試載入城市資料: ${url}`);

                // 使用 AbortController 設定超時（60秒）
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000);

                const res = await fetch(url, {
                    cache: 'no-store',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!res.ok) {
                    console.warn(`cities_data.json 載入失敗 (HTTP ${res.status})，來源: ${url}`);
                    continue;
                }

                // 檢查 Content-Type
                const contentType = res.headers.get('content-type');
                if (contentType && !contentType.includes('application/json')) {
                    console.warn(`cities_data.json 不是 JSON 格式 (${contentType})，來源: ${url}`);
                    continue;
                }

                console.log(`📥 開始解析 JSON 資料...`);
                const json = await res.json();
                const raw = Array.isArray(json) ? json : (json?.cities || []);
                if (!raw.length) {
                    console.warn(`cities_data.json 內容為空，來源: ${url}`);
                    continue;
                }
                this.citiesData = raw
                    .filter(c => c && (c.latitude || c.lat) && (c.longitude || c.lng) && (c.countryCode || c.country_iso_code))
                    .map(c => ({
                        id: `${(c.name || c.city || '').trim()}_${(c.country || c.countryName || '').trim()}_${(c.countryCode || c.country_iso_code || '').toUpperCase()}`,
                        name: c.name || c.city || 'Unknown',
                        country: c.country || c.countryName || '',
                        countryCode: (c.countryCode || c.country_iso_code || '').toUpperCase(),
                        latitude: Number(c.latitude ?? c.lat),
                        longitude: Number(c.longitude ?? c.lng),
                        population: Number(c.population || 0),
                        isCapital: !!(c.capital || c.is_capital)
                    }));
                if (this.citiesData.length) {
                    this.usedCitiesFallback = false;
                    this.citiesDataSource = url;
                    this.buildCountryCandidates();
                    console.log(`✅ cities_data.json 載入成功：${url}，共 ${this.citiesData.length} 筆`);
                    console.log('📊 前 5 個城市範例:', this.citiesData.slice(0, 5).map(c => ({
                        name: c.name,
                        country: c.country,
                        countryCode: c.countryCode,
                        lat: c.latitude,
                        lng: c.longitude
                    })));
                    return this.citiesData;
                }
            } catch (error) {
                console.warn(`載入城市資料失敗 (${url})`, error);
            }
        }

        console.warn('⚠️ 無法載入 cities_data.json，改用內建候選清單。');
        this.usedCitiesFallback = true;
        this.citiesDataSource = 'fallback';
        this.citiesData = fallbackCities;
        this.buildCountryCandidates();
        return this.citiesData;
    }

    buildCountryCandidates() {
        if (!this.citiesData || !this.citiesData.length) { this.countryCandidates = []; return; }
        const popular = new Set([
            'Tokyo', 'Seoul', 'Singapore', 'Bangkok', 'Hong Kong', 'Manila', 'Kuala Lumpur', 'Jakarta', 'Ho Chi Minh City', 'Hanoi',
            'Beijing', 'Shanghai', 'Osaka', 'Kyoto', 'Sydney', 'Melbourne', 'Perth', 'Auckland', 'Wellington',
            'London', 'Paris', 'Berlin', 'Rome', 'Madrid', 'Amsterdam', 'Zurich', 'Vienna', 'Prague', 'Warsaw',
            'New York', 'Los Angeles', 'Chicago', 'Toronto', 'Vancouver', 'Mexico City', 'Sao Paulo', 'Buenos Aires'
        ]);
        const byCountry = new Map();
        for (const c of this.citiesData) {
            const key = c.countryCode;
            if (!byCountry.has(key)) byCountry.set(key, []);
            byCountry.get(key).push(c);
        }
        const candidates = [];
        byCountry.forEach((list) => {
            // 先找熱門/首都，否則取人口最多
            let chosen = list.find(x => popular.has((x.name || '').trim())) || list.find(x => x.isCapital);
            if (!chosen) {
                chosen = list.reduce((a, b) => (a.population > b.population ? a : b));
            }
            candidates.push(chosen);
        });
        this.countryCandidates = candidates;
    }

    countryCodeToEmoji(cc) {
        if (!cc || cc.length !== 2) return '🌍';
        const codePoints = cc.toUpperCase().split('').map(ch => 127397 + ch.charCodeAt());
        return String.fromCodePoint(...codePoints);
    }

    // === 測試時鐘（虛擬現在時間） ===
    now() {
        return (window.TEST_CLOCK && window.TEST_CLOCK.use)
            ? new Date(window.TEST_CLOCK.now)
            : new Date();
    }

    // 初始化時鐘設定
    initializeClock() {
        // 如果沒有啟用測試時鐘，確保使用真實時間
        if (!window.TEST_CLOCK || !window.TEST_CLOCK.use) {
            console.log('使用真實時間:', new Date().toLocaleString());
        } else {
            console.log('使用測試時間:', new Date(window.TEST_CLOCK.now).toLocaleString());
        }
    }

    enableTestClock(datetime) {
        const dt = (datetime instanceof Date) ? datetime : new Date(datetime);
        window.TEST_CLOCK = window.TEST_CLOCK || { use: false, now: Date.now() };
        window.TEST_CLOCK.use = true;
        window.TEST_CLOCK.now = dt.getTime();
        this._startTestTicker();
        console.log('🧪 測試時鐘啟用：', new Date(window.TEST_CLOCK.now).toLocaleString());
        console.log('🕐 現在系統將使用測試時間運行');

        // 啟用時立刻刷新一次狀態與降落判斷
        this._maybeUpdateFlightStatus();
        if (this._landingCheckByTestClock()) this.showLandingButton();
    }

    disableTestClock() {
        if (window.TEST_CLOCK) window.TEST_CLOCK.use = false;
        clearInterval(this._testTicker);
        console.log('🧪 測試時鐘停用，還原真實時間');
        console.log('🕐 現在系統將使用真實時間運行:', new Date().toLocaleString());
    }

    _startTestTicker() {
        clearInterval(this._testTicker);
        this._testTicker = setInterval(() => {
            if (window.TEST_CLOCK && window.TEST_CLOCK.use) {
                window.TEST_CLOCK.now += 1000; // 每秒推進
                this._maybeUpdateFlightStatus();
            }
        }, 1000);
    }

    _maybeUpdateFlightStatus() {
        const panel = document.querySelector('.flight-status-popup');
        if (panel) {
            const el = panel.querySelector('.flight-status');
            if (el) el.textContent = this.getCurrentFlightStatus();
        }
        if (this.gameState.selectedDestination && this._landingCheckByTestClock()) {
            this.showLandingButton();
        }
    }

    _landingCheckByTestClock() {
        if (!(window.TEST_CLOCK && window.TEST_CLOCK.use)) return false;
        const wakeTime = this.gameState.wakeTime || '08:00';
        const [h, m] = wakeTime.split(':').map(Number);
        const now = this.now();
        const todayTarget = new Date(now);
        todayTarget.setHours(h, m, 0, 0);
        // 測試模式：若尚未到今日的醒來時間，目標就是今天；若已過，改為明天
        const target = (now.getTime() <= todayTarget.getTime())
            ? todayTarget
            : new Date(todayTarget.getTime() + 24 * 60 * 60 * 1000);
        return now.getTime() >= target.getTime();
    }

    // 更新飛行狀態顯示
    updateFlightStatusDisplay(status) {
        const statusElement = document.querySelector('.flight-status-popup .status-text');
        if (statusElement) {
            // 根據語言切換顯示文字
            const lang = this.gameState.language || 'zh-TW';
            const dict = {
                'zh-TW': {
                    '準備起飛': '準備起飛',
                    '起飛中': '起飛中',
                    '巡航中': '巡航中',
                    '準備降落': '準備降落',
                    '降落中': '降落中',
                    '已降落': '已降落'
                },
                'en': {
                    '準備起飛': 'Ready for take-off',
                    '起飛中': 'Taking off',
                    '巡航中': 'Cruising',
                    '準備降落': 'Approach',
                    '降落中': 'Landing',
                    '已降落': 'Landed'
                }
            };
            const map = dict[lang] || dict['zh-TW'];
            statusElement.textContent = map[status] || status;

            // 移除所有狀態類別
            statusElement.classList.remove('status-preparing', 'status-taking-off', 'status-cruising', 'status-landing', 'status-landed', 'status-flying');

            // 根據狀態添加對應的CSS類別
            switch (status) {
                case '準備起飛':
                    statusElement.classList.add('status-preparing');
                    break;
                case '起飛中':
                    statusElement.classList.add('status-taking-off');
                    break;
                case '巡航中':
                    statusElement.classList.add('status-cruising');
                    break;
                case '準備降落':
                case '降落中':
                    statusElement.classList.add('status-landing');
                    break;
                case '已降落':
                    statusElement.classList.add('status-landed');
                    break;
                default:
                    statusElement.classList.add('status-flying');
                    break;
            }
        }
    }

    // 依現在時間推導飛行狀態（計時器模式）
    getCurrentFlightStatus() {
        // 如果正在降落中，顯示降落中
        if (this.gameState.isLanding) {
            return '降落中';
        }

        // 如果飛行已經完成（按過降落鍵），顯示已降落
        if (this.gameState.flightCompleted) {
            return '已降落';
        }

        // 飛行計時器模式：基於計時器進度
        if (this.gameState.flightTimerMode) {
            if (!this.gameState.timerStartTime || !this.gameState.timerEndTime) {
                return '準備起飛';
            }

            const now = this.now();
            const startTime = this.gameState.timerStartTime.getTime();
            const endTime = this.gameState.timerEndTime.getTime();

            if (now.getTime() < startTime) {
                return '準備起飛';
            }

            if (now.getTime() >= endTime) {
                // 時間到了，自動降落
                if (!this.gameState.flightCompleted) {
                    this.handleTimerComplete();
                }
                return '已降落';
            }

            // 計算飛行進度（0-1）
            const totalTime = endTime - startTime;
            const elapsedTime = now.getTime() - startTime;
            const progress = elapsedTime / totalTime;

            // 根據進度返回狀態
            if (progress < 0.05) {
                return '起飛中'; // 剛起飛
            } else if (progress < 0.9) {
                return '巡航中'; // 大部分時間在巡航
            } else if (progress < 0.98) {
                return '準備降落'; // 接近目的地
            } else {
                return '降落中'; // 正在降落
            }
        }

        // 舊模式（保留向後兼容）
        const now = this.now();
        const wakeTime = this.gameState.wakeTime || '08:00';
        const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);

        // 計算今天的目標時間
        const todayTarget = new Date(now);
        todayTarget.setHours(wakeHour, wakeMinute, 0, 0);

        // 如果現在已經過了今天的起床時間，目標是明天
        const targetTime = (now.getTime() > todayTarget.getTime())
            ? new Date(todayTarget.getTime() + 24 * 60 * 60 * 1000)
            : todayTarget;

        // 起飛時間：目標時間的前一天晚上11點
        const departureTime = new Date(targetTime.getTime() - 24 * 60 * 60 * 1000);
        departureTime.setHours(23, 0, 0, 0);

        // 計算飛行進度
        const totalTime = targetTime.getTime() - departureTime.getTime();
        const elapsedTime = now.getTime() - departureTime.getTime();
        const progress = elapsedTime / totalTime;

        console.log('飛行狀態計算:', {
            now: now.toLocaleString(),
            departure: departureTime.toLocaleString(),
            target: targetTime.toLocaleString(),
            progress: Math.round(progress * 100) + '%',
            isLanding: this.gameState.isLanding,
            flightCompleted: this.gameState.flightCompleted
        });

        // 根據飛行進度返回狀態
        if (progress < 0) {
            return '準備起飛'; // 還沒到起飛時間
        } else if (progress < 0.1) {
            return '起飛中'; // 剛起飛
        } else if (progress < 0.8) {
            return '巡航中'; // 大部分時間在巡航
        } else if (progress < 0.95) {
            return '準備降落'; // 接近目的地
        } else if (progress < 1) {
            return '降落中'; // 正在降落
        } else {
            // 即使到了時間，如果還沒按降落鍵，繼續巡航
            return '巡航中';
        }
    }

    init() {
        // 臨時重置功能：清除可能存在的錯誤狀態
        this.resetGameIfNeeded();

        // 初始化時鐘設定
        this.initializeClock();

        this.loadGameState();
        this.setupEventListeners();
        // 套用當前語言設定到 UI
        this.applyLanguage(this.gameState.language || 'zh-TW');
        // 載入當前位置和統計資料
        this.loadCurrentLocationAndStats();
        this.renderDestinationGrid();
        this.refreshHomeButtonsState();
        this.setInitialDate();
    }

    resetGameIfNeeded() {
        // 檢查是否有錯誤的遊戲狀態需要重置
        const saved = localStorage.getItem('wakeUpMapGame');
        if (saved) {
            try {
                const savedState = JSON.parse(saved);
                // 如果遊戲已開始但沒有選擇目的地，重置遊戲
                if (savedState.gameStarted && !savedState.selectedDestination && !savedState.currentTicket) {
                    console.log('🎮 檢測到錯誤的遊戲狀態，重置遊戲');
                    localStorage.removeItem('wakeUpMapGame');
                }
            } catch (e) {
                console.log('🎮 清除損壞的遊戲狀態');
                localStorage.removeItem('wakeUpMapGame');
            }
        }

        // 強制重置遊戲狀態（臨時修復）
        console.log('🎮 強制重置遊戲狀態');
        localStorage.removeItem('wakeUpMapGame');
    }

    loadGameState() {
        // 從 localStorage 載入遊戲狀態
        const saved = localStorage.getItem('wakeUpMapGame');
        if (saved) {
            const savedState = JSON.parse(saved);
            this.gameState = { ...this.gameState, ...savedState };
            console.log('🎮 載入保存的遊戲狀態:', this.gameState);
        } else {
            console.log('🎮 沒有保存的遊戲狀態，使用預設值');
        }
    }

    saveGameState() {
        // 保存遊戲狀態到 localStorage
        localStorage.setItem('wakeUpMapGame', JSON.stringify(this.gameState));
    }

    // 將關鍵事件記錄到後端（Firebase 由 /api/save-record 寫入）
    async saveGameRecord(payload = {}) {
        try {
            const body = {
                userDisplayName: (window.env && window.env.USER_NAME) || 'raspi-user',
                groupName: 'sleep_flight',
                source: 'web_app',
                deviceType: 'raspberry_pi',
                ...payload
            };
            const res = await fetch('/api/save-record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error(`save-record status ${res.status}`);
            console.log('📌 記錄已寫入');

            // 快取「上一個位置」供下次當作起點
            try {
                if (typeof body.city === 'string' && typeof body.country === 'string') {
                    const lat = (typeof body.latitude === 'number') ? body.latitude : undefined;
                    const lng = (typeof body.longitude === 'number') ? body.longitude : undefined;
                    if (lat != null && lng != null) {
                        localStorage.setItem('lastKnownLocation', JSON.stringify({
                            name: body.city,
                            country: body.country,
                            coordinates: [lat, lng]
                        }));
                    }
                }
            } catch (_) { }
            return true;
        } catch (e) {
            console.warn('⚠️ 記錄寫入失敗（不中斷流程）', e);
            return false;
        }
    }

    setupEventListeners() {
        // 首頁：規劃旅程/開始旅程
        document.getElementById('buyTicketBtn')?.addEventListener('click', () => {
            if (this.gameState.currentTicket) return; // 已有機票，禁用
            this.showTaskModal(); // 先顯示任務選擇視窗
        });

        // 點擊飛行資訊面板顯示歷史機票
        document.getElementById('flightInfoPanel')?.addEventListener('click', () => {
            this.showFlightHistoryModal();
        });
        document.getElementById('beginJourneyBtn')?.addEventListener('click', async () => {
            console.log('🔄 開始旅程按鈕被點擊', {
                hasTicket: !!this.gameState.currentTicket,
                currentTicket: this.gameState.currentTicket,
                selectedDestination: this.gameState.selectedDestination,
                flightTimerMode: this.gameState.flightTimerMode
            });

            if (!this.gameState.currentTicket && !this.gameState.selectedDestination) {
                console.warn('⚠️ 尚未規劃旅程，無法開始旅程');
                alert('請先規劃旅程！');
                return; // 尚未購票
            }

            console.log('✅ 開始進入地圖頁面...');

            // 先切換到地圖頁面（在背景準備）
            this.gameState.flightStarted = true;
            this.gameState.flightStatus = 'flying';
            this.startGame();

            // 顯示起飛資訊大視窗（同時播放機長聲音，播放完成後自動跳轉）
            const destination = this.gameState.selectedDestination || this.gameState.currentTicket?.destination;
            console.log('📍 目的地資訊:', destination);

            if (destination) {
                // 確保目的地已設置
                if (!this.gameState.selectedDestination) {
                    this.gameState.selectedDestination = destination;
                }
                console.log('🛫 準備顯示起飛資訊大視窗');
                await this.showBoardingInfoScreen();
            } else {
                console.warn('⚠️ 沒有目的地，直接開始遊戲');
            }
        });

        // 目的地選擇事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('destination-option')) {
                this.selectDestination(e.target.dataset.destination);
            }
        });

        // 機票確認事件
        document.getElementById('confirmTicket')?.addEventListener('click', () => {
            this.confirmTicket();
        });

        // 重新選擇目的地事件
        document.getElementById('changeDestination')?.addEventListener('click', () => {
            this.changeDestination();
        });

        // 計時長度視窗關閉事件
        document.getElementById('timerModalClose')?.addEventListener('click', () => {
            this.hideTimerModal();
        });

        document.getElementById('timerModalOverlay')?.addEventListener('click', () => {
            this.hideTimerModal();
        });

        // 確認計時長度按鈕
        document.getElementById('confirmTimerBtn')?.addEventListener('click', () => {
            this.confirmTimerDuration();
        });

        // 語言切換按鈕
        document.getElementById('languageToggle')?.addEventListener('click', () => {
            const next = (this.gameState.language === 'zh-TW') ? 'en' : 'zh-TW';
            this.setLanguage(next);
        });

        // TASK 視窗關閉事件
        document.getElementById('taskModalClose')?.addEventListener('click', () => {
            this.hideTaskModal();
        });

        document.getElementById('taskModalOverlay')?.addEventListener('click', () => {
            this.hideTaskModal();
        });

        // 確認任務按鈕
        document.getElementById('confirmTaskBtn')?.addEventListener('click', () => {
            this.confirmTaskSelection();
        });

        // 目的地視窗關閉事件
        document.getElementById('modalClose')?.addEventListener('click', () => {
            this.hideDestinationModal();
        });

        document.getElementById('ticketModalClose')?.addEventListener('click', () => {
            this.hideTicketModal();
        });

        // 點擊遮罩關閉視窗
        document.getElementById('modalOverlay')?.addEventListener('click', () => {
            this.hideDestinationModal();
        });

        document.getElementById('ticketModalOverlay')?.addEventListener('click', () => {
            this.hideTicketModal();
        });

        // 巴特按鈕事件
        document.getElementById('battButton')?.addEventListener('click', () => {
            this.handleBattClick();
        });

        // 飛行計時器長度選擇事件（僅更新顯示，不重新計算目的地）
        document.getElementById('timerDurationInput')?.addEventListener('change', (e) => {
            const minutes = Number(e.target.value) || 30;
            const validMinutes = Math.max(30, minutes);
            const timerInput = document.getElementById('timerDurationInput');
            if (timerInput) {
                timerInput.value = validMinutes;
            }
            // 更新預設按鈕狀態
            document.querySelectorAll('.time-preset').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.minutes && Number(btn.dataset.minutes) === validMinutes) {
                    btn.classList.add('active');
                }
            });
        });

        // 時間預設按鈕事件（僅更新顯示，不重新計算目的地）
        document.querySelectorAll('.time-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = e.target.dataset.minutes || e.target.dataset.time;
                if (minutes) {
                    const validMinutes = Math.max(30, Number(minutes));
                    const timerInput = document.getElementById('timerDurationInput');
                    if (timerInput) {
                        timerInput.value = validMinutes;
                    }
                    // 更新按鈕狀態
                    document.querySelectorAll('.time-preset').forEach(b => {
                        b.classList.remove('active');
                    });
                    e.target.classList.add('active');
                }
            });
        });

        // 任務選擇按鈕事件（TASK）
        document.querySelectorAll('.task-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.task-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const task = btn.dataset.task || 'REST';
                this.gameState.taskType = task;
                this.saveGameState();
                console.log('🎯 任務已選擇:', task);
            });
        });
    }

    confirmTaskSelection() {
        // 讀取目前選擇的 TASK（若無則維持原值）
        const activeTaskBtn = document.querySelector('.task-option.active');
        if (activeTaskBtn && activeTaskBtn.dataset.task) {
            this.gameState.taskType = activeTaskBtn.dataset.task;
            this.saveGameState();
        }

        console.log('✅ 任務已確認:', this.gameState.taskType);

        // 關閉任務視窗，顯示計時長度選擇視窗
        this.hideTaskModal();
        this.showTimerModal();
    }

    async renderDestinationGrid() {
        const grid = document.getElementById('destinationGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="loading-destinations">🔄 正在計算可達目的地...</div>';

        try {
            await this.loadCitiesData();
            // 獲取當前位置
            const currentLocation = await this.getCurrentLocation();
            this.gameState.currentLocation = currentLocation;

            // 計算可達目的地（根據計時長度）
            const timerMinutes = this.gameState.timerDuration || 30;
            const destinations = await this.calculateFlightTimerDestinations(currentLocation, timerMinutes);
            this.gameState.destinations = destinations;

            grid.innerHTML = '';

            const gridWrapper = grid.parentElement;
            if (gridWrapper) {
                let notice = gridWrapper.querySelector('.destination-warning');
                if (this.usedCitiesFallback) {
                    if (!notice) {
                        notice = document.createElement('div');
                        notice.className = 'destination-warning';
                        notice.innerHTML = '⚠️ 目前使用預設目的地資料。請確認 cities_data.json 是否成功載入，便可顯示更多城市。';
                        gridWrapper.insertBefore(notice, gridWrapper.firstChild);
                    }
                } else if (notice) {
                    notice.remove();
                }
            }

            destinations.forEach(dest => {
                const button = document.createElement('button');
                button.className = 'destination-option';
                button.dataset.destination = dest.id;
                button.innerHTML = `
                    <div class="dest-flag-large">${dest.flag}</div>
                    <div class="dest-info">
                <div class="dest-name">${dest.name}</div>
                        <div class="dest-country">${dest.country}</div>
                    </div>
                `;

                grid.appendChild(button);
            });

        } catch (error) {
            console.error('載入目的地失敗:', error);
            grid.innerHTML = '<div class="error-destinations">❌ 載入目的地失敗，請稍後再試</div>';
        }
    }

    // 顯示計時長度選擇視窗（第一階段）
    showTimerModal() {
        const modal = document.getElementById('timerModal');
        if (modal) {
            modal.classList.add('active');
            // 確保使用預設值
            const timerInput = document.getElementById('timerDurationInput');
            if (timerInput) {
                timerInput.value = this.gameState.timerDuration || 30;
            }
            // 更新預設按鈕狀態
            document.querySelectorAll('.time-preset').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.minutes && Number(btn.dataset.minutes) === (this.gameState.timerDuration || 30)) {
                    btn.classList.add('active');
                }
            });
        }
    }

    showTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) {
            modal.classList.add('active');

            // 更新任務按鈕狀態
            document.querySelectorAll('.task-option').forEach(btn => {
                btn.classList.remove('active');
                const task = btn.dataset.task || 'REST';
                if (task === (this.gameState.taskType || 'REST')) {
                    btn.classList.add('active');
                }
            });
        }
    }

    hideTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    hideTimerModal() {
        const modal = document.getElementById('timerModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // 確認計時長度，進入第三階段：顯示目的地選擇
    async confirmTimerDuration() {
        const timerInput = document.getElementById('timerDurationInput');
        const timerMinutes = timerInput ? Number(timerInput.value) || 30 : 30;

        // 確保最短30分鐘
        const validMinutes = Math.max(30, timerMinutes);
        this.gameState.timerDuration = validMinutes;
        this.saveGameState();

        console.log(`✅ 計時長度已確認：${validMinutes} 分鐘`);

        // 關閉計時長度視窗，開啟目的地選擇視窗
        this.hideTimerModal();
        this.showDestinationModal();
    }

    showDestinationModal() {
        const modal = document.getElementById('destinationModal');
        if (modal) {
            modal.classList.add('active');
            // 更新顯示的計時長度
            const timerDisplay = document.getElementById('selectedTimerDisplay');
            if (timerDisplay) {
                timerDisplay.textContent = this.gameState.timerDuration || 30;
            }
            // 根據計時長度計算並顯示目的地
            this.renderDestinationGrid();
        }
    }

    hideDestinationModal() {
        const modal = document.getElementById('destinationModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showTicketModal() {
        const modal = document.getElementById('ticketModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideTicketModal() {
        const modal = document.getElementById('ticketModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    selectDestination(destinationId) {
        const destination = this.gameState.destinations.find(d => d.id === destinationId);
        if (!destination || !destination.unlocked) return;

        this.gameState.selectedDestination = destination;

        // 更新選中狀態
        document.querySelectorAll('.destination-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-destination="${destinationId}"]`).classList.add('selected');

        // 隱藏目的地選擇視窗，顯示機票確認視窗
        this.hideDestinationModal();
        this.showTicketPreview(destination);
    }

    showTicketPreview(destination) {
        // 獲取當前位置（上次降落位置）作為出發地
        const currentLocation = this.gameState.currentLocation || { name: '台北', countryCode: 'TPE', country: '台灣' };
        const originCode = currentLocation.countryCode || 'TPE';
        const originName = currentLocation.name || '台北';

        // 更新出發地資訊
        const originCityCodeEl = document.getElementById('originCityCode');
        const originCityNameEl = document.getElementById('originCityName');
        if (originCityCodeEl) originCityCodeEl.textContent = originCode;
        if (originCityNameEl) originCityNameEl.textContent = originName;

        // 更新機票資訊
        const selectedDestinationEl = document.getElementById('selectedDestination');
        const destinationCodeEl = document.getElementById('destinationCode');
        const departureDateEl = document.getElementById('departureDate');
        const departureTimeEl = document.getElementById('departureTime');
        const arrivalTimeEl = document.getElementById('arrivalTime');

        if (selectedDestinationEl) selectedDestinationEl.textContent = destination.name;
        if (destinationCodeEl) destinationCodeEl.textContent = destination.countryCode || 'XXX';
        if (departureDateEl) departureDateEl.textContent = this.getCurrentDate();

        // 確認機票視窗不再顯示任何時間點或時長，維持純「路線＋任務」的幻想感
        if (departureTimeEl) departureTimeEl.textContent = '';
        if (arrivalTimeEl) arrivalTimeEl.textContent = '';

        // 生成隨機的航班資訊
        const flightNumber = `WU-${Math.floor(Math.random() * 9000) + 1000}`;
        const seatNumber = `${Math.floor(Math.random() * 30) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`;
        const gateNumber = `${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;
        const ticketNumber = `WU${new Date().getFullYear()}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

        const flightNumberEl = document.getElementById('flightNumber');
        const seatNumberEl = document.getElementById('seatNumber');
        const gateNumberEl = document.getElementById('gateNumber');
        const barcodeNumberEl = document.getElementById('barcodeNumber');
        const ticketTaskTopEl = document.getElementById('ticketTaskTop');
        const ticketTaskBottomEl = document.getElementById('ticketTaskBottom');

        if (flightNumberEl) flightNumberEl.textContent = flightNumber;
        if (seatNumberEl) seatNumberEl.textContent = seatNumber;
        if (gateNumberEl) gateNumberEl.textContent = gateNumber;
        if (barcodeNumberEl) barcodeNumberEl.textContent = ticketNumber;

        // 更新 TASK 顯示（上下兩個 Banner）
        const taskLabelMap = {
            READING: '讀書',
            EXERCISE: '運動',
            MEDITATION: '冥想',
            REST: '休息',
            WORK: '工作',
            GAME: '遊戲'
        };
        const task = this.gameState.taskType || 'REST';
        const taskText = taskLabelMap[task] || '休息';
        if (ticketTaskTopEl) ticketTaskTopEl.textContent = taskText;
        if (ticketTaskBottomEl) ticketTaskBottomEl.textContent = taskText;

        // 顯示機票確認視窗
        this.showTicketModal();
    }

    async confirmTicket() {
        if (!this.gameState.selectedDestination) {
            console.error('❌ confirmTicket: 沒有選中目的地');
            return;
        }

        const destination = this.gameState.selectedDestination;
        console.log('🎫 確認旅程規劃', destination);

        // 生成機票
        this.gameState.currentTicket = {
            id: `ticket_${Date.now()}`,
            destination: destination,
            purchaseDate: new Date().toISOString(),
            week: this.gameState.currentWeek,
            price: destination.price
        };

        console.log('✅ 機票已創建', this.gameState.currentTicket);

        // 保存狀態
        this.saveGameState();

        // 隱藏機票確認視窗
        this.hideTicketModal();

        // 顯示機票UI在台北位置欄位下方
        this.showTicketInLocationPanel();

        // 更新首頁按鈕狀態（規劃旅程後：規劃旅程按鈕禁用、開始旅程可按）
        this.refreshHomeButtonsState();
        console.log('✅ 按鈕狀態已更新，開始旅程按鈕應該已啟用');

        // 顯示成功訊息（票券資訊呈現在台北面板下方）
        this.showGameStartMessage();
    }

    changeDestination() {
        // 隱藏機票確認視窗
        this.hideTicketModal();

        // 清除選中狀態
        document.querySelectorAll('.destination-option').forEach(btn => {
            btn.classList.remove('selected');
        });

        this.gameState.selectedDestination = null;
        this.gameState.currentTicket = null;

        // 重新顯示任務選擇視窗（第一階段）
        this.showTaskModal();
        this.refreshHomeButtonsState();
    }

    // 首頁雙按鈕可用性切換
    refreshHomeButtonsState() {
        const buyBtn = document.getElementById('buyTicketBtn');
        const beginBtn = document.getElementById('beginJourneyBtn');
        const hasTicket = !!this.gameState.currentTicket;
        const hasDestination = !!this.gameState.selectedDestination;

        // 規劃旅程按鈕：如果已經有機票則禁用，否則可用
        if (buyBtn) buyBtn.disabled = hasTicket;

        // 開始旅程按鈕：必須有機票才能開始
        if (beginBtn) beginBtn.disabled = !hasTicket;
    }

    startGame() {
        console.log('🚀 startGame() 被調用', {
            currentTicket: this.gameState.currentTicket,
            selectedDestination: this.gameState.selectedDestination
        });

        this.gameState.gameStarted = true;
        this.saveGameState();

        // 隱藏遊戲開始畫面
        const gameStartState = document.getElementById('gameStartState');
        if (gameStartState) {
            gameStartState.classList.remove('active');
            console.log('✅ 隱藏了 gameStartState');
        } else {
            console.error('❌ 找不到 gameStartState 元素');
        }

        // 顯示飛行地圖
        this.showFlightMap();

        // 觸發遊戲開始事件
        window.dispatchEvent(new CustomEvent('gameStarted', {
            detail: {
                ticket: this.gameState.currentTicket,
                gameState: this.gameState
            }
        }));

        console.log('🎮 遊戲開始！', this.gameState.currentTicket);
    }

    showFlightMap() {
        console.log('🗺️ showFlightMap() 被調用');

        // 創建飛行地圖容器（如果尚未存在）
        let flightMapContainer = document.getElementById('flightMapContainer');
        if (!flightMapContainer) {
            flightMapContainer = document.createElement('div');
            flightMapContainer.id = 'flightMapContainer';
            flightMapContainer.className = 'flight-map-container';

            // 添加到結果狀態中
            const resultState = document.getElementById('resultState');
            if (resultState) {
                resultState.appendChild(flightMapContainer);
                console.log('✅ 地圖容器已添加到 resultState');
            } else {
                console.error('❌ 找不到 resultState 元素');
                return;
            }
        } else {
            console.log('✅ 地圖容器已存在');
        }

        // 顯示結果狀態
        const resultState = document.getElementById('resultState');
        if (resultState) {
            resultState.classList.add('active');
            console.log('✅ resultState 已設為 active');
        }

        // 初始化飛行地圖
        this.initializeFlightMap();

        // 更新左下角機票顯示（確保使用最新的當前位置）
        this.showTicketInLocationPanel();
    }

    initializeFlightMap() {
        const destination = this.gameState.selectedDestination;
        if (!destination) return;

        // 獲取當前位置（上次降落位置）作為出發地
        const currentLocation = this.gameState.currentLocation || {
            name: '台北',
            countryCode: 'TPE',
            country: '台灣',
            coordinates: [25.0330, 121.5654],
            latitude: 25.0330,
            longitude: 121.5654
        };

        // 獲取出發地座標（優先使用 coordinates，其次使用 latitude/longitude）
        const originCoords = currentLocation.coordinates ||
            (currentLocation.latitude && currentLocation.longitude
                ? [currentLocation.latitude, currentLocation.longitude]
                : [25.0330, 121.5654]);

        // 目的地座標（根據目的地ID設定）
        const destinationCoords = this.getDestinationCoords(destination.id);

        // 取得容器並防止重複初始化
        let el = document.getElementById('flightMapContainer');
        if (!el) return;
        if (this.map && this.map.invalidateSize) {
            this.map.invalidateSize();
            this._ensureMapPanelsVisible && this._ensureMapPanelsVisible();
            return;
        }
        if (el._leaflet_id) {
            const fresh = el.cloneNode(false);
            el.parentNode.replaceChild(fresh, el);
            el = fresh;
        }

        // 創建地圖
        this.map = L.map(el).setView(originCoords, 3);

        // 添加地圖瓦片
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // 清理既有浮層，避免重複或被舊元素遮擋
        this.cleanupMapOverlays();

        // 添加出發地標記（使用當前位置）
        const originCode = currentLocation.countryCode || 'TPE';
        const originName = currentLocation.name || '台北';
        const originCountry = currentLocation.country || '台灣';
        const originMarker = L.marker(originCoords).addTo(this.map);
        originMarker.bindPopup(`
            <div class="flight-popup">
                <h3>✈️ 出發地</h3>
                <p><strong>${originName} ${originCode}</strong></p>
                <p>${originCountry}</p>
            </div>
        `);

        // 添加目的地標記
        const destinationMarker = L.marker(destinationCoords).addTo(this.map);
        destinationMarker.bindPopup(`
            <div class="flight-popup">
                <h3>🎯 目的地</h3>
                <p><strong>${destination.name}</strong></p>
                <p>${destination.flag}</p>
            </div>
        `);

        // 添加航線
        const flightPath = L.polyline([originCoords, destinationCoords], {
            color: '#ff6b35',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(this.map);

        // 綁定自訂縮放控制
        this._bindCustomZoomControls();

        // === 飛機動畫系統 ===
        console.log('初始化飛機動畫系統...');

        // 1. 創建飛機圖標
        const planeIcon = L.divIcon({
            html: '<div style="font-size: 24px; color: #ff6b35; background: white; border: 2px solid #ff6b35; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">✈️</div>',
            className: 'plane-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        // 2. 創建飛機標記（初始位置在出發地）
        const planeMarker = L.marker(originCoords, { icon: planeIcon }).addTo(this.map);
        console.log('飛機已創建，位置:', originCoords);

        // 3. 計算飛機應該在哪個位置
        const getFlightProgress = () => {
            const now = this.now();

            // ✈️ 計時器模式：依照計時時長決定飛行進度（0~1）
            if (this.gameState.flightTimerMode && this.gameState.timerStartTime && this.gameState.timerEndTime) {
                const startTime = this.gameState.timerStartTime.getTime();
                const endTime = this.gameState.timerEndTime.getTime();
                const current = now.getTime();

                // 尚未起飛
                if (current <= startTime) {
                    return 0;
                }

                const total = endTime - startTime;
                const elapsed = current - startTime;
                const progress = Math.max(0, Math.min(1, elapsed / total));

                console.log('⏱️ 計時器模式飛行進度:', {
                    now: now.toLocaleString(),
                    start: new Date(startTime).toLocaleString(),
                    end: new Date(endTime).toLocaleString(),
                    progress: Math.round(progress * 100) + '%'
                });

                return progress;
            }

            // 🕒 舊鬧鐘模式：依照起床時間（wakeTime）計算進度（保留向後相容）
            const wakeTime = this.gameState.wakeTime || '08:00';
            const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);

            // 今天的目標時間
            const todayTarget = new Date(now);
            todayTarget.setHours(wakeHour, wakeMinute, 0, 0);

            // 如果現在已經過了今天的起床時間，目標是明天
            const targetTime = (now.getTime() > todayTarget.getTime())
                ? new Date(todayTarget.getTime() + 24 * 60 * 60 * 1000)
                : todayTarget;

            // 起飛時間：目標時間的前一天晚上11點
            const departureTime = new Date(targetTime.getTime() - 24 * 60 * 60 * 1000);
            departureTime.setHours(23, 0, 0, 0);

            // 計算進度
            const totalTime = targetTime.getTime() - departureTime.getTime();
            const elapsedTime = now.getTime() - departureTime.getTime();
            const progress = Math.max(0, Math.min(1, elapsedTime / totalTime));

            console.log('🕒 鬧鐘模式飛行進度計算:', {
                now: now.toLocaleString(),
                departure: departureTime.toLocaleString(),
                target: targetTime.toLocaleString(),
                progress: Math.round(progress * 100) + '%'
            });

            return progress;
        };

        // 4. 更新飛機位置（僅移動，不旋轉，以避免干擾 Leaflet 的 translate3d）
        const updatePlanePosition = () => {
            const progress = getFlightProgress();

            // 計算飛機在航線上的位置（依照進度線性插值）
            const planePos = [
                originCoords[0] + (destinationCoords[0] - originCoords[0]) * progress,
                originCoords[1] + (destinationCoords[1] - originCoords[1]) * progress
            ];

            // 更新飛機位置
            planeMarker.setLatLng(planePos);

            console.log('✈️ 飛機位置更新:', planePos, '進度:', Math.round(progress * 100) + '%');
        };

        // 5. 啟動飛機動畫（每10秒更新一次）
        updatePlanePosition(); // 立即更新一次
        setInterval(updatePlanePosition, 10000); // 每10秒更新

        // 計算距離
        const distance = this.calculateDistance(originCoords, destinationCoords);

        // 添加飛行狀態懸浮視窗
        this.addFlightStatusPopup(this.map, distance, destination);

        // 調整地圖視圖以包含兩個點
        const group = new L.featureGroup([originMarker, destinationMarker]);
        this.map.fitBounds(group.getBounds().pad(0.1));

        // 立即顯示降落按鈕（測試用）
        this.showActionButton('landing');

        // 保底：確保四個地圖面板可見
        this._ensureMapPanelsVisible();
    }

    _ensureMapPanelsVisible() {
        const ids = ['sleepTimePopup', 'flightStatusPopup', 'resourceDisplayPopup', 'simpleTicketPopup'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'block';
                el.style.opacity = '1';
                el.style.visibility = 'visible';
            }
        });
    }

    _bindCustomZoomControls() {
        if (!this.map) return;

        const zoomInBtn = document.getElementById('mapZoomInBtn');
        const zoomOutBtn = document.getElementById('mapZoomOutBtn');

        if (zoomInBtn) {
            zoomInBtn.onclick = () => {
                if (this.map) {
                    this.map.zoomIn();
                }
            };
        }

        if (zoomOutBtn) {
            zoomOutBtn.onclick = () => {
                if (this.map) {
                    this.map.zoomOut();
                }
            };
        }
    }

    getDestinationCoords(destinationId) {
        // 改為從 JSON 取得
        const data = (this.citiesData && this.citiesData.length) ? this.citiesData : [];
        const city = data.find(c => c.id === destinationId);
        if (city) return [city.latitude, city.longitude];
        return [13.7563, 100.5018];
    }

    calculateDistance(coord1, coord2) {
        const R = 6371; // 地球半徑（公里）
        const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
        const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    addFlightStatusPopup(map, distance, destination) {
        // 只關心飛行「時長」與倒數，不再顯示實際時間點
        const timerMinutes = this.gameState.timerDuration || 30;
        const durationText = this.formatDuration(timerMinutes);

        // 國際化文案
        const lang = this.gameState.language || 'zh-TW';
        const i18n = {
            'zh-TW': {
                title: '飛行狀態',
                dest: '目的地：',
                remaining: '剩餘時間：',
                progress: '飛行進度：',
                duration: '旅程長度：',
                status: '狀態：',
                minute: '分',
                second: '秒'
            },
            'en': {
                title: 'Flight Status',
                dest: 'Destination:',
                remaining: 'Time left:',
                progress: 'Progress:',
                duration: 'Duration:',
                status: 'Status:',
                minute: 'min',
                second: 's'
            }
        }[lang] || i18n?.['zh-TW'];

        // 獲取當前位置（上次降落位置）作為出發地
        const currentLocation = this.gameState.currentLocation || {
            name: '台北',
            countryCode: 'TPE',
            country: '台灣'
        };
        const originCode = currentLocation.countryCode || 'TPE';

        // 創建飛行狀態懸浮視窗（右上角）
        const flightStatus = document.createElement('div');
        flightStatus.className = 'flight-status-popup';
        flightStatus.classList.add(lang === 'en' ? 'lang-en' : 'lang-zh');
        flightStatus.innerHTML = `
            <div class="flight-status-content">
                <h3>✈️ ${i18n.title}</h3>
                <div class="flight-info">
                    <div class="info-item">
                        <span class="label">${i18n.dest}</span>
                        <span class="value">${destination.flag} ${destination.name}</span>
                    </div>
                    <div class="info-item timer-item">
                        <span class="label">⏱️ ${i18n.remaining}</span>
                        <span class="value" id="remainingTime">${timerMinutes} ${i18n.minute} 00 ${i18n.second}</span>
                    </div>
                    <div class="info-item progress-item">
                        <span class="label">📊 ${i18n.progress}</span>
                        <div class="progress-container">
                            <div class="progress-bar" id="flightProgressBar">
                                <div class="progress-fill" id="flightProgressFill" style="width: 0%"></div>
                    </div>
                            <span class="progress-text" id="flightProgressText">0%</span>
                    </div>
                </div>
                    <div class="info-item">
                        <span class="label">🕐 ${i18n.duration}</span>
                        <span class="value">${durationText}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">${i18n.status}</span>
                        <span class="value flight-status">準備起飛</span>
                    </div>
                </div>
                <div class="expand-toggle" id="expandToggle">
                    <span class="expand-arrow">▼</span>
                </div>
            </div>
        `;


        // 創建簡單機票（左下角）
        const flightNumber = `WU-${Math.floor(Math.random() * 9000) + 1000}`;
        const gateNumber = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');
        const seatNumber = `${Math.floor(Math.random() * 30) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`;
        const today = new Date().toISOString().split('T')[0];

        const simpleTicket = document.createElement('div');
        simpleTicket.className = 'simple-ticket-popup collapsed';
        simpleTicket.innerHTML = `
            <div class="simple-ticket-content">
                <div class="collapse-toggle" id="collapseToggle">
                    <span class="collapse-arrow">▲</span>
                </div>
                <div class="ticket-header">
                    <span class="airline-icon">✈️</span>
                    <span class="airline-name">WAKE UP</span>
                </div>
                <div class="ticket-route">
                    <span class="from">${originCode}</span>
                    <span class="arrow">→</span>
                    <span class="to">${destination.countryCode || 'XXX'}</span>
                </div>
                <div class="ticket-details">
                    <div class="detail-row">
                    <div class="detail-item">
                        <span class="detail-label">FLIGHT</span>
                            <span class="detail-value">${flightNumber}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">DATE</span>
                            <span class="detail-value">${today}</span>
                    </div>
                    </div>
                    <div class="detail-row">
                    <div class="detail-item">
                        <span class="detail-label">GATE</span>
                            <span class="detail-value">${gateNumber}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">SEAT</span>
                            <span class="detail-value">${seatNumber}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加到結果畫面容器（確保在地圖上方）
        const overlayContainer = document.getElementById('resultState') || document.body;
        overlayContainer.appendChild(flightStatus);
        overlayContainer.appendChild(simpleTicket);

        // 設置展開/收起功能
        const expandToggle = flightStatus.querySelector('#expandToggle');
        if (expandToggle) {
            expandToggle.addEventListener('click', () => {
                simpleTicket.classList.toggle('collapsed');
                const arrow = expandToggle.querySelector('.expand-arrow');
                if (arrow) {
                    arrow.textContent = simpleTicket.classList.contains('collapsed') ? '▼' : '▲';
                }
            });
        }

        // 設置收起功能（從下方面板）
        const collapseToggle = simpleTicket.querySelector('#collapseToggle');
        if (collapseToggle) {
            collapseToggle.addEventListener('click', () => {
                simpleTicket.classList.add('collapsed');
                const expandArrow = flightStatus.querySelector('.expand-arrow');
                if (expandArrow) {
                    expandArrow.textContent = '▼';
                }
            });
        }

        // 如果計時器還沒開始，立即開始計時器（進入地圖時自動開始）
        if (!this.gameState.timerStartTime || !this.gameState.timerEndTime) {
            console.log('🚀 地圖初始化時自動啟動計時器');
            const timerMinutes = this.gameState.timerDuration || 30;
            const now = this.now();
            this.gameState.timerStartTime = now;
            this.gameState.timerEndTime = new Date(now.getTime() + timerMinutes * 60 * 1000);
            this.saveGameState();
            console.log(`⏱️ 計時器已自動啟動：${timerMinutes}分鐘`);
        }

        // 開始實時更新計時器和進度（包含到達時間的實時更新）
        this.startFlightTimerUpdates(flightStatus, destination);

        // 模擬飛行狀態更新
        this.simulateFlightStatus(flightStatus, distance);
    }

    // 開始實時更新飛行計時器和進度
    startFlightTimerUpdates(flightStatusElement, destination) {
        // 保存計時器 ID，以便後續可以清除
        if (this.flightTimerUpdateInterval) {
            clearInterval(this.flightTimerUpdateInterval);
        }

        const updateTimer = () => {
            // 如果計時器還沒開始，繼續等待
            if (!this.gameState.timerStartTime || !this.gameState.timerEndTime) {
                // 顯示預設值
                const timerMinutes = this.gameState.timerDuration || 30;
                const remainingTimeEl = document.getElementById('remainingTime');
                if (remainingTimeEl) {
                    remainingTimeEl.textContent = `${timerMinutes} 分 00 秒`;
                }
                const progressFillEl = document.getElementById('flightProgressFill');
                const progressTextEl = document.getElementById('flightProgressText');
                if (progressFillEl) progressFillEl.style.width = '0%';
                if (progressTextEl) progressTextEl.textContent = '0%';
                return; // 繼續檢查，不停止
            }

            const now = this.now();
            const startTime = this.gameState.timerStartTime.getTime();
            const endTime = this.gameState.timerEndTime.getTime();
            const currentTime = now.getTime();

            // 計算剩餘時間
            const remainingMs = Math.max(0, endTime - currentTime);
            const remainingMinutes = Math.floor(remainingMs / 60000);
            const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

            // 更新剩餘時間顯示
            const remainingTimeEl = document.getElementById('remainingTime');
            if (remainingTimeEl) {
                remainingTimeEl.textContent = `${remainingMinutes} 分 ${String(remainingSeconds).padStart(2, '0')} 秒`;
            }

            // 計算進度百分比
            const totalTime = endTime - startTime;
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));

            // 更新進度條
            const progressFillEl = document.getElementById('flightProgressFill');
            const progressTextEl = document.getElementById('flightProgressText');
            if (progressFillEl) {
                progressFillEl.style.width = `${progress}%`;
            }
            if (progressTextEl) {
                progressTextEl.textContent = `${Math.round(progress)}%`;
            }

            // 更新預計到達時間（目的地當地時間）
            if (destination) {
                this.updateEstimatedArrivalTime(destination);
            }

            // 如果時間到了，停止更新
            if (remainingMs <= 0) {
                if (remainingTimeEl) remainingTimeEl.textContent = '00 分 00 秒';
                if (progressFillEl) progressFillEl.style.width = '100%';
                if (progressTextEl) progressTextEl.textContent = '100%';
                return;
            }
        };

        // 立即執行一次
        updateTimer();

        // 每秒更新一次（使用 setInterval 而不是 setTimeout，這樣即使計時器還沒開始也會持續檢查）
        this.flightTimerUpdateInterval = setInterval(updateTimer, 1000);
    }

    updateEstimatedArrivalTime(destination) {
        const arrivalTimeElement = document.getElementById('estimatedArrivalTime');
        if (!arrivalTimeElement) return;

        // 飛行計時器模式：根據計時長度計算到達時間（轉換為目的地當地時間）
        let arrivalTimeText;
        if (this.gameState.flightTimerMode) {
            const timerMinutes = this.gameState.timerDuration || 30;
            const now = this.now();

            // 當前位置時區（起點時區）
            const currentTimezone = this.getCurrentLocationTimezone();
            // 目的地時區（如果沒有則使用當前位置時區）
            const destinationTimezone = destination?.timezone || currentTimezone;
            // 時區差異（小時）
            const timezoneDiff = destinationTimezone - currentTimezone;

            // 先計算當前位置時間的到達時間
            const endTimeAtCurrentLocation = new Date(now.getTime() + timerMinutes * 60 * 1000);
            // 轉換為目的地當地時間（加上時區差異）
            const localEndTime = new Date(endTimeAtCurrentLocation.getTime() + timezoneDiff * 60 * 60 * 1000);

            const hours = String(localEndTime.getHours()).padStart(2, '0');
            const minutes = String(localEndTime.getMinutes()).padStart(2, '0');
            arrivalTimeText = `${hours}:${minutes}`;
        } else {
            // 原有的飛行天數計算
            if (destination.daysToArrive === 1) {
                arrivalTimeText = '明天 08:00';
            } else if (destination.daysToArrive === 2) {
                arrivalTimeText = '後天 08:00';
            } else if (destination.daysToArrive === 3) {
                arrivalTimeText = '3天後 08:00';
            } else {
                arrivalTimeText = `${destination.daysToArrive}天後 08:00`;
            }
        }

        arrivalTimeElement.textContent = arrivalTimeText;
    }

    simulateFlightStatus(flightStatusElement, distance) {
        const statusElement = flightStatusElement.querySelector('.flight-status');

        // 使用真實的飛行狀態計算，而不是模擬
        const updateStatus = () => {
            const realStatus = this.getCurrentFlightStatus();
            statusElement.textContent = realStatus;

            // 根據狀態設置不同的樣式
            let statusClass = 'flight-status';
            if (realStatus === '準備起飛') statusClass += ' status-preparing';
            else if (realStatus === '起飛中') statusClass += ' status-taking-off';
            else if (realStatus === '巡航中') statusClass += ' status-cruising';
            else if (realStatus === '準備降落') statusClass += ' status-landing';
            else if (realStatus === '降落中') statusClass += ' status-landing';
            else if (realStatus === '已降落') statusClass += ' status-landed';
            else statusClass += ' status-flying';

            statusElement.className = `value ${statusClass}`;

            console.log('飛行狀態更新:', realStatus);
        };

        // 立即更新一次
        updateStatus();

        // 每5秒更新一次狀態
        setInterval(updateStatus, 5000);
    }

    // 檢查是否準時（正負10分鐘）
    checkPunctuality() {
        console.log('🔍 開始檢查準時性...');

        // 使用系統時間
        const currentTime = new Date();
        console.log('🕐 使用系統時間:', currentTime);

        // 計算預計到達時間（根據目的地天數）
        const targetArrivalTime = this.calculateTargetArrivalTime();
        console.log('🎯 預計到達時間:', targetArrivalTime);

        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        const targetHour = targetArrivalTime.getHours();
        const targetMinute = targetArrivalTime.getMinutes();

        // 檢查日期是否相同
        const currentDate = currentTime.toDateString();
        const targetDate = targetArrivalTime.toDateString();
        const isSameDate = currentDate === targetDate;

        console.log(`📅 日期檢查: 當前日期 ${currentDate}, 目標日期 ${targetDate}, 是否同一天 ${isSameDate}`);

        if (!isSameDate) {
            console.log('❌ 日期不同，視為遲到');
            return 'LATE';
        }

        // 計算時間差（分鐘）
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const targetTotalMinutes = targetHour * 60 + targetMinute;
        const timeDifference = Math.abs(currentTotalMinutes - targetTotalMinutes);

        console.log(`🕐 時間檢查: 當前 ${currentHour}:${currentMinute.toString().padStart(2, '0')}, 目標 ${targetHour}:${targetMinute.toString().padStart(2, '0')}, 差異 ${timeDifference} 分鐘`);

        if (timeDifference <= 10) {
            console.log('✅ 準時！');
            return 'ON_TIME';
        } else {
            console.log('❌ 遲到！');
            return 'LATE';
        }
    }

    // 計算預計到達時間
    calculateTargetArrivalTime() {
        if (!this.gameState.selectedDestination) {
            // 如果沒有選擇目的地，使用預設的08:00
            const now = new Date();
            now.setHours(8, 0, 0, 0);
            return now;
        }

        const destination = this.gameState.selectedDestination;
        const now = this.now();

        // 飛行計時器模式：使用設定的計時長度
        if (this.gameState.flightTimerMode) {
            const timerMinutes = this.gameState.timerDuration || 30;
            const endTime = new Date(now.getTime() + timerMinutes * 60 * 1000);
            return endTime;
        }

        // 原有的飛行天數計算
        if (destination.daysToArrive === 1) {
            // 明天8:00
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(8, 0, 0, 0);
            return tomorrow;
        } else if (destination.daysToArrive === 2) {
            // 後天8:00
            const dayAfterTomorrow = new Date(now);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            dayAfterTomorrow.setHours(8, 0, 0, 0);
            return dayAfterTomorrow;
        } else if (destination.daysToArrive === 3) {
            // 3天後8:00
            const threeDaysLater = new Date(now);
            threeDaysLater.setDate(threeDaysLater.getDate() + 3);
            threeDaysLater.setHours(8, 0, 0, 0);
            return threeDaysLater;
        } else {
            // 其他天數
            const arrivalDate = new Date(now);
            arrivalDate.setDate(arrivalDate.getDate() + destination.daysToArrive);
            arrivalDate.setHours(8, 0, 0, 0);
            return arrivalDate;
        }
    }

    // 巴特按鈕點擊處理
    async handleBattClick() {
        console.log('🎯 巴特按鈕被點擊');

        const punctuality = this.checkPunctuality();
        const statusElement = document.querySelector('.flight-status');

        if (!statusElement) {
            console.log('❌ 找不到飛行狀態元素');
            return;
        }

        if (punctuality === 'ON_TIME') {
            // 準時降落
            statusElement.textContent = '準時降落';
            statusElement.className = 'value flight-status on-time';
            console.log('✅ 準時降落！');

            // 播放降落廣播（計算準時性狀態）
            if (this.gameState.flightTimerMode && this.gameState.selectedDestination) {
                const punctuality = this.getPunctualityStatus();
                await this.playSleepFlightAnnouncement('landing', this.gameState.selectedDestination, punctuality);
            }

            // 顯示成功訊息
            alert('✈️ 準時降落\n\n恭喜！您準時抵達目的地！');
        } else {
            // 遇到亂流
            statusElement.textContent = '飛機遇到亂流還在飛行中';
            statusElement.className = 'value flight-status turbulence';
            console.log('⚠️ 飛機遇到亂流，還在飛行中');

            // 顯示亂流訊息
            alert('✈️ 遇到亂流\n\n飛機遇到亂流，請稍後再試！');
        }
    }

    setupTimeControls() {
        const updateTimeBtn = document.getElementById('updateTime');
        const customDate = document.getElementById('customDate');
        const customTime = document.getElementById('customTime');

        if (updateTimeBtn && customDate && customTime) {
            updateTimeBtn.addEventListener('click', () => {
                const selectedDate = customDate.value;
                const selectedTime = customTime.value;

                if (selectedDate && selectedTime) {
                    // 創建自定義日期時間
                    const customDateTime = new Date(`${selectedDate}T${selectedTime}`);

                    // 更新遊戲狀態中的時間
                    this.gameState.customDateTime = customDateTime;

                    // 更新頁面顯示
                    this.updateDateTimeDisplay(customDateTime);

                    // 顯示成功訊息
                    this.showTimeUpdateMessage(customDateTime);
                }
            });
        }
    }

    updateDateTimeDisplay(customDateTime) {
        // 更新主頁面的日期顯示
        const wakeupDateEl = document.getElementById('wakeupDate');
        if (wakeupDateEl) {
            const options = {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                weekday: 'short'
            };
            wakeupDateEl.textContent = customDateTime.toLocaleDateString('zh-TW', options);
        }

        // 更新其他可能需要時間的地方
        console.log('🕐 時間已更新為:', customDateTime.toLocaleString('zh-TW'));
    }

    showTimeUpdateMessage(customDateTime) {
        // 創建臨時提示訊息
        const message = document.createElement('div');
        message.className = 'time-update-message';
        message.innerHTML = `
            <div class="message-content">
                ✅ 時間已更新為：${customDateTime.toLocaleString('zh-TW')}
            </div>
        `;

        document.body.appendChild(message);

        // 3秒後移除訊息
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }

    showGameStartMessage() {
        const destination = this.gameState.selectedDestination;

        // 飛行計時器模式：根據計時長度計算到達時間（轉換為目的地當地時間）
        let arrivalTimeText;
        if (this.gameState.flightTimerMode) {
            const timerMinutes = this.gameState.timerDuration || 30;
            const now = this.now();

            // 當前位置時區（起點時區）
            const currentTimezone = this.getCurrentLocationTimezone();
            // 目的地時區（如果沒有則使用當前位置時區）
            const destinationTimezone = destination?.timezone || currentTimezone;
            // 時區差異（小時）
            const timezoneDiff = destinationTimezone - currentTimezone;

            // 先計算當前位置時間的到達時間
            const endTimeAtCurrentLocation = new Date(now.getTime() + timerMinutes * 60 * 1000);
            // 轉換為目的地當地時間（加上時區差異）
            const localEndTime = new Date(endTimeAtCurrentLocation.getTime() + timezoneDiff * 60 * 60 * 1000);

            const hours = String(localEndTime.getHours()).padStart(2, '0');
            const minutes = String(localEndTime.getMinutes()).padStart(2, '0');
            arrivalTimeText = `${hours}:${minutes}`;
        } else {
            // 舊模式保留原本邏輯
            if (destination.daysToArrive === 1) {
                arrivalTimeText = '隔天 08:00';
            } else if (destination.daysToArrive === 2) {
                arrivalTimeText = '後天 08:00';
            } else if (destination.daysToArrive === 3) {
                arrivalTimeText = '3天後 08:00';
            } else {
                arrivalTimeText = `${destination.daysToArrive}天後 08:00`;
            }
        }

        const durationText = this.formatDuration(this.gameState.timerDuration || 30);

        const message = `
            ✈️ 機票購買成功！
            
            🎫 目的地：${destination.flag} ${destination.name}
            🕐 旅程長度：${durationText}
            📍 區域：${destination.country}
            
            🎮 旅程即將開始！
        `;

        alert(message);
    }

    setupCompactTimeControls() {
        const updateTimeBtn = document.getElementById('updateTime');
        const customDate = document.getElementById('customDate');
        const customTime = document.getElementById('customTime');

        if (updateTimeBtn && customDate && customTime) {
            updateTimeBtn.addEventListener('click', () => {
                const selectedDate = customDate.value;
                const selectedTime = customTime.value;

                if (selectedDate && selectedTime) {
                    // 創建自定義日期時間
                    const customDateTime = new Date(`${selectedDate}T${selectedTime}`);

                    // 更新遊戲狀態中的時間
                    this.gameState.customDateTime = customDateTime;

                    // 更新頁面顯示
                    this.updateDateTimeDisplay(customDateTime);

                    // 顯示成功訊息
                    this.showTimeUpdateMessage(customDateTime);
                }
            });
        }
    }


    setInitialDate() {
        const today = new Date();
        const dateStr = today.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-');

        document.getElementById('departureDate').textContent = dateStr;
    }

    getCurrentDate() {
        const today = new Date();
        return today.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-');
    }

    // 獲取當前位置的時區（UTC偏移小時數）
    getCurrentLocationTimezone() {
        const currentLocation = this.gameState.currentLocation;
        if (currentLocation && currentLocation.timezone !== undefined) {
            return currentLocation.timezone;
        }
        // 如果沒有當前位置，嘗試從快取獲取
        try {
            const cached = localStorage.getItem('lastKnownLocation');
            if (cached) {
                const loc = JSON.parse(cached);
                if (loc && loc.timezone !== undefined) {
                    return loc.timezone;
                }
            }
        } catch (e) {
            console.warn('讀取快取位置時區失敗:', e);
        }
        // 預設台灣時區（UTC+8）
        return 8;
    }

    // 睡眠航班相關方法
    async getCurrentLocation() {
        try {
            // 優先使用 gameState 中的當前位置
            if (this.gameState.currentLocation && this.gameState.currentLocation.coordinates) {
                return this.gameState.currentLocation;
            }

            // 其次使用本地快取的上一個位置
            const cached = localStorage.getItem('lastKnownLocation');
            if (cached) {
                const loc = JSON.parse(cached);
                if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
                    // 確保有時區資訊
                    if (!loc.timezone) {
                        loc.timezone = 8; // 預設台灣時區
                    }
                    this.gameState.currentLocation = loc;
                    return loc;
                }
            }
            // 嘗試從最後的記錄獲取位置（從 Firebase 查詢上次降落位置）
            const latestRecord = await this.getLatestRecord();
            if (latestRecord) {
                // 從 Firebase 記錄獲取時區（如果有的話）
                const timezone = latestRecord.timezone || 8;

                const location = {
                    name: latestRecord.city_zh || latestRecord.city,
                    country: latestRecord.country_zh || latestRecord.country,
                    countryCode: latestRecord.countryCode || 'TW',
                    coordinates: [latestRecord.latitude, latestRecord.longitude],
                    timezone: timezone,
                    latitude: latestRecord.latitude,
                    longitude: latestRecord.longitude
                };
                this.gameState.currentLocation = location;
                // 同時保存到 localStorage
                localStorage.setItem('lastKnownLocation', JSON.stringify(location));
                console.log('📍 已從 Firebase 載入上次降落位置:', location.name, '時區:', timezone);
                return location;
            }

            // 如果沒有記錄，使用預設位置（台北）
            const defaultLocation = {
                name: '台北',
                country: '台灣',
                countryCode: 'TPE',
                coordinates: [25.0330, 121.5654],
                timezone: 8,
                latitude: 25.0330,
                longitude: 121.5654
            };
            this.gameState.currentLocation = defaultLocation;
            return defaultLocation;
        } catch (error) {
            console.error('獲取當前位置失敗:', error);
            const defaultLocation = {
                name: '台北',
                country: '台灣',
                countryCode: 'TPE',
                coordinates: [25.0330, 121.5654],
                timezone: 8,
                latitude: 25.0330,
                longitude: 121.5654
            };
            this.gameState.currentLocation = defaultLocation;
            return defaultLocation;
        }
    }

    // 載入當前位置和統計資料
    async loadCurrentLocationAndStats() {
        try {
            // 載入當前位置
            const currentLocation = await this.getCurrentLocation();
            if (currentLocation) {
                this.gameState.currentLocation = currentLocation;
                this.updateCurrentLocationDisplay();

                // 如果有當前位置（上次降落位置），顯示機票（即使沒有選中目的地）
                // 這樣可以顯示「從上次降落位置出發」的狀態
                this.showTicketInLocationPanel();
            }

            // 載入統計資料
            await this.loadFlightStatistics();
        } catch (e) {
            console.error('載入當前位置和統計資料失敗:', e);
        }
    }

    // 更新當前位置顯示
    updateCurrentLocationDisplay() {
        const currentCityName = document.getElementById('currentCityName');
        const currentCitySubtitle = document.querySelector('.location-subtitle');
        const location = this.gameState.currentLocation;

        if (!location) return;

        const lang = this.gameState.language || 'zh-TW';
        const cityName = location.name || '台北';
        const countryName = location.country || 'Taiwan';
        const flag = this.getCountryFlag(location.countryCode || 'TW');

        if (currentCityName) {
            currentCityName.textContent = (lang === 'en')
                ? `Current location: ${cityName}`
                : `當前位置：${cityName}`;
        }
        if (currentCitySubtitle) {
            currentCitySubtitle.textContent = `${cityName}, ${countryName} ${flag}`;
        }
    }

    // 載入飛行統計資料
    async loadFlightStatistics() {
        try {
            if (!window.firebaseSDK || !window.firebaseSDK.getFirestore) {
                console.log('📍 Firebase 未初始化，無法載入統計資料');
                this.updateFlightStatisticsDisplay({ totalFlights: 0, totalDistance: 0, visitedCities: 0 });
                return;
            }

            const db = window.firebaseSDK.getFirestore();
            if (!db) {
                console.log('📍 Firebase 資料庫未初始化，無法載入統計資料');
                this.updateFlightStatisticsDisplay({ totalFlights: 0, totalDistance: 0, visitedCities: 0 });
                return;
            }

            const APP_ID = 'default-app-id-worldclock-history';
            const user = (window.env && window.env.USER_NAME) || 'morgan';

            // 使用模組化的 Firebase SDK 語法（與 getLatestRecord 一致）
            const { collection, query, where, orderBy, getDocs } = window.firebaseSDK;
            const flightCollection = collection(db, 'artifacts', APP_ID, 'userProfiles', user, 'Flight');

            // 查詢所有已完成的飛行
            const flightQuery = query(
                flightCollection,
                where('status', '==', 'completed'),
                orderBy('updatedAt', 'desc')
            );

            const snapshot = await getDocs(flightQuery);

            let totalFlights = 0;
            let totalDistance = 0;
            const visitedCitiesSet = new Set();

            snapshot.forEach(doc => {
                const data = doc.data();
                totalFlights++;

                // 累加飛行距離
                if (data.flightDistance && typeof data.flightDistance === 'number') {
                    totalDistance += data.flightDistance;
                }

                // 記錄訪問的城市
                if (data.destination) {
                    const cityKey = `${data.destination.city || ''}_${data.destination.country || ''}`;
                    if (cityKey && cityKey !== '_') {
                        visitedCitiesSet.add(cityKey);
                    }
                }
            });

            const stats = {
                totalFlights,
                totalDistance: Math.round(totalDistance),
                visitedCities: visitedCitiesSet.size
            };

            console.log('📊 飛行統計資料:', stats);
            this.updateFlightStatisticsDisplay(stats);
        } catch (e) {
            console.error('載入飛行統計資料失敗:', e);
            this.updateFlightStatisticsDisplay({ totalFlights: 0, totalDistance: 0, visitedCities: 0 });
        }
    }

    // 更新飛行統計資料顯示
    updateFlightStatisticsDisplay(stats) {
        const totalFlightsEl = document.getElementById('totalFlights');
        const totalDistanceEl = document.getElementById('totalDistance');
        const visitedCitiesEl = document.getElementById('visitedCities');

        if (totalFlightsEl) totalFlightsEl.textContent = stats.totalFlights || 0;
        if (totalDistanceEl) {
            const lang = this.gameState.language || 'zh-TW';
            totalDistanceEl.textContent = `${stats.totalDistance || 0} ${lang === 'en' ? 'km' : '公里'}`;
        }
        if (visitedCitiesEl) visitedCitiesEl.textContent = stats.visitedCities || 0;

        // 保存統計資料供歷史視窗使用
        this.flightStatistics = stats;
    }

    // 顯示歷史機票視窗
    async showFlightHistoryModal() {
        try {
            if (!window.firebaseSDK || !window.firebaseSDK.getFirestore) {
                alert('無法載入歷史記錄：Firebase 未初始化');
                return;
            }

            const db = window.firebaseSDK.getFirestore();
            if (!db) {
                alert('無法載入歷史記錄：資料庫未初始化');
                return;
            }

            const APP_ID = 'default-app-id-worldclock-history';
            const user = (window.env && window.env.USER_NAME) || 'morgan';
            const { collection, query, where, orderBy, getDocs } = window.firebaseSDK;
            const flightCollection = collection(db, 'artifacts', APP_ID, 'userProfiles', user, 'Flight');

            // 查詢所有已完成的飛行（按時間倒序）
            const flightQuery = query(
                flightCollection,
                where('status', '==', 'completed'),
                orderBy('updatedAt', 'desc')
            );

            const snapshot = await getDocs(flightQuery);
            const flights = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                flights.push({
                    id: doc.id,
                    ...data
                });
            });

            // 創建或獲取歷史視窗
            let historyModal = document.getElementById('flightHistoryModal');
            if (!historyModal) {
                historyModal = document.createElement('div');
                historyModal.id = 'flightHistoryModal';
                historyModal.className = 'flight-history-modal';
                document.body.appendChild(historyModal);
            }

            const lang = this.gameState.language || 'zh-TW';
            const i18n = {
                'zh-TW': {
                    title: '飛行歷史',
                    noFlights: '尚無飛行記錄',
                    origin: '出發地',
                    destination: '目的地',
                    date: '日期',
                    status: '狀態',
                    distance: '距離',
                    success: '成功',
                    early: '提早',
                    ontime: '準時',
                    late: '誤點',
                    perfect: '完美',
                    close: '關閉'
                },
                'en': {
                    title: 'Flight History',
                    noFlights: 'No flight records yet',
                    origin: 'Origin',
                    destination: 'Destination',
                    date: 'Date',
                    status: 'Status',
                    distance: 'Distance',
                    success: 'Success',
                    early: 'Early',
                    ontime: 'On Time',
                    late: 'Late',
                    perfect: 'Perfect',
                    close: 'Close'
                }
            }[lang] || {
                title: '飛行歷史',
                noFlights: '尚無飛行記錄',
                origin: '出發地',
                destination: '目的地',
                date: '日期',
                status: '狀態',
                distance: '距離',
                success: '成功',
                early: '提早',
                ontime: '準時',
                late: '誤點',
                perfect: '完美',
                close: '關閉'
            };

            // 生成歷史記錄列表
            let historyContent = '';
            if (flights.length === 0) {
                historyContent = `<div class="history-empty">${i18n.noFlights}</div>`;
            } else {
                historyContent = flights.map(flight => {
                    const origin = flight.origin || {};
                    const dest = flight.destination || {};
                    const punctuality = flight.punctuality || {};
                    const status = punctuality.status || 'ON_TIME';

                    // 格式化日期
                    let dateStr = '';
                    if (flight.updatedAt) {
                        try {
                            const date = flight.updatedAt.toDate ? flight.updatedAt.toDate() : new Date(flight.updatedAt);
                            dateStr = date.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW');
                        } catch (e) {
                            dateStr = 'N/A';
                        }
                    }

                    // 狀態標籤
                    let statusLabel = '';
                    let statusClass = '';
                    if (status === 'PERFECT') {
                        statusLabel = i18n.perfect;
                        statusClass = 'status-perfect';
                    } else if (status === 'EARLY') {
                        statusLabel = i18n.early;
                        statusClass = 'status-early';
                    } else if (status === 'ON_TIME') {
                        statusLabel = i18n.ontime;
                        statusClass = 'status-ontime';
                    } else {
                        statusLabel = i18n.late;
                        statusClass = 'status-late';
                    }

                    return `
                        <div class="history-item">
                            <div class="history-route">
                                <div class="history-origin">
                                    <div class="history-city-code">${origin.countryCode || 'XXX'}</div>
                                    <div class="history-city-name">${origin.city || 'Unknown'}</div>
                                </div>
                                <div class="history-arrow">→</div>
                                <div class="history-destination">
                                    <div class="history-city-code">${dest.countryCode || 'XXX'}</div>
                                    <div class="history-city-name">${dest.city || 'Unknown'}</div>
                                </div>
                            </div>
                            <div class="history-details">
                                <div class="history-detail-item">
                                    <span class="history-label">${i18n.date}</span>
                                    <span class="history-value">${dateStr}</span>
                                </div>
                                <div class="history-detail-item">
                                    <span class="history-label">${i18n.status}</span>
                                    <span class="history-value ${statusClass}">${statusLabel}</span>
                                </div>
                                <div class="history-detail-item">
                                    <span class="history-label">${i18n.distance}</span>
                                    <span class="history-value">${flight.flightDistance || 0} km</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            historyModal.innerHTML = `
                <div class="history-modal-content">
                    <div class="history-modal-header">
                        <h2 class="history-modal-title">${i18n.title}</h2>
                        <button class="history-modal-close" id="closeHistoryModal">&times;</button>
                    </div>
                    <div class="history-modal-body">
                        ${historyContent}
                    </div>
                </div>
            `;

            // 顯示視窗
            historyModal.style.display = 'flex';

            // 關閉按鈕事件
            const closeBtn = document.getElementById('closeHistoryModal');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    historyModal.style.display = 'none';
                };
            }

            // 點擊背景關閉
            historyModal.onclick = (e) => {
                if (e.target === historyModal) {
                    historyModal.style.display = 'none';
                }
            };

        } catch (e) {
            console.error('載入飛行歷史失敗:', e);
            alert('載入飛行歷史失敗，請稍後再試');
        }
    }

    async getLatestRecord() {
        try {
            // 檢查 Firebase 是否可用
            if (!window.firebaseSDK || !window.firebaseSDK.getFirestore) {
                console.log('📍 Firebase 未初始化，使用預設位置');
                return null;
            }

            const db = window.firebaseSDK.getFirestore();
            if (!db) {
                console.log('📍 Firebase 資料庫未初始化，使用預設位置');
                return null;
            }

            const userName = (window.env && window.env.USER_NAME) || 'morgan';
            const user = userName.toLowerCase();
            const APP_ID = 'default-app-id-worldclock-history';

            // 首先嘗試從 Flight 記錄中獲取最新降落記錄
            try {
                const { collection, query, where, orderBy, limit, getDocs } = window.firebaseSDK;
                const flightCollection = collection(db, 'artifacts', APP_ID, 'userProfiles', user, 'Flight');

                // 查詢狀態為 'completed' 或 'landing' 的記錄（已降落的飛行）
                const flightQuery = query(
                    flightCollection,
                    where('status', 'in', ['completed', 'landing', 'landed']),
                    orderBy('updatedAt', 'desc'),
                    limit(1)
                );

                const flightSnapshot = await getDocs(flightQuery);

                if (!flightSnapshot.empty) {
                    const latestFlight = flightSnapshot.docs[0].data();
                    const destination = latestFlight.destination;

                    if (destination && destination.city && destination.lat && destination.lng) {
                        console.log('📍 從 Flight 記錄獲取上次降落位置:', destination.city);

                        // 嘗試從城市資料中獲取時區
                        let timezone = 8; // 預設台灣時區
                        if (destination.lat && destination.lng) {
                            // 可以嘗試從城市資料庫匹配時區，暫時使用預設值
                            // 或從 matchedCityUTCOffset 獲取（如果有的話）
                            if (latestFlight.matchedCityUTCOffset !== undefined) {
                                timezone = latestFlight.matchedCityUTCOffset;
                            } else if (latestFlight.targetUTCOffset !== undefined) {
                                timezone = latestFlight.targetUTCOffset;
                            }
                        }

                        return {
                            city: destination.city,
                            city_zh: destination.city_zh || destination.city,
                            country: destination.country,
                            country_zh: destination.country_zh || destination.country,
                            countryCode: destination.countryCode,
                            latitude: destination.lat,
                            longitude: destination.lng,
                            timezone: timezone
                        };
                    }
                }
            } catch (flightError) {
                console.warn('⚠️ 查詢 Flight 記錄失敗，嘗試查詢 wakeup_records:', flightError);
            }

            // 如果 Flight 記錄查詢失敗，嘗試從 wakeup_records 獲取最新記錄
            try {
                const { collection, query, where, orderBy, limit, getDocs } = window.firebaseSDK;
                const wakeupRecordsCollection = collection(db, 'wakeup_records');

                // 查詢該用戶的最新記錄
                const recordsQuery = query(
                    wakeupRecordsCollection,
                    where('userDisplayName', '==', userName),
                    orderBy('recordedAt', 'desc'),
                    limit(1)
                );

                const recordsSnapshot = await getDocs(recordsQuery);

                if (!recordsSnapshot.empty) {
                    const latestRecord = recordsSnapshot.docs[0].data();

                    if (latestRecord.city && latestRecord.latitude && latestRecord.longitude) {
                        console.log('📍 從 wakeup_records 獲取上次位置:', latestRecord.city);

                        // 獲取時區資訊
                        let timezone = 8; // 預設台灣時區
                        if (latestRecord.matchedCityUTCOffset !== undefined) {
                            timezone = latestRecord.matchedCityUTCOffset;
                        } else if (latestRecord.targetUTCOffset !== undefined) {
                            timezone = latestRecord.targetUTCOffset;
                        }

                        return {
                            city: latestRecord.city,
                            city_zh: latestRecord.city_zh || latestRecord.city,
                            country: latestRecord.country,
                            country_zh: latestRecord.country_zh || latestRecord.country,
                            latitude: latestRecord.latitude,
                            longitude: latestRecord.longitude,
                            timezone: timezone
                        };
                    }
                }
            } catch (recordsError) {
                console.warn('⚠️ 查詢 wakeup_records 失敗:', recordsError);
            }

            console.log('📍 沒有找到 Firebase 記錄，使用預設位置（台北）');
            return null;
        } catch (error) {
            console.error('❌ 獲取最新記錄失敗:', error);
            return null;
        }
    }

    async calculateFlightTimerDestinations(currentLocation, timerMinutes) {
        // 確保最短30分鐘
        const validTimerMinutes = Math.max(30, timerMinutes || 30);
        console.log('🚀 開始計算目的地（計時器模式）計時長度:', validTimerMinutes, '分鐘');
        console.log('📍 接收到的 currentLocation:', currentLocation);

        // 提取當前位置座標
        const currentLoc = (() => {
            if (currentLocation) {
                if (typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number') {
                    console.log('✅ 使用 currentLocation.latitude/longitude:', currentLocation.latitude, currentLocation.longitude);
                    return { latitude: currentLocation.latitude, longitude: currentLocation.longitude };
                }
                if (Array.isArray(currentLocation.coordinates) && currentLocation.coordinates.length === 2) {
                    const [lat, lng] = currentLocation.coordinates;
                    console.log('✅ 使用 currentLocation.coordinates:', lat, lng);
                    return { latitude: Number(lat), longitude: Number(lng) };
                }
            }
            console.warn('⚠️ 無法從 currentLocation 提取座標，使用預設位置（台北）');
            return { latitude: 25.0330, longitude: 121.5654 }; // 台北
        })();

        const origin = { latitude: currentLoc.latitude, longitude: currentLoc.longitude };
        const originCoords = [origin.latitude, origin.longitude];
        console.log('📍 最終使用的起點座標:', originCoords);

        // 載入城市資料
        const cities = await this.loadCitiesData();
        console.log('📊 載入的城市資料總數:', cities.length);
        console.log('📊 是否使用 fallback:', this.usedCitiesFallback);
        console.log('📊 countryCandidates 數量:', this.countryCandidates ? this.countryCandidates.length : 0);

        // 如果 countryCandidates 太少（少於 100 個），改用全部城市列表以獲得更多選項
        const pool = (this.countryCandidates && this.countryCandidates.length > 100)
            ? this.countryCandidates
            : cities;
        console.log('📊 使用的候選城市池大小:', pool.length);
        if (this.countryCandidates && this.countryCandidates.length <= 100) {
            console.log('⚠️ countryCandidates 數量過少，改用全部城市列表以獲得更多選項');
        }

        // 根據計時長度計算最大飛行距離
        // 假設飛機速度 800km/h，30分鐘 = 0.5小時 * 800 = 400km
        const FLIGHT_SPEED_KMH = 800; // 飛機時速
        const maxDistanceKm = (validTimerMinutes / 60) * FLIGHT_SPEED_KMH;
        console.log(`✈️ 計時 ${validTimerMinutes} 分鐘，最大飛行距離: ${maxDistanceKm.toFixed(0)}km (嚴格限制)`);

        // 計算所有城市到起點的距離
        const withDistance = pool.map(c => ({
            ...c,
            distanceKm: this.calculateDistance(originCoords, [c.latitude, c.longitude])
        })).filter(c => c.distanceKm > 0);
        console.log('📊 計算距離後的城市數量:', withDistance.length);
        if (withDistance.length > 0) {
            const minDist = Math.min(...withDistance.map(c => c.distanceKm));
            const maxDist = Math.max(...withDistance.map(c => c.distanceKm));
            console.log(`📊 距離範圍: ${minDist.toFixed(0)}km - ${maxDist.toFixed(0)}km`);
        }

        // 篩選距離範圍內的城市（降低最小距離到 50km，讓選項更多元）
        const minDistanceKm = 50; // 最小距離，降低以獲得更多選項
        let candidates = withDistance
            .filter(c => c.distanceKm >= minDistanceKm && c.distanceKm <= maxDistanceKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);
        console.log(`📊 在 ${minDistanceKm}-${maxDistanceKm.toFixed(0)}km 範圍內的城市數量:`, candidates.length);

        // 如果候選城市太少，稍微放寬距離範圍（最多到 1.2 倍，更嚴格）
        // 但不會無限制擴大，保持合理的飛行時間
        if (candidates.length < 10) {
            const expandedMax = Math.min(maxDistanceKm * 1.2, maxDistanceKm + 200); // 最多增加200km或20%
            candidates = withDistance
                .filter(c => c.distanceKm >= minDistanceKm && c.distanceKm <= expandedMax)
                .sort((a, b) => a.distanceKm - b.distanceKm);
            console.log(`⚠️ 候選城市較少，稍微放寬距離範圍至 ${expandedMax.toFixed(0)}km，現在有 ${candidates.length} 個候選城市`);
        }

        // 依國家分組，挑「最近」或「更耳熟能詳」的城市
        const nameBoost = new Set([
            'Tokyo', 'Seoul', 'Singapore', 'Bangkok', 'Hong Kong', 'Manila', 'Kuala Lumpur', 'Jakarta', 'Ho Chi Minh City', 'Hanoi',
            'Beijing', 'Shanghai', 'Osaka', 'Kyoto', 'Sydney', 'Melbourne', 'Perth', 'Auckland', 'Wellington',
            'London', 'Paris', 'Berlin', 'Rome', 'Madrid', 'Amsterdam', 'Zurich', 'Vienna', 'Prague', 'Warsaw',
            'New York', 'Los Angeles', 'Chicago', 'Toronto', 'Vancouver', 'Mexico City', 'Sao Paulo', 'Buenos Aires'
        ]);
        const cityScore = (c) => {
            // 分數越低越好（主排序距離，副排序熱門度）
            let bonus = 0;
            const cityName = (c.name || '').trim();
            if (nameBoost.has(cityName)) bonus -= 200; // 熱門城市給負分讓它靠前
            if (c.population) bonus -= Math.min(100, Math.floor(Number(c.population) / 1_000_000));
            return c.distanceKm + bonus;
        };

        // 按國家分組，每個國家選最佳城市
        const countryBest = new Map();
        for (const c of candidates) {
            const key = c.countryCode;
            const prev = countryBest.get(key);
            if (!prev || cityScore(c) < cityScore(prev)) countryBest.set(key, c);
        }
        candidates = Array.from(countryBest.values()).sort((a, b) => a.distanceKm - b.distanceKm);
        console.log(`📊 按國家分組後，有 ${candidates.length} 個不同國家的候選城市`);

        const pickUniqueCountries = (list) => {
            const top = [];
            const seen = new Set();

            // 先按距離排序
            const sorted = [...list].sort((a, b) => a.distanceKm - b.distanceKm);
            const total = sorted.length;

            // 將候選城市分成幾個距離範圍，增加多樣性
            const ranges = [
                { min: 0, max: Math.max(1, Math.floor(total * 0.3)) },      // 前 30%（最近）
                { min: Math.floor(total * 0.3), max: Math.floor(total * 0.6) },   // 30%-60%
                { min: Math.floor(total * 0.6), max: Math.floor(total * 0.9) },   // 60%-90%
                { min: Math.floor(total * 0.9), max: total }                      // 90%-100%（較遠）
            ];

            // 從每個範圍中隨機選擇一個不同國家的城市
            for (const range of ranges) {
                if (top.length >= 4) break;

                const inRange = sorted.slice(range.min, range.max);
                // 過濾掉已經選過的國家
                const available = inRange.filter(c => !seen.has(c.countryCode));

                if (available.length > 0) {
                    // 隨機選擇一個
                    const randomIndex = Math.floor(Math.random() * available.length);
                    const chosen = available[randomIndex];
                    seen.add(chosen.countryCode);
                    top.push({
                        ...chosen,
                        flag: this.countryCodeToEmoji(chosen.countryCode),
                        price: this.calculateFlightPrice(chosen.distanceKm),
                        unlocked: true
                    });
                }
            }

            // 如果還沒選夠4個，從剩餘候選中隨機補充
            if (top.length < 4) {
                const remaining = sorted.filter(c => !seen.has(c.countryCode));
                while (top.length < 4 && remaining.length > 0) {
                    const randomIndex = Math.floor(Math.random() * remaining.length);
                    const chosen = remaining.splice(randomIndex, 1)[0];
                    seen.add(chosen.countryCode);
                    top.push({
                        ...chosen,
                        flag: this.countryCodeToEmoji(chosen.countryCode),
                        price: this.calculateFlightPrice(chosen.distanceKm),
                        unlocked: true
                    });
                }
            }

            return top;
        };

        let top = pickUniqueCountries(candidates);
        console.log(`📊 初步選擇了 ${top.length} 個目的地`);

        // 如果不足4個國家，稍微擴大搜尋範圍（但嚴格限制，最多到1.5倍距離）
        // 這樣可以保持飛行時間的合理性
        if (top.length < 4) {
            const maxExpand = Math.min(maxDistanceKm * 1.5, maxDistanceKm + 300); // 最多增加300km或50%
            let expand = maxDistanceKm * 1.1; // 從1.1倍開始
            const expandStep = maxDistanceKm * 0.1; // 每次增加10%

            while (top.length < 4 && expand <= maxExpand) {
                const more = withDistance
                    .filter(c => c.distanceKm >= minDistanceKm && c.distanceKm <= expand)
                    .sort((a, b) => a.distanceKm - b.distanceKm);
                const newTop = pickUniqueCountries(more);
                if (newTop.length > top.length) {
                    top = newTop;
                    console.log(`📊 擴大搜尋範圍至 ${expand.toFixed(0)}km，找到 ${top.length} 個目的地`);
                }
                expand += expandStep;
            }
        }

        // 如果還是不到4個，只從合理距離內選擇（不無限制擴大）
        // 寧可顯示較少的目的地，也不要顯示不合理距離的目的地
        if (top.length < 4) {
            const reasonableMax = Math.min(maxDistanceKm * 1.5, maxDistanceKm + 300);
            console.log(`⚠️ 候選城市仍不足，從合理距離內選擇（最多 ${reasonableMax.toFixed(0)}km）`);
            const reasonableCandidates = withDistance
                .filter(c => c.distanceKm >= minDistanceKm && c.distanceKm <= reasonableMax)
                .sort((a, b) => a.distanceKm - b.distanceKm);
            const finalTop = pickUniqueCountries(reasonableCandidates);
            if (finalTop.length > top.length) {
                top = finalTop;
                console.log(`✅ 從合理距離內找到 ${top.length} 個目的地`);
            } else {
                console.log(`⚠️ 在合理距離內仍只有 ${top.length} 個目的地，將顯示這些選項`);
            }
        }

        console.log(`✅ 最終選擇的 ${top.length} 個目的地（計時 ${validTimerMinutes} 分鐘）:`);
        top.forEach((dest, idx) => {
            console.log(`  ${idx + 1}. ${dest.flag} ${dest.name}, ${dest.country} (${dest.distanceKm.toFixed(0)}km)`);
        });
        return top;
    }

    // 計算兩點間距離（公里）
    calculateDistance(coord1, coord2) {
        const R = 6371; // 地球半徑
        const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
        const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    // 計算提早降落的中途城市
    async calculateEarlyLandingCity(punctuality) {
        const origin = this.gameState.currentLocation;
        const destination = this.gameState.selectedDestination;

        if (!origin || !destination) {
            console.warn('⚠️ 無法計算中途降落城市：缺少起點或目的地');
            return destination; // 如果沒有起點或目的地，降落在目的地
        }

        // 計算實際飛行時間（分鐘）
        if (!this.gameState.timerStartTime) {
            console.warn('⚠️ 無法計算中途降落城市：計時器未啟動');
            return destination;
        }

        const now = this.now();
        const actualFlightTimeMs = now.getTime() - this.gameState.timerStartTime.getTime();
        const actualFlightTimeMinutes = actualFlightTimeMs / (1000 * 60);

        // 計算實際飛行距離（公里）
        const FLIGHT_SPEED_KMH = 800; // 飛機時速
        const actualFlightDistance = actualFlightTimeMinutes * (FLIGHT_SPEED_KMH / 60);

        // 計算起點到目的地的總距離
        const originCoords = origin.coordinates || (origin.latitude && origin.longitude ? [origin.latitude, origin.longitude] : [25.0330, 121.5654]);
        const destCoords = [destination.latitude, destination.longitude];
        const totalDistance = this.calculateDistance(originCoords, destCoords);

        console.log('📍 計算中途降落城市:', {
            origin: {
                name: origin.name || '未知',
                coords: originCoords,
                hasCoordinates: !!origin.coordinates,
                hasLatLon: !!(origin.latitude && origin.longitude)
            },
            destination: {
                name: destination.name || '未知',
                coords: destCoords
            },
            actualFlightTime: `${actualFlightTimeMinutes.toFixed(1)} 分鐘`,
            actualFlightDistance: `${actualFlightDistance.toFixed(0)} km`,
            totalDistance: `${totalDistance} km`,
            progress: totalDistance > 0 ? `${((actualFlightDistance / totalDistance) * 100).toFixed(1)}%` : 'N/A'
        });

        // 檢查總距離是否有效
        if (totalDistance === 0 || !isFinite(totalDistance)) {
            console.warn('⚠️ 總距離無效或為 0，降落在目的地');
            return destination;
        }

        // 如果實際飛行距離已經超過總距離的85%，還是降落在目的地
        if (actualFlightDistance >= totalDistance * 0.85) {
            console.log(`✅ 已接近目的地（${((actualFlightDistance / totalDistance) * 100).toFixed(1)}% >= 85%），降落在目的地`);
            return destination;
        }

        // 如果實際飛行距離太短（少於總距離的20%），降落在目的地（避免降落在起點附近）
        if (actualFlightDistance < totalDistance * 0.2) {
            console.log(`⚠️ 飛行距離太短（${((actualFlightDistance / totalDistance) * 100).toFixed(1)}% < 20%），降落在目的地`);
            return destination;
        }

        // 計算飛行進度（0-1）
        const flightProgress = actualFlightDistance / totalDistance;

        // 計算中途點的理論位置
        const originLat = originCoords[0];
        const originLon = originCoords[1];
        const destLat = destCoords[0];
        const destLon = destCoords[1];

        const latDiff = destLat - originLat;
        const lonDiff = destLon - originLon;

        const intermediateLat = originLat + latDiff * flightProgress;
        const intermediateLon = originLon + lonDiff * flightProgress;

        // 載入所有城市資料
        const cities = await this.loadCitiesData();
        console.log(`📍 載入了 ${cities.length} 個城市用於搜索中途降落城市`);

        // 找出距離理論中途點最近的城市
        let bestCity = null;
        let minScore = Infinity;
        const searchRadius = 600; // 搜索半徑 600km（擴大搜索範圍以提高找到城市的機率）
        let citiesChecked = 0;
        let citiesInRadius = 0;

        for (const city of cities) {
            citiesChecked++;

            // 計算城市到理論中途點的距離
            const cityDistanceToIntermediate = this.calculateDistance(
                [intermediateLat, intermediateLon],
                [city.latitude, city.longitude]
            );

            // 計算城市距離起點的距離
            const cityDistanceFromOrigin = this.calculateDistance(
                originCoords,
                [city.latitude, city.longitude]
            );

            // 計算城市到目的地的距離
            const cityDistanceToDest = this.calculateDistance(
                [city.latitude, city.longitude],
                destCoords
            );

            // 檢查是否在搜索範圍內
            if (cityDistanceToIntermediate <= searchRadius) {
                citiesInRadius++;

                // 檢查該城市是否在前往目的地的方向上（避免往回飛）
                // 城市距離起點 < 城市距離目的地（確保在正確方向）
                if (cityDistanceFromOrigin < cityDistanceToDest) {
                    // 避免選擇起點或目的地本身（放寬條件：至少距離 30km）
                    if (cityDistanceFromOrigin > 30 && cityDistanceToDest > 30) {
                        // 計算評分：距離理論中途點越近越好，距離實際飛行距離越接近越好
                        const distanceFromIntermediate = cityDistanceToIntermediate;
                        const distanceFromActual = Math.abs(cityDistanceFromOrigin - actualFlightDistance);

                        // 綜合評分（權重：距離中途點 60%，距離實際飛行距離 40%）
                        const score = distanceFromIntermediate * 0.6 + distanceFromActual * 0.4;

                        if (score < minScore) {
                            minScore = score;
                            bestCity = city;
                            console.log(`  🎯 找到更好的候選城市: ${city.name} (評分: ${score.toFixed(1)}, 距離中途點: ${cityDistanceToIntermediate}km, 距離起點: ${cityDistanceFromOrigin}km)`);
                        }
                    }
                }
            }
        }

        console.log(`📍 搜索完成：檢查了 ${citiesChecked} 個城市，${citiesInRadius} 個在搜索半徑內`);

        // 如果找到合適的城市，返回它
        if (bestCity) {
            console.log(`📍 提早降落：從 ${origin.name || '起點'} 飛往 ${destination.name}，實際飛行 ${actualFlightTimeMinutes.toFixed(1)} 分鐘（${actualFlightDistance.toFixed(0)}km / ${totalDistance}km），降落在中途城市 ${bestCity.name}`);

            return {
                ...bestCity,
                flag: this.countryCodeToEmoji(bestCity.countryCode),
                isEarlyLanding: true,
                originalDestination: destination.name,
                originalDestinationCountry: destination.country,
                actualFlightDistance: Math.round(actualFlightDistance),
                plannedDistance: totalDistance,
                flightProgress: Math.round(flightProgress * 100)
            };
        }

        // 如果找不到合適的中途城市，嘗試第二種策略：找距離起點約等於實際飛行距離的城市
        console.log('⚠️ 找不到理論中途點附近的城市，改用距離策略');
        let bestCityByDistance = null;
        let minDistanceDiff = Infinity;
        let distanceStrategyChecked = 0;

        for (const city of cities) {
            const cityDistanceFromOrigin = this.calculateDistance(
                originCoords,
                [city.latitude, city.longitude]
            );

            const cityDistanceToDest = this.calculateDistance(
                [city.latitude, city.longitude],
                destCoords
            );

            // 確保城市在正確方向且距離合理（放寬條件）
            if (cityDistanceFromOrigin > 30 &&
                cityDistanceFromOrigin < cityDistanceToDest &&
                cityDistanceFromOrigin <= actualFlightDistance * 2.0) { // 放寬到 2 倍實際飛行距離

                distanceStrategyChecked++;
                const distanceDiff = Math.abs(cityDistanceFromOrigin - actualFlightDistance);

                if (distanceDiff < minDistanceDiff) {
                    minDistanceDiff = distanceDiff;
                    bestCityByDistance = city;
                    console.log(`  🎯 距離策略找到候選: ${city.name} (距離起點: ${cityDistanceFromOrigin}km, 誤差: ${distanceDiff.toFixed(0)}km)`);
                }
            }
        }

        console.log(`📍 距離策略搜索完成：檢查了 ${distanceStrategyChecked} 個符合條件的城市`);

        if (bestCityByDistance) {
            console.log(`📍 提早降落（距離策略）：降落在 ${bestCityByDistance.name}`);
            return {
                ...bestCityByDistance,
                flag: this.countryCodeToEmoji(bestCityByDistance.countryCode),
                isEarlyLanding: true,
                originalDestination: destination.name,
                originalDestinationCountry: destination.country,
                actualFlightDistance: Math.round(actualFlightDistance),
                plannedDistance: totalDistance,
                flightProgress: Math.round(flightProgress * 100)
            };
        }

        // 如果還是找不到，返回目的地（但有警告）
        console.warn(`⚠️ 找不到合適的中途降落城市，降落在目的地 ${destination.name}`);
        return destination;
    }

    // 根據起床時間計算UTC偏移
    getUTCOffsetFromWakeTime(wakeTime) {
        const [hours, minutes] = wakeTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;

        // 將時間轉換為UTC偏移（簡化計算）
        // 8:00 = UTC+8, 6:00 = UTC+6, 10:00 = UTC+10
        return Math.round((totalMinutes - 480) / 60); // 480分鐘 = 8小時
    }

    // 計算航班價格
    calculateFlightPrice(distance) {
        const basePrice = 2000;
        const distanceMultiplier = distance / 1000;
        const price = Math.round(basePrice + distanceMultiplier * 100);
        console.log(`計算價格: 距離=${distance}km, 基礎價格=${basePrice}, 距離倍數=${distanceMultiplier}, 最終價格=${price}`);
        return price;
    }

    // 計算「旅程長度」的文字描述（不再回傳實際時間點）
    calculateArrivalTime(destination) {
        const minutes = this.gameState.timerDuration || 30;
        return this.formatDuration(minutes);
    }

    // 在左側（當前位置區）顯示地圖效果的位置面板
    showTicketInLocationPanel() {
        const locationPanel = document.querySelector('.taipei-location-panel');
        if (!locationPanel) return;

        // 移除現有的機票顯示
        const existingTicket = locationPanel.querySelector('.location-ticket');
        if (existingTicket) existingTicket.remove();

        // 移除機票樣式類別
        locationPanel.classList.remove('ticket-only', 'collapsed');

        // 顯示當前位置相關的原始內容
        ['location-header'].forEach(cls => {
            const section = locationPanel.querySelector(`.${cls}`);
            if (section) section.style.display = 'flex';
        });

        // 如果有選中目的地，顯示機票（但不在位置面板中，而是單獨顯示）
        const destination = this.gameState.selectedDestination;
        const currentLocation = this.gameState.currentLocation || { name: '台北', countryCode: 'TPE', country: '台灣' };

        // 更新當前位置顯示
        this.updateCurrentLocationDisplay();

        // 如果有目的地，在位置面板下方顯示機票資訊（但使用地圖風格）
        if (destination) {
            const lang = this.gameState.language || 'zh-TW';
            const originCode = currentLocation.countryCode || 'TPE';
            const originName = currentLocation.name || '台北';

            const labelPack = (lang === 'en') ? {
                duration: 'Duration',
                gate: 'Gate',
                task: 'TASK'
            } : {
                duration: '飛行時長',
                gate: '登機門',
                task: 'TASK'
            };

            const taskText = (() => {
                const mapZh = {
                    READING: '讀書',
                    EXERCISE: '運動',
                    MEDITATION: '冥想',
                    REST: '休息',
                    WORK: '工作',
                    GAME: '遊戲'
                };
                const mapEn = {
                    READING: 'READ',
                    EXERCISE: 'WORKOUT',
                    MEDITATION: 'MEDITATE',
                    REST: 'REST',
                    WORK: 'WORK',
                    GAME: 'GAME'
                };
                const key = this.gameState.taskType || 'REST';
                const map = (lang === 'en') ? mapEn : mapZh;
                return map[key] || (lang === 'en' ? 'REST' : '休息');
            })();

            // 創建地圖風格的機票資訊（顯示在位置面板下方）
            const ticketElement = document.createElement('div');
            ticketElement.className = 'location-ticket-map-style';
            ticketElement.innerHTML = `
                <div class="ticket-map-header">
                    <span class="airline-icon">✈️</span>
                    <span class="airline-name">FOCUS AIRLINES</span>
                    <span class="ticket-status">已購買</span>
                </div>
                <div class="ticket-map-route">
                    <div class="map-route-item">
                        <div class="map-location-code">${originCode}</div>
                        <div class="map-location-name">${originName}</div>
            </div>
                    <div class="map-route-arrow">→</div>
                    <div class="map-route-item">
                        <div class="map-location-code">${destination.countryCode || 'XXX'}</div>
                        <div class="map-location-name">${destination.name}</div>
                    </div>
                    </div>
                <div class="ticket-map-details">
                    <div class="map-detail-item">
                        <span class="map-detail-label">${labelPack.duration}</span>
                        <span class="map-detail-value">${this.formatDuration(this.gameState.timerDuration || 30)}</span>
                </div>
                    <div class="map-detail-item">
                        <span class="map-detail-label">${labelPack.gate}</span>
                        <span class="map-detail-value">${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}</span>
            </div>
                    <div class="map-detail-item">
                        <span class="map-detail-label">${labelPack.task}</span>
                        <span class="map-detail-value">${taskText}</span>
                </div>
                </div>
            `;
            locationPanel.appendChild(ticketElement);
        }
    }

    // 隱藏位置面板中的機票
    hideTicketInLocationPanel() {
        const existingTicket = document.querySelector('.location-ticket');
        if (existingTicket) {
            existingTicket.remove();
        }
    }

    // 顯示固定按鈕
    showActionButton(state) {
        console.log('顯示固定按鈕，狀態:', state);
        const button = document.getElementById('fixedActionButton');
        const btnIcon = document.getElementById('btnIcon');
        const btnText = document.getElementById('btnText');

        if (!button || !btnIcon || !btnText) {
            console.error('找不到按鈕元素');
            return;
        }

        this.gameState.actionButtonState = state;
        console.log('設置按鈕狀態為:', this.gameState.actionButtonState);

        switch (state) {
            case 'boarding':
                btnIcon.textContent = '✈️';
                btnText.textContent = '準備起飛';
                button.style.display = 'block';
                console.log('顯示準備起飛按鈕');
                break;
            case 'landing':
                btnIcon.textContent = '🛬';
                btnText.textContent = '準備降落';
                button.style.display = 'block';
                console.log('顯示準備降落按鈕');
                break;
            case 'hidden':
            default:
                button.style.display = 'none';
                console.log('隱藏按鈕');
                break;
        }
    }

    // 供除錯/測試用的全域方法
    _exposeDebugButtons() {
        window.forceBoardingButton = () => this.showActionButton('boarding');
        window.forceLandingButton = () => this.showActionButton('landing');
        console.log('🧪 已掛載除錯方法：forceBoardingButton() / forceLandingButton()');
    }

    // 隱藏固定按鈕
    hideActionButton() {
        this.showActionButton('hidden');
    }

    // 處理固定按鈕點擊
    async handleActionButton() {
        // 防止重複點擊
        if (this.isProcessingAction) {
            console.log('⏸️ 正在處理中，請稍候...');
            return;
        }

        console.log('按鈕被點擊，當前狀態:', this.gameState.actionButtonState);
        const state = this.gameState.actionButtonState;

        // 設置處理中標誌
        this.isProcessingAction = true;

        // 隱藏按鈕，防止重複點擊
        this.hideActionButton();

        switch (state) {
            case 'boarding':
                console.log('執行起飛流程');
                // 顯示等待視窗
                this.showWaitingModal('boarding');
                // 延遲一下讓用戶看到提示，然後開始流程
                setTimeout(async () => {
                    await this.startFlight();
                }, 500);
                break;
            case 'landing': {
                console.log('執行降落流程');
                // 顯示等待視窗
                this.showWaitingModal('landing');
                // 延遲一下讓用戶看到提示，然後開始流程
                setTimeout(async () => {
                    await this.handleLandingFlow();
                }, 500);
                break;
            }
            default:
                console.log('未知狀態:', state);
                this.isProcessingAction = false; // 重置標誌
                break;
        }
    }

    // 顯示等待視窗
    showWaitingModal(actionType) {
        // 創建或獲取等待視窗
        let modal = document.getElementById('waitingActionModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'waitingActionModal';
            modal.className = 'waiting-action-modal';
            modal.innerHTML = `
                <div class="waiting-modal-backdrop"></div>
                <div class="waiting-modal-content">
                    <div class="waiting-spinner">✈️</div>
                    <h2 class="waiting-title" id="waitingTitle">準備中...</h2>
                    <p class="waiting-message" id="waitingMessage">請稍候，系統正在處理您的請求</p>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // 根據操作類型設置內容
        const title = document.getElementById('waitingTitle');
        const message = document.getElementById('waitingMessage');

        if (actionType === 'boarding') {
            if (title) title.textContent = '✈️ 準備起飛';
            if (message) message.textContent = '正在準備登機廣播，請稍候...';
        } else if (actionType === 'landing') {
            if (title) title.textContent = '🛬 準備降落';
            if (message) message.textContent = '正在準備降落廣播，請稍候...';
        }

        // 顯示視窗
        modal.style.display = 'flex';
    }

    // 隱藏等待視窗
    hideWaitingModal() {
        const modal = document.getElementById('waitingActionModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 顯示起飛畫面
    showTakeOffScreen() {
        // 創建或獲取起飛畫面
        let takeOffScreen = document.getElementById('takeOffScreen');
        if (!takeOffScreen) {
            takeOffScreen = document.createElement('div');
            takeOffScreen.id = 'takeOffScreen';
            takeOffScreen.className = 'take-off-screen';
            takeOffScreen.innerHTML = `
                <div class="take-off-content">
                    <div class="take-off-icon">✈️</div>
                    <h1 class="take-off-title">準備起飛</h1>
                    <div class="take-off-animation">
                        <div class="plane-animation">✈️</div>
                    </div>
                </div>
            `;
            document.body.appendChild(takeOffScreen);
        }
        takeOffScreen.style.display = 'flex';
    }

    // 隱藏起飛畫面
    hideTakeOffScreen() {
        const takeOffScreen = document.getElementById('takeOffScreen');
        if (takeOffScreen) {
            takeOffScreen.style.display = 'none';
        }
    }

    // 顯示降落畫面
    showLandingScreen() {
        // 創建或獲取降落畫面
        let landingScreen = document.getElementById('landingScreen');
        if (!landingScreen) {
            landingScreen = document.createElement('div');
            landingScreen.id = 'landingScreen';
            landingScreen.className = 'landing-screen';
            landingScreen.innerHTML = `
                <div class="landing-content">
                    <div class="landing-icon">🛬</div>
                    <h1 class="landing-title">準備降落</h1>
                    <div class="landing-animation">
                        <div class="plane-landing-animation">✈️</div>
                    </div>
                </div>
            `;
            document.body.appendChild(landingScreen);
        }
        landingScreen.style.display = 'flex';
    }

    // 隱藏降落畫面
    hideLandingScreen() {
        const landingScreen = document.getElementById('landingScreen');
        if (landingScreen) {
            landingScreen.style.display = 'none';
        }
    }

    // 顯示地圖畫面
    showMapScreen() {
        // 切換到 resultState（地圖頁面）
        const resultState = document.getElementById('resultState');
        const gameStartState = document.getElementById('gameStartState');

        if (resultState) {
            resultState.classList.add('active');
        }
        if (gameStartState) {
            gameStartState.classList.remove('active');
        }
    }

    // 處理降落流程
    async handleLandingFlow() {
        // 記錄：使用者按下降落鍵（起床時間）
        try {
            const dest = this.gameState.selectedDestination;
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            await this.saveGameRecord({
                eventType: 'landing_press',
                city: dest?.name || '',
                country: dest?.country || '',
                latitude: dest?.latitude,
                longitude: dest?.longitude,
                timezone: tz,
                localTime: new Date(this.now()).toISOString(),
                timerDuration: this.gameState.timerDuration || 30, // 計時長度（分鐘）
                originCity: this.gameState.currentLocation?.name || '台北',
                originCountry: this.gameState.currentLocation?.country || '台灣'
            });
        } catch (e) { console.warn('寫入降落按鍵記錄失敗', e); }

        // Firestore：更新為 landed，記錄 landingPressedAt 與準點狀態（稍後計算）
        try {
            if (window.dbUpsertFlight) {
                const flightId = this.gameState.currentFlightId || `flight_${Date.now()}`;
                this.gameState.currentFlightId = flightId;
                await window.dbUpsertFlight((window.env && window.env.USER_NAME) || 'morgan', flightId, {
                    landingPressedAt: (window.firebaseSDK && window.firebaseSDK.serverTimestamp) ? window.firebaseSDK.serverTimestamp() : null,
                    status: 'landing'
                });
                window.dbAddClockEvent && window.dbAddClockEvent((window.env && window.env.USER_NAME) || 'morgan', { type: 'landing_press' });
            }
        } catch (e) { console.warn('更新 Firestore 降落狀態失敗', e); }

        // 先設置為降落中狀態
        this.gameState.flightStatus = 'landing';
        this.gameState.isLanding = true;

        // 顯示降落中狀態
        this.updateFlightStatusDisplay('降落中');

        // 隱藏等待視窗
        this.hideWaitingModal();

        // 計算準時性狀態
        const punctuality = this.getPunctualityStatus();

        // 顯示降落資訊大視窗（同時播放機長聲音）
        await this.showLandingInfoScreen(punctuality);

        // 重置處理標誌
        this.isProcessingAction = false;
    }

    // 開始飛行（計時器模式）
    async startFlight() {
        console.log('開始飛行計時器，狀態:', this.gameState.actionButtonState);
        console.log('選中的目的地:', this.gameState.selectedDestination);

        // 狀態會在 showBoardingInfoScreen() 播放完成後自動設置

        // 設定計時器（飛行計時器模式）
        if (this.gameState.flightTimerMode) {
            const timerMinutes = this.gameState.timerDuration || 30;
            const now = this.now();
            this.gameState.timerStartTime = now;
            this.gameState.timerEndTime = new Date(now.getTime() + timerMinutes * 60 * 1000);
            console.log(`⏱️ 計時器啟動：${timerMinutes}分鐘，將於 ${this.gameState.timerEndTime.toLocaleTimeString()} 降落`);

            // 設定計時結束回調
            this.setTimerCompletionCallback();

            // 確保計時器更新已啟動（重新觸發更新）
            const flightStatusElement = document.querySelector('.flight-status-popup');
            if (flightStatusElement) {
                const destination = this.gameState.selectedDestination;
                this.startFlightTimerUpdates(flightStatusElement, destination);
            }
        }

        // 記錄：睡覺開始（起飛前）
        try {
            const cur = this.gameState.currentLocation;
            const dest = this.gameState.selectedDestination;
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            await this.saveGameRecord({
                eventType: 'sleep_start',
                city: cur?.name || '台北',
                country: cur?.country || '台灣',
                latitude: cur?.coordinates?.[0],
                longitude: cur?.coordinates?.[1],
                timezone: tz,
                localTime: new Date(this.now()).toISOString(),
                timerDuration: this.gameState.timerDuration || 30, // 計時長度（分鐘）
                plannedDestination: dest ? `${dest.country} ${dest.name}` : '',
                targetCity: dest?.name,
                targetCountry: dest?.country
            });
        } catch (e) { console.warn('寫入睡覺開始記錄失敗', e); }

        // 隱藏等待視窗
        this.hideWaitingModal();

        // 顯示起飛資訊大視窗（同時播放機長聲音，播放完成後自動跳轉到地圖）
        if (this.gameState.flightTimerMode && this.gameState.selectedDestination) {
            await this.showBoardingInfoScreen();
            // showBoardingInfoScreen() 會自動設置 flightStarted、flightStatus 並調用 startGame()
        } else {
            // 如果沒有目的地，直接顯示地圖
            this.gameState.flightStarted = true;
            this.gameState.flightStatus = 'flying';
            this.showMapScreen();
        }

        // 寫入 Firestore：flight 狀態為 flying，記錄 sleepStartAt
        try {
            if (window.dbUpsertFlight) {
                const origin = this.gameState.currentLocation;
                const dest = this.gameState.selectedDestination;
                const flightId = this.gameState.currentFlightId || `flight_${Date.now()}`;
                this.gameState.currentFlightId = flightId;
                await window.dbUpsertFlight((window.env && window.env.USER_NAME) || 'morgan', flightId, {
                    origin: { city: origin?.name || '台北', country: origin?.country || '台灣', lat: origin?.coordinates?.[0], lng: origin?.coordinates?.[1] },
                    destination: { city: dest?.name, country: dest?.country, lat: dest?.latitude, lng: dest?.longitude },
                    timerDuration: this.gameState.timerDuration || 30, // 計時長度（分鐘）
                    taskType: this.gameState.taskType || 'REST',
                    sleepStartAt: (window.firebaseSDK && window.firebaseSDK.serverTimestamp) ? window.firebaseSDK.serverTimestamp() : null,
                    status: 'flying',
                    updatedAt: (window.firebaseSDK && window.firebaseSDK.serverTimestamp) ? window.firebaseSDK.serverTimestamp() : null
                });
                window.dbAddClockEvent && window.dbAddClockEvent((window.env && window.env.USER_NAME) || 'morgan', { type: 'sleep_start' });
            }
        } catch (e) { console.warn('寫入 Firestore 飛行狀態失敗', e); }

        // 飛行計時器模式：不再需要設定鬧鐘，計時結束會自動處理
        // 舊模式保留 setLandingAlarm
        if (!this.gameState.flightTimerMode) {
            this.setLandingAlarm();
        }

        // 隱藏等待覆蓋層
        const waiting = document.getElementById('waitingState');
        if (waiting) {
            waiting.style.display = 'none';
            waiting.classList.remove('active');
        }

        // 處理標誌會在 showBoardingInfoScreen() 播放完成後自動重置
    }

    // 設置降落鬧鐘
    setLandingAlarm() {
        const wakeTime = this.gameState.wakeTime || '08:00';
        const [hours, minutes] = wakeTime.split(':').map(Number);

        // 測試模式：改用輪詢
        if (window.TEST_CLOCK && window.TEST_CLOCK.use) {
            clearInterval(this._landingPoller);
            const poll = () => {
                if (!window.TEST_CLOCK.use) return; // 測試時鐘被停用
                if (this._landingCheckByTestClock()) {
                    clearInterval(this._landingPoller);
                    this.showLandingButton();
                }
            };
            // 立即檢查一次，避免錯過到點瞬間
            poll();
            this._landingPoller = setInterval(poll, 1000);
            console.log('🧪 測試模式：啟用降落輪詢');
            return;
        }

        const now = this.now();
        const landingTime = new Date(now);
        landingTime.setDate(landingTime.getDate() + 1);
        landingTime.setHours(hours, minutes, 0, 0);

        const timeUntilLanding = landingTime.getTime() - now.getTime();

        // 設置定時器（真實時間）
        setTimeout(() => {
            this.showLandingButton();
        }, timeUntilLanding);

        console.log(`降落鬧鐘已設置，將在 ${landingTime.toLocaleString()} 顯示降落按鈕`);
    }

    // 設定計時結束回調（飛行計時器模式）
    setTimerCompletionCallback() {
        if (!this.gameState.flightTimerMode || !this.gameState.timerEndTime) return;

        const endTime = this.gameState.timerEndTime.getTime();
        const now = this.now().getTime();
        const delay = endTime - now;

        if (delay > 0) {
            setTimeout(() => {
                this.handleTimerComplete();
            }, delay);
            console.log(`⏱️ 計時結束回調已設定，將在 ${delay / 1000} 秒後自動降落`);
        } else {
            // 時間已經到了，立即處理
            this.handleTimerComplete();
        }
    }

    // 計時完成處理（飛行計時器模式）
    async handleTimerComplete() {
        if (this.gameState.flightCompleted) return; // 已經處理過

        console.log('⏱️ 計時完成！飛機降落');

        // 更新狀態
        this.gameState.flightCompleted = true;
        this.gameState.isLanding = true;
        this.gameState.flightStatus = 'completed';
        this.updateFlightStatusDisplay('已降落');

        // 更新當前位置為目的地（下次飛行從這裡開始）
        if (this.gameState.selectedDestination) {
            const destination = this.gameState.selectedDestination;
            this.gameState.currentLocation = {
                name: destination.name,
                country: destination.country,
                coordinates: [destination.latitude, destination.longitude],
                timezone: destination.timezone || 8, // 預設UTC+8
                latitude: destination.latitude,
                longitude: destination.longitude
            };

            // 保存到 localStorage 以便下次使用
            localStorage.setItem('lastKnownLocation', JSON.stringify(this.gameState.currentLocation));
            console.log('📍 當前位置已更新為:', destination.name, '時區:', destination.timezone);
        }

        // 計算準時性狀態並顯示降落資訊大視窗（同時播放聲音）
        if (this.gameState.selectedDestination) {
            const punctuality = this.getPunctualityStatus();
            await this.showLandingInfoScreen(punctuality);
        } else {
            // 如果沒有目的地，直接顯示完成畫面
            this.showFlightCompletionModal();
        }
    }

    // 顯示飛行完成畫面（備用方法，當沒有目的地時使用）
    showFlightCompletionModal() {
        // 這裡可以顯示完成動畫或彈窗
        const destination = this.gameState.selectedDestination;
        if (destination) {
            alert(`✈️ 飛行完成！\n\n恭喜抵達 ${destination.flag} ${destination.name}！`);
        }
    }

    // 顯示降落按鈕
    showLandingButton() {
        this.showActionButton('landing');

        // 播放降落廣播（計算準時性狀態）
        if (this.gameState.selectedDestination) {
            const punctuality = this.getPunctualityStatus();
            this.playSleepFlightAnnouncement('landing', this.gameState.selectedDestination, punctuality);
        }
    }

    // 完成飛行
    async completeFlight() {
        this.gameState.flightCompleted = true;
        this.gameState.flightStatus = 'completed';
        this.gameState.isLanding = false; // 結束降落中狀態

        // 更新狀態顯示為已降落
        this.updateFlightStatusDisplay('已降落');

        // 隱藏按鈕
        this.hideActionButton();

        // 計算準時性並扣除資源
        this.calculatePunctuality();

        // 獲取準時性狀態（優先使用 gameState 中保存的完整資訊）
        const punctuality = this.gameState.punctuality || this.getPunctualityStatus();

        // 獲取實際降落位置（可能是中途城市或改降城市）
        const actualDestination = this.gameState.selectedDestination;
        const originalDestination = this.gameState.originalDestination || this.gameState.selectedDestination;

        // 更新當前位置為實際降落位置（下次飛行從這裡開始）
        if (actualDestination) {
            this.gameState.currentLocation = {
                name: actualDestination.name,
                country: actualDestination.country,
                countryCode: actualDestination.countryCode || 'TW',
                coordinates: [actualDestination.latitude, actualDestination.longitude],
                timezone: actualDestination.timezone || 8, // 預設UTC+8
                latitude: actualDestination.latitude,
                longitude: actualDestination.longitude
            };

            // 保存到 localStorage 以便下次使用
            localStorage.setItem('lastKnownLocation', JSON.stringify(this.gameState.currentLocation));
            console.log('📍 當前位置已更新為:', actualDestination.name, '時區:', actualDestination.timezone);
        }

        // 寫入 Firestore：記錄完整的降落資料
        try {
            if (window.dbUpsertFlight) {
                const flightId = this.gameState.currentFlightId || `flight_${Date.now()}`;

                // 計算飛行距離（使用起飛時的原始位置）
                const flightOrigin = this.gameState.originalOrigin || this.gameState.currentLocation;
                let flightDistance = 0;
                if (flightOrigin && actualDestination) {
                    const originCoords = flightOrigin.coordinates || [flightOrigin.latitude, flightOrigin.longitude];
                    const destCoords = [actualDestination.latitude, actualDestination.longitude];
                    flightDistance = this.calculateDistance(originCoords, destCoords);
                }

                // 準備降落資料
                const landingData = {
                    status: 'completed',
                    destination: {
                        city: actualDestination?.name,
                        city_zh: actualDestination?.name, // 可以後續加入中文翻譯
                        country: actualDestination?.country,
                        country_zh: actualDestination?.country,
                        countryCode: actualDestination?.countryCode,
                        lat: actualDestination?.latitude,
                        lng: actualDestination?.longitude
                    },
                    // 準時性資訊
                    punctuality: {
                        status: punctuality.status, // 'EARLY', 'ON_TIME', 'LATE', 'PERFECT'
                        minutesDiff: punctuality.minutesDiff,
                        actualTime: punctuality.actualTime,
                        targetTime: punctuality.targetTime
                    },
                    // 如果是提早降落，記錄中途降落資訊
                    isEarlyLanding: punctuality.isEarlyLanding || false,
                    landingCity: punctuality.landingCity || null,
                    originalDestination: punctuality.originalDestination || originalDestination?.name || null,
                    // 如果是誤點改降，記錄改降資訊
                    divertedCity: punctuality.divertedCity || null,
                    // 任務類型
                    taskType: this.gameState.taskType || 'REST',
                    // 飛行距離（公里）
                    flightDistance: Math.round(flightDistance),
                    // 計時長度（分鐘）
                    timerDuration: this.gameState.timerDuration || 30,
                    // 降落時間
                    landedAt: (window.firebaseSDK && window.firebaseSDK.serverTimestamp) ? window.firebaseSDK.serverTimestamp() : null,
                    // 時區資訊（用於下次載入）
                    matchedCityUTCOffset: actualDestination?.timezone || 8,
                    targetUTCOffset: actualDestination?.timezone || 8,
                    // 更新時間
                    updatedAt: (window.firebaseSDK && window.firebaseSDK.serverTimestamp) ? window.firebaseSDK.serverTimestamp() : null
                };

                await window.dbUpsertFlight((window.env && window.env.USER_NAME) || 'morgan', flightId, landingData);
                console.log('✅ 飛行降落資料已寫入 Firebase:', landingData);

                // 重新載入統計資料
                await this.loadFlightStatistics();
            }
        } catch (e) {
            console.error('❌ 寫入 Firestore 降落資料失敗', e);
        }

        // 更新當前位置顯示
        this.updateCurrentLocationDisplay();

        // 更新機票顯示（顯示新的當前位置作為出發地）
        this.showTicketInLocationPanel();

        // 顯示結果
        this.showFlightMap();
    }

    // 計算準時性
    calculatePunctuality() {
        const p = this.getPunctualityStatus();
        if (p.status === 'LATE') {
            // 遲到提醒
            const minutesDiff = p.minutesDiff;
            console.log(`遲到 ${minutesDiff} 分鐘`);
        } else {
            console.log('準時/提早降落');
        }
    }

    // 獲取準時性狀態
    getPunctualityStatus() {
        // 飛行計時器模式：使用計時器結束時間作為目標時間
        if (this.gameState.flightTimerMode) {
            if (!this.gameState.timerEndTime) {
                return { status: 'ON_TIME', minutesDiff: 0, actualTime: '', targetTime: '' };
            }

            const now = this.now();
            const targetTime = this.gameState.timerEndTime.getTime();
            const actualTime = now.getTime();
            const timeDiff = actualTime - targetTime;
            const minutesDiff = Math.round(timeDiff / (1000 * 60));

            // 保存實際時間和目標時間
            const result = {
                status: '',
                minutesDiff: Math.abs(minutesDiff),
                actualTime: now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                targetTime: new Date(targetTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
            };

            // 更細緻的分級
            if (minutesDiff < -10) {
                result.status = 'EARLY'; // 超早（提前 10 分鐘以上）
            } else if (minutesDiff < -5) {
                result.status = 'EARLY'; // 提早（提前 5-9 分鐘）
            } else if (Math.abs(minutesDiff) <= 1) {
                result.status = 'PERFECT'; // 完美準時（±1分鐘內）
            } else if (Math.abs(minutesDiff) <= 5) {
                result.status = 'ON_TIME'; // 準時（±2-5分鐘）
            } else if (minutesDiff <= 10) {
                result.status = 'LATE'; // 輕微遲到（5-10分鐘）
            } else {
                result.status = 'LATE'; // 嚴重誤點（超過 10 分鐘）
            }

            return result;
        }

        // 舊模式（保留向後兼容）
        const wakeTime = this.gameState.wakeTime || '08:00';
        const now = this.now();
        const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);

        const targetTime = new Date(now);
        targetTime.setHours(wakeHour, wakeMinute, 0, 0);

        const timeDiff = now.getTime() - targetTime.getTime();
        const minutesDiff = Math.round(timeDiff / (1000 * 60));

        const result = {
            status: '',
            minutesDiff: Math.abs(minutesDiff),
            actualTime: now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            targetTime: targetTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
        };

        // 更細緻的分級
        if (minutesDiff < -10) {
            result.status = 'EARLY';
        } else if (minutesDiff < -5) {
            result.status = 'EARLY';
        } else if (Math.abs(minutesDiff) <= 1) {
            result.status = 'PERFECT';
        } else if (Math.abs(minutesDiff) <= 5) {
            result.status = 'ON_TIME';
        } else if (minutesDiff <= 10) {
            result.status = 'LATE';
        } else {
            result.status = 'LATE';
        }

        return result;
    }

    // 顯示起飛資訊大視窗（整合顯示資訊和播放聲音，播放完成後自動跳轉）
    async showBoardingInfoScreen() {
        console.log('🛫 [showBoardingInfoScreen] 開始顯示起飛資訊大視窗');
        const destination = this.gameState.selectedDestination;
        const origin = this.gameState.currentLocation;
        const cityName = destination?.name || '目的地';
        const countryName = destination?.country || '';
        const originName = origin?.name || '台北';
        const timerMinutes = this.gameState.timerDuration || 30;

        console.log('🛫 [showBoardingInfoScreen] 資訊:', {
            destination,
            origin,
            cityName,
            countryName,
            originName,
            timerMinutes
        });

        // 創建或獲取起飛資訊大視窗
        let infoScreen = document.getElementById('boardingInfoScreen');
        if (!infoScreen) {
            console.log('🛫 [showBoardingInfoScreen] 創建新的視窗元素');
            infoScreen = document.createElement('div');
            infoScreen.id = 'boardingInfoScreen';
            infoScreen.className = 'boarding-info-screen';
            document.body.appendChild(infoScreen);
            console.log('🛫 [showBoardingInfoScreen] 視窗元素已添加到 body');
        } else {
            console.log('🛫 [showBoardingInfoScreen] 使用現有視窗元素');
        }

        // 更新視窗內容（簡化版：只顯示標題和狀態）
        infoScreen.innerHTML = `
            <div class="boarding-info-content">
                <div class="boarding-info-header">
                    <div class="boarding-info-icon">✈️</div>
                    <h1 class="boarding-info-title" id="boardingInfoTitle">準備起飛</h1>
                </div>
                <div class="boarding-info-status" id="boardingInfoStatus">準備中...</div>
            </div>
        `;

        const statusEl = document.getElementById('boardingInfoStatus');

        // 強制顯示視窗（確保在最上層）
        console.log('🛫 [showBoardingInfoScreen] 設置視窗顯示');
        infoScreen.style.display = 'flex';
        infoScreen.style.zIndex = '99999'; // 提高 z-index 確保在最上層
        infoScreen.style.position = 'fixed';
        infoScreen.style.top = '0';
        infoScreen.style.left = '0';
        infoScreen.style.width = '100%';
        infoScreen.style.height = '100%';
        infoScreen.style.backgroundColor = 'rgba(30, 60, 114, 0.95)';
        infoScreen.style.pointerEvents = 'auto'; // 確保可以接收點擊事件

        // 檢查視窗是否真的顯示了
        const computedStyle = window.getComputedStyle(infoScreen);
        console.log('🛫 [showBoardingInfoScreen] 視窗樣式檢查:', {
            display: computedStyle.display,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity
        });

        // 稍微延遲一下，讓視窗先顯示
        await new Promise(resolve => setTimeout(resolve, 500));

        // 更新狀態：等待語音生成
        if (statusEl) {
            statusEl.textContent = '機長準備廣播...';
            console.log('🛫 [showBoardingInfoScreen] 狀態更新為: 機長準備廣播...');
        }

        // 播放登機廣播（包含語音生成和播放）
        console.log('🛫 [showBoardingInfoScreen] 開始播放登機廣播');
        const playPromise = this.playSleepFlightAnnouncement('boarding', destination);

        // 稍微延遲後更新狀態為「正在廣播中」（給 API 調用一點時間）
        setTimeout(() => {
            if (statusEl) {
                statusEl.textContent = '機長正在廣播中...';
                statusEl.classList.add('status-playing');
                console.log('🛫 [showBoardingInfoScreen] 狀態更新為: 機長正在廣播中...');
            }
        }, 1000);

        // 等待播放完成
        await playPromise;
        console.log('🛫 [showBoardingInfoScreen] 廣播播放完成');

        // 播放完成後，隱藏視窗（地圖已經在背景準備好了）
        infoScreen.style.display = 'none';
        console.log('🛫 [showBoardingInfoScreen] 視窗已隱藏，地圖已顯示');

        // 重置處理標誌
        this.isProcessingAction = false;
        console.log('🛫 [showBoardingInfoScreen] 流程完成');
    }

    // 確認起飛資訊
    async confirmBoardingInfo() {
        console.log('✅ 確認起飛資訊，準備開始遊戲');

        // 隱藏起飛資訊視窗
        const infoScreen = document.getElementById('boardingInfoScreen');
        if (infoScreen) {
            infoScreen.style.display = 'none';
        }

        // 設置飛行狀態
        this.gameState.flightStarted = true;
        this.gameState.flightStatus = 'flying';

        // 開始遊戲（切換到地圖）
        this.startGame();

        // 重置處理標誌
        this.isProcessingAction = false;
    }

    // 獲取任務類型名稱
    getTaskTypeName(taskType) {
        const taskNames = {
            'READING': '📚 讀書',
            'EXERCISE': '💪 運動',
            'MEDITATION': '🧘 冥想',
            'REST': '😴 休息',
            'WORK': '💻 工作',
            'GAME': '🎮 遊戲'
        };
        return taskNames[taskType] || '😴 休息';
    }

    // 顯示降落資訊大視窗（整合顯示資訊和播放聲音）
    async showLandingInfoScreen(punctuality) {
        // 如果是提早降落，先計算中途降落城市資訊
        if (punctuality.status === 'EARLY' && !punctuality.isEarlyLanding) {
            try {
                const landingCity = await this.calculateEarlyLandingCity(punctuality);
                if (landingCity.isEarlyLanding) {
                    punctuality.landingCity = landingCity.name;
                    punctuality.landingCityCountry = landingCity.country;
                    punctuality.originalDestination = this.gameState.selectedDestination.name;
                    punctuality.originalDestinationCountry = this.gameState.selectedDestination.country;
                    punctuality.isEarlyLanding = true;
                    punctuality.actualFlightDistance = landingCity.actualFlightDistance;
                    punctuality.plannedDistance = landingCity.plannedDistance;
                    punctuality.flightProgress = landingCity.flightProgress;
                }
            } catch (error) {
                console.error('計算中途降落城市失敗:', error);
            }
        }

        const destination = this.gameState.selectedDestination;
        const cityName = destination?.name || '目的地';
        const countryName = destination?.country || '';

        // 創建或獲取降落資訊大視窗
        let infoScreen = document.getElementById('landingInfoScreen');
        if (!infoScreen) {
            infoScreen = document.createElement('div');
            infoScreen.id = 'landingInfoScreen';
            infoScreen.className = 'landing-info-screen';
            infoScreen.innerHTML = `
                <div class="landing-info-content">
                    <div class="landing-info-header">
                        <div class="landing-info-icon">🛬</div>
                        <h1 class="landing-info-title" id="landingInfoTitle">準備降落</h1>
                    </div>
                    <div class="landing-info-body" id="landingInfoBody"></div>
                    <div class="landing-info-actions" id="landingInfoActions"></div>
                </div>
            `;
            document.body.appendChild(infoScreen);
        }

        // 根據狀態設置內容
        let titleText = '';
        let bodyContent = '';
        let actionButtons = '';

        if (punctuality.status === 'EARLY') {
            const isSuperEarly = punctuality.minutesDiff >= 10;
            const isMidwayLanding = punctuality.isEarlyLanding && punctuality.landingCity;
            const landingCityName = punctuality.landingCity || cityName;
            const originalDestName = punctuality.originalDestination || cityName;

            titleText = isSuperEarly
                ? '🛬 提早降落 <span class="badge badge-early">超早抵達</span>'
                : '🛬 提早降落 <span class="badge badge-early">提早抵達</span>';

            if (isMidwayLanding && landingCityName !== originalDestName) {
                const progressPercent = punctuality.flightProgress || 0;
                bodyContent = `
                    <p>您提早了 ${punctuality.minutesDiff} 分鐘降落！</p>
                    <p>${isSuperEarly ? '哇！時間管理大師！' : '呃…我們好像提早到太多了。'}</p>
                    <p>因為還沒到終點，飛機已在【${landingCityName}】提前降落。</p>
                    <p>原定目的地【${originalDestName}】尚未到達（已飛行約 ${progressPercent}% 的距離）。</p>
                `;
            } else {
                bodyContent = `
                    <p>您提早了 ${punctuality.minutesDiff} 分鐘降落！</p>
                    <p>${isSuperEarly ? '哇！時間管理大師！飛機提前完成任務，已經降落在' : '呃…我們好像提早到太多了。飛機已在'}【${cityName}】提前降落。</p>
                `;
            }

            actionButtons = `
                <button class="landing-info-btn landing-info-btn-primary" onclick="window.wakeUpMapGame.confirmLandingInfo('early', ${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
            `;
        } else if (punctuality.status === 'PERFECT') {
            titleText = '🛬 完美準時降落 <span class="badge badge-perfect">完美準時 ⭐</span>';
            bodyContent = `
                <p>完美準時！時間掌控的精準藝術 🎯</p>
                <p>乘客您好，本次航班順利準時降落於【${cityName}】。</p>
                <p>感謝你堅持完成這段旅程，你的時間管理很漂亮。</p>
            `;
            actionButtons = `
                <button class="landing-info-btn landing-info-btn-primary" onclick="window.wakeUpMapGame.confirmLandingInfo('perfect', ${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
            `;
        } else if (punctuality.status === 'ON_TIME') {
            titleText = '🛬 準時降落 <span class="badge badge-ontime">準時抵達</span>';
            bodyContent = `
                <p>恭喜！您準時降落了！</p>
                <p>乘客您好，本次航班順利準時降落於【${cityName}】。</p>
                <p>機長對您的時間管理表示讚賞。</p>
                <p>歡迎來到【${cityName}】，祝你今天有個順心的旅程。</p>
            `;
            actionButtons = `
                <button class="landing-info-btn landing-info-btn-primary" onclick="window.wakeUpMapGame.confirmLandingInfo('ontime', ${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
            `;
        } else {
            // LATE
            const isSevereLate = punctuality.minutesDiff > 10;
            const hasDiversion = punctuality.originalDestination && punctuality.divertedCity;
            const originalCityName = punctuality.originalDestination || cityName;

            titleText = isSevereLate
                ? '🛬 誤點降落 <span class="badge badge-late">嚴重誤點</span>'
                : '🛬 誤點降落 <span class="badge badge-late">輕微遲到</span>';

            let destinationNote = '';
            if (hasDiversion && punctuality.divertedCity !== originalCityName) {
                destinationNote = `<p>原定降落於【${originalCityName}】，但因時間超過，我們轉降至【${punctuality.divertedCity}】。</p>`;
            } else if (isSevereLate) {
                destinationNote = `<p>原定降落於【${cityName}】，但因時間超過，可能轉降至其他城市。</p>`;
            } else {
                destinationNote = `<p>雖有延誤，但仍順利降落在【${cityName}】。</p>`;
            }

            bodyContent = `
                <p>抱歉，我們在空中繞了幾圈…本次航班延誤了 ${punctuality.minutesDiff} 分鐘。</p>
                ${destinationNote}
                <p>飛機需要在空中盤旋等待降落許可。</p>
            `;
            actionButtons = `
                <button class="landing-info-btn landing-info-btn-primary" onclick="window.wakeUpMapGame.confirmLandingInfo('late', ${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
            `;
        }

        // 更新視窗內容
        const titleEl = document.getElementById('landingInfoTitle');
        const bodyEl = document.getElementById('landingInfoBody');
        const actionsEl = document.getElementById('landingInfoActions');

        if (titleEl) titleEl.innerHTML = titleText;
        if (bodyEl) bodyEl.innerHTML = bodyContent;
        if (actionsEl) {
            actionsEl.innerHTML = actionButtons;
            // 初始隱藏按鈕，等聲音播放完後再顯示
            actionsEl.style.display = 'none';
        }

        // 顯示視窗
        infoScreen.style.display = 'flex';

        // 同時播放機長聲音
        const announcementDestination = punctuality.isEarlyLanding && punctuality.landingCity
            ? { name: punctuality.landingCity, country: punctuality.landingCityCountry }
            : destination;

        await this.playSleepFlightAnnouncement('landing', announcementDestination, punctuality);

        // 播放完成後，自動處理降落並回到首頁
        console.log('🛬 降落語音播放完成，準備回到首頁');

        // 隱藏降落資訊視窗
        infoScreen.style.display = 'none';

        // 根據類型處理降落
        if (punctuality.status === 'EARLY') {
            await this.applyEarlyLanding(punctuality);
        } else if (punctuality.status === 'PERFECT' || punctuality.status === 'ON_TIME') {
            await this.applyOnTimeLanding(punctuality);
        } else {
            await this.applyLateLanding(punctuality);
        }

        // 完成降落處理（但不顯示地圖）
        this.gameState.flightCompleted = true;
        this.gameState.flightStatus = 'completed';
        this.gameState.isLanding = false;

        // 更新狀態顯示為已降落
        this.updateFlightStatusDisplay('已降落');

        // 隱藏按鈕
        this.hideActionButton();

        // 獲取實際降落位置
        const actualDestination = this.gameState.selectedDestination;
        const originalDestination = this.gameState.originalDestination || this.gameState.selectedDestination;

        // 更新當前位置為實際降落位置（下次飛行從這裡開始）
        if (actualDestination) {
            this.gameState.currentLocation = {
                name: actualDestination.name,
                country: actualDestination.country,
                countryCode: actualDestination.countryCode || 'TW',
                coordinates: [actualDestination.latitude, actualDestination.longitude],
                timezone: actualDestination.timezone || 8,
                latitude: actualDestination.latitude,
                longitude: actualDestination.longitude
            };

            // 保存到 localStorage
            localStorage.setItem('lastKnownLocation', JSON.stringify(this.gameState.currentLocation));
            console.log('📍 當前位置已更新為:', actualDestination.name);
        }

        // 寫入 Firestore：記錄完整的降落資料
        try {
            if (window.dbUpsertFlight) {
                const flightId = this.gameState.currentFlightId || `flight_${Date.now()}`;
                const flightOrigin = this.gameState.originalOrigin || this.gameState.currentLocation;
                let flightDistance = 0;
                if (flightOrigin && actualDestination) {
                    const originCoords = flightOrigin.coordinates || [flightOrigin.latitude, flightOrigin.longitude];
                    const destCoords = [actualDestination.latitude, actualDestination.longitude];
                    flightDistance = this.calculateDistance(originCoords, destCoords);
                }

                const landingData = {
                    status: 'completed',
                    destination: {
                        city: actualDestination?.name,
                        city_zh: actualDestination?.name,
                        country: actualDestination?.country,
                        country_zh: actualDestination?.country,
                        countryCode: actualDestination?.countryCode,
                        lat: actualDestination?.latitude,
                        lng: actualDestination?.longitude
                    },
                    punctuality: {
                        status: punctuality.status,
                        minutesDiff: punctuality.minutesDiff,
                        actualTime: punctuality.actualTime,
                        targetTime: punctuality.targetTime
                    },
                    isEarlyLanding: punctuality.isEarlyLanding || false,
                    landingCity: punctuality.landingCity || null,
                    originalDestination: punctuality.originalDestination || originalDestination?.name || null,
                    divertedCity: punctuality.divertedCity || null,
                    taskType: this.gameState.taskType || 'REST',
                    flightDistance: Math.round(flightDistance),
                    timerDuration: this.gameState.timerDuration || 30,
                    landedAt: (window.firebaseSDK && window.firebaseSDK.serverTimestamp) ? window.firebaseSDK.serverTimestamp() : null,
                    matchedCityUTCOffset: actualDestination?.timezone || 8,
                    targetUTCOffset: actualDestination?.timezone || 8,
                    updatedAt: (window.firebaseSDK && window.firebaseSDK.serverTimestamp) ? window.firebaseSDK.serverTimestamp() : null
                };

                await window.dbUpsertFlight((window.env && window.env.USER_NAME) || 'morgan', flightId, landingData);
                console.log('✅ 飛行降落資料已寫入 Firebase');

                // 重新載入統計資料
                await this.loadFlightStatistics();
            }
        } catch (e) {
            console.error('❌ 寫入 Firestore 降落資料失敗', e);
        }

        // 更新當前位置顯示和機票顯示
        this.updateCurrentLocationDisplay();
        this.showTicketInLocationPanel();

        // 切換到首頁（gameStartState）- FOCUS AIRLINES
        const gameStartState = document.getElementById('gameStartState');
        const resultState = document.getElementById('resultState');
        const waitingState = document.getElementById('waitingState');

        if (gameStartState) {
            gameStartState.classList.add('active');
        }
        if (resultState) {
            resultState.classList.remove('active');
        }
        if (waitingState) {
            waitingState.classList.remove('active');
        }

        // 重置遊戲狀態（準備下一次飛行）
        // 注意：保留 currentLocation（已更新為降落位置），但清除 selectedDestination
        this.gameState.gameStarted = false;
        this.gameState.flightStarted = false;
        this.gameState.selectedDestination = null;
        this.gameState.currentTicket = null;
        this.gameState.actionButtonState = 'hidden';

        // 更新首頁顯示（顯示當前位置，不顯示機票）
        this.updateCurrentLocationDisplay();
        this.showTicketInLocationPanel();

        // 重新載入統計資料
        await this.loadFlightStatistics();

        // 更新按鈕狀態：可以規劃旅程，但不能開始旅程
        this.refreshHomeButtonsState();

        console.log('✅ 已切換到首頁（FOCUS AIRLINES）');

        // 重置處理標誌
        this.isProcessingAction = false;
    }

    // 確認降落資訊（整合原本的 applyEarlyLanding, applyOnTimeLanding, applyLateLanding）
    async confirmLandingInfo(type, punctuality) {
        // 隱藏降落資訊視窗
        const infoScreen = document.getElementById('landingInfoScreen');
        if (infoScreen) {
            infoScreen.style.display = 'none';
        }

        // 根據類型處理降落
        if (type === 'early') {
            await this.applyEarlyLanding(punctuality);
        } else if (type === 'perfect' || type === 'ontime') {
            await this.applyOnTimeLanding(punctuality);
        } else if (type === 'late') {
            await this.applyLateLanding(punctuality);
        }
    }

    // 顯示降落結果彈窗（保留作為備用，但不再使用）
    async showLandingOutcomeModal(punctuality) {
        const modal = document.getElementById('landingModal');
        const title = document.getElementById('landingTitle');
        const body = document.getElementById('landingBody');
        const actions = document.getElementById('landingActions');

        if (!modal || !title || !body || !actions) {
            console.error('降落結果彈窗元素未找到');
            return;
        }

        const destination = this.gameState.selectedDestination;
        const cityName = destination?.name || '目的地';
        const countryName = destination?.country || '';

        // 如果是提早降落，先計算中途降落城市資訊（僅用於顯示，不修改 gameState）
        if (punctuality.status === 'EARLY' && !punctuality.isEarlyLanding) {
            try {
                const landingCity = await this.calculateEarlyLandingCity(punctuality);
                if (landingCity.isEarlyLanding) {
                    // 僅更新 punctuality 物件以供顯示使用，不修改 gameState
                    punctuality.landingCity = landingCity.name;
                    punctuality.landingCityCountry = landingCity.country;
                    punctuality.originalDestination = destination.name;
                    punctuality.originalDestinationCountry = destination.country;
                    punctuality.isEarlyLanding = true;
                    punctuality.actualFlightDistance = landingCity.actualFlightDistance;
                    punctuality.plannedDistance = landingCity.plannedDistance;
                    punctuality.flightProgress = landingCity.flightProgress;
                }
            } catch (error) {
                console.error('計算中途降落城市失敗:', error);
            }
        }

        // 根據狀態設置內容
        if (punctuality.status === 'EARLY') {
            const isSuperEarly = punctuality.minutesDiff >= 10;
            const isMidwayLanding = punctuality.isEarlyLanding && punctuality.landingCity;
            const landingCityName = punctuality.landingCity || cityName;
            const originalDestName = punctuality.originalDestination || cityName;

            title.innerHTML = isSuperEarly
                ? '🛬 提早降落 <span class="badge badge-early">超早抵達</span>'
                : '🛬 提早降落 <span class="badge badge-early">提早抵達</span>';

            let bodyContent = '';
            if (isMidwayLanding && landingCityName !== originalDestName) {
                // 中途降落情況
                const progressPercent = punctuality.flightProgress || 0;
                bodyContent = `
                    <p>您提早了 ${punctuality.minutesDiff} 分鐘降落！</p>
                    <p>${isSuperEarly ? '哇！時間管理大師！' : '呃…我們好像提早到太多了。'}</p>
                    <p>因為還沒到終點，飛機已在【${landingCityName}】提前降落。</p>
                    <p>原定目的地【${originalDestName}】尚未到達（已飛行約 ${progressPercent}% 的距離）。</p>
                    <p>沒事的，機組人員會處理後續。下次我們一起飛完全程吧！</p>
                    <p>雖然還沒到終點，但這段飛行仍然很棒。歡迎來到【${landingCityName}】！</p>
                `;
            } else {
                // 直接降落在目的地（但提早了）
                bodyContent = `
                    <p>您提早了 ${punctuality.minutesDiff} 分鐘降落！</p>
                    <p>${isSuperEarly ? '哇！時間管理大師！飛機提前完成任務，已經降落在' : '呃…我們好像提早到太多了。飛機已在'}【${cityName}】提前降落。</p>
                    <p>沒事的，機組人員會處理後續。下次我們一起飛完全程吧！</p>
                    <p>雖然還沒到終點，但這段飛行仍然很棒。歡迎來到【${cityName}】！</p>
                `;
            }

            body.innerHTML = bodyContent;
            actions.innerHTML = `
                <button class="landing-btn landing-btn-primary" onclick="window.wakeUpMapGame.applyEarlyLanding(${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
                <button class="landing-btn landing-btn-secondary" onclick="window.wakeUpMapGame.hideLandingModal()">取消</button>
            `;
        } else if (punctuality.status === 'PERFECT') {
            title.innerHTML = '🛬 完美準時降落 <span class="badge badge-perfect">完美準時 ⭐</span>';
            body.innerHTML = `
                <p>完美準時！時間掌控的精準藝術 🎯</p>
                <p>乘客您好，本次航班順利準時降落於【${cityName}】。</p>
                <p>感謝你堅持完成這段旅程，你的時間管理很漂亮。</p>
                <p id="surpriseText">正在準備驚喜...</p>
            `;
            actions.innerHTML = `
                <button class="landing-btn landing-btn-primary" onclick="window.wakeUpMapGame.applyOnTimeLanding(${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
                <button class="landing-btn landing-btn-secondary" onclick="window.wakeUpMapGame.hideLandingModal()">取消</button>
            `;
        } else if (punctuality.status === 'ON_TIME') {
            title.innerHTML = '🛬 準時降落 <span class="badge badge-ontime">準時抵達</span>';
            body.innerHTML = `
                <p>恭喜！您準時降落了！</p>
                <p>乘客您好，本次航班順利準時降落於【${cityName}】。</p>
                <p>機長對您的時間管理表示讚賞。</p>
                <p>歡迎來到【${cityName}】，祝你今天有個順心的旅程。</p>
                <p id="surpriseText">正在準備驚喜...</p>
            `;
            actions.innerHTML = `
                <button class="landing-btn landing-btn-primary" onclick="window.wakeUpMapGame.applyOnTimeLanding(${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
                <button class="landing-btn landing-btn-secondary" onclick="window.wakeUpMapGame.hideLandingModal()">取消</button>
            `;
        } else {
            // LATE
            const isSevereLate = punctuality.minutesDiff > 10;
            const hasDiversion = punctuality.originalDestination && punctuality.divertedCity;
            const originalCityName = punctuality.originalDestination || cityName;

            title.innerHTML = isSevereLate
                ? '🛬 誤點降落 <span class="badge badge-late">嚴重誤點</span>'
                : '🛬 誤點降落 <span class="badge badge-late">輕微遲到</span>';

            let destinationNote = '';
            if (hasDiversion && punctuality.divertedCity !== originalCityName) {
                destinationNote = `<p>原定降落於【${originalCityName}】，但因時間超過，我們轉降至【${punctuality.divertedCity}】。</p>`;
            } else if (isSevereLate) {
                destinationNote = `<p>原定降落於【${cityName}】，但因時間超過，可能轉降至其他城市。</p>`;
            } else {
                destinationNote = `<p>雖有延誤，但仍順利降落在【${cityName}】。</p>`;
            }

            body.innerHTML = `
                <p>抱歉，我們在空中繞了幾圈…本次航班延誤了 ${punctuality.minutesDiff} 分鐘。</p>
                ${destinationNote}
                <p>飛機需要在空中盤旋等待降落許可。</p>
                <p>下次一起看看能不能準時降落吧，我相信你可以。</p>
            `;
            actions.innerHTML = `
                <button class="landing-btn landing-btn-primary" onclick="window.wakeUpMapGame.applyLateLanding(${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
                <button class="landing-btn landing-btn-secondary" onclick="window.wakeUpMapGame.hideLandingModal()">取消</button>
            `;
        }

        // 顯示彈窗
        modal.style.display = 'block';

        // 綁定關閉按鈕
        const closeBtn = document.getElementById('landingClose');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideLandingModal();
        }

        // 綁定背景點擊關閉
        const backdrop = modal.querySelector('.landing-modal-backdrop');
        if (backdrop) {
            backdrop.onclick = () => this.hideLandingModal();
        }
    }

    // 隱藏降落結果彈窗
    hideLandingModal() {
        const modal = document.getElementById('landingModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 處理提早降落
    async applyEarlyLanding(punctuality) {
        console.log('執行提早降落', punctuality);
        console.log('📍 當前位置:', this.gameState.currentLocation);
        console.log('📍 目的地:', this.gameState.selectedDestination);
        console.log('📍 計時器開始時間:', this.gameState.timerStartTime);

        // 計算中途降落城市
        const landingCity = await this.calculateEarlyLandingCity(punctuality);
        console.log('📍 計算結果 - landingCity:', landingCity);
        console.log('📍 是否中途降落:', landingCity.isEarlyLanding);

        // 如果降落在中途城市，更新目的地資訊
        if (landingCity.isEarlyLanding) {
            // 更新準時性資訊
            punctuality.landingCity = landingCity.name;
            punctuality.landingCityCountry = landingCity.country;
            punctuality.originalDestination = this.gameState.selectedDestination.name;
            punctuality.originalDestinationCountry = this.gameState.selectedDestination.country;
            punctuality.isEarlyLanding = true;
            punctuality.actualFlightDistance = landingCity.actualFlightDistance;
            punctuality.plannedDistance = landingCity.plannedDistance;
            punctuality.flightProgress = landingCity.flightProgress;

            // 更新選中的目的地為降落城市（保存原始目的地以供顯示）
            this.gameState.originalDestination = this.gameState.selectedDestination;
            this.gameState.selectedDestination = landingCity;

            console.log(`✅ 提早降落在中途城市：${landingCity.name}（原定目的地：${punctuality.originalDestination}）`);
        }

        // 保存 punctuality 到 gameState，供 completeFlight 使用
        this.gameState.punctuality = punctuality;

        // 不再播放聲音（已在 showLandingInfoScreen 中播放）
        this.hideLandingModal();
        await this.completeFlight();
    }

    // 處理準時降落
    async applyOnTimeLanding(punctuality) {
        console.log('執行準時降落', punctuality);

        // 如果是完美準時，確保狀態正確
        if (Math.abs(punctuality.minutesDiff) <= 1 && punctuality.status !== 'PERFECT') {
            punctuality.status = 'PERFECT';
        }

        // 保存 punctuality 到 gameState，供 completeFlight 使用
        this.gameState.punctuality = punctuality;

        // 不再播放聲音（已在 showLandingInfoScreen 中播放）
        this.hideLandingModal();
        await this.completeFlight();
    }

    // 處理遲到降落
    async applyLateLanding(punctuality) {
        console.log('執行遲到降落', punctuality);

        // 記錄原始目的地
        const originalDestination = this.gameState.selectedDestination;

        // 嚴重誤點（超過10分鐘）時，30% 機率改降其他城市
        let divertedCity = null;
        if (punctuality.minutesDiff > 10 && Math.random() < 0.3) {
            const diversion = this.pickDiversion(originalDestination);
            console.log(`飛機改降 ${diversion.name}`);
            divertedCity = diversion;
            this.gameState.selectedDestination = diversion;
            this.gameState.originalDestination = originalDestination;

            // 更新準時性資訊中的改降城市
            punctuality.originalDestination = originalDestination?.name;
            punctuality.divertedCity = divertedCity.name;
        }

        // 保存 punctuality 到 gameState，供 completeFlight 使用
        this.gameState.punctuality = punctuality;

        // 不再播放聲音（已在 showLandingInfoScreen 中播放）
        this.hideLandingModal();
        await this.completeFlight();
    }

    // 隨機準時驚喜
    randomOnTimeSurprise() {
        const surprises = [
            { type: 'none', amount: 0, message: '享受了美味的飛機餐！' },
            { type: 'none', amount: 0, message: '窗外的風景真美！' },
            { type: 'none', amount: 0, message: '完美的飛行體驗！' }
        ];

        return surprises[Math.floor(Math.random() * surprises.length)];
    }

    // 選擇改降城市
    pickDiversion(currentDest) {
        const allCities = this.getAllCities();
        const alternatives = allCities.filter(city => city.id !== currentDest.id);
        return alternatives[Math.floor(Math.random() * alternatives.length)];
    }

    // 生成吸引人的短句
    generateAttractivePhrase(destination) {
        const phrases = {
            'tokyo': '暢遊京都，體驗和風之美',
            'seoul': '探索首爾，感受韓流魅力',
            'bangkok': '漫步曼谷，品味泰式風情',
            'singapore': '獅城之旅，現代與傳統交融',
            'hongkong': '東方之珠，璀璨夜景等你',
            'manila': '馬尼拉灣，熱帶海島風光',
            'kualalumpur': '雙子塔下，馬來西亞風情',
            'jakarta': '雅加達夜，印尼文化體驗',
            'hochiminh': '胡志明市，越南歷史與現代',
            'taipei': '台北101，台灣美食天堂'
        };

        // 如果有預設短句就使用，否則生成隨機的
        if (phrases[destination.id]) {
            return phrases[destination.id];
        }

        // 根據國家生成通用短句
        const countryPhrases = {
            '日本': '櫻花飛舞，和風雅韻',
            '韓國': '韓流魅力，時尚之都',
            '泰國': '微笑國度，熱帶天堂',
            '新加坡': '花園城市，多元文化',
            '香港': '東方明珠，購物天堂',
            '菲律賓': '千島之國，熱帶風情',
            '馬來西亞': '多元文化，熱帶雨林',
            '印尼': '萬島之國，火山與海灘',
            '越南': '歷史悠久，美食天堂'
        };

        return countryPhrases[destination.country] || '探索新世界，開啟新旅程';
    }

    // 獲取國家旗幟
    getCountryFlag(countryCode) {
        const flagMap = {
            'US': '🇺🇸', 'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳',
            'TH': '🇹🇭', 'SG': '🇸🇬', 'MY': '🇲🇾', 'ID': '🇮🇩',
            'PH': '🇵🇭', 'VN': '🇻🇳', 'IN': '🇮🇳', 'AU': '🇦🇺',
            'NZ': '🇳🇿', 'GB': '🇬🇧', 'FR': '🇫🇷', 'DE': '🇩🇪',
            'IT': '🇮🇹', 'ES': '🇪🇸', 'RU': '🇷🇺', 'BR': '🇧🇷',
            'CA': '🇨🇦', 'MX': '🇲🇽', 'AR': '🇦🇷', 'CL': '🇨🇱'
        };
        return flagMap[countryCode] || '🌍';
    }

    // 50個國家的完整數據庫
    getAllCities() {
        return [
            // 東亞
            { id: 'tokyo', name: '東京', country: '日本', countryCode: 'JP', latitude: 35.6762, longitude: 139.6503, timezone: 9 },
            { id: 'seoul', name: '首爾', country: '韓國', countryCode: 'KR', latitude: 37.5665, longitude: 126.9780, timezone: 9 },
            { id: 'hongkong', name: '香港', country: '香港', countryCode: 'HK', latitude: 22.3193, longitude: 114.1694, timezone: 8 },
            { id: 'macau', name: '澳門', country: '澳門', countryCode: 'MO', latitude: 22.1987, longitude: 113.5439, timezone: 8 },

            // 東南亞
            { id: 'singapore', name: '新加坡', country: '新加坡', countryCode: 'SG', latitude: 1.3521, longitude: 103.8198, timezone: 8 },
            { id: 'bangkok', name: '曼谷', country: '泰國', countryCode: 'TH', latitude: 13.7563, longitude: 100.5018, timezone: 7 },
            { id: 'manila', name: '馬尼拉', country: '菲律賓', countryCode: 'PH', latitude: 14.5995, longitude: 120.9842, timezone: 8 },
            { id: 'kualalumpur', name: '吉隆坡', country: '馬來西亞', countryCode: 'MY', latitude: 3.1390, longitude: 101.6869, timezone: 8 },
            { id: 'jakarta', name: '雅加達', country: '印尼', countryCode: 'ID', latitude: -6.2088, longitude: 106.8456, timezone: 7 },
            { id: 'hochiminh', name: '胡志明市', country: '越南', countryCode: 'VN', latitude: 10.8231, longitude: 106.6297, timezone: 7 },
            { id: 'hanoi', name: '河內', country: '越南', countryCode: 'VN', latitude: 21.0285, longitude: 105.8542, timezone: 7 },
            { id: 'yangon', name: '仰光', country: '緬甸', countryCode: 'MM', latitude: 16.8661, longitude: 96.1951, timezone: 6.5 },
            { id: 'phnompenh', name: '金邊', country: '柬埔寨', countryCode: 'KH', latitude: 11.5564, longitude: 104.9282, timezone: 7 },
            { id: 'vientiane', name: '永珍', country: '寮國', countryCode: 'LA', latitude: 17.9757, longitude: 102.6331, timezone: 7 },
            { id: 'bandar', name: '斯里巴加灣', country: '汶萊', countryCode: 'BN', latitude: 4.9036, longitude: 114.9398, timezone: 8 },
            { id: 'dili', name: '帝力', country: '東帝汶', countryCode: 'TL', latitude: -8.5558, longitude: 125.5603, timezone: 9 },

            // 南亞
            { id: 'kathmandu', name: '加德滿都', country: '尼泊爾', countryCode: 'NP', latitude: 27.7172, longitude: 85.3240, timezone: 5.75 },
            { id: 'dhaka', name: '達卡', country: '孟加拉', countryCode: 'BD', latitude: 23.8103, longitude: 90.4125, timezone: 6 },
            { id: 'colombo', name: '可倫坡', country: '斯里蘭卡', countryCode: 'LK', latitude: 6.9271, longitude: 79.8612, timezone: 5.5 },
            { id: 'male', name: '馬累', country: '馬爾地夫', countryCode: 'MV', latitude: 4.1755, longitude: 73.5093, timezone: 5 },
            { id: 'islamabad', name: '伊斯蘭堡', country: '巴基斯坦', countryCode: 'PK', latitude: 33.6844, longitude: 73.0479, timezone: 5 },
            { id: 'karachi', name: '喀拉蚩', country: '巴基斯坦', countryCode: 'PK', latitude: 24.8607, longitude: 67.0011, timezone: 5 },

            // 印度（精選主要城市）
            { id: 'mumbai', name: '孟買', country: '印度', countryCode: 'IN', latitude: 19.0760, longitude: 72.8777, timezone: 5.5 },
            { id: 'delhi', name: '新德里', country: '印度', countryCode: 'IN', latitude: 28.6139, longitude: 77.2090, timezone: 5.5 },
            { id: 'bangalore', name: '班加羅爾', country: '印度', countryCode: 'IN', latitude: 12.9716, longitude: 77.5946, timezone: 5.5 },
            { id: 'kolkata', name: '加爾各答', country: '印度', countryCode: 'IN', latitude: 22.5726, longitude: 88.3639, timezone: 5.5 },
            { id: 'chennai', name: '清奈', country: '印度', countryCode: 'IN', latitude: 13.0827, longitude: 80.2707, timezone: 5.5 },
            { id: 'hyderabad', name: '海德拉巴', country: '印度', countryCode: 'IN', latitude: 17.3850, longitude: 78.4867, timezone: 5.5 },
            { id: 'jaipur', name: '齋浦爾', country: '印度', countryCode: 'IN', latitude: 26.9124, longitude: 75.7873, timezone: 5.5 },
            { id: 'bhopal', name: '博帕爾', country: '印度', countryCode: 'IN', latitude: 23.2599, longitude: 77.4126, timezone: 5.5 },

            // 中東
            { id: 'dubai', name: '杜拜', country: '阿聯酋', countryCode: 'AE', latitude: 25.2048, longitude: 55.2708, timezone: 4 },
            { id: 'abudhabi', name: '阿布達比', country: '阿聯酋', countryCode: 'AE', latitude: 24.4539, longitude: 54.3773, timezone: 4 },
            { id: 'doha', name: '多哈', country: '卡達', countryCode: 'QA', latitude: 25.2854, longitude: 51.5310, timezone: 3 },
            { id: 'kuwait', name: '科威特市', country: '科威特', countryCode: 'KW', latitude: 29.3759, longitude: 47.9774, timezone: 3 },
            { id: 'riyadh', name: '利雅德', country: '沙烏地阿拉伯', countryCode: 'SA', latitude: 24.7136, longitude: 46.6753, timezone: 3 },
            { id: 'jeddah', name: '吉達', country: '沙烏地阿拉伯', countryCode: 'SA', latitude: 21.4858, longitude: 39.1925, timezone: 3 },
            { id: 'muscat', name: '馬斯開特', country: '阿曼', countryCode: 'OM', latitude: 23.5880, longitude: 58.3829, timezone: 4 },
            { id: 'manama', name: '麥納瑪', country: '巴林', countryCode: 'BH', latitude: 26.0667, longitude: 50.5577, timezone: 3 },

            // 歐洲
            { id: 'london', name: '倫敦', country: '英國', countryCode: 'GB', latitude: 51.5074, longitude: -0.1278, timezone: 0 },
            { id: 'paris', name: '巴黎', country: '法國', countryCode: 'FR', latitude: 48.8566, longitude: 2.3522, timezone: 1 },
            { id: 'berlin', name: '柏林', country: '德國', countryCode: 'DE', latitude: 52.5200, longitude: 13.4050, timezone: 1 },
            { id: 'rome', name: '羅馬', country: '義大利', countryCode: 'IT', latitude: 41.9028, longitude: 12.4964, timezone: 1 },
            { id: 'madrid', name: '馬德里', country: '西班牙', countryCode: 'ES', latitude: 40.4168, longitude: -3.7038, timezone: 1 },
            { id: 'amsterdam', name: '阿姆斯特丹', country: '荷蘭', countryCode: 'NL', latitude: 52.3676, longitude: 4.9041, timezone: 1 },
            { id: 'zurich', name: '蘇黎世', country: '瑞士', countryCode: 'CH', latitude: 47.3769, longitude: 8.5417, timezone: 1 },
            { id: 'vienna', name: '維也納', country: '奧地利', countryCode: 'AT', latitude: 48.2082, longitude: 16.3738, timezone: 1 },
            { id: 'prague', name: '布拉格', country: '捷克', countryCode: 'CZ', latitude: 50.0755, longitude: 14.4378, timezone: 1 },
            { id: 'warsaw', name: '華沙', country: '波蘭', countryCode: 'PL', latitude: 52.2297, longitude: 21.0122, timezone: 1 },
            { id: 'moscow', name: '莫斯科', country: '俄羅斯', countryCode: 'RU', latitude: 55.7558, longitude: 37.6176, timezone: 3 },
            { id: 'istanbul', name: '伊斯坦堡', country: '土耳其', countryCode: 'TR', latitude: 41.0082, longitude: 28.9784, timezone: 3 },

            // 美洲
            { id: 'newyork', name: '紐約', country: '美國', countryCode: 'US', latitude: 40.7128, longitude: -74.0060, timezone: -5 },
            { id: 'losangeles', name: '洛杉磯', country: '美國', countryCode: 'US', latitude: 34.0522, longitude: -118.2437, timezone: -8 },
            { id: 'chicago', name: '芝加哥', country: '美國', countryCode: 'US', latitude: 41.8781, longitude: -87.6298, timezone: -6 },
            { id: 'toronto', name: '多倫多', country: '加拿大', countryCode: 'CA', latitude: 43.6532, longitude: -79.3832, timezone: -5 },
            { id: 'vancouver', name: '溫哥華', country: '加拿大', countryCode: 'CA', latitude: 49.2827, longitude: -123.1207, timezone: -8 },
            { id: 'mexicocity', name: '墨西哥城', country: '墨西哥', countryCode: 'MX', latitude: 19.4326, longitude: -99.1332, timezone: -6 },
            { id: 'saoPaulo', name: '聖保羅', country: '巴西', countryCode: 'BR', latitude: -23.5505, longitude: -46.6333, timezone: -3 },
            { id: 'buenosaires', name: '布宜諾斯艾利斯', country: '阿根廷', countryCode: 'AR', latitude: -34.6118, longitude: -58.3960, timezone: -3 },

            // 大洋洲
            { id: 'sydney', name: '雪梨', country: '澳洲', countryCode: 'AU', latitude: -33.8688, longitude: 151.2093, timezone: 10 },
            { id: 'melbourne', name: '墨爾本', country: '澳洲', countryCode: 'AU', latitude: -37.8136, longitude: 144.9631, timezone: 10 },
            { id: 'perth', name: '伯斯', country: '澳洲', countryCode: 'AU', latitude: -31.9505, longitude: 115.8605, timezone: 8 },
            { id: 'auckland', name: '奧克蘭', country: '紐西蘭', countryCode: 'NZ', latitude: -36.8485, longitude: 174.7633, timezone: 12 },
            { id: 'wellington', name: '威靈頓', country: '紐西蘭', countryCode: 'NZ', latitude: -41.2865, longitude: 174.7762, timezone: 12 },
            { id: 'mira', name: '米拉', country: '印度', countryCode: 'IN', latitude: 19.2952, longitude: 72.8544, timezone: 5.5 },
            { id: 'rajahmundry', name: '拉賈蒙德里', country: '印度', countryCode: 'IN', latitude: 16.9849, longitude: 81.7870, timezone: 5.5 },
            { id: 'bhiwandi', name: '比萬迪', country: '印度', countryCode: 'IN', latitude: 19.3002, longitude: 73.0586, timezone: 5.5 },
            { id: 'rohtak', name: '羅塔克', country: '印度', countryCode: 'IN', latitude: 28.8955, longitude: 76.6066, timezone: 5.5 },
            { id: 'korba', name: '科爾巴', country: '印度', countryCode: 'IN', latitude: 22.3458, longitude: 82.6963, timezone: 5.5 },
            { id: 'bhilai', name: '比萊', country: '印度', countryCode: 'IN', latitude: 21.2167, longitude: 81.4333, timezone: 5.5 },
            { id: 'berhampur', name: '貝蘭普爾', country: '印度', countryCode: 'IN', latitude: 19.3147, longitude: 84.7941, timezone: 5.5 },
            { id: 'muzaffarnagar', name: '穆扎法爾納加爾', country: '印度', countryCode: 'IN', latitude: 29.4709, longitude: 77.7033, timezone: 5.5 },
            { id: 'ahmednagar', name: '艾哈邁德納加爾', country: '印度', countryCode: 'IN', latitude: 19.0952, longitude: 74.7496, timezone: 5.5 },
            { id: 'mathura', name: '馬圖拉', country: '印度', countryCode: 'IN', latitude: 27.4924, longitude: 77.6737, timezone: 5.5 },
            { id: 'kollam', name: '科拉姆', country: '印度', countryCode: 'IN', latitude: 8.8932, longitude: 76.6141, timezone: 5.5 },
            { id: 'avadi', name: '阿瓦迪', country: '印度', countryCode: 'IN', latitude: 13.1157, longitude: 80.1016, timezone: 5.5 },
            { id: 'kadapa', name: '卡達帕', country: '印度', countryCode: 'IN', latitude: 14.4753, longitude: 78.8294, timezone: 5.5 },
            { id: 'kamarhati', name: '卡馬爾哈蒂', country: '印度', countryCode: 'IN', latitude: 22.6711, longitude: 88.3747, timezone: 5.5 },
            { id: 'sambalpur', name: '桑巴爾普爾', country: '印度', countryCode: 'IN', latitude: 21.4703, longitude: 83.9701, timezone: 5.5 },
            { id: 'unnao', name: '烏瑙', country: '印度', countryCode: 'IN', latitude: 26.5471, longitude: 80.4878, timezone: 5.5 },
            { id: 'hugli', name: '胡格利', country: '印度', countryCode: 'IN', latitude: 22.9000, longitude: 88.3900, timezone: 5.5 },
            { id: 'udupi', name: '烏杜皮', country: '印度', countryCode: 'IN', latitude: 13.3409, longitude: 74.7421, timezone: 5.5 },
            { id: 'tenali', name: '特納利', country: '印度', countryCode: 'IN', latitude: 16.2430, longitude: 80.6404, timezone: 5.5 },
            { id: 'sagar', name: '薩加爾', country: '印度', countryCode: 'IN', latitude: 23.8338, longitude: 78.7164, timezone: 5.5 },
            { id: 'konkan', name: '孔坎', country: '印度', countryCode: 'IN', latitude: 15.3173, longitude: 74.0776, timezone: 5.5 },
            { id: 'ratlam', name: '拉特蘭', country: '印度', countryCode: 'IN', latitude: 23.3315, longitude: 75.0367, timezone: 5.5 },
            { id: 'hospet', name: '霍斯佩特', country: '印度', countryCode: 'IN', latitude: 15.2695, longitude: 76.3871, timezone: 5.5 },
            { id: 'aizawl', name: '艾藻爾', country: '印度', countryCode: 'IN', latitude: 23.7271, longitude: 92.7176, timezone: 5.5 },
            { id: 'dehradun', name: '德拉敦', country: '印度', countryCode: 'IN', latitude: 30.3165, longitude: 78.0322, timezone: 5.5 },
            { id: 'durgapur', name: '杜爾加普爾', country: '印度', countryCode: 'IN', latitude: 23.5204, longitude: 87.3119, timezone: 5.5 },
            { id: 'asansol', name: '阿桑索爾', country: '印度', countryCode: 'IN', latitude: 23.6739, longitude: 86.9524, timezone: 5.5 },
            { id: 'nanded', name: '南德', country: '印度', countryCode: 'IN', latitude: 19.1383, longitude: 77.3210, timezone: 5.5 },
            { id: 'kolhapur', name: '科爾哈普爾', country: '印度', countryCode: 'IN', latitude: 16.7050, longitude: 74.2433, timezone: 5.5 },
            { id: 'ajmer', name: '阿傑梅爾', country: '印度', countryCode: 'IN', latitude: 26.4499, longitude: 74.6399, timezone: 5.5 },
            { id: 'akola', name: '阿科拉', country: '印度', countryCode: 'IN', latitude: 20.7000, longitude: 77.0000, timezone: 5.5 },
            { id: 'gulbarga', name: '古爾伯加', country: '印度', countryCode: 'IN', latitude: 17.3297, longitude: 76.8343, timezone: 5.5 },
            { id: 'jamnagar', name: '賈姆納加爾', country: '印度', countryCode: 'IN', latitude: 22.4707, longitude: 70.0577, timezone: 5.5 },
            { id: 'ujjain', name: '烏賈因', country: '印度', countryCode: 'IN', latitude: 23.1765, longitude: 75.7885, timezone: 5.5 },
            { id: 'loni', name: '洛尼', country: '印度', countryCode: 'IN', latitude: 28.7515, longitude: 77.2880, timezone: 5.5 },
            { id: 'siliguri', name: '西里古里', country: '印度', countryCode: 'IN', latitude: 26.7271, longitude: 88.3953, timezone: 5.5 },
            { id: 'jhansi', name: '占西', country: '印度', countryCode: 'IN', latitude: 25.4484, longitude: 78.5685, timezone: 5.5 },
            { id: 'ulhasnagar', name: '烏拉斯納加爾', country: '印度', countryCode: 'IN', latitude: 19.2167, longitude: 73.1500, timezone: 5.5 },
            { id: 'nellore', name: '內洛爾', country: '印度', countryCode: 'IN', latitude: 14.4426, longitude: 79.9865, timezone: 5.5 },
            { id: 'jammu', name: '查謨', country: '印度', countryCode: 'IN', latitude: 32.7266, longitude: 74.8570, timezone: 5.5 },
            { id: 'sangli', name: '桑格利', country: '印度', countryCode: 'IN', latitude: 16.8524, longitude: 74.5815, timezone: 5.5 },
            { id: 'mangalore', name: '芒格洛爾', country: '印度', countryCode: 'IN', latitude: 12.9141, longitude: 74.8560, timezone: 5.5 },
            { id: 'erode', name: '埃羅德', country: '印度', countryCode: 'IN', latitude: 11.3410, longitude: 77.7172, timezone: 5.5 },
            { id: 'belgaum', name: '貝爾高姆', country: '印度', countryCode: 'IN', latitude: 15.8497, longitude: 74.4977, timezone: 5.5 },
            { id: 'ambattur', name: '安巴圖爾', country: '印度', countryCode: 'IN', latitude: 13.0767, longitude: 80.0886, timezone: 5.5 },
            { id: 'tirunelveli', name: '蒂魯內爾韋利', country: '印度', countryCode: 'IN', latitude: 8.7139, longitude: 77.7567, timezone: 5.5 },
            { id: 'malegaon', name: '馬萊岡', country: '印度', countryCode: 'IN', latitude: 20.5598, longitude: 74.5252, timezone: 5.5 },
            { id: 'gaya', name: '加雅', country: '印度', countryCode: 'IN', latitude: 24.7955, longitude: 85.0000, timezone: 5.5 },
            { id: 'jalgaon', name: '賈爾岡', country: '印度', countryCode: 'IN', latitude: 21.0077, longitude: 75.5626, timezone: 5.5 },
            { id: 'udaipur', name: '烏代布爾', country: '印度', countryCode: 'IN', latitude: 24.5854, longitude: 73.7125, timezone: 5.5 },
            { id: 'maheshtala', name: '馬赫什塔拉', country: '印度', countryCode: 'IN', latitude: 22.5086, longitude: 88.2539, timezone: 5.5 },
            { id: 'davanagere', name: '達瓦納格爾', country: '印度', countryCode: 'IN', latitude: 14.4669, longitude: 75.9264, timezone: 5.5 },
            { id: 'kozhikode', name: '科澤科德', country: '印度', countryCode: 'IN', latitude: 11.2588, longitude: 75.7804, timezone: 5.5 },
            { id: 'akbarpur', name: '阿克巴爾普爾', country: '印度', countryCode: 'IN', latitude: 26.4298, longitude: 82.5353, timezone: 5.5 },
            { id: 'gulbarga', name: '古爾伯加', country: '印度', countryCode: 'IN', latitude: 17.3297, longitude: 76.8343, timezone: 5.5 },
            { id: 'latur', name: '拉圖爾', country: '印度', countryCode: 'IN', latitude: 18.4088, longitude: 76.5604, timezone: 5.5 },
            { id: 'kurnool', name: '庫爾努爾', country: '印度', countryCode: 'IN', latitude: 15.8301, longitude: 78.0425, timezone: 5.5 },
            { id: 'rajpur', name: '拉傑普爾', country: '印度', countryCode: 'IN', latitude: 22.3293, longitude: 88.1510, timezone: 5.5 },
            { id: 'nagda', name: '納格達', country: '印度', countryCode: 'IN', latitude: 23.4564, longitude: 75.4175, timezone: 5.5 },
            { id: 'tumkur', name: '圖姆庫爾', country: '印度', countryCode: 'IN', latitude: 13.3399, longitude: 77.1003, timezone: 5.5 },
            { id: 'bidar', name: '比達爾', country: '印度', countryCode: 'IN', latitude: 17.9104, longitude: 77.5199, timezone: 5.5 },
            { id: 'singrauli', name: '辛格勞利', country: '印度', countryCode: 'IN', latitude: 24.1967, longitude: 82.6667, timezone: 5.5 },
            { id: 'puducherry', name: '本地治里', country: '印度', countryCode: 'IN', latitude: 11.9416, longitude: 79.8083, timezone: 5.5 },
            { id: 'shimla', name: '西姆拉', country: '印度', countryCode: 'IN', latitude: 31.1048, longitude: 77.1734, timezone: 5.5 },
            { id: 'gandhinagar', name: '甘地納加爾', country: '印度', countryCode: 'IN', latitude: 23.2156, longitude: 72.6369, timezone: 5.5 },
            { id: 'shillong', name: '西隆', country: '印度', countryCode: 'IN', latitude: 25.5788, longitude: 91.8933, timezone: 5.5 },
            { id: 'newdelhi', name: '新德里', country: '印度', countryCode: 'IN', latitude: 28.6139, longitude: 77.2090, timezone: 5.5 },
            { id: 'ranchi', name: '蘭契', country: '印度', countryCode: 'IN', latitude: 23.3441, longitude: 85.3096, timezone: 5.5 },
            { id: 'gwalior', name: '瓜廖爾', country: '印度', countryCode: 'IN', latitude: 26.2183, longitude: 78.1828, timezone: 5.5 },
            { id: 'jabalpur', name: '賈巴爾普爾', country: '印度', countryCode: 'IN', latitude: 23.1815, longitude: 79.9864, timezone: 5.5 },
            { id: 'coimbatore', name: '哥印拜陀', country: '印度', countryCode: 'IN', latitude: 11.0168, longitude: 76.9558, timezone: 5.5 },
            { id: 'howrah', name: '豪拉', country: '印度', countryCode: 'IN', latitude: 22.5892, longitude: 88.3103, timezone: 5.5 },
            { id: 'ranchi', name: '蘭契', country: '印度', countryCode: 'IN', latitude: 23.3441, longitude: 85.3096, timezone: 5.5 },
            { id: 'allahabad', name: '阿拉哈巴德', country: '印度', countryCode: 'IN', latitude: 25.4358, longitude: 81.8463, timezone: 5.5 },
            { id: 'navimumbai', name: '新孟買', country: '印度', countryCode: 'IN', latitude: 19.0330, longitude: 73.0297, timezone: 5.5 },
            { id: 'amritsar', name: '阿姆利則', country: '印度', countryCode: 'IN', latitude: 31.6340, longitude: 74.8723, timezone: 5.5 },
            { id: 'dhanbad', name: '丹巴德', country: '印度', countryCode: 'IN', latitude: 23.7957, longitude: 86.4304, timezone: 5.5 },
            { id: 'aurangabad', name: '奧蘭加巴德', country: '印度', countryCode: 'IN', latitude: 19.8762, longitude: 75.3433, timezone: 5.5 },
            { id: 'srinagar', name: '斯利那加', country: '印度', countryCode: 'IN', latitude: 34.0837, longitude: 74.7973, timezone: 5.5 },
            { id: 'varanasi', name: '瓦拉納西', country: '印度', countryCode: 'IN', latitude: 25.3176, longitude: 82.9739, timezone: 5.5 },
            { id: 'vasai', name: '瓦賽', country: '印度', countryCode: 'IN', latitude: 19.4700, longitude: 72.8000, timezone: 5.5 },
            { id: 'kalyan', name: '卡利揚', country: '印度', countryCode: 'IN', latitude: 19.2403, longitude: 73.1305, timezone: 5.5 },
            { id: 'rajkot', name: '拉傑果德', country: '印度', countryCode: 'IN', latitude: 22.3039, longitude: 70.8022, timezone: 5.5 },
            { id: 'meerut', name: '密拉特', country: '印度', countryCode: 'IN', latitude: 28.9845, longitude: 77.7064, timezone: 5.5 },
            { id: 'faridabad', name: '法里達巴德', country: '印度', countryCode: 'IN', latitude: 28.4089, longitude: 77.3178, timezone: 5.5 },
            { id: 'nashik', name: '納西克', country: '印度', countryCode: 'IN', latitude: 19.9975, longitude: 73.7898, timezone: 5.5 },
            { id: 'agra', name: '阿格拉', country: '印度', countryCode: 'IN', latitude: 27.1767, longitude: 78.0081, timezone: 5.5 },
            { id: 'ludhiana', name: '盧迪亞納', country: '印度', countryCode: 'IN', latitude: 30.9010, longitude: 75.8573, timezone: 5.5 },
            { id: 'vadodara', name: '瓦都達拉', country: '印度', countryCode: 'IN', latitude: 22.3072, longitude: 73.1812, timezone: 5.5 },
            { id: 'patna', name: '巴特那', country: '印度', countryCode: 'IN', latitude: 25.5941, longitude: 85.1376, timezone: 5.5 },
            { id: 'visakhapatnam', name: '維沙卡帕特南', country: '印度', countryCode: 'IN', latitude: 17.6868, longitude: 83.2185, timezone: 5.5 },
            { id: 'bhopal', name: '博帕爾', country: '印度', countryCode: 'IN', latitude: 23.2599, longitude: 77.4126, timezone: 5.5 },
            { id: 'indore', name: '印多爾', country: '印度', countryCode: 'IN', latitude: 22.7196, longitude: 75.8577, timezone: 5.5 },
            { id: 'nagpur', name: '那格浦爾', country: '印度', countryCode: 'IN', latitude: 21.1458, longitude: 79.0882, timezone: 5.5 },
            { id: 'kanpur', name: '坎普爾', country: '印度', countryCode: 'IN', latitude: 26.4499, longitude: 80.3319, timezone: 5.5 },
            { id: 'lucknow', name: '勒克瑙', country: '印度', countryCode: 'IN', latitude: 26.8467, longitude: 80.9462, timezone: 5.5 },
            { id: 'jaipur', name: '齋浦爾', country: '印度', countryCode: 'IN', latitude: 26.9124, longitude: 75.7873, timezone: 5.5 },
            { id: 'ahmedabad', name: '艾哈邁達巴德', country: '印度', countryCode: 'IN', latitude: 23.0225, longitude: 72.5714, timezone: 5.5 },
            { id: 'pune', name: '浦那', country: '印度', countryCode: 'IN', latitude: 18.5204, longitude: 73.8567, timezone: 5.5 },
            { id: 'hyderabad', name: '海德拉巴', country: '印度', countryCode: 'IN', latitude: 17.3850, longitude: 78.4867, timezone: 5.5 },
            { id: 'chennai', name: '清奈', country: '印度', countryCode: 'IN', latitude: 13.0827, longitude: 80.2707, timezone: 5.5 },
            { id: 'kolkata', name: '加爾各答', country: '印度', countryCode: 'IN', latitude: 22.5726, longitude: 88.3639, timezone: 5.5 },
            { id: 'bangalore', name: '班加羅爾', country: '印度', countryCode: 'IN', latitude: 12.9716, longitude: 77.5946, timezone: 5.5 },
            { id: 'delhi', name: '新德里', country: '印度', countryCode: 'IN', latitude: 28.6139, longitude: 77.2090, timezone: 5.5 },
            { id: 'mumbai', name: '孟買', country: '印度', countryCode: 'IN', latitude: 19.0760, longitude: 72.8777, timezone: 5.5 },
            { id: 'karachi', name: '喀拉蚩', country: '巴基斯坦', countryCode: 'PK', latitude: 24.8607, longitude: 67.0011, timezone: 5 },
            { id: 'islamabad', name: '伊斯蘭堡', country: '巴基斯坦', countryCode: 'PK', latitude: 33.6844, longitude: 73.0479, timezone: 5 },
            { id: 'male', name: '馬累', country: '馬爾地夫', countryCode: 'MV', latitude: 4.1755, longitude: 73.5093, timezone: 5 },
            { id: 'colombo', name: '可倫坡', country: '斯里蘭卡', countryCode: 'LK', latitude: 6.9271, longitude: 79.8612, timezone: 5.5 },
            { id: 'dhaka', name: '達卡', country: '孟加拉', countryCode: 'BD', latitude: 23.8103, longitude: 90.4125, timezone: 6 },
            { id: 'kathmandu', name: '加德滿都', country: '尼泊爾', countryCode: 'NP', latitude: 27.7172, longitude: 85.3240, timezone: 5.75 },
            { id: 'dili', name: '帝力', country: '東帝汶', countryCode: 'TL', latitude: -8.5558, longitude: 125.5603, timezone: 9 },
            { id: 'bandar', name: '斯里巴加灣', country: '汶萊', countryCode: 'BN', latitude: 4.9036, longitude: 114.9398, timezone: 8 },
            { id: 'vientiane', name: '永珍', country: '寮國', countryCode: 'LA', latitude: 17.9757, longitude: 102.6331, timezone: 7 },
            { id: 'phnompenh', name: '金邊', country: '柬埔寨', countryCode: 'KH', latitude: 11.5564, longitude: 104.9282, timezone: 7 },
            { id: 'yangon', name: '仰光', country: '緬甸', countryCode: 'MM', latitude: 16.8661, longitude: 96.1951, timezone: 6.5 },
            { id: 'hanoi', name: '河內', country: '越南', countryCode: 'VN', latitude: 21.0285, longitude: 105.8542, timezone: 7 },
            { id: 'hochiminh', name: '胡志明市', country: '越南', countryCode: 'VN', latitude: 10.8231, longitude: 106.6297, timezone: 7 },
            { id: 'jakarta', name: '雅加達', country: '印尼', countryCode: 'ID', latitude: -6.2088, longitude: 106.8456, timezone: 7 },
            { id: 'kualalumpur', name: '吉隆坡', country: '馬來西亞', countryCode: 'MY', latitude: 3.1390, longitude: 101.6869, timezone: 8 },
            { id: 'manila', name: '馬尼拉', country: '菲律賓', countryCode: 'PH', latitude: 14.5995, longitude: 120.9842, timezone: 8 },
            { id: 'hongkong', name: '香港', country: '香港', countryCode: 'HK', latitude: 22.3193, longitude: 114.1694, timezone: 8 },
            { id: 'bangkok', name: '曼谷', country: '泰國', countryCode: 'TH', latitude: 13.7563, longitude: 100.5018, timezone: 7 },
            { id: 'singapore', name: '新加坡', country: '新加坡', countryCode: 'SG', latitude: 1.3521, longitude: 103.8198, timezone: 8 },
            { id: 'seoul', name: '首爾', country: '韓國', countryCode: 'KR', latitude: 37.5665, longitude: 126.9780, timezone: 9 },
            { id: 'tokyo', name: '東京', country: '日本', countryCode: 'JP', latitude: 35.6762, longitude: 139.6503, timezone: 9 }
        ];
    }

    // 過濾8小時航程內的城市
    filterByFlightRange(currentLocation, cities) {
        const flightDuration = 8; // 小時
        const flightSpeed = 800; // 公里/小時
        const maxDistance = flightDuration * flightSpeed; // 6400公里

        return cities.filter(city => {
            const distance = this.calculateDistance(
                [currentLocation.coordinates[0], currentLocation.coordinates[1]],
                [city.latitude, city.longitude]
            );
            return distance <= maxDistance;
        }).map(city => ({
            ...city,
            distance: this.calculateDistance(
                [currentLocation.coordinates[0], currentLocation.coordinates[1]],
                [city.latitude, city.longitude]
            ),
            flightTime: Math.round((this.calculateDistance(
                [currentLocation.coordinates[0], currentLocation.coordinates[1]],
                [city.latitude, city.longitude]
            ) / flightSpeed) * 10) / 10
        }));
    }

    // 選擇4個最佳目的地
    selectBestDestinations(cities, currentLocation) {
        if (cities.length === 0) {
            // 如果沒有符合條件的城市，返回前4個城市
            const allCities = this.getAllCities();
            return allCities.slice(0, 4).map(city => ({
                id: city.id,
                name: city.name,
                country: city.country,
                countryCode: city.countryCode,
                flag: this.getCountryFlag(city.countryCode),
                distance: this.calculateDistance(
                    [currentLocation.coordinates[0], currentLocation.coordinates[1]],
                    [city.latitude, city.longitude]
                ),
                flightTime: Math.round((this.calculateDistance(
                    [currentLocation.coordinates[0], currentLocation.coordinates[1]],
                    [city.latitude, city.longitude]
                ) / 800) * 10) / 10,
                coordinates: [city.latitude, city.longitude],
                price: this.calculateFlightPrice(this.calculateDistance(
                    [currentLocation.coordinates[0], currentLocation.coordinates[1]],
                    [city.latitude, city.longitude]
                )),
                timezone: city.timezone,
                unlocked: true
            }));
        }

        // 按距離排序，選擇不同距離範圍的城市
        const sortedCities = cities.sort((a, b) => a.distance - b.distance);

        // 選擇策略：近、中近、中遠、遠各一個
        const selected = [];
        const ranges = [
            { min: 0, max: 1600 },      // 近距離
            { min: 1600, max: 3200 },   // 中近距離
            { min: 3200, max: 4800 },   // 中遠距離
            { min: 4800, max: 6400 }    // 遠距離
        ];

        ranges.forEach(range => {
            const citiesInRange = sortedCities.filter(city =>
                city.distance >= range.min && city.distance < range.max
            );
            if (citiesInRange.length > 0) {
                const randomCity = citiesInRange[Math.floor(Math.random() * citiesInRange.length)];
                selected.push({
                    id: randomCity.id,
                    name: randomCity.name,
                    country: randomCity.country,
                    countryCode: randomCity.countryCode,
                    flag: this.getCountryFlag(randomCity.countryCode),
                    distance: Math.round(randomCity.distance),
                    flightTime: randomCity.flightTime,
                    coordinates: [randomCity.latitude, randomCity.longitude],
                    price: this.calculateFlightPrice(randomCity.distance),
                    timezone: randomCity.timezone,
                    unlocked: true
                });
            }
        });

        // 如果選擇的城市不足4個，用隨機城市補足
        while (selected.length < 4 && sortedCities.length > selected.length) {
            const remainingCities = sortedCities.filter(city =>
                !selected.some(selectedCity => selectedCity.id === city.id)
            );
            if (remainingCities.length > 0) {
                const randomCity = remainingCities[Math.floor(Math.random() * remainingCities.length)];
                selected.push({
                    id: randomCity.id,
                    name: randomCity.name,
                    country: randomCity.country,
                    countryCode: randomCity.countryCode,
                    flag: this.getCountryFlag(randomCity.countryCode),
                    distance: Math.round(randomCity.distance),
                    flightTime: randomCity.flightTime,
                    coordinates: [randomCity.latitude, randomCity.longitude],
                    price: this.calculateFlightPrice(randomCity.distance),
                    timezone: randomCity.timezone,
                    unlocked: true
                });
            } else {
                break;
            }
        }

        return selected;
    }

    // 備用目的地（當API失敗時）
    getFallbackDestinations() {
        return [
            {
                id: 'tokyo',
                name: '東京',
                country: '日本',
                countryCode: 'JP',
                flag: '🇯🇵',
                distance: 2100,
                flightTime: 2.6,
                coordinates: [35.6762, 139.6503],
                price: 3000,
                unlocked: true
            },
            {
                id: 'seoul',
                name: '首爾',
                country: '韓國',
                countryCode: 'KR',
                flag: '🇰🇷',
                distance: 1800,
                flightTime: 2.3,
                coordinates: [37.5665, 126.9780],
                price: 2800,
                unlocked: true
            },
            {
                id: 'bangkok',
                name: '曼谷',
                country: '泰國',
                countryCode: 'TH',
                flag: '🇹🇭',
                distance: 1200,
                flightTime: 1.5,
                coordinates: [13.7563, 100.5018],
                price: 2500,
                unlocked: true
            },
            {
                id: 'singapore',
                name: '新加坡',
                country: '新加坡',
                countryCode: 'SG',
                flag: '🇸🇬',
                distance: 800,
                flightTime: 1.0,
                coordinates: [1.3521, 103.8198],
                price: 2200,
                unlocked: true
            },
            {
                id: 'hongkong',
                name: '香港',
                country: '香港',
                countryCode: 'HK',
                flag: '🇭🇰',
                distance: 600,
                flightTime: 0.8,
                coordinates: [22.3193, 114.1694],
                price: 2000,
                unlocked: true
            }
        ];
    }

    // 更新計時長度（分鐘）
    updateTimerDuration(minutes) {
        // 確保最短30分鐘
        const validMinutes = Math.max(30, Number(minutes) || 30);
        this.gameState.timerDuration = validMinutes;

        // 更新預設按鈕狀態
        document.querySelectorAll('.time-preset').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.minutes && Number(btn.dataset.minutes) === validMinutes) {
                btn.classList.add('active');
            }
        });

        // 更新輸入框
        const timerInput = document.getElementById('timerDurationInput');
        if (timerInput) {
            timerInput.value = validMinutes;
        }

        // 重新載入目的地
        this.renderDestinationGrid();
    }

    // 播放睡眠航班語音（優先呼叫後端 OpenAI 生成；失敗時使用備用）
    async playSleepFlightAnnouncement(announcementType, destination, punctuality = null) {
        console.log('播放睡眠航班廣播:', announcementType, destination, punctuality);

        // 組合請求內容（加入機長口吻、風趣、在地特色）
        const origin = this.gameState.currentLocation || { name: '台北', country: '台灣', coordinates: [25.0330, 121.5654] };

        // 計算目的地的當地時間和時段
        let localTimeInfo = null;
        if (destination && announcementType === 'landing') {
            try {
                const now = this.now();
                const currentTimezone = this.getCurrentLocationTimezone();
                const destinationTimezone = destination?.timezone || currentTimezone;
                const timezoneDiff = destinationTimezone - currentTimezone;

                // 計算到達時間（目的地當地時間）
                let arrivalTimeAtDestination;
                if (this.gameState.flightTimerMode) {
                    const timerMinutes = this.gameState.timerDuration || 30;
                    const endTimeAtCurrentLocation = new Date(now.getTime() + timerMinutes * 60 * 1000);
                    arrivalTimeAtDestination = new Date(endTimeAtCurrentLocation.getTime() + timezoneDiff * 60 * 60 * 1000);
                } else {
                    // 舊模式：假設明天 08:00 到達
                    arrivalTimeAtDestination = new Date(now);
                    arrivalTimeAtDestination.setDate(arrivalTimeAtDestination.getDate() + 1);
                    arrivalTimeAtDestination.setHours(8, 0, 0, 0);
                    arrivalTimeAtDestination = new Date(arrivalTimeAtDestination.getTime() + timezoneDiff * 60 * 60 * 1000);
                }

                const localHour = arrivalTimeAtDestination.getHours();
                const localMinute = arrivalTimeAtDestination.getMinutes();

                // 判斷時段
                let timeOfDay = '';
                let timeContext = '';
                if (localHour >= 6 && localHour < 11) {
                    timeOfDay = 'morning';
                    timeContext = '早上';
                } else if (localHour >= 11 && localHour < 14) {
                    timeOfDay = 'noon';
                    timeContext = '中午';
                } else if (localHour >= 14 && localHour < 18) {
                    timeOfDay = 'afternoon';
                    timeContext = '下午';
                } else if (localHour >= 18 && localHour < 22) {
                    timeOfDay = 'evening';
                    timeContext = '晚上';
                } else {
                    timeOfDay = 'night';
                    timeContext = '深夜';
                }

                localTimeInfo = {
                    localHour: localHour,
                    localMinute: localMinute,
                    localTimeString: `${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}`,
                    timeOfDay: timeOfDay,
                    timeContext: timeContext
                };

                console.log('📍 目的地當地時間資訊:', localTimeInfo);
            } catch (e) {
                console.warn('計算目的地當地時間失敗:', e);
            }
        }

        // 根據準時性狀態調整語氣提示
        let toneHints = [
            '以機長第一人稱開場：各位乘客大家好，我是本次航班的機長',
            '口吻輕鬆風趣但專業，簡短有力，10–30秒',
            '提到目的地的1–2個在地特色（文化/美食/地標/氣候/景點）',
            '降落廣播請報時：預計到達/當地時間（若未知可略過）',
            '避免冗長旅遊指南，避免過多數字，避免重複',
        ];

        // 根據準時性狀態調整語氣
        if (punctuality && punctuality.status) {
            if (punctuality.status === 'PERFECT') {
                toneHints.push('語氣：專業、溫柔、有點儀式感，可搭配輕微跑道聲＋塔台音效');
            } else if (punctuality.status === 'EARLY') {
                toneHints.push('語氣：輕鬆、安慰、有點吐槽但不傷人');
            } else if (punctuality.status === 'LATE') {
                toneHints.push('語氣：幽默、帶歉意、有故事性');
            }
        }

        const body = {
            announcementType: (announcementType === 'takeoff') ? 'boarding' : announcementType,
            city: destination?.name,
            country: destination?.country,
            countryCode: destination?.countryCode,
            currentLocation: origin?.name || '台北',
            timerDuration: this.gameState.timerDuration || 30, // 計時長度（分鐘）
            // 新欄位（語意化）
            origin: { city: origin?.name || '台北', country: origin?.country || '台灣' },
            destination: { city: destination?.name, country: destination?.country },
            // 新增：準時性狀態
            punctuality: punctuality ? {
                status: punctuality.status, // 'EARLY', 'ON_TIME', 'LATE', 'PERFECT'
                minutesDiff: punctuality.minutesDiff,
                actualTime: punctuality.actualTime,
                targetTime: punctuality.targetTime,
                originalDestination: punctuality.originalDestination,
                divertedCity: punctuality.divertedCity
            } : null,
            // 新增：目的地當地時間資訊
            localTimeInfo: localTimeInfo,
            // 新增：任務類型
            taskType: this.gameState.taskType || 'REST',
            // 介面語言（用來決定中文/英文廣播）
            uiLanguage: this.gameState.language || 'zh-TW',
            // 提示模型偏好
            style: 'captain_funny',
            toneHints: toneHints
        };

        try {
            const res = await fetch('/api/generateSleepFlightAnnouncement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`API status ${res.status}`);
            const data = await res.json();

            const announcement = (data && data.announcement) ? data.announcement : null;
            if (announcement) {
                // 使用 Promise 包裝播放，以便等待播放完成
                return new Promise((resolve) => {
                    const lang = this.gameState.language === 'en' ? 'en-US' : 'zh-TW';
                    if (window.audioManager && typeof window.audioManager.playTextWithLanguage === 'function') {
                        window.audioManager.playTextWithLanguage(announcement, lang, {
                            voice: 'male_lively', rate: 1.05, pitch: 0.95, style: 'lively'
                        }).then(() => {
                            resolve(true);
                        }).catch(() => {
                            resolve(false);
                        });
                    } else {
                        // 使用瀏覽器 TTS，監聽播放完成事件
                        this.playTextWithBrowserTTS(announcement, resolve);
                    }
                });
            }
        } catch (err) {
            console.warn('OpenAI 生成失敗，改用備用廣播。', err);
        }

        // 備援：本地機長口吻文案
        const fallback = this.getCaptainStyleFallback(announcementType, destination);
        return new Promise((resolve) => {
            try {
                const lang = this.gameState.language === 'en' ? 'en-US' : 'zh-TW';
                if (window.audioManager && typeof window.audioManager.playTextWithLanguage === 'function') {
                    window.audioManager.playTextWithLanguage(fallback, lang, {
                        voice: 'male_lively',
                        rate: 1.05,
                        pitch: 0.95,
                        style: 'lively'
                    }).then(() => {
                        resolve(false);
                    }).catch(() => {
                        resolve(false);
                    });
                } else {
                    this.playTextWithBrowserTTS(fallback, resolve);
                }
            } catch (e) {
                console.warn('播放備援語音失敗，改以 alert 顯示文案');
                alert(fallback);
                resolve(false);
            }
        });
    }

    // 備用廣播內容（一般）
    getFallbackAnnouncement(announcementType, destination) {
        if (announcementType === 'boarding') {
            return `歡迎搭乘 Wake Up Airlines！我們即將從 ${this.gameState.currentLocation?.name || '台北'} 飛往 ${destination.name}，預計明天 ${this.calculateArrivalTime(destination)} 到達。請準備好您的夢想，我們即將起飛！`;
        } else if (announcementType === 'landing') {
            return `各位旅客，飛機即將降落在 ${destination.name}。請繫好安全帶，準備降落。如果您準備好了，請按按鈕確認降落。`;
        }
        return '';
    }

    // 備用廣播內容（機長口吻、風趣版）
    getCaptainStyleFallback(announcementType, destination) {
        const city = destination?.name || '目的地';
        const country = destination?.country || '';

        if (announcementType === 'boarding') {
            return `各位乘客大家好，我是本次航班的機長。` +
                `從 ${this.gameState.currentLocation?.name || '台北'} 出發，航向 ${country}${city}。` +
                `待會兒請把座椅靠背立起、調整心情到「度假模式」，` +
                `我們會用最平穩的姿態帶你接近一點點幸福。祝您旅途愉快！`;
        } else if (announcementType === 'takeoff') {
            return `各位乘客大家好，我是機長。` +
                `飛機即將從 ${this.gameState.currentLocation?.name || '台北'} 起飛，` +
                `目的地是 ${country}${city}。` +
                `請繫好安全帶，收起小桌板，準備享受這段美好的飛行時光。` +
                `我們即將起飛，祝您旅途愉快！`;
        }
        // landing
        return `各位乘客大家好，機長在此。飛機即將降落在 ${country}${city}。` +
            `這裡以熱情著稱，美食與文化都很有味道，等一下走出機艙記得深呼吸一下當地的空氣。` +
            `請您再次確認安全帶已繫妥，小桌板收好，行李安置穩固。` +
            `代表全體機組人員，感謝您搭乘，也祝您在 ${city} 有個美好的一天！！！愛你喔。`;
    }

    // 使用瀏覽器TTS播放文字
    playTextWithBrowserTTS(text, onComplete = null) {
        if ('speechSynthesis' in window) {
            const voices = speechSynthesis.getVoices();
            const preferred = voices.find(v => /zh-TW/i.test(v.lang) && /male|Google|Android/i.test(v.name));
            const utterance = new SpeechSynthesisUtterance(text);
            if (preferred) utterance.voice = preferred; // 男聲偏好
            utterance.lang = 'zh-TW';
            utterance.rate = 1.05; // 活潑一點
            utterance.pitch = 0.95;

            // 監聽播放完成事件
            if (onComplete) {
                utterance.onend = () => {
                    onComplete(true);
                };
                utterance.onerror = () => {
                    onComplete(false);
                };
            }

            speechSynthesis.speak(utterance);
        } else if (onComplete) {
            onComplete(false);
        }
    }

    // 外部 API
    getGameState() {
        return this.gameState;
    }

    getCurrentTicket() {
        return this.gameState.currentTicket;
    }


    resetGame() {
        this.gameState = {
            currentWeek: 1,
            currentDay: 1,
            selectedDestination: null,
            destinations: this.gameState.destinations,
            currentTicket: null,
            gameStarted: false,
            flightTimerMode: true,
            timerDuration: 30,
            timerStartTime: null,
            timerEndTime: null,
            currentLocation: null,
            actionButtonState: 'hidden',
            flightCompleted: false,
            isLanding: false
        };

        localStorage.removeItem('wakeUpMapGame');
        this.renderDestinationGrid();

        // 顯示遊戲開始畫面
        document.getElementById('gameStartState').classList.add('active');
        document.getElementById('waitingState').classList.remove('active');
    }

    cleanupMapOverlays() {
        const classes = ['flight-status-popup', 'resource-display-popup', 'simple-ticket-popup'];
        classes.forEach(cls => {
            document.querySelectorAll(`.${cls}`).forEach(el => el.remove());
        });
    }

    hideLegacyResultPanels() {
        const selectors = ['.result-info-panel', '.voice-loading-bar', '#resultInfoPanel', '#voiceLoadingBar'];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.style.display = 'none';
            });
        });
    }
}

// 初始化遊戲系統
let wakeUpMapGame;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 開始初始化遊戲系統...');
    wakeUpMapGame = new WakeUpMapGame();

    // 將遊戲實例暴露到全域
    window.wakeUpMapGame = wakeUpMapGame;

    console.log('🎮 Wake-Up Map 遊戲系統已初始化');
    console.log('🎮 遊戲狀態:', wakeUpMapGame.getGameState());

    // 觸發遊戲系統就緒事件
    window.dispatchEvent(new CustomEvent('gameSystemReady', {
        detail: { game: wakeUpMapGame }
    }));

    // 掛載除錯快速顯示按鈕方法
    wakeUpMapGame._exposeDebugButtons();
});

// 導出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WakeUpMapGame;
}

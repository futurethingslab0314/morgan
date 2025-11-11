/**
 * 🗺️ Wake-Up Map 遊戲化系統
 * 每週旅程模式 - 7天為一個週期
 */

class WakeUpMapGame {
    constructor() {
        this.gameState = {
            money: 10000,
            fuel: 1000,
            currentWeek: 1,
            currentDay: 1,
            selectedDestination: null,
            destinations: [], // 將由睡眠航班系統動態生成
            currentTicket: null,
            gameStarted: false,
            // 新增睡眠航班相關狀態
            sleepFlightMode: true,
            wakeTime: '08:00',
            currentLocation: null,
            actionButtonState: 'hidden', // hidden, boarding, landing
            flightCompleted: false,
            isLanding: false
        };

        this.usedCitiesFallback = false;
        this.citiesDataSource = 'unknown';

        this.init();
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
            urlCandidates.push('cities_data.json');
            urlCandidates.push('/cities_data.json');
            if (origin) urlCandidates.push(`${origin.replace(/\/$/, '')}/cities_data.json`);
        } else {
            urlCandidates.push('/cities_data.json');
        }

        for (const url of [...new Set(urlCandidates)]) {
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) {
                    console.warn(`cities_data.json 載入失敗 (HTTP ${res.status})，來源: ${url}`);
                    continue;
                }
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
            statusElement.textContent = status;

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

    // 依現在時間推導飛行狀態（測試時鐘友善）
    getCurrentFlightStatus() {
        // 如果正在降落中，顯示降落中
        if (this.gameState.isLanding) {
            return '降落中';
        }

        // 如果飛行已經完成（按過降落鍵），顯示已降落
        if (this.gameState.flightCompleted) {
            return '已降落';
        }

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
        this.renderDestinationGrid();
        this.updateResourceDisplay();
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
        // 首頁：購買機票/開始旅程
        document.getElementById('buyTicketBtn')?.addEventListener('click', () => {
            if (this.gameState.currentTicket) return; // 已有機票，禁用
            this.showDestinationModal();
        });
        document.getElementById('beginJourneyBtn')?.addEventListener('click', async () => {
            if (!this.gameState.currentTicket) return; // 尚未購票
            // 播放起飛廣播後再進入地圖
            try {
                await this.playSleepFlightAnnouncement('takeoff', this.gameState.selectedDestination || this.gameState.currentTicket?.destination);
            } catch (e) {
                console.warn('起飛語音播放失敗，改為直接進入地圖', e);
            }
            this.startGame();
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

        // 懸浮視窗關閉事件
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

        // 睡眠航班時間選擇事件
        document.getElementById('wakeTimeInput')?.addEventListener('change', (e) => {
            this.updateWakeTime(e.target.value);
        });

        // 時間預設按鈕事件
        document.querySelectorAll('.time-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTimePreset(e.target.dataset.time);
            });
        });
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

            // 計算可達目的地
            const destinations = await this.calculateSleepFlightDestinations(currentLocation, this.gameState.wakeTime);
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
                    <div class="dest-price">NT$ ${dest.price.toLocaleString()}</div>
                `;

                grid.appendChild(button);
            });

        } catch (error) {
            console.error('載入目的地失敗:', error);
            grid.innerHTML = '<div class="error-destinations">❌ 載入目的地失敗，請稍後再試</div>';
        }
    }

    showDestinationModal() {
        const modal = document.getElementById('destinationModal');
        if (modal) {
            modal.classList.add('active');
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

        // 檢查是否有足夠的錢
        if (this.gameState.money < destination.price) {
            alert(`💰 金錢不足！需要 NT$ ${destination.price.toLocaleString()}，您只有 NT$ ${this.gameState.money.toLocaleString()}`);
            return;
        }

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
        // 更新機票資訊
        const selectedDestinationEl = document.getElementById('selectedDestination');
        const destinationCodeEl = document.getElementById('destinationCode');
        const ticketPriceEl = document.getElementById('ticketPrice');
        const departureDateEl = document.getElementById('departureDate');
        const departureTimeEl = document.getElementById('departureTime');
        const arrivalTimeEl = document.getElementById('arrivalTime');

        if (selectedDestinationEl) selectedDestinationEl.textContent = destination.name;
        if (destinationCodeEl) destinationCodeEl.textContent = destination.countryCode || 'XXX';
        if (ticketPriceEl) ticketPriceEl.textContent = `NT$ ${destination.price.toLocaleString()}`;
        if (departureDateEl) departureDateEl.textContent = this.getCurrentDate();
        if (departureTimeEl) departureTimeEl.textContent = '11:30';

        // 睡眠航班模式：根據起床時間計算到達時間
        let arrivalTimeText;
        if (this.gameState.sleepFlightMode) {
            arrivalTimeText = `隔天 ${this.gameState.wakeTime}`;
        } else {
            // 原有的飛行天數計算
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

        if (arrivalTimeEl) arrivalTimeEl.textContent = arrivalTimeText;

        // 生成隨機的航班資訊
        const flightNumber = `WU-${Math.floor(Math.random() * 9000) + 1000}`;
        const seatNumber = `${Math.floor(Math.random() * 30) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`;
        const gateNumber = `${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;
        const ticketNumber = `WU${new Date().getFullYear()}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

        const flightNumberEl = document.getElementById('flightNumber');
        const seatNumberEl = document.getElementById('seatNumber');
        const gateNumberEl = document.getElementById('gateNumber');
        const barcodeNumberEl = document.getElementById('barcodeNumber');

        if (flightNumberEl) flightNumberEl.textContent = flightNumber;
        if (seatNumberEl) seatNumberEl.textContent = seatNumber;
        if (gateNumberEl) gateNumberEl.textContent = gateNumber;
        if (barcodeNumberEl) barcodeNumberEl.textContent = ticketNumber;

        // 顯示機票確認視窗
        this.showTicketModal();
    }

    async confirmTicket() {
        if (!this.gameState.selectedDestination) return;

        const destination = this.gameState.selectedDestination;

        // 扣除金錢
        this.gameState.money -= destination.price;

        // 生成機票
        this.gameState.currentTicket = {
            id: `ticket_${Date.now()}`,
            destination: destination,
            purchaseDate: new Date().toISOString(),
            week: this.gameState.currentWeek,
            price: destination.price
        };

        // 保存狀態
        this.saveGameState();

        // 更新資源顯示
        this.updateResourceDisplay();

        // 隱藏機票確認視窗
        this.hideTicketModal();

        // 顯示機票UI在台北位置欄位下方
        this.showTicketInLocationPanel();

        // 更新首頁按鈕狀態（購票後：購買機票禁用、開始旅程可按）
        this.refreshHomeButtonsState();

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

        // 重新顯示目的地選擇視窗
        this.showDestinationModal();
        this.refreshHomeButtonsState();
    }

    // 首頁雙按鈕可用性切換
    refreshHomeButtonsState() {
        const buyBtn = document.getElementById('buyTicketBtn');
        const beginBtn = document.getElementById('beginJourneyBtn');
        const hasTicket = !!this.gameState.currentTicket;

        if (buyBtn) buyBtn.disabled = hasTicket;
        if (beginBtn) beginBtn.disabled = !hasTicket;
    }

    startGame() {
        this.gameState.gameStarted = true;
        this.saveGameState();

        // 隱藏遊戲開始畫面
        document.getElementById('gameStartState').classList.remove('active');

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
        // 創建飛行地圖容器
        const flightMapContainer = document.createElement('div');
        flightMapContainer.id = 'flightMapContainer';
        flightMapContainer.className = 'flight-map-container';

        // 添加到結果狀態中
        const resultState = document.getElementById('resultState');
        if (resultState) {
            resultState.appendChild(flightMapContainer);
        }

        // 初始化飛行地圖
        this.initializeFlightMap();

        // 顯示結果狀態
        document.getElementById('resultState').classList.add('active');
    }

    initializeFlightMap() {
        const destination = this.gameState.selectedDestination;
        if (!destination) return;

        // 台北座標
        const taipeiCoords = [25.0330, 121.5654];

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
        this.map = L.map(el).setView(taipeiCoords, 3);

        // 添加地圖瓦片
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // 清理既有浮層，避免重複或被舊元素遮擋
        this.cleanupMapOverlays();

        // 添加台北標記
        const taipeiMarker = L.marker(taipeiCoords).addTo(this.map);
        taipeiMarker.bindPopup(`
            <div class="flight-popup">
                <h3>✈️ 出發地</h3>
                <p><strong>台北 TPE</strong></p>
                <p>台灣</p>
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
        const flightPath = L.polyline([taipeiCoords, destinationCoords], {
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

        // 2. 創建飛機標記（初始位置在台北）
        const planeMarker = L.marker(taipeiCoords, { icon: planeIcon }).addTo(this.map);
        console.log('飛機已創建，位置:', taipeiCoords);

        // 3. 計算飛機應該在哪個位置
        const getFlightProgress = () => {
            const now = this.now();
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

            console.log('飛行進度計算:', {
                now: now.toLocaleString(),
                departure: departureTime.toLocaleString(),
                target: targetTime.toLocaleString(),
                progress: Math.round(progress * 100) + '%'
            });

            return progress;
        };

        // 4. 更新飛機位置
        const updatePlanePosition = () => {
            const progress = getFlightProgress();

            // 計算飛機在航線上的位置
            const planePos = [
                taipeiCoords[0] + (destinationCoords[0] - taipeiCoords[0]) * progress,
                taipeiCoords[1] + (destinationCoords[1] - taipeiCoords[1]) * progress
            ];

            // 更新飛機位置
            planeMarker.setLatLng(planePos);

            // 設置飛機角度（朝向目的地）
            const angle = Math.atan2(
                destinationCoords[1] - taipeiCoords[1],
                destinationCoords[0] - taipeiCoords[0]
            ) * 180 / Math.PI;

            const planeElement = planeMarker.getElement();
            if (planeElement) {
                planeElement.style.transform = `rotate(${angle + 45}deg)`;
            }

            console.log('飛機位置更新:', planePos, '進度:', Math.round(progress * 100) + '%');
        };

        // 5. 啟動飛機動畫（每10秒更新一次）
        updatePlanePosition(); // 立即更新一次
        setInterval(updatePlanePosition, 10000); // 每10秒更新

        // 計算距離
        const distance = this.calculateDistance(taipeiCoords, destinationCoords);

        // 添加飛行狀態懸浮視窗
        this.addFlightStatusPopup(this.map, distance, destination);

        // 調整地圖視圖以包含兩個點
        const group = new L.featureGroup([taipeiMarker, destinationMarker]);
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
        // 創建飛行狀態懸浮視窗（右上角）
        const flightStatus = document.createElement('div');
        flightStatus.className = 'flight-status-popup';
        flightStatus.innerHTML = `
            <div class="flight-status-content">
                <h3>✈️ 飛行狀態</h3>
                <div class="flight-info">
                    <div class="info-item">
                        <span class="label">目的地：</span>
                        <span class="value">${destination.flag} ${destination.name}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">距離：</span>
                        <span class="value">${distance.toLocaleString()} 公里</span>
                    </div>
                    <div class="info-item">
                        <span class="label">狀態：</span>
                        <span class="value flight-status">準備起飛</span>
                    </div>
                    <div class="info-item">
                        <span class="label">預計到達時間：</span>
                        <span class="value" id="estimatedArrivalTime">計算中...</span>
                    </div>
                </div>
            </div>
        `;

        // 創建資源顯示（右下角）
        const resourceDisplay = document.createElement('div');
        resourceDisplay.className = 'resource-display-popup';
        const moneyPct = Math.min(100, Math.round((this.gameState.money / 10000) * 100));
        const fuelPct = Math.min(100, Math.round((this.gameState.fuel / 1000) * 100));

        resourceDisplay.innerHTML = `
            <div class="resource-display-content">
                <h3>💰 資源</h3>
                <div class="resource-bars">
                    <div class="resource-bar">
                        <div class="resource-label">💰 Money</div>
                        <div class="resource-bar-fill">
                            <div class="resource-fill money-fill" style="width: ${moneyPct}%"></div>
                        </div>
                        <span class="resource-value" id="flightMoney">${this.gameState.money.toLocaleString()}</span>
                    </div>
                    <div class="resource-bar">
                        <div class="resource-label">⛽ Fuel</div>
                        <div class="resource-bar-fill">
                            <div class="resource-fill fuel-fill" style="width: ${fuelPct}%"></div>
                        </div>
                        <span class="resource-value" id="flightFuel">${this.gameState.fuel}/1000</span>
                    </div>
                </div>
            </div>
        `;

        // 創建簡單機票（左下角）
        const simpleTicket = document.createElement('div');
        simpleTicket.className = 'simple-ticket-popup';
        simpleTicket.innerHTML = `
            <div class="simple-ticket-content">
                <div class="ticket-header">
                    <span class="airline-icon">✈️</span>
                    <span class="airline-name">WAKE UP</span>
                </div>
                <div class="ticket-route">
                    <div class="from">TPE</div>
                    <div class="arrow">→</div>
                    <div class="to">${destination.code || 'XXX'}</div>
                </div>
                <div class="ticket-details">
                    <div class="detail-item">
                        <span class="detail-label">FLIGHT</span>
                        <span class="detail-value">WU-${Math.floor(Math.random() * 9000) + 1000}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">DATE</span>
                        <span class="detail-value">${new Date().toISOString().split('T')[0]}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">GATE</span>
                        <span class="detail-value">${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">SEAT</span>
                        <span class="detail-value">${Math.floor(Math.random() * 30) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}</span>
                    </div>
                </div>
            </div>
        `;

        // 添加到結果畫面容器（確保在地圖上方）
        const overlayContainer = document.getElementById('resultState') || document.body;
        overlayContainer.appendChild(flightStatus);
        overlayContainer.appendChild(resourceDisplay);
        overlayContainer.appendChild(simpleTicket);

        // 計算並顯示預計到達時間
        this.updateEstimatedArrivalTime(destination);

        // 模擬飛行狀態更新
        this.simulateFlightStatus(flightStatus, distance);
    }

    updateEstimatedArrivalTime(destination) {
        const arrivalTimeElement = document.getElementById('estimatedArrivalTime');
        if (!arrivalTimeElement) return;

        // 睡眠航班模式：根據起床時間計算到達時間
        let arrivalTimeText;
        if (this.gameState.sleepFlightMode) {
            arrivalTimeText = `明天 ${this.gameState.wakeTime}`;
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

        // 睡眠航班模式：使用設定的起床時間
        if (this.gameState.sleepFlightMode) {
            const [hours, minutes] = this.gameState.wakeTime.split(':').map(Number);
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(hours, minutes, 0, 0);
            return tomorrow;
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

            // 播放降落廣播
            if (this.gameState.sleepFlightMode && this.gameState.selectedDestination) {
                await this.playSleepFlightAnnouncement('landing', this.gameState.selectedDestination);
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

        // 睡眠航班模式：根據起床時間計算到達時間
        let arrivalTimeText;
        if (this.gameState.sleepFlightMode) {
            arrivalTimeText = `隔天 ${this.gameState.wakeTime}`;
        } else {
            // 原有的飛行天數計算
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

        const message = `
            ✈️ 機票購買成功！
            
            🎫 目的地：${destination.flag} ${destination.name}
            💰 花費：NT$ ${destination.price.toLocaleString()}
            🕐 抵達時間：${arrivalTimeText}
            📍 區域：${destination.country} (${this.calculateArrivalTime(destination)}到達)
            
            🎮 本週旅程即將開始！
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

    updateResourceDisplay() {
        // 更新金錢顯示
        const moneyEl = document.getElementById('gameMoney');
        const moneyFill = document.getElementById('moneyFill');
        if (moneyEl) {
            moneyEl.textContent = this.gameState.money.toLocaleString();
        }
        if (moneyFill) {
            const percentage = (this.gameState.money / 10000) * 100;
            moneyFill.style.width = `${Math.max(percentage, 5)}%`;
        }

        // 更新油耗顯示
        const fuelEl = document.getElementById('gameFuel');
        const fuelFill = document.getElementById('fuelFill');
        if (fuelEl) {
            fuelEl.textContent = this.gameState.fuel;
        }
        if (fuelFill) {
            const percentage = (this.gameState.fuel / 1000) * 100;
            fuelFill.style.width = `${Math.max(percentage, 5)}%`;
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

    // 睡眠航班相關方法
    async getCurrentLocation() {
        try {
            // 優先使用本地快取的上一個位置
            const cached = localStorage.getItem('lastKnownLocation');
            if (cached) {
                const loc = JSON.parse(cached);
                if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
                    return loc;
                }
            }
            // 嘗試從最後的記錄獲取位置
            const latestRecord = await this.getLatestRecord();
            if (latestRecord) {
                return {
                    name: latestRecord.city,
                    country: latestRecord.country,
                    coordinates: [latestRecord.latitude, latestRecord.longitude]
                };
            }

            // 如果沒有記錄，使用預設位置（台北）
            return {
                name: '台北',
                country: '台灣',
                coordinates: [25.0330, 121.5654]
            };
        } catch (error) {
            console.error('獲取當前位置失敗:', error);
            return {
                name: '台北',
                country: '台灣',
                coordinates: [25.0330, 121.5654]
            };
        }
    }

    async getLatestRecord() {
        try {
            // 這裡可以從Firebase或其他數據源獲取最新記錄
            // 暫時返回null，使用預設位置
            return null;
        } catch (error) {
            console.error('獲取最新記錄失敗:', error);
            return null;
        }
    }

    async calculateSleepFlightDestinations(currentLocation, wakeTime) {
        console.log('開始計算目的地（JSON資料） 起床時間:', wakeTime);

        // 目前以台北為出發點（若無明確定位）
        const currentLoc = (() => {
            if (currentLocation) {
                if (typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number') {
                    return { latitude: currentLocation.latitude, longitude: currentLocation.longitude };
                }
                if (Array.isArray(currentLocation.coordinates) && currentLocation.coordinates.length === 2) {
                    const [lat, lng] = currentLocation.coordinates;
                    return { latitude: Number(lat), longitude: Number(lng) };
                }
            }
            return { latitude: 25.0330, longitude: 121.5654 };
        })();
        const origin = { latitude: currentLoc.latitude, longitude: currentLoc.longitude };
        const originCoords = [origin.latitude, origin.longitude];

        const cities = await this.loadCitiesData();
        const pool = (this.countryCandidates && this.countryCandidates.length) ? this.countryCandidates : cities;
        console.log('可用候選城市數量:', pool.length);
        const maxDistanceKm = 8 * 800; // 6400km

        const withDistance = pool.map(c => ({
            ...c,
            distanceKm: this.calculateDistance(originCoords, [c.latitude, c.longitude])
        })).filter(c => c.distanceKm > 0);

        let candidates = withDistance.filter(c => c.distanceKm <= maxDistanceKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);

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
            if (nameBoost.has((c.name || '').trim())) bonus -= 200; // 熱門城市給負分讓它靠前
            if (c.population) bonus -= Math.min(100, Math.floor(Number(c.population) / 1_000_000));
            return c.distanceKm + bonus;
        };

        const countryBest = new Map();
        for (const c of candidates) {
            const key = c.countryCode;
            const prev = countryBest.get(key);
            if (!prev || cityScore(c) < cityScore(prev)) countryBest.set(key, c);
        }
        candidates = Array.from(countryBest.values()).sort((a, b) => a.distanceKm - b.distanceKm);

        const pickUniqueCountries = (list) => {
            const top = [];
            const seen = new Set();
            for (const c of list) {
                if (seen.has(c.countryCode)) continue;
                seen.add(c.countryCode);
                top.push({
                    ...c,
                    flag: this.countryCodeToEmoji(c.countryCode),
                    price: this.calculateFlightPrice(c.distanceKm),
                    unlocked: true
                });
                if (top.length >= 4) break;
            }
            return top;
        };

        let top = pickUniqueCountries(candidates);
        let expand = 7000;
        while (top.length < 4 && expand <= 10000) {
            const more = withDistance.filter(c => c.distanceKm <= expand).sort((a, b) => a.distanceKm - b.distanceKm);
            top = pickUniqueCountries(more);
            expand += 1000;
        }
        if (top.length < 4) {
            top = pickUniqueCountries(withDistance.sort((a, b) => a.distanceKm - b.distanceKm));
        }
        console.log('最終選擇的4個目的地:', top);
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

    // 計算到達時間
    calculateArrivalTime(destination) {
        const now = this.now();
        const wakeTime = this.gameState.wakeTime || '08:00';
        const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);

        // 計算目標到達時間（明天早上）
        const arrivalTime = new Date(now);
        arrivalTime.setDate(arrivalTime.getDate() + 1);
        arrivalTime.setHours(wakeHour, wakeMinute, 0, 0);

        return arrivalTime.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // 在左側（當前位置區）顯示機票，並將台北面板縮成小圖示
    showTicketInLocationPanel() {
        const locationPanel = document.querySelector('.taipei-location-panel');
        if (!locationPanel || !this.gameState.selectedDestination) return;

        // 移除現有的機票顯示
        const existingTicket = locationPanel.querySelector('.location-ticket');
        if (existingTicket) existingTicket.remove();

        // 移除縮小狀態與小圖示，改為專注展示機票
        locationPanel.classList.remove('collapsed');
        locationPanel.classList.add('ticket-only');
        const miniIcon = locationPanel.querySelector('.location-mini-icon');
        if (miniIcon) miniIcon.remove();

        // 隱藏當前位置相關的原始內容
        ['location-header', 'taipei-features', 'ai-generated-content'].forEach(cls => {
            const section = locationPanel.querySelector(`.${cls}`);
            if (section) section.style.display = 'none';
        });

        const destination = this.gameState.selectedDestination;

        // 創建機票UI
        const ticketElement = document.createElement('div');
        ticketElement.className = 'location-ticket';
        ticketElement.innerHTML = `
            <div class="ticket-header">
                <div class="airline-info">
                    <span class="airline-icon">✈️</span>
                    <span class="airline-name">WAKE UP AIRLINES</span>
                </div>
                <div class="ticket-status">已購買</div>
            </div>
            
            <div class="ticket-route">
                <div class="route-info">
                    <div class="location-info">
                        <div class="location-code">TPE</div>
                        <div class="location-name">台北</div>
                    </div>
                    <div class="flight-arrow">✈️</div>
                    <div class="location-info">
                        <div class="location-code">${destination.countryCode}</div>
                        <div class="location-name">${destination.name}</div>
                    </div>
                </div>
            </div>
            
            <div class="ticket-details">
                <div class="detail-item">
                    <span class="detail-label">出發時間</span>
                    <span class="detail-value">今晚 23:30</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">到達時間</span>
                    <span class="detail-value">明天 ${this.gameState.wakeTime}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">票價</span>
                    <span class="detail-value">NT$ ${destination.price.toLocaleString()}</span>
                </div>
            </div>
        `;

        // 將機票添加至左側位置面板（小圖示下方）
        locationPanel.appendChild(ticketElement);
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
        console.log('按鈕被點擊，當前狀態:', this.gameState.actionButtonState);
        alert('按鈕被點擊了！狀態: ' + this.gameState.actionButtonState);

        const state = this.gameState.actionButtonState;

        switch (state) {
            case 'boarding':
                console.log('執行起飛流程');
                this.startFlight();
                break;
            case 'landing': {
                console.log('執行降落流程');

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
                        plannedWakeTime: this.gameState.wakeTime || '08:00',
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

                // 2秒後顯示降落結果彈窗
                setTimeout(() => {
                    const p = this.getPunctualityStatus();
                    this.showLandingOutcomeModal(p);
                }, 2000);

                break;
            }
            default:
                console.log('未知狀態:', state);
                break;
        }
    }

    // 開始飛行
    async startFlight() {
        console.log('開始飛行，狀態:', this.gameState.actionButtonState);
        console.log('選中的目的地:', this.gameState.selectedDestination);

        this.gameState.flightStarted = true;
        this.gameState.flightStatus = 'flying';

        // 隱藏按鈕
        this.hideActionButton();

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
                plannedWakeTime: this.gameState.wakeTime || '08:00',
                plannedDestination: dest ? `${dest.country} ${dest.name}` : '',
                targetCity: dest?.name,
                targetCountry: dest?.country
            });
        } catch (e) { console.warn('寫入睡覺開始記錄失敗', e); }

        // 播放登機廣播
        if (this.gameState.sleepFlightMode && this.gameState.selectedDestination) {
            console.log('準備播放登機廣播');
            await this.playSleepFlightAnnouncement('boarding', this.gameState.selectedDestination);
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
                    plannedWakeTime: this.gameState.wakeTime || '08:00',
                    sleepStartAt: (window.firebaseSDK && window.firebaseSDK.serverTimestamp) ? window.firebaseSDK.serverTimestamp() : null,
                    status: 'flying'
                });
                window.dbAddClockEvent && window.dbAddClockEvent((window.env && window.env.USER_NAME) || 'morgan', { type: 'sleep_start' });
            }
        } catch (e) { console.warn('寫入 Firestore 飛行狀態失敗', e); }

        console.log('準備開始遊戲');
        // 開始遊戲
        this.startGame();

        // 設置鬧鐘，在起床時間顯示降落按鈕
        this.setLandingAlarm();

        // 隱藏等待覆蓋層
        const waiting = document.getElementById('waitingState');
        if (waiting) {
            waiting.style.display = 'none';
            waiting.classList.remove('active');
        }
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

    // 顯示降落按鈕
    showLandingButton() {
        this.showActionButton('landing');

        // 播放降落廣播
        if (this.gameState.selectedDestination) {
            this.playSleepFlightAnnouncement('landing', this.gameState.selectedDestination);
        }
    }

    // 完成飛行
    completeFlight() {
        this.gameState.flightCompleted = true;
        this.gameState.flightStatus = 'completed';
        this.gameState.isLanding = false; // 結束降落中狀態

        // 更新狀態顯示為已降落
        this.updateFlightStatusDisplay('已降落');

        // 隱藏按鈕
        this.hideActionButton();

        // 計算準時性並扣除資源
        this.calculatePunctuality();

        // 顯示結果
        this.showFlightMap();
    }

    // 計算準時性
    calculatePunctuality() {
        const p = this.getPunctualityStatus();
        if (p.status === 'LATE') {
            // 依遲到幅度扣款（備用）；主要懲罰已在 applyLateLanding
            const minutesDiff = p.minutesDiff;
            const penalty = minutesDiff <= 30 ? 100 : 500;
            this.gameState.money = Math.max(0, this.gameState.money - penalty);
            this.updateResourceDisplay();
            console.log(`遲到 ${minutesDiff} 分鐘，扣除 NT$ ${penalty}`);
        } else {
            console.log('準時/提早降落');
        }
    }

    // 獲取準時性狀態
    getPunctualityStatus() {
        const wakeTime = this.gameState.wakeTime || '08:00';
        const now = this.now();
        const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);

        const targetTime = new Date(now);
        targetTime.setHours(wakeHour, wakeMinute, 0, 0);

        const timeDiff = now.getTime() - targetTime.getTime();
        const minutesDiff = Math.round(timeDiff / (1000 * 60));

        // 早於目標時間 5 分鐘以上 → 提早
        if (minutesDiff < -5) {
            return { status: 'EARLY', minutesDiff: Math.abs(minutesDiff) };
        }
        // 目標前後 5 分鐘內 → 準時
        if (Math.abs(minutesDiff) <= 5) {
            return { status: 'ON_TIME', minutesDiff };
        }
        // 晚超過 5 分鐘 → 遲到
        return { status: 'LATE', minutesDiff };
    }

    // 顯示降落結果彈窗
    showLandingOutcomeModal(punctuality) {
        const modal = document.getElementById('landingModal');
        const title = document.getElementById('landingTitle');
        const body = document.getElementById('landingBody');
        const actions = document.getElementById('landingActions');

        if (!modal || !title || !body || !actions) {
            console.error('降落結果彈窗元素未找到');
            return;
        }

        // 根據狀態設置內容
        if (punctuality.status === 'EARLY') {
            title.innerHTML = '🛬 提早降落 <span class="badge badge-early">提早</span>';
            body.innerHTML = `
                <p>您提早了 ${punctuality.minutesDiff} 分鐘降落！</p>
                <p>機長決定提前降落，節省了燃料消耗。</p>
                <p><strong>獎勵：</strong>燃料 +10</p>
            `;
            actions.innerHTML = `
                <button class="landing-btn landing-btn-primary" onclick="window.wakeUpMapGame.applyEarlyLanding(${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
                <button class="landing-btn landing-btn-secondary" onclick="window.wakeUpMapGame.hideLandingModal()">取消</button>
            `;
        } else if (punctuality.status === 'ON_TIME') {
            title.innerHTML = '🛬 準時降落 <span class="badge badge-ontime">準時</span>';
            body.innerHTML = `
                <p>恭喜！您準時降落了！</p>
                <p>機長對您的時間管理表示讚賞。</p>
                <p id="surpriseText">正在準備驚喜...</p>
            `;
            actions.innerHTML = `
                <button class="landing-btn landing-btn-primary" onclick="window.wakeUpMapGame.applyOnTimeLanding(${JSON.stringify(punctuality).replace(/"/g, '&quot;')})">確認降落</button>
                <button class="landing-btn landing-btn-secondary" onclick="window.wakeUpMapGame.hideLandingModal()">取消</button>
            `;
        } else {
            title.innerHTML = '🛬 遲到降落 <span class="badge badge-late">遲到</span>';
            body.innerHTML = `
                <p>您遲到了 ${punctuality.minutesDiff} 分鐘！</p>
                <p>飛機需要在空中盤旋等待降落許可。</p>
                <p><strong>懲罰：</strong>燃料 -20</p>
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
    applyEarlyLanding(punctuality) {
        console.log('執行提早降落');
        this.gameState.fuel = Math.min(100, this.gameState.fuel + 10);
        this.updateResourceDisplay();

        // 播放降落廣播
        this.playSleepFlightAnnouncement('landing', this.gameState.selectedDestination);

        this.hideLandingModal();
        this.completeFlight();
    }

    // 處理準時降落
    applyOnTimeLanding(punctuality) {
        console.log('執行準時降落');

        // 顯示隨機驚喜
        const surprise = this.randomOnTimeSurprise();
        const surpriseText = document.getElementById('surpriseText');
        if (surpriseText) {
            surpriseText.innerHTML = `<p><strong>驚喜：</strong>${surprise.message}</p>`;
        }

        // 應用驚喜效果
        if (surprise.type === 'money') {
            this.gameState.money += surprise.amount;
        } else if (surprise.type === 'fuel') {
            this.gameState.fuel = Math.min(100, this.gameState.fuel + surprise.amount);
        }
        this.updateResourceDisplay();

        // 播放降落廣播
        this.playSleepFlightAnnouncement('landing', this.gameState.selectedDestination);

        this.hideLandingModal();
        this.completeFlight();
    }

    // 處理遲到降落
    applyLateLanding(punctuality) {
        console.log('執行遲到降落');

        // 扣除燃料
        this.gameState.fuel = Math.max(0, this.gameState.fuel - 20);

        // 30% 機率改降其他城市
        if (Math.random() < 0.3) {
            const diversion = this.pickDiversion(this.gameState.selectedDestination);
            console.log(`飛機改降 ${diversion.name}`);
            this.gameState.selectedDestination = diversion;
        }

        this.updateResourceDisplay();

        // 播放降落廣播
        this.playSleepFlightAnnouncement('landing', this.gameState.selectedDestination);

        this.hideLandingModal();
        this.completeFlight();
    }

    // 隨機準時驚喜
    randomOnTimeSurprise() {
        const surprises = [
            { type: 'money', amount: 200, message: '機長給您小費 NT$ 200！' },
            { type: 'fuel', amount: 15, message: '節能飛行，燃料 +15！' },
            { type: 'none', amount: 0, message: '享受了美味的飛機餐！' },
            { type: 'money', amount: 100, message: '獲得里程獎勵 NT$ 100！' },
            { type: 'fuel', amount: 10, message: '順風飛行，燃料 +10！' }
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

    // 更新起床時間
    updateWakeTime(time) {
        this.gameState.wakeTime = time;

        // 更新預設按鈕狀態
        document.querySelectorAll('.time-preset').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.time === time) {
                btn.classList.add('active');
            }
        });

        // 重新載入目的地
        this.renderDestinationGrid();
    }

    // 選擇時間預設
    selectTimePreset(time) {
        document.getElementById('wakeTimeInput').value = time;
        this.updateWakeTime(time);
    }

    // 播放睡眠航班語音（優先呼叫後端 OpenAI 生成；失敗時使用備用）
    async playSleepFlightAnnouncement(announcementType, destination) {
        console.log('播放睡眠航班廣播:', announcementType, destination);

        // 組合請求內容（加入機長口吻、風趣、在地特色）
        const origin = this.gameState.currentLocation || { name: '台北', country: '台灣', coordinates: [25.0330, 121.5654] };
        const body = {
            announcementType: (announcementType === 'takeoff') ? 'boarding' : announcementType,
            city: destination?.name,
            country: destination?.country,
            countryCode: destination?.countryCode,
            currentLocation: origin?.name || '台北',
            wakeTime: this.gameState.wakeTime,
            // 新欄位（語意化）
            origin: { city: origin?.name || '台北', country: origin?.country || '台灣' },
            destination: { city: destination?.name, country: destination?.country },
            // 提示模型偏好
            style: 'captain_funny',
            toneHints: [
                '以機長第一人稱開場：各位乘客大家好，我是本次航班的機長',
                '口吻輕鬆風趣但專業，簡短有力，10–30秒',
                '提到目的地的1–2個在地特色（文化/美食/地標/氣候）',
                '降落廣播請報時：預計到達/當地時間（若未知可略過）',
                '避免冗長旅遊指南，避免過多數字，避免重複',
            ]
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
                // 直接使用前端播放（或你的 audioManager）
                if (window.audioManager && typeof window.audioManager.playTextWithLanguage === 'function') {
                    await window.audioManager.playTextWithLanguage(announcement, 'zh-TW', {
                        voice: 'male_lively', rate: 1.05, pitch: 0.95, style: 'lively'
                    });
                } else {
                    this.playTextWithBrowserTTS(announcement);
                }
                return true;
            }
        } catch (err) {
            console.warn('OpenAI 生成失敗，改用備用廣播。', err);
        }

        // 備援：本地機長口吻文案
        const fallback = this.getCaptainStyleFallback(announcementType, destination);
        try {
            if (window.audioManager && typeof window.audioManager.playTextWithLanguage === 'function') {
                await window.audioManager.playTextWithLanguage(fallback, 'zh-TW', {
                    voice: 'male_lively',
                    rate: 1.05,
                    pitch: 0.95,
                    style: 'lively'
                });
            } else {
                this.playTextWithBrowserTTS(fallback);
            }
        } catch (e) {
            console.warn('播放備援語音失敗，改以 alert 顯示文案');
            alert(fallback);
        }
        return false;
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
            `代表全體機組人員，感謝您搭乘，也祝您在 ${city} 有個美好的一天。`;
    }

    // 使用瀏覽器TTS播放文字
    playTextWithBrowserTTS(text) {
        if ('speechSynthesis' in window) {
            const voices = speechSynthesis.getVoices();
            const preferred = voices.find(v => /zh-TW/i.test(v.lang) && /male|Google|Android/i.test(v.name));
            const utterance = new SpeechSynthesisUtterance(text);
            if (preferred) utterance.voice = preferred; // 男聲偏好
            utterance.lang = 'zh-TW';
            utterance.rate = 1.05; // 活潑一點
            utterance.pitch = 0.95;
            speechSynthesis.speak(utterance);
        }
    }

    // 外部 API
    getGameState() {
        return this.gameState;
    }

    getCurrentTicket() {
        return this.gameState.currentTicket;
    }

    addMoney(amount) {
        this.gameState.money += amount;
        this.updateResourceDisplay();
        this.saveGameState();
    }

    spendMoney(amount) {
        if (this.gameState.money >= amount) {
            this.gameState.money -= amount;
            this.updateResourceDisplay();
            this.saveGameState();
            return true;
        }
        return false;
    }

    addFuel(amount) {
        this.gameState.fuel = Math.min(this.gameState.fuel + amount, 1000);
        this.updateResourceDisplay();
        this.saveGameState();
    }

    useFuel(amount) {
        if (this.gameState.fuel >= amount) {
            this.gameState.fuel -= amount;
            this.updateResourceDisplay();
            this.saveGameState();
            return true;
        }
        return false;
    }

    resetGame() {
        this.gameState = {
            money: 10000,
            fuel: 1000,
            currentWeek: 1,
            currentDay: 1,
            selectedDestination: null,
            destinations: this.gameState.destinations,
            currentTicket: null,
            gameStarted: false
        };

        localStorage.removeItem('wakeUpMapGame');
        this.updateResourceDisplay();
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

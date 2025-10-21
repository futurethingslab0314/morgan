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
            destinations: [
                {
                    id: 'thailand',
                    name: '泰國',
                    flag: '🇹🇭',
                    code: 'BKK',
                    price: 2000,
                    distance: 1200,
                    unlocked: true
                },
                {
                    id: 'japan',
                    name: '日本',
                    flag: '🇯🇵',
                    code: 'NRT',
                    price: 3000,
                    distance: 2100,
                    unlocked: true
                },
                {
                    id: 'korea',
                    name: '韓國',
                    flag: '🇰🇷',
                    code: 'ICN',
                    price: 2500,
                    distance: 1800,
                    unlocked: true
                },
                {
                    id: 'singapore',
                    name: '新加坡',
                    flag: '🇸🇬',
                    code: 'SIN',
                    price: 1500,
                    distance: 800,
                    unlocked: true
                },
                {
                    id: 'vietnam',
                    name: '越南',
                    flag: '🇻🇳',
                    code: 'SGN',
                    price: 1800,
                    distance: 1000,
                    unlocked: true
                }
            ],
            currentTicket: null,
            gameStarted: false
        };

        this.init();
    }

    init() {
        // 臨時重置功能：清除可能存在的錯誤狀態
        this.resetGameIfNeeded();

        this.loadGameState();
        this.setupEventListeners();
        this.renderDestinationGrid();
        this.updateResourceDisplay();
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

    setupEventListeners() {
        // 開始旅程按鈕事件
        document.getElementById('startJourneyBtn')?.addEventListener('click', () => {
            this.showDestinationModal();
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
    }

    renderDestinationGrid() {
        const grid = document.getElementById('destinationGrid');
        if (!grid) return;

        grid.innerHTML = '';

        this.gameState.destinations.forEach(dest => {
            const button = document.createElement('button');
            button.className = `destination-option ${!dest.unlocked ? 'locked' : ''}`;
            button.dataset.destination = dest.id;
            button.innerHTML = `
                <div class="dest-flag">${dest.flag}</div>
                <div class="dest-name">${dest.name}</div>
                <div class="dest-price">NT$ ${dest.price.toLocaleString()}</div>
            `;

            if (!dest.unlocked) {
                button.disabled = true;
            }

            grid.appendChild(button);
        });

        // 添加「待解鎖...」選項
        const lockedOption = document.createElement('div');
        lockedOption.className = 'destination-option locked-option';
        lockedOption.innerHTML = `
            <div class="dest-flag">🔒</div>
            <div class="dest-name">待解鎖...</div>
            <div class="dest-price">敬請期待</div>
        `;
        grid.appendChild(lockedOption);
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
        if (destinationCodeEl) destinationCodeEl.textContent = destination.code || 'XXX';
        if (ticketPriceEl) ticketPriceEl.textContent = `NT$ ${destination.price.toLocaleString()}`;
        if (departureDateEl) departureDateEl.textContent = this.getCurrentDate();
        if (departureTimeEl) departureTimeEl.textContent = '11:30';
        if (arrivalTimeEl) arrivalTimeEl.textContent = '隔天 08:00';

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

    confirmTicket() {
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

        // 顯示成功訊息
        this.showGameStartMessage();

        // 開始遊戲
        this.startGame();
    }

    changeDestination() {
        // 隱藏機票確認視窗
        this.hideTicketModal();

        // 清除選中狀態
        document.querySelectorAll('.destination-option').forEach(btn => {
            btn.classList.remove('selected');
        });

        this.gameState.selectedDestination = null;

        // 重新顯示目的地選擇視窗
        this.showDestinationModal();
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

        // 創建地圖
        const map = L.map('flightMapContainer').setView(taipeiCoords, 3);

        // 添加地圖瓦片
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 添加台北標記
        const taipeiMarker = L.marker(taipeiCoords).addTo(map);
        taipeiMarker.bindPopup(`
            <div class="flight-popup">
                <h3>✈️ 出發地</h3>
                <p><strong>台北 TPE</strong></p>
                <p>台灣</p>
            </div>
        `);

        // 添加目的地標記
        const destinationMarker = L.marker(destinationCoords).addTo(map);
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
        }).addTo(map);

        // 計算距離
        const distance = this.calculateDistance(taipeiCoords, destinationCoords);

        // 添加飛行狀態懸浮視窗
        this.addFlightStatusPopup(map, distance, destination);

        // 調整地圖視圖以包含兩個點
        const group = new L.featureGroup([taipeiMarker, destinationMarker]);
        map.fitBounds(group.getBounds().pad(0.1));
    }

    getDestinationCoords(destinationId) {
        // 根據目的地ID返回座標
        const coords = {
            'thailand': [13.7563, 100.5018], // 曼谷
            'japan': [35.6762, 139.6503], // 東京
            'korea': [37.5665, 126.9780], // 首爾
            'singapore': [1.3521, 103.8198], // 新加坡
            'vietnam': [10.8231, 106.6297] // 胡志明市
        };
        return coords[destinationId] || [13.7563, 100.5018]; // 預設曼谷
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
                        <span class="label">預計飛行時間：</span>
                        <span class="value">${Math.round(distance / 800)} 小時</span>
                    </div>
                </div>
            </div>
        `;

        // 創建資源顯示（右下角）
        const resourceDisplay = document.createElement('div');
        resourceDisplay.className = 'resource-display-popup';
        resourceDisplay.innerHTML = `
            <div class="resource-display-content">
                <h3>💰 資源</h3>
                <div class="resource-info">
                    <div class="resource-item">
                        <span class="resource-label">💰 Money:</span>
                        <span class="resource-value" id="flightMoney">${this.gameState.money.toLocaleString()}</span>
                    </div>
                    <div class="resource-item">
                        <span class="resource-label">⛽ Fuel:</span>
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

        // 添加到地圖容器
        const mapContainer = document.getElementById('flightMapContainer');
        if (mapContainer) {
            mapContainer.appendChild(flightStatus);
            mapContainer.appendChild(resourceDisplay);
            mapContainer.appendChild(simpleTicket);
        }

        // 模擬飛行狀態更新
        this.simulateFlightStatus(flightStatus, distance);
    }

    simulateFlightStatus(flightStatusElement, distance) {
        const statusElement = flightStatusElement.querySelector('.flight-status');
        const statuses = ['準備起飛', '正在滑行', '起飛中', '爬升中', '巡航中', '下降中', '即將降落', '已降落'];
        let currentStatus = 0;

        const updateStatus = () => {
            if (currentStatus < statuses.length) {
                statusElement.textContent = statuses[currentStatus];
                statusElement.className = `value flight-status status-${currentStatus}`;
                currentStatus++;
                setTimeout(updateStatus, 2000); // 每2秒更新一次
            }
        };

        updateStatus();
    }

    showGameStartMessage() {
        const destination = this.gameState.selectedDestination;
        const message = `
            ✈️ 機票購買成功！
            
            🎫 目的地：${destination.flag} ${destination.name}
            💰 花費：NT$ ${destination.price.toLocaleString()}
            🕐 抵達時間：隔天 08:00
            
            🎮 本週旅程即將開始！
        `;

        alert(message);
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
});

// 導出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WakeUpMapGame;
}

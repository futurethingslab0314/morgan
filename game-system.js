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

        // 顯示等待狀態
        document.getElementById('waitingState').classList.add('active');

        // 觸發遊戲開始事件
        window.dispatchEvent(new CustomEvent('gameStarted', {
            detail: {
                ticket: this.gameState.currentTicket,
                gameState: this.gameState
            }
        }));

        console.log('🎮 遊戲開始！', this.gameState.currentTicket);
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

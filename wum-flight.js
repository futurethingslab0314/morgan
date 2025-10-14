// wum-flight.js
// Web Component: 甦醒地圖航班票券系統（Shadow DOM 完全隔離）

class WumFlight extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // 常數配置
        this.T_TARGET = '0800';
        this.KM_PER_MIN = 7.4;
        this.MONEY_PER_FUEL = 12;
        this.FUEL_PER_KM = 1 / 150;
        this.FUEL_MAX = 120;
        this.FUEL_INIT = 100;

        // 城市資料層級
        this.CITY_TIERS = [
            [0, 60, [['Taipei', 'New Taipei'], ['Shinjuku', 'Shibuya'], ['Causeway Bay', 'Tsim Sha Tsui']]],
            [61, 250, [['Taipei', 'Taichung'], ['Osaka', 'Kyoto'], ['Seoul', 'Incheon']]],
            [251, 700, [['Taipei', 'Kaohsiung'], ['Tokyo', 'Nagoya'], ['Seoul', 'Busan']]],
            [701, 1500, [['Taipei', 'Shanghai'], ['Tokyo', 'Seoul'], ['Hong Kong', 'Taipei']]],
            [1501, 3500, [['Taipei', 'Tokyo'], ['Taipei', 'Singapore'], ['Osaka', 'Taipei']]],
            [3501, 8000, [['Taipei', 'Sydney'], ['Tokyo', 'Bangkok'], ['Seoul', 'Singapore']]],
            [8001, 14000, [['Taipei', 'San Francisco'], ['Tokyo', 'Los Angeles'], ['Seoul', 'Paris']]]
        ];

        // LocalStorage keys
        this.STORAGE_KEYS = {
            FUEL: 'WUM_FUEL',
            LAST_HHMM: 'WUM_LAST_HHMM',
            LAST_DATE: 'WUM_LAST_DATE',
            TICKETS: 'WUM_TICKETS'
        };

        // 狀態
        this.state = {
            fuel: this.FUEL_INIT,
            lastHHMM: null,
            lastDate: null,
            tickets: [],
            currentTicket: null
        };

        // 初始化
        this.init();
    }

    connectedCallback() {
        this.render();
        // 發送就緒事件
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent('wum:ready', {
                detail: { api: this.api }
            }));
            console.log('✈️ [wum-flight] Component 已就緒');
        }, 100);
    }

    // ===== 工具函式 =====

    pad2(n) {
        return String(n).padStart(2, '0');
    }

    hhmmToMin(hhmm) {
        const s = String(hhmm).padStart(4, '0');
        return parseInt(s.slice(0, 2)) * 60 + parseInt(s.slice(2, 4));
    }

    signedWrapMinutes(currHHMM, baseHHMM) {
        const a = this.hhmmToMin(currHHMM);
        const b = this.hhmmToMin(baseHHMM);
        let d = a - b;
        if (d > 720) d -= 1440;
        if (d < -720) d += 1440;
        return d;
    }

    clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    todayISO() {
        const d = new Date();
        return `${d.getFullYear()}-${this.pad2(d.getMonth() + 1)}-${this.pad2(d.getDate())}`;
    }

    /**
     * 將各種時間格式轉換為 HHMM 格式
     */
    normalizeTimeFormat(timeStr) {
        if (!timeStr) return null;

        try {
            // 移除 AM/PM 並轉換為 24 小時制
            let cleanTime = String(timeStr).trim();
            let isPM = /PM/i.test(cleanTime);
            let isAM = /AM/i.test(cleanTime);
            cleanTime = cleanTime.replace(/AM|PM/gi, '').trim();

            // 分割時間部分
            const parts = cleanTime.split(':');
            let hours = parseInt(parts[0], 10);
            let minutes = parseInt(parts[1] || '0', 10);

            // 處理 12 小時制
            if (isPM && hours !== 12) {
                hours += 12;
            } else if (isAM && hours === 12) {
                hours = 0;
            }

            // 確保是兩位數
            const hoursStr = String(hours).padStart(2, '0');
            const minutesStr = String(minutes).padStart(2, '0');

            return hoursStr + minutesStr;
        } catch (error) {
            console.error('[wum-flight] 時間格式轉換失敗:', error);
            return null;
        }
    }

    // ===== 城市選擇 =====

    pickCitiesByDistance(km) {
        const tier = this.CITY_TIERS.find(([lo, hi]) => km >= lo && km <= hi) || this.CITY_TIERS.at(-1);
        const pool = tier[2];
        const idx = (new Date().getDate() + km) % pool.length;
        const [fromCity, toCity] = pool[idx];
        return { fromCity, toCity };
    }

    // ===== 票種判定 =====

    getTicketType(deltaMin) {
        if (deltaMin === 0) return 'First Flight';
        if (deltaMin <= 5) return 'Neighborhood Hop';
        if (deltaMin <= 30) return 'City Hop';
        if (deltaMin <= 90) return 'Regional Flight';
        if (deltaMin <= 180) return 'Country Flight';
        return 'Long-Haul';
    }

    getTicketTypeBadgeClass(ticketType) {
        const map = {
            'First Flight': 'badge-first',
            'Neighborhood Hop': 'badge-neighborhood',
            'City Hop': 'badge-city',
            'Regional Flight': 'badge-regional',
            'Country Flight': 'badge-country',
            'Long-Haul': 'badge-longhaul'
        };
        return map[ticketType] || 'badge-default';
    }

    // ===== 核心計算 =====

    computeTicket(prevHHMM, currHHMM, opts = {}) {
        const { nightPenalty = false, streakBonus = false, firstDayFree = false } = opts;

        console.log('[wum-flight] 計算票券:', { prevHHMM, currHHMM, opts });

        // 位置（相位）
        const phaseErrMin = this.signedWrapMinutes(currHHMM, this.T_TARGET);
        const lonShiftDeg = phaseErrMin * 0.25;

        // 航段
        const signedDelta = prevHHMM ? this.signedWrapMinutes(currHHMM, prevHHMM) : 0;
        const deltaMin = Math.abs(signedDelta);
        const direction = signedDelta > 0 ? 'WESTBOUND' : signedDelta < 0 ? 'EASTBOUND' : '○';
        const distanceKm = Math.round(deltaMin * this.KM_PER_MIN);

        // 耗油（0..10）
        let fuelUsed = (firstDayFree || !prevHHMM) ? 0 : this.clamp(Math.round(distanceKm * this.FUEL_PER_KM), 0, 10);

        const cm = this.hhmmToMin(currHHMM);
        const isNight = (cm < 360) || (cm >= 1380);

        if (nightPenalty && isNight && fuelUsed > 0) {
            fuelUsed = this.clamp(Math.ceil(fuelUsed * 1.2), 0, 10);
        }
        if (streakBonus && fuelUsed > 0) {
            fuelUsed = this.clamp(Math.floor(fuelUsed * 0.9), 0, 10);
        }

        // 票種
        const ticketType = this.getTicketType(deltaMin);

        // 城市對應
        const { fromCity, toCity } = this.pickCitiesByDistance(distanceKm);

        const money = fuelUsed * this.MONEY_PER_FUEL;

        // 敘述
        let narrative;
        if (deltaMin === 0) {
            narrative = `首次起飛。今日相位 ${phaseErrMin >= 0 ? '+' : ''}${phaseErrMin} 分（偏移 ${Math.abs(lonShiftDeg).toFixed(1)}°）。`;
        } else {
            narrative = `你比昨天${signedDelta > 0 ? '晚' : '早'} ${deltaMin} 分鐘起飛，由 ${fromCity} 飛往 ${toCity}，${distanceKm} 公里，耗油 ${fuelUsed}（NT$${money}）。相位 ${phaseErrMin >= 0 ? '+' : ''}${phaseErrMin} 分（偏移 ${Math.abs(lonShiftDeg).toFixed(1)}°）。`;
        }

        return {
            date: this.todayISO(),
            prevHHMM: prevHHMM || null,
            currHHMM,
            phaseErrMin,
            lonShiftDeg,
            signedDelta,
            deltaMin,
            direction,
            distanceKm,
            fuelUsed,
            money,
            ticketType,
            fromCity,
            toCity,
            narrative,
            nightPenalty: nightPenalty && isNight,
            streakBonus
        };
    }

    // ===== LocalStorage =====

    init() {
        // 載入狀態
        const fuelStr = localStorage.getItem(this.STORAGE_KEYS.FUEL);
        this.state.fuel = fuelStr ? this.clamp(parseInt(fuelStr), 0, this.FUEL_MAX) : this.FUEL_INIT;

        this.state.lastHHMM = localStorage.getItem(this.STORAGE_KEYS.LAST_HHMM);
        this.state.lastDate = localStorage.getItem(this.STORAGE_KEYS.LAST_DATE);

        const ticketsStr = localStorage.getItem(this.STORAGE_KEYS.TICKETS);
        this.state.tickets = ticketsStr ? JSON.parse(ticketsStr) : [];

        console.log('[wum-flight] 狀態已載入:', this.state);
    }

    saveFuel() {
        localStorage.setItem(this.STORAGE_KEYS.FUEL, String(this.state.fuel));
    }

    saveLastHHMM(hhmm) {
        this.state.lastHHMM = hhmm;
        localStorage.setItem(this.STORAGE_KEYS.LAST_HHMM, hhmm);
    }

    saveLastDate(date) {
        this.state.lastDate = date;
        localStorage.setItem(this.STORAGE_KEYS.LAST_DATE, date);
    }

    saveTickets() {
        localStorage.setItem(this.STORAGE_KEYS.TICKETS, JSON.stringify(this.state.tickets));
    }

    // ===== 對外 API =====

    get api() {
        return {
            getFuel: () => this.state.fuel,

            setFuel: (v) => {
                this.state.fuel = this.clamp(v, 0, this.FUEL_MAX);
                this.saveFuel();
                this.updateFuelUI();
                console.log('[wum-flight] Fuel 已更新:', this.state.fuel);
            },

            generate: (opts) => this.generate(opts),

            getTickets: () => [...this.state.tickets],

            getCurrentTicket: () => this.state.currentTicket,

            resetToday: () => {
                this.state.lastDate = null;
                localStorage.removeItem(this.STORAGE_KEYS.LAST_DATE);
                console.log('[wum-flight] 今日標記已重置');
            },

            resetAll: () => {
                this.state.fuel = this.FUEL_INIT;
                this.state.lastHHMM = null;
                this.state.lastDate = null;
                this.state.tickets = [];
                this.state.currentTicket = null;

                localStorage.removeItem(this.STORAGE_KEYS.FUEL);
                localStorage.removeItem(this.STORAGE_KEYS.LAST_HHMM);
                localStorage.removeItem(this.STORAGE_KEYS.LAST_DATE);
                localStorage.removeItem(this.STORAGE_KEYS.TICKETS);

                this.render();
                console.log('[wum-flight] 已完全重置');
            }
        };
    }

    // ===== 生成票券 =====

    generate(opts = {}) {
        let { currHHMM, prevHHMM, nightPenalty, streakBonus, firstDayFree } = opts;

        if (!currHHMM) {
            console.error('[wum-flight] generate() 需要 currHHMM');
            return;
        }

        // 標準化時間格式
        currHHMM = this.normalizeTimeFormat(currHHMM);
        if (prevHHMM) {
            prevHHMM = this.normalizeTimeFormat(prevHHMM);
        }

        if (!currHHMM) {
            console.error('[wum-flight] 無效的 currHHMM 格式');
            return;
        }

        const today = this.todayISO();
        const alreadyGenerated = (this.state.lastDate === today);

        // 使用提供的 prevHHMM 或從狀態取得
        const effectivePrev = prevHHMM || this.state.lastHHMM;

        console.log('[wum-flight] 生成票券:', {
            effectivePrev,
            currHHMM,
            alreadyGenerated,
            currentFuel: this.state.fuel
        });

        // 計算票券
        const ticket = this.computeTicket(effectivePrev, currHHMM, {
            nightPenalty,
            streakBonus,
            firstDayFree
        });

        // 儲存當前票券
        this.state.currentTicket = ticket;

        // 只在首次生成時扣油
        if (!alreadyGenerated) {
            const oldFuel = this.state.fuel;
            this.state.fuel = this.clamp(this.state.fuel - ticket.fuelUsed, 0, this.FUEL_MAX);
            this.saveFuel();

            // 記錄今天已生成
            this.saveLastDate(today);

            // 加入歷史
            this.state.tickets.push(ticket);
            this.saveTickets();

            console.log(`[wum-flight] 🎫 生成新票券，扣油 ${ticket.fuelUsed}（${oldFuel} → ${this.state.fuel}）`);
        } else {
            console.log('[wum-flight] ℹ️ 今天已生成過票券，不再扣油');
        }

        // 更新 lastHHMM
        this.saveLastHHMM(currHHMM);

        // 刷新 UI
        this.render();

        // 發送事件
        this.dispatchEvent(new CustomEvent('wum:ticket-generated', {
            detail: { ticket, alreadyGenerated, currentFuel: this.state.fuel }
        }));

        return ticket;
    }

    // ===== UI 更新 =====

    updateFuelUI() {
        const bar = this.shadowRoot.querySelector('.fuel-bar-fill');
        const text = this.shadowRoot.querySelector('.fuel-text');
        if (bar) {
            const percent = (this.state.fuel / this.FUEL_MAX) * 100;
            bar.style.width = `${percent}%`;
        }
        if (text) {
            text.textContent = `${this.state.fuel} / ${this.FUEL_MAX}`;
        }
    }

    // ===== 渲染 =====

    render() {
        const ticket = this.state.currentTicket;
        const fuelPercent = (this.state.fuel / this.FUEL_MAX) * 100;

        // 根據 Fuel 百分比決定顏色
        let fuelColor = '#00ff88';
        if (this.state.fuel < 20) fuelColor = '#ff6b6b';
        else if (this.state.fuel < 50) fuelColor = '#ffa500';

        this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: block; font-family: 'Orbitron', 'Arial', sans-serif; }
        
        .container {
          max-width: 100%;
          padding: 15px;
        }
        
        /* Fuel Card */
        .fuel-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 2px solid rgba(0, 255, 136, 0.3);
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 15px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .fuel-title {
          color: #00ff88;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .fuel-icon {
          font-size: 16px;
          animation: fuel-pulse 2s ease-in-out infinite;
        }
        
        @keyframes fuel-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        
        .fuel-bar-container {
          width: 100%;
          height: 30px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          overflow: hidden;
          position: relative;
          margin-bottom: 8px;
        }
        
        .fuel-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, ${fuelColor} 0%, ${fuelColor}dd 100%);
          transition: width 0.35s ease, background 0.35s ease;
          border-radius: 15px;
          box-shadow: 0 0 15px ${fuelColor}66;
        }
        
        .fuel-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: bold;
          font-size: 14px;
          text-shadow: 0 0 8px rgba(0, 0, 0, 0.9);
          z-index: 1;
        }
        
        /* Ticket Card */
        .ticket-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 2px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .ticket-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .ticket-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        
        .badge-first { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .badge-neighborhood { background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); color: #1a1a2e; }
        .badge-city { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #1a1a2e; }
        .badge-regional { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); color: #1a1a2e; }
        .badge-country { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #1a1a2e; }
        .badge-longhaul { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #1a1a2e; }
        
        .ticket-date {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
        }
        
        .ticket-route {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 15px 0;
          font-size: 14px;
          color: white;
          font-weight: 600;
        }
        
        .city { flex: 1; }
        .from-city { text-align: left; }
        .to-city { text-align: right; }
        
        .direction-arrow {
          flex: 0 0 40px;
          text-align: center;
          font-size: 24px;
          color: #00ff88;
          animation: arrow-move 1.5s ease-in-out infinite;
        }
        
        @keyframes arrow-move {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        
        .ticket-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 12px 0;
        }
        
        .stat {
          background: rgba(0, 0, 0, 0.3);
          padding: 8px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .stat-label {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        
        .stat-value {
          font-size: 14px;
          font-weight: bold;
          color: white;
        }
        
        .fuel-stat {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
        }
        
        .fuel-stat .stat-value { color: #00ff88; }
        
        .ticket-narrative {
          background: rgba(0, 0, 0, 0.3);
          padding: 12px;
          border-radius: 8px;
          border-left: 3px solid #00ff88;
          margin-top: 12px;
        }
        
        .narrative-text {
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          line-height: 1.6;
          font-family: 'Courier New', monospace;
        }
        
        .modifiers {
          display: flex;
          gap: 5px;
          margin-top: 8px;
        }
        
        .modifier-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        }
        
        .night-penalty {
          background: rgba(255, 107, 107, 0.2);
          border: 1px solid rgba(255, 107, 107, 0.5);
          color: #ff6b6b;
        }
        
        .streak-bonus {
          background: rgba(0, 255, 136, 0.2);
          border: 1px solid rgba(0, 255, 136, 0.5);
          color: #00ff88;
        }
        
        .no-ticket {
          text-align: center;
          padding: 30px 20px;
          color: rgba(255, 255, 255, 0.5);
        }
        
        .no-ticket-icon {
          font-size: 48px;
          margin-bottom: 10px;
          opacity: 0.3;
        }
        
        /* 響應式 */
        @media (max-width: 600px) {
          .ticket-stats {
            grid-template-columns: 1fr;
          }
        }
      </style>
      
      <div class="container">
        <!-- Fuel Card -->
        <div class="fuel-card">
          <div class="fuel-title">
            <span class="fuel-icon">⛽</span>
            <span>Fuel Tank</span>
          </div>
          <div class="fuel-bar-container">
            <div class="fuel-bar-fill" style="width: ${fuelPercent}%"></div>
            <div class="fuel-text">${this.state.fuel} / ${this.FUEL_MAX}</div>
          </div>
        </div>
        
        <!-- Ticket Card -->
        <div class="ticket-card">
          ${ticket ? `
            <div class="ticket-header">
              <span class="ticket-badge ${this.getTicketTypeBadgeClass(ticket.ticketType)}">
                ${ticket.ticketType}
              </span>
              <span class="ticket-date">${ticket.date}</span>
            </div>
            
            <div class="ticket-route">
              <div class="city from-city">${ticket.fromCity}</div>
              <div class="direction-arrow">
                ${ticket.direction === 'WESTBOUND' ? '→' : ticket.direction === 'EASTBOUND' ? '←' : '○'}
              </div>
              <div class="city to-city">${ticket.toCity}</div>
            </div>
            
            <div class="ticket-stats">
              <div class="stat">
                <div class="stat-label">時間差</div>
                <div class="stat-value">${ticket.deltaMin === 0 ? '首次' : ticket.deltaMin + ' 分'}</div>
              </div>
              <div class="stat">
                <div class="stat-label">距離</div>
                <div class="stat-value">${ticket.distanceKm} km</div>
              </div>
              <div class="stat fuel-stat">
                <div class="stat-label">耗油</div>
                <div class="stat-value">${ticket.fuelUsed} ⛽</div>
              </div>
            </div>
            
            ${ticket.nightPenalty || ticket.streakBonus ? `
              <div class="modifiers">
                ${ticket.nightPenalty ? '<span class="modifier-badge night-penalty">🌙 夜間懲罰 +20%</span>' : ''}
                ${ticket.streakBonus ? '<span class="modifier-badge streak-bonus">⭐ 穩定紅利 -10%</span>' : ''}
              </div>
            ` : ''}
            
            <div class="ticket-narrative">
              <div class="narrative-text">${ticket.narrative}</div>
            </div>
          ` : `
            <div class="no-ticket">
              <div class="no-ticket-icon">✈️</div>
              <p>尚無航班票券</p>
              <p style="font-size: 11px; margin-top: 8px; opacity: 0.7;">等待生成...</p>
            </div>
          `}
        </div>
      </div>
    `;
    }
}

// 註冊 Web Component
customElements.define('wum-flight', WumFlight);

console.log('✈️ [wum-flight] Web Component 已註冊');


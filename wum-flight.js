// wum-flight.js
// Web Component: 甦醒地圖航班票券系統（已隱藏）

class WumFlight extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.init();
  }

  connectedCallback() {
    this.render();
    // 發送就緒事件
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('wum:ready', {
        detail: { api: this.api }
      }));
      console.log('✈️ [wum-flight] Component 已就緒（已隱藏）');
    }, 100);
  }

  init() {
    // 基本配置
    this.T_TARGET = '0800';
    this.KM_PER_MIN = 7.4;
    this.MONEY_PER_FUEL = 12;
    this.FUEL_PER_KM = 1 / 150;
    this.FUEL_MAX = 1000;
    this.FUEL_INIT = 800;
    this.FUEL_USAGE_MAX = 100;

    // 狀態
    this.state = {
      fuel: this.FUEL_INIT,
      lastHHMM: null,
      lastDate: null,
      tickets: [],
      currentTicket: null
    };

    // API
    this.api = {
      generate: (opts) => this.generate(opts),
      reset: () => this.reset(),
      getState: () => this.state
    };
  }

  // 隱藏的渲染函數
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: none; }
      </style>
    `;
  }

  // 空的方法（保持API兼容性）
  generate(opts = {}) {
    return null;
  }

  reset() {
    this.state = {
      fuel: this.FUEL_INIT,
      lastHHMM: null,
      lastDate: null,
      tickets: [],
      currentTicket: null
    };
    this.render();
  }
}

// 註冊 Web Component
customElements.define('wum-flight', WumFlight);

console.log('✈️ [wum-flight] Web Component 已註冊（已隱藏）');
// flight-integration.js
// 整合 flight 功能到甦醒地圖 UI

(function () {
    'use strict';

    // 全域航班票券資料
    let currentFlightTicket = null;

    /**
     * 初始化航班票券功能
     */
    function initFlightTicket() {
        console.log('✈️ 初始化航班票券功能');

        // 綁定飛機按鈕點擊事件
        const flightTicketButton = document.getElementById('flightTicketButton');
        if (flightTicketButton) {
            flightTicketButton.addEventListener('click', showFlightTicketModal);
        }

        // 綁定關閉按鈕事件
        const closeButton = document.getElementById('flightTicketModalClose');
        const footerCloseButton = document.getElementById('closeFlightTicketButton');
        const modal = document.getElementById('flightTicketModal');

        if (closeButton) {
            closeButton.addEventListener('click', hideFlightTicketModal);
        }

        if (footerCloseButton) {
            footerCloseButton.addEventListener('click', hideFlightTicketModal);
        }

        // 點擊背景關閉
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) {
                    hideFlightTicketModal();
                }
            });
        }
    }

    /**
     * 顯示航班票券彈窗
     */
    function showFlightTicketModal() {
        console.log('✈️ 顯示航班票券', currentFlightTicket);

        if (!currentFlightTicket) {
            console.warn('⚠️ 尚無航班票券資料');
            return;
        }

        // 更新彈窗內容
        updateFlightTicketModal(currentFlightTicket);

        // 顯示彈窗
        const modal = document.getElementById('flightTicketModal');
        if (modal) {
            modal.style.display = 'block';
            // 添加動畫效果
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }

    /**
     * 隱藏航班票券彈窗
     */
    function hideFlightTicketModal() {
        const modal = document.getElementById('flightTicketModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * 更新航班票券彈窗內容
     */
    function updateFlightTicketModal(ticket) {
        // 票種徽章
        const ticketTypeBadge = document.getElementById('ticketTypeBadge');
        if (ticketTypeBadge) {
            ticketTypeBadge.textContent = ticket.ticketType;
            ticketTypeBadge.className = 'ticket-type-badge ' + getTicketTypeClass(ticket.ticketType);
        }

        // 方向
        const directionText = document.querySelector('#ticketDirection .direction-text');
        const directionArrow = document.querySelector('#ticketDirection .direction-arrow');
        if (directionText) {
            directionText.textContent = ticket.direction;
        }
        if (directionArrow) {
            directionArrow.textContent = getDirectionArrow(ticket.direction);
        }

        // 數據統計
        const deltaMinEl = document.getElementById('ticketDeltaMin');
        if (deltaMinEl) {
            deltaMinEl.textContent = ticket.deltaMin === 0 ? '首次' : `${ticket.deltaMin} 分鐘`;
        }

        const distanceEl = document.getElementById('ticketDistance');
        if (distanceEl) {
            distanceEl.textContent = `${ticket.distanceKm} km`;
        }

        const fuelEl = document.getElementById('ticketFuel');
        if (fuelEl) {
            fuelEl.textContent = `${ticket.fuelUsed} ⛽`;
        }

        // 敘述文字
        const narrativeEl = document.getElementById('ticketNarrative');
        if (narrativeEl) {
            narrativeEl.textContent = ticket.narrative;
        }
    }

    /**
     * 根據票種返回對應的 CSS class
     */
    function getTicketTypeClass(ticketType) {
        const typeMap = {
            'Neighborhood Hop': 'badge-neighborhood',
            'City Hop': 'badge-city',
            'Regional Flight': 'badge-regional',
            'Country Flight': 'badge-country',
            'Continental Edge': 'badge-continental',
            'Long-Haul': 'badge-longhaul'
        };
        return typeMap[ticketType] || 'badge-default';
    }

    /**
     * 根據方向返回對應的箭頭
     */
    function getDirectionArrow(direction) {
        const arrowMap = {
            'EASTBOUND': '←',
            'WESTBOUND': '→',
            'LOCAL': '○'
        };
        return arrowMap[direction] || '→';
    }

    /**
     * 計算並顯示航班票券
     */
    function calculateAndDisplayFlightTicket(lastEvent) {
        console.log('✈️ 計算航班票券', { lastEvent });

        // 確保 FlightTicket 模組已載入
        if (!window.FlightTicket) {
            console.error('❌ FlightTicket 模組未載入');
            return null;
        }

        try {
            // 取得當前時間
            const currentTime = window.FlightTicket.formatCurrentTime();
            const previousTime = lastEvent?.localTime ?? null;

            console.log('✈️ 時間資訊:', { previousTime, currentTime });

            // 生成票券（可選：啟用夜間懲罰）
            const opts = {
                nightPenalty: window.FlightTicket.isNightByHHMM(currentTime),
                streakBonus: false,  // 可根據需求啟用
                firstDayFree: false  // 可根據需求啟用
            };

            const ticket = window.FlightTicket.makeTicket(previousTime, currentTime, opts);

            console.log('✈️ 生成的票券:', ticket);

            // 儲存票券資料
            currentFlightTicket = ticket;

            // 更新 UI 顯示油耗
            updateFuelDisplay(ticket.fuelUsed);

            // 啟用飛機按鈕
            const flightButton = document.getElementById('flightTicketButton');
            if (flightButton) {
                flightButton.disabled = false;
                flightButton.classList.add('active');
            }

            return ticket;
        } catch (error) {
            console.error('❌ 計算航班票券失敗:', error);
            return null;
        }
    }

    /**
     * 更新油耗顯示
     */
    function updateFuelDisplay(fuelUsed) {
        const fuelValueEl = document.getElementById('fuelUsed');
        if (fuelValueEl) {
            fuelValueEl.textContent = fuelUsed;
            // 添加動畫效果
            fuelValueEl.classList.add('fuel-update');
            setTimeout(() => {
                fuelValueEl.classList.remove('fuel-update');
            }, 500);
        }
    }

    /**
     * 重置航班票券
     */
    function resetFlightTicket() {
        currentFlightTicket = null;

        const fuelValueEl = document.getElementById('fuelUsed');
        if (fuelValueEl) {
            fuelValueEl.textContent = '--';
        }

        const flightButton = document.getElementById('flightTicketButton');
        if (flightButton) {
            flightButton.disabled = true;
            flightButton.classList.remove('active');
        }
    }

    // 初始化
    document.addEventListener('DOMContentLoaded', function () {
        initFlightTicket();
    });

    // 導出函式供外部使用
    window.FlightUI = {
        calculateAndDisplayFlightTicket,
        showFlightTicketModal,
        hideFlightTicketModal,
        updateFuelDisplay,
        resetFlightTicket,
        getCurrentTicket: () => currentFlightTicket
    };

    console.log('✈️ Flight Integration 模組已載入');
})();


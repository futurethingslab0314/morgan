// core/flight.js
// 航班票券生成系統 - JavaScript 版本（從 TypeScript 轉換）

/**
 * 將 HHMM 格式的時間字串轉換為分鐘數
 */
function parseHHMMToMinutes(hhmm) {
    const clean = hhmm.replace(':', '');

    if (clean.length !== 4 || !/^\d{4}$/.test(clean)) {
        throw new Error(`Invalid HHMM format: ${hhmm}`);
    }

    const hours = parseInt(clean.substring(0, 2), 10);
    const minutes = parseInt(clean.substring(2, 4), 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error(`Invalid time values: ${hhmm}`);
    }

    return hours * 60 + minutes;
}

/**
 * 限制數值在指定範圍內
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 根據距離判斷機票類型
 */
function getTicketType(distanceKm) {
    if (distanceKm < 20) return "Neighborhood Hop";
    if (distanceKm < 150) return "City Hop";
    if (distanceKm < 350) return "Regional Flight";
    if (distanceKm < 800) return "Country Flight";
    if (distanceKm < 2000) return "Continental Edge";
    return "Long-Haul";
}

/**
 * 生成航班敘述文字
 */
function generateNarrative(deltaMin, direction, distanceKm, fuelUsed, prevHHMM) {
    if (prevHHMM === null) {
        return `這是你的第一次起飛，飛行 ${distanceKm} 公里，耗油 ${fuelUsed}。`;
    }

    if (direction === "LOCAL") {
        return `你和昨天同一時間起飛，停留在當地，耗油 ${fuelUsed}。`;
    }

    const timeDiff = deltaMin === 0
        ? "同一時間"
        : deltaMin === 1
            ? "1 分鐘"
            : `${deltaMin} 分鐘`;

    const directionText = direction === "EASTBOUND" ? "向東" : "向西";
    const timeContext = deltaMin === 0
        ? "同一時間起飛"
        : direction === "EASTBOUND"
            ? `比昨天早 ${timeDiff}起飛`
            : `比昨天晚 ${timeDiff}起飛`;

    return `你${timeContext}，${directionText} ${distanceKm} 公里，耗油 ${fuelUsed}。`;
}

/**
 * 生成航班票券資訊
 */
function makeTicket(prevHHMM, currHHMM, opts) {
    opts = opts || {};
    const { nightPenalty = false, streakBonus = false, firstDayFree = false } = opts;

    let deltaMin = 0;
    let direction = "LOCAL";

    if (prevHHMM !== null) {
        const prevMinutes = parseHHMMToMinutes(prevHHMM);
        const currMinutes = parseHHMMToMinutes(currHHMM);
        const diff = currMinutes - prevMinutes;

        deltaMin = Math.abs(diff);
        direction = diff < 0 ? "EASTBOUND" : diff > 0 ? "WESTBOUND" : "LOCAL";
    }

    // 首日免扣（可選）
    if (prevHHMM === null && firstDayFree) {
        return {
            deltaMin: 0,
            direction: "LOCAL",
            distanceKm: 0,
            fuelUsed: 0,
            ticketType: "Neighborhood Hop",
            narrative: "首次登記 Home Base，未消耗燃油。",
        };
    }

    const distanceKm = Math.round(
        clamp(10 * Math.pow(deltaMin / 5, 1.2), 5, 5000)
    );

    let fuelUsed = Math.round(5 + 0.06 * distanceKm);

    if (nightPenalty) fuelUsed = Math.round(fuelUsed * 1.2);
    if (streakBonus) fuelUsed = Math.round(fuelUsed * 0.9);

    const ticketType = getTicketType(distanceKm);
    const narrative = generateNarrative(deltaMin, direction, distanceKm, fuelUsed, prevHHMM);

    return {
        deltaMin,
        direction,
        distanceKm,
        fuelUsed,
        ticketType,
        narrative,
    };
}

/**
 * 格式化當前時間為 HHMM 格式
 */
function formatCurrentTime(date) {
    date = date || new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}${minutes}`;
}

/**
 * 判斷指定時間是否為夜間
 */
function isNightByHHMM(hhmm) {
    const m = parseHHMMToMinutes(hhmm);
    const h = Math.floor(m / 60);
    return h < 3 || h >= 12;
}

/**
 * 生成航班票券的輔助函式
 */
function generateFlightTicket(lastEvent, opts) {
    try {
        const currentTime = formatCurrentTime();
        const previousTime = lastEvent?.localTime ?? null;
        const ticket = makeTicket(previousTime, currentTime, opts);
        return ticket;
    } catch (error) {
        console.error('生成航班票券失敗:', error);
        return null;
    }
}

// 導出為全域函式（供 HTML 使用）
if (typeof window !== 'undefined') {
    window.FlightTicket = {
        makeTicket,
        formatCurrentTime,
        isNightByHHMM,
        generateFlightTicket
    };
}


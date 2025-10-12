// core/flight.ts
// 航班票券生成系統 - 純計算函式，不依賴 DOM

/**
 * 將 HHMM 格式的時間字串轉換為分鐘數
 * @param hhmm - 格式如 "0830" 或 "08:30"
 * @returns 從午夜開始的分鐘數
 */
function parseHHMMToMinutes(hhmm: string): number {
    // 移除可能的冒號
    const clean = hhmm.replace(':', '');

    // 確保是 4 位數字
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
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * 根據距離判斷機票類型
 */
function getTicketType(distanceKm: number): string {
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
function generateNarrative(
    deltaMin: number,
    direction: "EASTBOUND" | "WESTBOUND" | "LOCAL",
    distanceKm: number,
    fuelUsed: number,
    prevHHMM: string | null
): string {
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

export interface FlightTicket {
    deltaMin: number;
    direction: "EASTBOUND" | "WESTBOUND" | "LOCAL";
    distanceKm: number;
    fuelUsed: number;
    ticketType: string;
    narrative: string;
}

export interface MakeTicketOptions {
    nightPenalty?: boolean;    // 夜間懲罰 (x1.2)
    streakBonus?: boolean;      // 穩定紅利 (x0.9)
    firstDayFree?: boolean;     // 首日免扣油
}

/**
 * 生成航班票券資訊
 * @param prevHHMM - 前一天的時間（HHMM 格式），null 表示第一次
 * @param currHHMM - 當前時間（HHMM 格式）
 * @param opts - 選項：夜間懲罰、穩定紅利、首日免扣油
 * @returns 航班票券資訊物件
 * 
 * @example
 * // 第一次起飛
 * const ticket1 = makeTicket(null, "0830");
 * // => { deltaMin: 0, direction: "LOCAL", distanceKm: 5, fuelUsed: 5, ... }
 * 
 * @example
 * // 晚 42 分鐘起飛（向西）
 * const t2 = makeTicket("0830", "0912");
 * // 依公式：distance ≈ 130~140 km，fuel ≈ 13（實際以程式輸出為準）
 * 
 * @example
 * // 早 30 分鐘起飛（向東）
 * const ticket3 = makeTicket("0900", "0830");
 * // => { deltaMin: 30, direction: "EASTBOUND", ... }
 * 
 * @example
 * // 使用夜間懲罰
 * const ticket4 = makeTicket("0830", "0912", { nightPenalty: isNightByHHMM("0912") });
 * 
 * @example
 * // 首日免扣油
 * const ticket5 = makeTicket(null, "0730", { firstDayFree: true });
 * // => { fuelUsed: 0, distanceKm: 0, narrative: "首次登記 Home Base，未消耗燃油。" }
 */
export function makeTicket(
    prevHHMM: string | null,
    currHHMM: string,
    opts?: MakeTicketOptions
): FlightTicket {
    const { nightPenalty = false, streakBonus = false, firstDayFree = false } = opts ?? {};

    // 1. 計算 deltaMin（分鐘差異的絕對值）
    let deltaMin = 0;
    let direction: "EASTBOUND" | "WESTBOUND" | "LOCAL" = "LOCAL";

    if (prevHHMM !== null) {
        const prevMinutes = parseHHMMToMinutes(prevHHMM);
        const currMinutes = parseHHMMToMinutes(currHHMM);
        const diff = currMinutes - prevMinutes;

        deltaMin = Math.abs(diff);

        // 2. 判斷方向
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

    // 3. 計算距離（公里）
    // distanceKm = clamp(10 * (deltaMin/5)^1.2, 5, 5000)
    const distanceKm = Math.round(
        clamp(10 * Math.pow(deltaMin / 5, 1.2), 5, 5000)
    );

    // 4. 計算耗油量（基礎油耗）
    // fuelUsed = round(5 + 0.06 * distanceKm)
    let fuelUsed = Math.round(5 + 0.06 * distanceKm);

    // 套用修正係數
    if (nightPenalty) fuelUsed = Math.round(fuelUsed * 1.2);  // 夜間懲罰 +20%
    if (streakBonus) fuelUsed = Math.round(fuelUsed * 0.9);  // 穩定紅利 -10%

    // 5. 判斷機票類型
    const ticketType = getTicketType(distanceKm);

    // 6. 生成敘述
    const narrative = generateNarrative(
        deltaMin,
        direction,
        distanceKm,
        fuelUsed,
        prevHHMM
    );

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
 * 格式化當前時間為 HHMM 格式（無冒號）
 * @param date - 要格式化的日期物件，預設為當前時間
 * @returns HHMM 格式的字串，如 "0912"
 * 
 * @example
 * const now = formatCurrentTime(); // "0912"
 */
export function formatCurrentTime(date: Date = new Date()): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}${minutes}`;
}

/**
 * 格式化時間為 HH:MM 格式（有冒號）
 * @param date - 要格式化的日期物件，預設為當前時間
 * @returns HH:MM 格式的字串，如 "09:12"
 * 
 * @example
 * const now = formatTimeWithColon(); // "09:12"
 */
export function formatTimeWithColon(date: Date = new Date()): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * 判斷指定時間是否為夜間（用於夜間懲罰）
 * @param hhmm - HHMM 格式的時間
 * @returns 是否為夜間（00:00–02:59 或 12:00 以後）
 * 
 * @example
 * isNightByHHMM("0130"); // => true (凌晨)
 * isNightByHHMM("1400"); // => true (下午)
 * isNightByHHMM("0900"); // => false (早上)
 */
export function isNightByHHMM(hhmm: string): boolean {
    const m = parseHHMMToMinutes(hhmm);
    const h = Math.floor(m / 60);
    return h < 3 || h >= 12; // 00:00–02:59 或 12:00 以後
}

/**
 * 生成航班票券的輔助函式（包含錯誤處理）
 * @param lastEvent - 上一次事件物件，包含 localTime 屬性
 * @param opts - makeTicket 的選項參數
 * @returns FlightTicket 物件，失敗時返回 null
 * 
 * @example
 * const ticket = generateFlightTicket(lastEvent);
 * if (ticket) {
 *   console.log(ticket.narrative);
 * }
 * 
 * @example
 * // 使用夜間懲罰
 * const ticket = generateFlightTicket(lastEvent, { 
 *   nightPenalty: isNightByHHMM(formatCurrentTime()) 
 * });
 */
export function generateFlightTicket(
    lastEvent?: { localTime: string },
    opts?: MakeTicketOptions
): FlightTicket | null {
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


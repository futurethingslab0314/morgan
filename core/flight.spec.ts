// core/flight.spec.ts
// 航班票券系統測試 - Jest/Vitest 皆可

import { makeTicket, isNightByHHMM, formatCurrentTime } from "./flight";

describe("makeTicket - 基本功能", () => {
    test("小差（+2 分）被 clamp 到 5km", () => {
        const t = makeTicket("0730", "0732");
        expect(t.distanceKm).toBe(5);
        expect(t.direction).toBe("WESTBOUND");
        expect(t.fuelUsed).toBeGreaterThanOrEqual(5);
    });

    test("中差（+45 分）約 120~170km", () => {
        const t = makeTicket("0730", "0815");
        expect(t.distanceKm).toBeGreaterThanOrEqual(120);
        expect(t.distanceKm).toBeLessThanOrEqual(170);
        expect(t.direction).toBe("WESTBOUND");
    });

    test("首次且免扣油", () => {
        const t = makeTicket(null, "0730", { firstDayFree: true });
        expect(t.fuelUsed).toBe(0);
        expect(t.distanceKm).toBe(0);
        expect(t.narrative).toContain("首次登記");
    });

    test("首次不免扣油（預設）", () => {
        const t = makeTicket(null, "0730");
        expect(t.fuelUsed).toBeGreaterThan(0);
        expect(t.distanceKm).toBe(5);
    });
});

describe("makeTicket - 方向判斷", () => {
    test("向東（早起）", () => {
        const t = makeTicket("0900", "0830");
        expect(t.direction).toBe("EASTBOUND");
        expect(t.deltaMin).toBe(30);
    });

    test("向西（晚起）", () => {
        const t = makeTicket("0830", "0912");
        expect(t.direction).toBe("WESTBOUND");
        expect(t.deltaMin).toBe(42);
    });

    test("本地（同一時間）", () => {
        const t = makeTicket("0830", "0830");
        expect(t.direction).toBe("LOCAL");
        expect(t.deltaMin).toBe(0);
        expect(t.distanceKm).toBe(5);
    });
});

describe("makeTicket - 票種分類", () => {
    test("Neighborhood Hop (< 20km)", () => {
        const t = makeTicket("0830", "0832"); // 小差距
        expect(t.ticketType).toBe("Neighborhood Hop");
        expect(t.distanceKm).toBeLessThan(20);
    });

    test("City Hop (< 150km)", () => {
        const t = makeTicket("0830", "0900"); // 30 分鐘
        expect(t.ticketType).toBe("City Hop");
        expect(t.distanceKm).toBeGreaterThanOrEqual(20);
        expect(t.distanceKm).toBeLessThan(150);
    });

    test("Regional Flight (< 350km)", () => {
        const t = makeTicket("0830", "0945"); // 75 分鐘
        expect(t.ticketType).toBe("Regional Flight");
        expect(t.distanceKm).toBeGreaterThanOrEqual(150);
        expect(t.distanceKm).toBeLessThan(350);
    });

    test("Country Flight (< 800km)", () => {
        const t = makeTicket("0830", "1100"); // 150 分鐘
        expect(t.ticketType).toBe("Country Flight");
        expect(t.distanceKm).toBeGreaterThanOrEqual(350);
        expect(t.distanceKm).toBeLessThan(800);
    });

    test("Continental Edge (< 2000km)", () => {
        const t = makeTicket("0830", "1330"); // 300 分鐘
        expect(t.ticketType).toBe("Continental Edge");
        expect(t.distanceKm).toBeGreaterThanOrEqual(800);
        expect(t.distanceKm).toBeLessThan(2000);
    });

    test("Long-Haul (>= 2000km)", () => {
        const t = makeTicket("0830", "2030"); // 720 分鐘 (跨越午夜需調整測試)
        // 或使用極大時差
        const t2 = makeTicket("0600", "1800"); // 720 分鐘
        expect(t2.ticketType).toBe("Long-Haul");
        expect(t2.distanceKm).toBeGreaterThanOrEqual(2000);
    });
});

describe("makeTicket - 選項功能", () => {
    test("夜間懲罰（+20%）", () => {
        const t1 = makeTicket("0830", "0900", { nightPenalty: false });
        const t2 = makeTicket("0830", "0900", { nightPenalty: true });

        // 夜間應該多消耗 20%
        expect(t2.fuelUsed).toBeGreaterThan(t1.fuelUsed);
        expect(t2.fuelUsed).toBeCloseTo(t1.fuelUsed * 1.2, 0);
    });

    test("穩定紅利（-10%）", () => {
        const t1 = makeTicket("0830", "0900", { streakBonus: false });
        const t2 = makeTicket("0830", "0900", { streakBonus: true });

        // 穩定應該少消耗 10%
        expect(t2.fuelUsed).toBeLessThan(t1.fuelUsed);
        expect(t2.fuelUsed).toBeCloseTo(t1.fuelUsed * 0.9, 0);
    });

    test("夜間懲罰 + 穩定紅利（同時套用）", () => {
        const t1 = makeTicket("0830", "0900");
        const t2 = makeTicket("0830", "0900", {
            nightPenalty: true,
            streakBonus: true
        });

        // 1.2 * 0.9 = 1.08，應該略高於基礎
        expect(t2.fuelUsed).toBeGreaterThan(t1.fuelUsed);
        expect(t2.fuelUsed).toBeCloseTo(t1.fuelUsed * 1.08, 0);
    });
});

describe("isNightByHHMM", () => {
    test("凌晨時段（00:00–02:59）", () => {
        expect(isNightByHHMM("0000")).toBe(true);
        expect(isNightByHHMM("0130")).toBe(true);
        expect(isNightByHHMM("0259")).toBe(true);
    });

    test("早晨時段（03:00–11:59）", () => {
        expect(isNightByHHMM("0300")).toBe(false);
        expect(isNightByHHMM("0830")).toBe(false);
        expect(isNightByHHMM("1159")).toBe(false);
    });

    test("午後時段（12:00 以後）", () => {
        expect(isNightByHHMM("1200")).toBe(true);
        expect(isNightByHHMM("1400")).toBe(true);
        expect(isNightByHHMM("2359")).toBe(true);
    });
});

describe("時間格式處理", () => {
    test("支援無冒號格式（HHMM）", () => {
        const t = makeTicket("0830", "0900");
        expect(t.deltaMin).toBe(30);
    });

    test("支援有冒號格式（HH:MM）", () => {
        const t = makeTicket("08:30", "09:00");
        expect(t.deltaMin).toBe(30);
    });

    test("混合格式也能正常運作", () => {
        const t = makeTicket("0830", "09:00");
        expect(t.deltaMin).toBe(30);
    });

    test("無效格式應拋出錯誤", () => {
        expect(() => makeTicket("abc", "0900")).toThrow();
        expect(() => makeTicket("0830", "25:00")).toThrow();
    });
});

describe("formatCurrentTime", () => {
    test("格式化為 HHMM（無冒號）", () => {
        const testDate = new Date("2024-01-15T09:12:00");
        const result = formatCurrentTime(testDate);
        expect(result).toBe("0912");
        expect(result).toMatch(/^\d{4}$/);
    });

    test("早晨時間補零", () => {
        const testDate = new Date("2024-01-15T03:05:00");
        const result = formatCurrentTime(testDate);
        expect(result).toBe("0305");
    });
});

describe("敘述文字生成", () => {
    test("首次登記敘述", () => {
        const t = makeTicket(null, "0830");
        expect(t.narrative).toContain("第一次起飛");
    });

    test("首次免費敘述", () => {
        const t = makeTicket(null, "0830", { firstDayFree: true });
        expect(t.narrative).toContain("首次登記");
        expect(t.narrative).toContain("未消耗燃油");
    });

    test("向西飛行敘述", () => {
        const t = makeTicket("0830", "0912");
        expect(t.narrative).toContain("向西");
        expect(t.narrative).toContain("晚");
    });

    test("向東飛行敘述", () => {
        const t = makeTicket("0900", "0830");
        expect(t.narrative).toContain("向東");
        expect(t.narrative).toContain("早");
    });

    test("本地停留敘述", () => {
        const t = makeTicket("0830", "0830");
        expect(t.narrative).toContain("同一時間");
        expect(t.narrative).toContain("當地");
    });
});

describe("邊界測試", () => {
    test("最小距離限制（5km）", () => {
        const t = makeTicket("0830", "0830");
        expect(t.distanceKm).toBe(5);
    });

    test("最大距離限制（5000km）", () => {
        // 使用極大時差（接近 12 小時）
        const t = makeTicket("0600", "1759");
        expect(t.distanceKm).toBeLessThanOrEqual(5000);
    });

    test("跨午夜計算", () => {
        // 23:00 到 01:00，差異 2 小時 = 120 分鐘
        const t = makeTicket("2300", "0100");
        expect(t.deltaMin).toBe(120);
    });
});


# ✈️ wum-flight Web Component - 完整指南

## 🎉 已完成的整合

### ✅ 新建檔案
1. **`wum-flight.js`** - 完整的 Web Component（Shadow DOM 隔離）

### ✅ 已更新檔案
1. **`pi.html`**
   - 添加 `<wum-flight>` 元素（右上角浮動顯示）
   - 引入 `wum-flight.js`
   - 添加初始化和事件監聽腳本

2. **`pi-script.js`**
   - 在 `saveToFirebase` 成功後自動調用 wum-flight
   - 支援時間格式轉換
   - 保存票券和 Fuel 資訊到 Firebase

3. **`web_controller_dsi.py`**
   - 修復 `clean_user_name` 未定義錯誤

## 🎯 系統架構

### 雙系統並存
現在有兩個航班票券系統同時運作，不會互相衝突：

| 功能 | 舊系統 (flight.js) | 新系統 (wum-flight) |
|------|-------------------|---------------------|
| 位置 | 結果面板內嵌 | 右上角浮動卡片 |
| 隔離 | 無（共用 DOM） | Shadow DOM 完全隔離 |
| Fuel 管理 | 無 | 有（100-120 系統） |
| 距離公式 | `10 * (Δ/5)^1.2` | `Δ × 7.4` |
| 耗油範圍 | 5-30+ | 0-10（固定上限） |
| 城市對應 | 無 | 有（tier 分層系統） |
| 相位計算 | 無 | 有（相對 08:00） |
| 重複防護 | 無 | 有（同日不重複扣油） |

## 🚀 使用方式

### 自動模式（已整合）

當您按下按鈕開始甦醒：
1. 系統定位城市
2. 生成故事和問候語
3. **自動計算並顯示航班票券**
4. 保存到 Firebase
5. 右上角顯示票券卡片

### 手動測試（在 Console 中）

```javascript
// 1. 檢查 API 是否就緒
console.log('wum-flight API:', window.wumFlightAPI);

// 2. 查看當前 Fuel
console.log('當前 Fuel:', window.wumFlightAPI.getFuel());

// 3. 生成票券（首次）
window.wumFlightAPI.generate({ currHHMM: '0830' });

// 4. 生成票券（第二次，有時間差）
window.wumFlightAPI.generate({ 
    currHHMM: '0912',
    prevHHMM: '0830',
    nightPenalty: false 
});

// 5. 查看所有歷史票券
console.log('歷史票券:', window.wumFlightAPI.getTickets());

// 6. 查看當前票券
console.log('當前票券:', window.wumFlightAPI.getCurrentTicket());

// 7. 手動設定 Fuel
window.wumFlightAPI.setFuel(50);

// 8. 重置今天標記（可再次扣油）
window.wumFlightAPI.resetToday();

// 9. 完全重置（Fuel、歷史、票券）
window.wumFlightAPI.resetAll();
```

## 📊 計算邏輯詳解

### 1. 相位計算（Phase Calculation）
```javascript
目標時間: 08:00
當前時間: 09:12
相位誤差: +72 分鐘
經度偏移: +18° (72 × 0.25)
```

### 2. 距離計算
```javascript
昨天: 08:30
今天: 09:12
時間差: +42 分鐘（晚起）
距離: 42 × 7.4 = 311 km
方向: WESTBOUND（向西）
```

### 3. 耗油計算
```javascript
基礎油耗: round(311 / 150) = 2
夜間懲罰: 2 × 1.2 = 2.4 → ceil(2.4) = 3
穩定紅利: 3 × 0.9 = 2.7 → floor(2.7) = 2
最終範圍: 0-10（固定上限）
```

### 4. Fuel 管理
```javascript
初始值: 100
上限: 120
扣油: Fuel = clamp(Fuel - fuelUsed, 0, 120)
防重複: 同一天只扣一次
```

### 5. 票種分類
| 時間差（分鐘） | 票種 | 顏色 |
|--------------|------|------|
| 0 | First Flight | 紫色漸變 |
| 1-5 | Neighborhood Hop | 淺綠 |
| 6-30 | City Hop | 粉藍 |
| 31-90 | Regional Flight | 橙色 |
| 91-180 | Country Flight | 粉紅 |
| >180 | Long-Haul | 彩虹 |

### 6. 城市對應
根據距離從對應的 tier 中選擇城市對：
- 0-60 km: 同城市內（Taipei ↔ New Taipei）
- 61-250 km: 城市間（Taipei ↔ Taichung）
- 251-700 km: 區域間（Taipei ↔ Kaohsiung）
- 701-1500 km: 跨國短程（Taipei ↔ Shanghai）
- 1501-3500 km: 跨國中程（Taipei ↔ Tokyo）
- 3501-8000 km: 洲際短程（Taipei ↔ Sydney）
- 8001+ km: 洲際長程（Taipei ↔ San Francisco）

## 🎨 UI 位置

### wum-flight 卡片位置
```
右上角浮動：
- 位置: fixed, top: 10px, right: 10px
- z-index: 1000
- 最大寬度: 350px
```

### 舊系統位置
```
結果面板內：
- 航班資訊 Bar（fuel-info-bar）
- 飛機按鈕（可點擊打開彈窗）
```

兩者**不會衝突**，可以同時顯示或選擇只用一個。

## 🔧 配置選項

### 啟用夜間懲罰
```javascript
// 自動判斷（已整合）
const hours = now.getHours();
const isNight = hours < 6 || hours >= 23;  // 00:00-05:59 或 23:00-23:59

// 手動指定
window.wumFlightAPI.generate({ 
    currHHMM: '0230', 
    nightPenalty: true 
});
```

### 啟用穩定紅利
```javascript
// 假設有連續天數追蹤
const userStreak = 7;  // 連續 7 天
window.wumFlightAPI.generate({ 
    currHHMM: '0912', 
    streakBonus: userStreak >= 7 
});
```

### 首日免扣油
```javascript
window.wumFlightAPI.generate({ 
    currHHMM: '0830', 
    firstDayFree: true 
});
```

## 📱 響應式設計

wum-flight 自動適配不同螢幕：
- **桌面**: 完整顯示（350px 寬）
- **手機**: 單列顯示（100% 寬度）
- **樹莓派 800x480**: 優化顯示

## 🧪 測試案例

### 測試 1: 首次起飛
```javascript
window.wumFlightAPI.resetAll();  // 重置
window.wumFlightAPI.generate({ currHHMM: '0830' });
// 預期: Fuel 100 → 100, deltaMin: 0, 耗油: 0
```

### 測試 2: 小幅晚起
```javascript
window.wumFlightAPI.generate({ currHHMM: '0835', prevHHMM: '0830' });
// 預期: Δ=5分, 距離=37km, 耗油=0（<1會被 round 到 0）
```

### 測試 3: 中幅晚起
```javascript
window.wumFlightAPI.generate({ currHHMM: '0912', prevHHMM: '0830' });
// 預期: Δ=42分, 距離=311km, 耗油=2
```

### 測試 4: 早起
```javascript
window.wumFlightAPI.generate({ currHHMM: '0700', prevHHMM: '0830' });
// 預期: Δ=90分, 距離=666km, EASTBOUND（向東）
```

### 測試 5: 夜間懲罰
```javascript
window.wumFlightAPI.generate({ 
    currHHMM: '0200',  // 凌晨 2 點
    prevHHMM: '0145',
    nightPenalty: true 
});
// 預期: 耗油會增加 20%
```

### 測試 6: 跨日計算
```javascript
window.wumFlightAPI.generate({ 
    currHHMM: '0100',  // 凌晨 1:00
    prevHHMM: '2300'   // 昨晚 23:00
});
// 預期: Δ=120分（2小時），使用最短路徑計算
```

### 測試 7: 重複生成（同一天）
```javascript
// 第一次
window.wumFlightAPI.generate({ currHHMM: '0912' });
console.log('Fuel:', window.wumFlightAPI.getFuel());  // 假設 98

// 第二次（同一天）
window.wumFlightAPI.generate({ currHHMM: '0915' });
console.log('Fuel:', window.wumFlightAPI.getFuel());  // 仍然 98，不再扣
```

## 🎨 自訂樣式

由於使用 Shadow DOM，樣式完全隔離。如需修改：

1. **直接編輯 `wum-flight.js` 中的 `<style>` 區塊**
2. **或使用 CSS Custom Properties（CSS 變數）**

範例：
```javascript
// 在 wum-flight.js 的 style 中使用變數
:host {
    --fuel-color: #00ff88;
    --card-bg: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}
```

## 🔗 與主系統的互動

### 接收主系統的 Fuel 更新
```javascript
// 在主系統中
document.getElementById('wumFlight').api.setFuel(newValue);
```

### 讀取 wum-flight 的狀態
```javascript
const fuel = document.getElementById('wumFlight').api.getFuel();
const tickets = document.getElementById('wumFlight').api.getTickets();
```

### 監聽票券生成事件
```javascript
document.getElementById('wumFlight').addEventListener('wum:ticket-generated', (e) => {
    console.log('新票券:', e.detail.ticket);
    console.log('剩餘 Fuel:', e.detail.currentFuel);
    
    // 可以在這裡更新其他 UI
});
```

## 🐛 故障排除

### 問題 1: wum-flight 不顯示

**檢查**:
```javascript
console.log(document.getElementById('wumFlight'));
console.log(window.wumFlightAPI);
```

**解決**: 確認 `wum-flight.js` 已載入，元素已在 DOM 中。

### 問題 2: 票券數值不正確

**檢查時間格式**:
```javascript
// 在 Console 中測試
const testTime = "12:43:07 PM";
const wf = document.getElementById('wumFlight');
const normalized = wf.normalizeTimeFormat(testTime);
console.log('轉換結果:', normalized);  // 應該是 "1243"
```

### 問題 3: Fuel 沒有扣減

**檢查日期標記**:
```javascript
console.log('上次日期:', localStorage.getItem('WUM_LAST_DATE'));
console.log('今天日期:', new Date().toISOString().split('T')[0]);

// 如果相同，重置日期標記
window.wumFlightAPI.resetToday();
```

### 問題 4: 與舊 UI 衝突

**解決方案**:

選項 A - 只顯示 wum-flight:
```javascript
// 隱藏舊的 flight-info-bar
document.querySelector('.flight-info-bar').style.display = 'none';
```

選項 B - 只顯示舊 UI:
```javascript
// 隱藏 wum-flight
document.getElementById('wumFlightContainer').style.display = 'none';
```

選項 C - 同時顯示（預設）:
```javascript
// 兩者都顯示，互不干擾
// wum-flight 在右上角
// 舊系統在結果面板內
```

## 📊 LocalStorage 資料結構

```javascript
{
  "WUM_FUEL": "98",                    // 當前 Fuel 值
  "WUM_LAST_HHMM": "0912",            // 最後一次的時間
  "WUM_LAST_DATE": "2025-10-12",      // 最後生成票券的日期
  "WUM_TICKETS": "[{...}, {...}]"     // 歷史票券陣列
}
```

### 查看 LocalStorage
```javascript
Object.keys(localStorage)
    .filter(k => k.startsWith('WUM_'))
    .forEach(k => console.log(k, '=', localStorage.getItem(k)));
```

## 🎮 管理命令

### 重置今天（允許再次生成）
```javascript
window.wumFlightAPI.resetToday();
// 現在可以再次生成票券並扣油
```

### 完全重置（清除所有資料）
```javascript
window.wumFlightAPI.resetAll();
// Fuel → 100
// 歷史 → []
// UI → 重新渲染
```

### 手動調整 Fuel
```javascript
// 加油
window.wumFlightAPI.setFuel(window.wumFlightAPI.getFuel() + 20);

// 扣油
window.wumFlightAPI.setFuel(window.wumFlightAPI.getFuel() - 10);

// 設定特定值
window.wumFlightAPI.setFuel(100);
```

## 🌟 進階功能

### 1. 連續天數追蹤（未來可實作）

```javascript
// 計算連續天數
function getStreak() {
    const tickets = window.wumFlightAPI.getTickets();
    // 檢查日期連續性...
    return streakDays;
}

// 使用
const streak = getStreak();
window.wumFlightAPI.generate({ 
    currHHMM: '0912',
    streakBonus: streak >= 7 
});
```

### 2. Fuel 獎勵機制（未來可實作）

```javascript
// 每達成特定里程碑，獲得 Fuel 獎勵
const totalDistance = tickets.reduce((sum, t) => sum + t.distanceKm, 0);
if (totalDistance >= 10000) {
    window.wumFlightAPI.setFuel(
        window.wumFlightAPI.getFuel() + 20  // 獎勵 20 Fuel
    );
}
```

### 3. 成就系統（未來可實作）

- 🏆 首次長途飛行（>2000km）
- 🏆 連續 7 天準時起飛（Δ < 5 分鐘）
- 🏆 環遊世界（累積 40000km）

## 📐 技術規格

### Web Component 規格
- **標籤**: `<wum-flight>`
- **模式**: Shadow DOM (mode: 'open')
- **樣式隔離**: 完全隔離，不影響外部
- **API 掛載**: `element.api`

### 事件
- `wum:ready` - Component 就緒
- `wum:ticket-generated` - 票券已生成

### LocalStorage Keys
- `WUM_FUEL` - Fuel 數值
- `WUM_LAST_HHMM` - 上次時間
- `WUM_LAST_DATE` - 上次日期
- `WUM_TICKETS` - 票券歷史

## 🎯 驗收清單

測試時間: ____________

- [ ] wum-flight 元素正確顯示在右上角
- [ ] Fuel 槽顯示 100 / 120
- [ ] 點擊按鈕後自動生成票券
- [ ] 票券顯示完整資訊（城市、距離、耗油）
- [ ] Fuel 正確扣減
- [ ] 同一天不重複扣油
- [ ] 第二天正確計算時間差異
- [ ] Console 有詳細日誌
- [ ] Shadow DOM 樣式不影響主頁面
- [ ] 舊 UI 和新 UI 可以共存

## 📝 下一步建議

1. **測試完整流程** - 從第一天到第七天
2. **調整 UI 位置** - 根據實際效果調整卡片位置
3. **選擇系統** - 決定使用新系統、舊系統或兩者並存
4. **實作進階功能** - 連續天數、成就系統等

---

**版本**: 1.0.0  
**更新日期**: 2025-10-12  
**狀態**: ✅ 已整合並測試


# 🚀 wum-flight 快速開始指南

## ⚡ 1 分鐘快速測試

### 選項 A: 獨立測試頁面（推薦！）

```bash
# 在瀏覽器中打開
open wum-flight-demo.html

然後：
1. 點擊「首次起飛」按鈕
2. 觀察右側卡片顯示
3. 嘗試其他測試案例
4. 查看 Fuel 扣減效果

### 選項 B: 在樹莓派上測試

```bash
# 重新啟動服務
cd /home/morgan/morgan/raspberrypi-dsi
sudo systemctl restart wakeupmap-dsi-web
```

然後按下實體按鈕，查看右上角的票券卡片。

## 📊 現在的 UI 配置

```
┌──────────────────────────────────────────────┐
│  [wum-flight 卡片]            ← 右上角浮動  │
│   ⛽ Fuel: 98/120                            │
│   [票券資訊]                                 │
│                                              │
│                                              │
│              [地圖]                          │
│                                              │
│  [結果面板]                                  │
│   城市: CÓRDOBA                              │
│   國家: Argentina                            │
│   ⛽ Fuel: 2  ✈️ ← 舊系統（可點擊彈窗）    │
│   故事內容...                                │
└──────────────────────────────────────────────┘
```

## 🎯 兩個系統的差異

### 新系統 (wum-flight) - 右上角卡片
- ✅ **Fuel 管理**: 100-120 系統
- ✅ **相位計算**: 相對 08:00
- ✅ **城市對應**: 智能選擇
- ✅ **防重複**: 同日不重複扣油
- ✅ **公式**: `distance = Δ × 7.4`
- ✅ **範圍**: 耗油 0-10

### 舊系統 (flight.js) - 面板內嵌
- ⚠️ **無 Fuel**: 只顯示油耗數字
- ⚠️ **無相位**: 沒有相對時間概念
- ⚠️ **無城市**: 不顯示城市對
- ⚠️ **可重複**: 可多次計算
- ⚠️ **公式**: `distance = 10 * (Δ/5)^1.2`
- ⚠️ **範圍**: 耗油 5-30+

## 🧪 3 個快速測試

### 測試 1: 基本功能（30 秒）

在 Console 中執行：
```javascript
// 檢查
console.log('API:', window.wumFlightAPI);

// 生成
window.wumFlightAPI.generate({ currHHMM: '0912' });

// 查看
console.log('Fuel:', window.wumFlightAPI.getFuel());
console.log('票券:', window.wumFlightAPI.getCurrentTicket());
```

**預期結果**: 
- Fuel: 100 (首次不扣油)
- 票券顯示完整資訊

### 測試 2: 時間差異（1 分鐘）

```javascript
window.wumFlightAPI.generate({ 
    currHHMM: '0912', 
    prevHHMM: '0830' 
});
```

**預期結果**:
- 時間差: 42 分鐘
- 距離: 311 km
- 耗油: 2
- Fuel: 100 → 98

### 測試 3: 重複防護（30 秒）

```javascript
// 第一次
window.wumFlightAPI.generate({ currHHMM: '0912' });
const fuel1 = window.wumFlightAPI.getFuel();

// 第二次（馬上）
window.wumFlightAPI.generate({ currHHMM: '0915' });
const fuel2 = window.wumFlightAPI.getFuel();

console.log('第一次 Fuel:', fuel1);
console.log('第二次 Fuel:', fuel2);
console.log('是否相同:', fuel1 === fuel2);  // 應該是 true
```

**預期結果**: Fuel 不變（同日防護生效）

## 🎨 視覺檢查清單

打開頁面後，應該看到：

### Fuel 卡片
- [ ] 綠色邊框
- [ ] ⛽ icon 有脈衝動畫
- [ ] 長條圖顯示正確百分比
- [ ] 數字顯示 "XX / 120"
- [ ] Fuel < 50 時變橙色
- [ ] Fuel < 20 時變紅色

### 票券卡片
- [ ] 紫藍色邊框
- [ ] 彩色票種徽章
- [ ] 城市名稱（from → to）
- [ ] 方向箭頭（← 或 → 或 ○）
- [ ] 箭頭有移動動畫
- [ ] 三欄數據統計
- [ ] 完整的航班說明文字
- [ ] 夜間/穩定徽章（如果有）

## 🎮 實用命令速查

```javascript
// 查看狀態
window.wumFlightAPI.getFuel()           // 當前 Fuel
window.wumFlightAPI.getCurrentTicket()  // 當前票券
window.wumFlightAPI.getTickets()        // 所有歷史

// 生成票券
window.wumFlightAPI.generate({ currHHMM: '0912' })

// 調整 Fuel
window.wumFlightAPI.setFuel(100)        // 設為 100
window.wumFlightAPI.setFuel(window.wumFlightAPI.getFuel() + 20)  // 加 20

// 重置
window.wumFlightAPI.resetToday()        // 重置今天
window.wumFlightAPI.resetAll()          // 完全重置
```

## 📱 手機/桌面測試

### 桌面瀏覽器
1. 打開 `http://localhost:3000/pi.html`（或 Vercel URL）
2. 按 F12 打開 Console
3. 執行測試命令
4. 查看右上角卡片

### 樹莓派（800x480）
1. 啟動服務
2. 按下實體按鈕
3. 查看結果頁面
4. 觀察票券卡片（自動調整大小）

### 手機瀏覽器
1. 訪問頁面
2. 票券卡片會自動變為單列顯示
3. 所有功能正常運作

## 🎯 成功標準

✅ **全部通過才算成功**：

1. [ ] 右上角顯示 wum-flight 卡片
2. [ ] Fuel 長條圖正確顯示
3. [ ] 點擊按鈕後自動生成票券
4. [ ] 票券顯示完整資訊（城市、距離、耗油）
5. [ ] Fuel 正確扣減
6. [ ] 第二天計算時間差異正確
7. [ ] Console 沒有錯誤
8. [ ] Shadow DOM 樣式不影響主頁面

## 💡 提示

### 如果只想測試 wum-flight
```javascript
// 隱藏舊 UI
document.querySelector('.flight-info-bar').style.display = 'none';
```

### 如果想調整卡片位置
編輯 `pi.html` 第 118 行的 style 屬性。

### 如果想修改 Fuel 上限
編輯 `wum-flight.js` 第 15 行：
```javascript
this.FUEL_MAX = 150;  // 改為 150
```

---

## 🎉 完成！

所有功能已就緒，可以開始使用了！

**下一步**: 
1. 測試基本功能 ✅
2. 體驗一週看看效果 📅
3. 根據需求調整參數 ⚙️
4. 實作進階功能（連續天數、成就等） 🏆

**文件**: 
- 詳細指南: `WUM_FLIGHT_GUIDE.md`
- 測試指南: `FLIGHT_TEST_GUIDE.md`
- 修復總結: `FIXES_APPLIED.md`

**有問題？** 查看 Console 日誌或重新閱讀文件。

祝使用愉快！✈️🌍


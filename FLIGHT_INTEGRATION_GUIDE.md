# 航班票券功能整合指南

## 📦 已添加的檔案

1. **core/flight.ts** - TypeScript 原始碼（含測試）
2. **core/flight.js** - JavaScript 版本（瀏覽器使用）
3. **core/flight.spec.ts** - 測試檔案
4. **flight-integration.js** - UI 整合腳本
5. **flight-ticket.css** - 樣式檔案

## 🎯 已完成的 UI 更新

### HTML (pi.html)
已在結果面板添加：
- ✅ 油耗顯示區塊 (`flight-info-bar`)
- ✅ 飛機 icon 按鈕 (`flightTicketButton`)
- ✅ 航班票券彈窗 (`flightTicketModal`)
- ✅ 引入 CSS (`flight-ticket.css`)
- ✅ 引入 JavaScript (`core/flight.js` 和 `flight-integration.js`)

### CSS (flight-ticket.css)
包含完整的樣式：
- 航班資訊 Bar 樣式
- 飛機按鈕動畫效果
- 票券彈窗設計
- 六種票種的徽章顏色
- 響應式設計

### JavaScript (flight-integration.js)
提供的全域函式：
```javascript
window.FlightUI = {
  calculateAndDisplayFlightTicket,  // 計算並顯示票券
  showFlightTicketModal,             // 顯示彈窗
  hideFlightTicketModal,             // 隱藏彈窗
  updateFuelDisplay,                 // 更新油耗顯示
  resetFlightTicket,                 // 重置票券
  getCurrentTicket                   // 取得當前票券
};
```

## 🔧 需要在 pi-script.js 中整合

### 方案 1：在 saveToFirebase 成功後調用

在 `pi-script.js` 的 `saveToFirebase` 函數中，找到這段：

```javascript
// 約在第 1823 行
console.log('✅ 記錄已儲存至 wakeup_records 集合');
console.log('✅ 文檔 ID:', docRef.id);

// 儲存文檔 ID 以供後續更新使用
window.currentRecordId = docRef.id;
```

**在這之後添加：**

```javascript
// ✈️ 計算並顯示航班票券
if (window.FlightUI && window.FlightUI.calculateAndDisplayFlightTicket) {
    console.log('✈️ 開始計算航班票券...');
    try {
        // 準備上一次記錄資料
        const lastEvent = querySnapshot.size > 0 ? {
            localTime: querySnapshot.docs[querySnapshot.docs.length - 1].data().localTime
        } : null;
        
        const ticket = window.FlightUI.calculateAndDisplayFlightTicket(lastEvent);
        
        if (ticket) {
            console.log('✈️ 航班票券計算成功:', ticket);
            // 可選：將票券資訊也保存到 Firebase
            if (docRef) {
                await updateDoc(doc(db, 'wakeup_records', docRef.id), {
                    flightTicket: ticket
                });
                console.log('✈️ 票券資訊已保存至 Firebase');
            }
        }
    } catch (error) {
        console.error('❌ 計算航班票券失敗:', error);
    }
}
```

### 方案 2：在 updateResultData 中調用

或者在 `updateResultData` 函數中，找到更新城市資訊的部分後添加：

```javascript
// 約在第 41-95 行的 updateResultData 函數中
// 更新問候語
const localGreetingEl = document.getElementById('localGreeting');
if (localGreetingEl && data.greeting) {
    localGreetingEl.textContent = `${data.greeting} (${data.language || 'Unknown'})`;
}

// ✈️ 計算航班票券（如果有座標資訊）
if (data.latitude && data.longitude && window.FlightUI) {
    console.log('✈️ 從 updateResultData 計算航班票券');
    setTimeout(() => {
        try {
            // 從 Firebase 獲取上一次記錄
            if (window.db && window.rawUserDisplayName) {
                const { collection, query, where, getDocs, orderBy, limit } = window.firebaseSDK;
                const q = query(
                    collection(window.db, 'wakeup_records'),
                    where('userId', '==', window.rawUserDisplayName),
                    orderBy('timestamp', 'desc'),
                    limit(2)  // 取最新2筆，第2筆是上一次的
                );
                
                getDocs(q).then(snapshot => {
                    const lastEvent = snapshot.size > 1 ? {
                        localTime: snapshot.docs[1].data().localTime
                    } : null;
                    
                    window.FlightUI.calculateAndDisplayFlightTicket(lastEvent);
                });
            }
        } catch (error) {
            console.error('❌ 計算航班票券失敗:', error);
        }
    }, 500);  // 延遲 500ms 確保 UI 已更新
}
```

### 方案 3：在狀態切換時調用

在 `setState('result')` 被調用時自動計算：

```javascript
// 在 setState 函數中，當切換到 result 狀態時
if (state === 'result') {
    // ...現有的狀態切換代碼...
    
    // ✈️ 自動計算並顯示航班票券
    setTimeout(() => {
        if (window.FlightUI && window.FlightUI.calculateAndDisplayFlightTicket) {
            window.FlightUI.calculateAndDisplayFlightTicket();
        }
    }, 1000);
}
```

## 🧪 測試方式

### 1. 基本功能測試
1. 打開 `pi.html`
2. 點擊「開始這一天」按鈕
3. 查看結果頁面是否顯示油耗數字
4. 點擊飛機 ✈️ icon
5. 確認彈窗顯示完整的票券資訊

### 2. 手動測試 JavaScript
在瀏覽器 Console 中執行：

```javascript
// 測試生成票券
const ticket = window.FlightTicket.makeTicket("0830", "0912");
console.log(ticket);

// 測試顯示票券
window.FlightUI.calculateAndDisplayFlightTicket({ localTime: "0830" });

// 測試彈窗
window.FlightUI.showFlightTicketModal();
```

### 3. 檢查票種分類

```javascript
// 測試不同距離的票種
console.log(window.FlightTicket.makeTicket("0830", "0832"));  // Neighborhood Hop
console.log(window.FlightTicket.makeTicket("0830", "0900"));  // City Hop
console.log(window.FlightTicket.makeTicket("0830", "0945"));  // Regional Flight
console.log(window.FlightTicket.makeTicket("0830", "1100"));  // Country Flight
console.log(window.FlightTicket.makeTicket("0830", "1330"));  // Continental Edge
console.log(window.FlightTicket.makeTicket("0600", "1800"));  // Long-Haul
```

## 📝 選項功能

### 啟用夜間懲罰
```javascript
const now = window.FlightTicket.formatCurrentTime();
const opts = {
    nightPenalty: window.FlightTicket.isNightByHHMM(now)
};
window.FlightUI.calculateAndDisplayFlightTicket(lastEvent, opts);
```

### 啟用穩定紅利
```javascript
// 假設有連續天數計算
const userStreak = 7;  // 連續7天
const opts = {
    streakBonus: userStreak >= 7
};
```

### 首日免扣油
```javascript
const opts = {
    firstDayFree: true
};
```

## 🎨 自訂樣式

在 `flight-ticket.css` 中可以調整：
- 票種徽章顏色（`.badge-*` 類別）
- 飛機按鈕大小和動畫
- 彈窗寬度和顏色
- 字體大小

## 🚀 進階功能

### 1. 將票券資訊保存到 Firebase
已在方案 1 中包含，將 `flightTicket` 欄位添加到記錄中。

### 2. 顯示歷史票券
可以在歷史記錄頁面中讀取並顯示過去的票券。

### 3. 票券統計
可以計算總飛行距離、總油耗等統計資訊。

## ❓ 常見問題

### Q: 油耗顯示為 "--"
A: 表示尚未計算票券，確認 `calculateAndDisplayFlightTicket` 已被調用。

### Q: 飛機按鈕無法點擊
A: 檢查 Console 是否有錯誤，確認 flight.js 已正確載入。

### Q: 彈窗不顯示
A: 確認 Modal HTML 元素已添加，CSS 已正確引入。

### Q: 時間格式錯誤
A: 確認傳入的時間格式為 "HHMM" 或 "HH:MM"。

## 📚 相關文件

- `core/flight.ts` - 完整的 TypeScript 原始碼和註解
- `core/flight.spec.ts` - 30+ 個測試案例
- `flight-ticket.css` - 完整的 UI 樣式設計

---

**需要協助？** 檢查瀏覽器 Console 的錯誤訊息，所有功能都有詳細的日誌輸出。


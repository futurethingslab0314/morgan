# ✈️ 航班票券功能 - 測試指南

## 🎉 已完成的修復

### 1. ✅ 修復 Python 錯誤
- **檔案**: `raspberrypi-dsi/web_controller_dsi.py`
- **問題**: `clean_user_name` 未定義
- **修復**: 在使用前先定義變數

### 2. ✅ 改進 JavaScript 功能
- **檔案**: `flight-integration.js`
- **改進內容**:
  - ✨ 點擊飛機按鈕時自動生成票券（如果還沒有）
  - ✨ 頁面載入後自動嘗試計算初始票券
  - ✨ 保存當前時間到 localStorage（供下次使用）
  - ✨ 按鈕不再被禁用，隨時可點擊
  - ✨ 更好的錯誤處理和日誌輸出

## 🧪 如何測試

### 步驟 1: 重新啟動服務

在樹莓派上執行：
```bash
cd /home/morgan/morgan/raspberrypi-dsi
sudo systemctl restart wakeupmap-dsi-web
```

或手動運行：
```bash
cd /home/morgan/morgan/raspberrypi-dsi
python3 main_web_dsi.py
```

### 步驟 2: 等待頁面載入

觀察 Terminal 輸出，確認：
- ✅ 瀏覽器啟動成功
- ✅ 用戶名稱設定成功（不再有 `clean_user_name` 錯誤）
- ✅ 網頁載入完成

### 步驟 3: 按下按鈕開始甦醒

按下實體按鈕（或點擊網頁上的按鈕），等待：
1. 城市定位
2. 故事生成
3. 結果頁面顯示

### 步驟 4: 檢查航班票券功能

在結果頁面上：

#### A. 檢查油耗顯示
- 應該看到油耗數字（不是 "--"）
- 例如: "Fuel: 13"

#### B. 檢查飛機按鈕
- 應該看到飛機 ✈️ icon
- 按鈕應該可以點擊（不會被禁用）
- Hover 時應該有動畫效果

#### C. 點擊飛機按鈕
- 應該彈出完整的票券彈窗
- 彈窗應該包含：
  - 票種徽章（彩色）
  - 飛行方向（EASTBOUND/WESTBOUND/LOCAL）
  - 時間差異
  - 飛行距離
  - 燃油消耗
  - 完整的航班說明文字

### 步驟 5: 查看 Console 日誌

在瀏覽器中按 **F12** 打開開發者工具，應該看到：

```
✈️ Flight Integration 模組已載入
✈️ 初始化航班票券功能
✅ 飛機按鈕事件已綁定
✈️ 自動嘗試計算初始票券...
ℹ️ 初始票券計算跳過（首次使用或資料不足）  # 首次使用正常

# 點擊開始按鈕後
✈️ 開始計算航班票券...
✈️ 時間: { previousTime: null, currentTime: "2043" }
✈️ 票券: { deltaMin: 0, direction: "LOCAL", ... }
✅ 已保存當前時間: 2043
✅ 票券計算成功

# 點擊飛機按鈕時
✈️ 顯示航班票券 { deltaMin: 0, direction: "LOCAL", ... }
```

## 🎯 預期結果

### 第一次使用（首次起飛）
- **油耗**: 5
- **距離**: 5 km
- **方向**: LOCAL
- **票種**: Neighborhood Hop
- **敘述**: "這是你的第一次起飛，飛行 5 公里，耗油 5。"

### 第二次使用（例如：昨天 08:30，今天 09:12）
- **油耗**: 約 13
- **距離**: 約 130 km
- **方向**: WESTBOUND（晚起）
- **票種**: City Hop
- **敘述**: "你比昨天晚 42 分鐘起飛，向西 130 公里，耗油 13。"

## 🐛 故障排除

### 問題 1: 油耗仍顯示 "--"

**診斷**:
```javascript
// 在 Console 中執行
console.log('FlightUI:', window.FlightUI);
console.log('FlightTicket:', window.FlightTicket);
```

**解決方案**:
- 如果 undefined：檢查檔案是否正確載入
- 如果已定義：手動觸發計算
  ```javascript
  window.FlightUI.calculateAndDisplayFlightTicket(null);
  ```

### 問題 2: 點擊飛機按鈕沒反應

**診斷**:
```javascript
// 檢查按鈕元素
const btn = document.getElementById('flightTicketButton');
console.log('按鈕:', btn);
console.log('事件監聽器:', getEventListeners(btn));
```

**解決方案**:
- 刷新頁面
- 或手動綁定：
  ```javascript
  document.getElementById('flightTicketButton').onclick = () => {
      window.FlightUI.showFlightTicketModal();
  };
  ```

### 問題 3: 彈窗顯示預設值（5 km, 5 油耗）

**原因**: 正常！這是首次使用或無法取得上次時間時的預設值。

**驗證**: 第二次使用時應該會正常計算時間差異。

### 問題 4: Python 仍出現 clean_user_name 錯誤

**確認修復**:
```bash
# 檢查檔案是否更新
grep -n "clean_user_name = self.user_name.strip()" /home/morgan/morgan/raspberrypi-dsi/web_controller_dsi.py
```

如果沒有輸出，需要手動更新檔案。

## 📊 測試清單

- [ ] Python 不再報 `clean_user_name` 錯誤
- [ ] 油耗數字正常顯示（不是 "--"）
- [ ] 飛機按鈕可以點擊
- [ ] 點擊後彈窗正常顯示
- [ ] 彈窗包含完整資訊
- [ ] Console 有正確的日誌
- [ ] 第二次使用時計算時間差異正確
- [ ] localStorage 有保存時間

## 🎨 視覺效果檢查

- [ ] 飛機按鈕有漸變背景
- [ ] Hover 時按鈕有旋轉效果
- [ ] 油耗數字有脈衝動畫
- [ ] 更新時油耗有放大閃爍
- [ ] 彈窗有滑入動畫
- [ ] 票種徽章有漂亮的顏色
- [ ] 方向箭頭有移動動畫

## 📝 記錄

測試時間: ____________

| 測試項目 | 結果 | 備註 |
|---------|------|------|
| Python 錯誤修復 | ☐ 通過 ☐ 失敗 | |
| 油耗顯示 | ☐ 通過 ☐ 失敗 | 數值: ____ |
| 飛機按鈕 | ☐ 通過 ☐ 失敗 | |
| 票券彈窗 | ☐ 通過 ☐ 失敗 | |
| 第二次測試 | ☐ 通過 ☐ 失敗 | 時間差: ____ 分鐘 |

---

**需要協助？** 查看 Console 日誌或聯繫開發者。


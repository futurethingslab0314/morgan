# Phase 7 完整流程步驟

## 📋 Phase 7 運作流程總覽

### 🚀 **進入 Phase 7 的觸發點**

1. **提前降落（Phase 5 → Phase 7）**
   - 用戶在 Phase 5 按三下按鈕確認提前降落
   - `confirmEarlyLanding()` 執行完成後，調用 `switchToPhase(Phase.LANDING)`

2. **準時/延後降落（Phase 6 → Phase 7）**
   - 用戶在 Phase 6 按下按鈕
   - `triggerManualLanding()` 執行完成後，調用 `switchToPhase(Phase.LANDING)`

---

## 🔄 **Phase 7 完整執行流程**

### **步驟 1: switchToPhase(Phase.LANDING) 被調用**
- **位置**: `pi.html:9431-9512`
- **執行內容**:
  - 隱藏所有不該在 Phase 7 顯示的 UI（stateCountry、進度條等）
  - 立即開始生成降落圖片（如果目的地已準備好）
  - 調用 `handleLanding()` 函數

---

### **步驟 2: handleLanding() 開始執行**
- **位置**: `pi.html:11343-11950`
- **執行內容**:

#### **2.1 初始化檢查**
- 檢查是否已執行過（防止重複執行）
- 標記 `landingExecuted = true`
- 立即隱藏進度條

#### **2.2 顯示 UI 提示**
- 顯示「準備降落程序...」（5秒）
- 切換到「機長廣播中...」

#### **2.3 播放音樂**
- 調用 `playWakeupMusicForPhase7()` 播放新的 wakeup 音樂（淡入效果）

#### **2.4 停止 takeoff2.mp4 可見性檢查**
- 停止 takeoff2.mp4 的可見性檢查
- 保持 takeoff2.mp4 播放直到 landing.mp4 準備好

#### **2.5 計算最終目的地**
- 計算實際飛行時長
- 計算準時情況（punctuality）
- 調用 `destinationCalculator.findDestination()` 計算最終目的地
- 檢查蟲洞效應（1/7 機率）
- 如果找到目的地，立即開始生成降落圖片

#### **2.6 生成降落內容**
- **提前降落**: 使用已準備好的 `window._preGeneratedLandingData`
- **正常降落**: 並行生成降落內容和目的地資訊
  - `generateLandingContent()` - 生成降落廣播文字
  - `generateDestinationInfo()` - 生成目的地資訊（時間、天氣、特色）

#### **2.7 播放語音**
- **提前降落**: 跳過（已在 `confirmEarlyLanding` 中播放）
- **正常降落**: 
  - 播放 `captain.mp3`（6秒）
  - 播放降落語音 TTS（等待完成）

#### **2.8 播放 landing.mp4**
- 調用 `playLandingVideoAndShowImage(landingImagePromise, finalDestination)`
- 等待 landing.mp4 播放完成

---

### **步驟 3: playLandingVideoAndShowImage() 執行**
- **位置**: `pi.html:5150-5400`
- **執行內容**:

#### **3.1 準備 landing.mp4**
- 創建新的 video 元素
- 設置 landing.mp4 源
- 等待 landing.mp4 可以播放

#### **3.2 移除舊影片**
- 淡出並移除 takeoff2.mp4
- 清除 window-content 的背景

#### **3.3 播放 landing.mp4**
- 淡入 landing.mp4
- 開始播放 landing.mp4
- 顯示「降落中，請稍後...」UI

#### **3.4 landing.mp4 播放結束**
- 停留在 landing.mp4 的最後一幀
- 隱藏「降落中，請稍後...」UI
- **立即顯示情緒量表**（不管圖片是否生成）
  - 調用 `showFlightFeedback(finalDestination)`
  - 保存 Promise 到 `window._landingFeedbackPromise`

#### **3.5 處理降落圖片**
- 檢查圖片是否已準備好
- **如果圖片已準備好**: 立即切換到圖片
- **如果圖片未準備好**: 停留在 landing.mp4 最後一幀，等待圖片生成完成後切換

---

### **步驟 4: showFlightFeedback() 執行（情緒量表）**
- **位置**: `pi.html:7850-8150`
- **執行內容**:

#### **4.1 顯示情緒量表 UI**
- 隱藏 stateCountry
- 隱藏機長廣播 UI
- 顯示 `#stateFlightFeedback`（情緒量表）

#### **4.2 初始化星星選項**
- 查詢 `.feedback-star-segment` 元素（5個星星）
- 初始化選中狀態（預設 3 分，索引 2）

#### **4.3 旋鈕選擇邏輯**
- 設置 `window._feedbackWaitingForButton = true`
- 輪詢旋鈕位置 API（每 100ms）
- 根據旋鈕位置（0-4）更新星星顯示（1-5 顆星亮）
- 更新 `window._feedbackSelectedValue`

#### **4.4 等待按鈕確認**
- 等待用戶按下按鈕確認選擇
- 或等待超時（30秒）自動使用當前選擇
- 返回選擇的分數（1-5）

---

### **步驟 5: handleLanding() 繼續執行（等待情緒量表完成）**
- **位置**: `pi.html:11830-11950`
- **執行內容**:

#### **5.1 等待情緒量表完成**
- 等待 `window._landingFeedbackPromise` 完成
- 獲取用戶選擇的分數

#### **5.2 生成目的地資訊**
- 使用 `finalDestination` 生成目的地資訊
- 包含：時間、天氣、特色

#### **5.3 顯示目的地資訊**
- 調用 `showLandingCountryInfo(finalDestination, destinationInfo)`
- 在底部 bar 顯示目的地資訊（所在位置、時間、天氣、特色）

#### **5.4 保存到 Firebase**
- 調用 `saveSleepRecord()` 保存睡眠記錄
- 包含：目的地、目的地資訊、圖片 URL、情緒分數等

#### **5.5 顯示目的地資訊**
- 調用 `showLandingCountryInfo(finalDestination)`
- 在底部 bar 顯示目的地資訊（所在位置、時間、天氣、特色）
- 隱藏情緒量表

#### **5.6 切換回 Phase 0**
- 更新 `destinationData = finalDestination`
- 更新 `destinationImageUrl = latestImageUrl`（使用最新生成的圖片）
- 調用 `switchToPhase(Phase.POST_ARRIVAL)`
- 設置 `currentState = State.COUNTRY`
- 調用 `switchState(State.COUNTRY)`

---

### **步驟 6: switchToPhase(Phase.POST_ARRIVAL) 執行**
- **位置**: `pi.html:9360-9420`
- **執行內容**:

#### **6.1 重置狀態**
- 調用 `resetFlightState()` 重置所有飛行狀態
- 清除所有全局變數和標記

#### **6.2 載入最新目的地**
- 調用 `loadLatestDestinationOnInit()` 載入最新目的地
- 顯示最新生成的降落圖片
- 顯示最新目的地資訊（如果有的話）

#### **6.3 設置 UI 狀態**
- 隱藏所有 Phase 7 的 UI
- 顯示 Phase 0 的 UI（stateCountry 或 stateLandingCountryInfo）

---

## ⚠️ **可能的問題點**

### **問題 1: 重複執行**
- `handleLanding()` 有 `landingExecuted` 標記防止重複執行
- 但如果標記未正確設置，可能導致重複執行

### **問題 2: 圖片生成時機**
- 圖片可能在多個地方開始生成（Phase 7 進入時、handleLanding 開始時、目的地計算完成時）
- 需要確保使用同一個 Promise

### **問題 3: 情緒量表顯示時機**
- 情緒量表在 landing.mp4 結束時立即顯示
- 但圖片可能還沒生成完成
- 需要確保圖片生成和情緒量表不衝突

### **問題 4: 狀態重置**
- 從 Phase 7 回到 Phase 0 時，需要確保所有狀態正確重置
- 否則可能導致第二次循環時出現問題

---

## 🔍 **調試建議**

1. **檢查 console 日誌**：每個步驟都有詳細的 console.log
2. **檢查 Promise 狀態**：確保所有 Promise 正確等待
3. **檢查全局變數**：確認 `landingExecuted`、`window._landingFeedbackPromise` 等變數的狀態
4. **檢查 UI 顯示**：確認每個 UI 元素在正確的時機顯示/隱藏


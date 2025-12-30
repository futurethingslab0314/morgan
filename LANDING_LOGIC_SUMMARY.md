# 降落邏輯完整流程說明

## 📋 降落流程總覽

降落流程分為兩種情況：
1. **提早降落**：從 Phase 5 直接跳到 Phase 7
2. **準時/遲到降落**：從 Phase 6 進入 Phase 7

---

## 🚀 情況一：提早降落（Phase 5 → Phase 7）

### 觸發條件
- 用戶在 Phase 5（巡航階段）按三下按鈕確認提前降落
- 調用 `confirmEarlyLanding()`

### 執行流程

#### 步驟 1: 確認提前降落
- **函數**: `confirmEarlyLanding()` (pi.html:8878-8998)
- **執行內容**:
  1. 設置標記：`manualLandingTriggered = true`, `window._earlyLandingConfirmed = true`
  2. 立即切換到 Phase 7：`switchToPhase(Phase.LANDING)`
  3. **同時進行**：
     - 顯示「降落準備中請稍等...」UI（持續顯示以拖時間）
     - 開始準備 TTS 文字內容（異步進行）：
     - 計算實際飛行時長
     - 計算最終目的地（包含蟲洞效應檢查）
     - 生成降落內容（`generateLandingContent`）
     - 保存到全局變數：
       - `window._preGeneratedLandingData`（文字A）
       - `window._preGeneratedFinalDestination`（目的地）
       - `window._preGeneratedIsWormhole`（是否蟲洞）
  4. 等待 TTS 文字內容準備完成（在此期間，UI 持續顯示「降落準備中請稍等...」以拖時間）
  5. TTS 文字內容準備完成後，切換到「機長準備廣播...」
  6. **注意**：captain.mp3 和語音A的播放將在 `handleLanding` 中統一處理

#### 步驟 2: 進入 Phase 7
- **函數**: `switchToPhase(Phase.LANDING)` → `handleLanding()`
- **執行內容**:
  1. 播放新的 wakeup 音樂（`playWakeupMusicForPhase7`）
  2. 使用已準備好的目的地和文字A（`window._preGeneratedFinalDestination`, `window._preGeneratedLandingData`）
  3. 生成語音A（預先生成 TTS 音頻）
  4. **播放語音A**：
     - 顯示「機長廣播中...」
     - 降低音樂音量到 0.15
     - 播放 `captain.mp3`
     - 立即播放語音A（降落廣播）
     - 恢復音樂音量到 0.6
  5. 開始生成圖片A（背景進行）
  6. 播放 `landing.mp4`
  7. 背景生成文字B和語音B（新城市介紹）
  8. `landing.mp4` 結束後，顯示情緒量表
  9. 情緒量表完成後，顯示文字B並播放語音B
  10. 保存到 Firebase
  11. 切換回 Phase 0

---

## 🛬 情況二：準時/遲到降落（Phase 6 → Phase 7）

### 觸發條件
- 用戶在 Phase 6（降落前 5 分鐘）按下按鈕
- 調用 `triggerManualLanding()`

### 執行流程

#### 步驟 1: Phase 6 準備階段
- **函數**: `handleDescent()` (pi.html:10550-10736)
- **執行內容**:
  1. 播放 wakeup 音樂（`descentWakeupMusic`）
  2. 顯示「準備降落...」UI
  3. 等待用戶按按鈕

#### 步驟 2: 用戶按下按鈕
- **函數**: `triggerManualLanding()` (pi.html:10794-10930)
- **執行內容**:
  1. 降低音樂音量到 0.15
  2. 顯示「機長準備廣播...」
  3. 生成準備降落的語音文字（`generateDescentWakeUpAnnouncement`）
  4. 預先生成 TTS 音頻
  5. **播放準備降落語音**：
     - 顯示「機長廣播中...」
     - 播放 `captain.mp3`
     - 立即播放準備降落的語音（TTS）
     - 恢復音樂音量到 0.6
  6. 切換到 Phase 7：`switchToPhase(Phase.LANDING)`

#### 步驟 3: 進入 Phase 7
- **函數**: `switchToPhase(Phase.LANDING)` → `handleLanding()`
- **執行內容**:
  1. 播放新的 wakeup 音樂（`playWakeupMusicForPhase7`）
  2. 計算最終目的地（包含蟲洞效應檢查）
  3. 生成文字A（降落廣播文字）
  4. **跳過語音A播放**（因為已在 Phase 6 播放過）
  5. 開始生成圖片A（背景進行）
  6. 播放 `landing.mp4`
  7. 背景生成文字B和語音B（新城市介紹）
  8. `landing.mp4` 結束後，顯示情緒量表
  9. 情緒量表完成後，顯示文字B並播放語音B
  10. 保存到 Firebase
  11. 切換回 Phase 0

---

## 🎯 Phase 7 核心流程（handleLanding）

### 步驟 1: 初始化
- 檢查是否已執行過（`landingExecuted`）
- 標記已執行
- 隱藏進度條

### 步驟 2: 播放音樂
- 播放新的 wakeup 音樂（`playWakeupMusicForPhase7`）
- 音樂音量：0.6

### 步驟 3: 計算目的地
- 計算實際飛行時長
- 計算最終目的地
- 檢查蟲洞效應（1/7 機率）

### 步驟 4: 生成內容（並行）
- **文字A**（降落廣播）：
  - 提早降落：使用 `window._preGeneratedLandingData`
  - 正常降落：調用 `generateLandingContent()`
- **語音A**（降落廣播語音）：
  - 預先生成 TTS 音頻
- **圖片A**（降落圖片）：
  - 背景生成，不阻塞流程

### 步驟 5: 播放語音A（僅提早降落）
- **提早降落**：
  - 顯示「機長廣播中...」
  - 降低音樂音量到 0.15
  - 播放 `captain.mp3`
  - 立即播放語音A
  - 恢復音樂音量到 0.6
- **準時/遲到降落**：
  - 跳過（已在 Phase 6 播放過）

### 步驟 6: 播放 landing.mp4
- 顯示「降落中，請稍後...」UI
- 播放 `landing.mp4`
- 背景生成文字B和語音B（新城市介紹）

### 步驟 7: landing.mp4 結束
- 停留在最後一幀
- **立即顯示情緒量表**（不管圖片是否生成）
- 如果圖片A已生成，切換到圖片A

### 步驟 8: 情緒量表完成
- 等待用戶選擇或超時（30秒）
- 獲取選擇的分數

### 步驟 9: 顯示文字B並播放語音B
- 等待文字B生成完成
- 預先生成語音B（TTS）
- 顯示文字B（`showLandingCountryInfo`）
- 播放語音B（新城市介紹）

### 步驟 10: 保存到 Firebase
- 保存睡眠記錄
- 包含：目的地、目的地資訊、圖片 URL、情緒分數等

### 步驟 11: 切換回 Phase 0
- 更新 `destinationData` 和 `destinationImageUrl`
- 調用 `switchToPhase(Phase.POST_ARRIVAL)`
- 重置所有狀態

---

## 🔍 關鍵邏輯說明

### 語音播放邏輯
1. **提早降落**：
   - Phase 7 播放語音A（captain.mp3 + 降落廣播）
   - 音樂音量：播放時降低到 0.15，播放完恢復到 0.6

2. **準時/遲到降落**：
   - Phase 6 播放準備降落語音（captain.mp3 + 準備降落廣播）
   - Phase 7 跳過語音A播放（已在 Phase 6 播放過）
   - 音樂音量：Phase 6 播放時降低到 0.15，播放完恢復到 0.6

### 圖片生成邏輯
- 圖片A在 Phase 7 開始時就開始生成（背景進行）
- 使用 `window._phase7ImageAPromise` 確保只生成一次
- `landing.mp4` 結束時，如果圖片已生成，立即切換；如果未生成，等待生成完成

### 情緒量表邏輯
- `landing.mp4` 結束時立即顯示（不管圖片是否生成）
- 使用 `window._landingFeedbackPromise` 保存 Promise
- 等待用戶選擇或超時（30秒）

### 文字B和語音B邏輯
- 在播放 `landing.mp4` 時背景生成
- 情緒量表完成後，等待文字B生成完成
- 預先生成語音B（TTS）
- 顯示文字B並播放語音B

---

## ⚠️ 注意事項

1. **防止重複執行**：
   - `handleLanding()` 使用 `landingExecuted` 標記防止重複執行
   - 在開始時就標記，即使後續出錯也不會重複執行

2. **音樂音量控制**：
   - 語音播放時，音樂音量降低到 0.15
   - 語音播放完成後，音樂音量恢復到 0.6
   - 使用 `fadeInAudio` 和 `fadeOutAudio` 實現平滑過渡

3. **圖片顯示**：
   - 優先使用最新生成的圖片（`window._manualLandingImageUrl`）
   - 在顯示前清除舊圖片（設置 `backgroundImage = 'none'`）

4. **狀態重置**：
   - 從 Phase 7 回到 Phase 0 時，調用 `resetFlightState()` 重置所有狀態
   - 確保第二次循環時能正常運作


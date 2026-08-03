# Sleep Airline 手機網站

## 📱 功能介紹

這是一個專為手機設計的視覺化資料庫，可以：

1. **✈️ 旅程列表**：查看所有航程記錄，包含城市圖片、飛行時長、準時狀態等
2. **🗺️ 地圖視圖**：在地圖上查看所有降落點和飛行路徑
3. **📊 統計分析**：查看總飛行次數、距離、準時率等統計數據

## 🔗 訪問連結

部署到 Vercel 後，訪問連結為：
- **生產環境**：`https://morgan-orcin.vercel.app/mobile/`
- **開發環境**：`https://morgan-orcin-git-<branch>-morgan-orcin.vercel.app/mobile/`

## 🚀 部署說明

### 方法 1：自動部署（推薦）

1. 將代碼推送到 GitHub
2. Vercel 會自動檢測並部署
3. 訪問 `https://morgan-orcin.vercel.app/mobile/`

### 方法 2：手動部署

```bash
# 在項目根目錄執行
vercel deploy --prod
```

## 📋 功能詳情

### 旅程列表頁
- 顯示所有航程記錄（卡片式設計）
- 每個卡片包含：
  - 降落城市圖片
  - 城市和國家名稱
  - 飛行時長
  - 抵達時間
  - 準時狀態徽章
  - 氣候帶標籤
- 點擊卡片查看詳細資訊

### 地圖視圖頁
- 使用 Google Maps 顯示所有降落點
- 綠色標記：起點（台北）
- 橙色標記：降落點（按順序編號）
- 橙色線條：飛行路徑
- 點擊標記查看城市資訊
- 自動調整地圖視圖以包含所有標記

### 統計頁面
- **總飛行次數**：所有航程的總數
- **總飛行距離**：累計飛行距離（公里）
- **準時率**：準時抵達的百分比
- **最常去的國家**：訪問次數最多的國家
- **氣候帶分布**：各氣候帶的訪問次數
- **準時率分析**：各準時狀態的分布

## 🔧 技術細節

### API 端點
- `POST /api/get-flight-history`：獲取航程歷史記錄

### 數據結構
每個航程記錄包含：
- `city`, `city_zh`：城市名稱（中英文）
- `country`, `country_zh`：國家名稱（中英文）
- `latitude`, `longitude`：座標
- `imageUrl`：降落圖片 URL
- `wakeTime`：抵達時間
- `sleepDuration`：飛行時長（分鐘）
- `plannedMinutes`：預期時長（分鐘）
- `punctuality`：準時狀態
- `climateZoneName`：氣候帶名稱
- `announcementText`：降落語音文字

### 依賴
- Google Maps JavaScript API（用於地圖顯示）
- 無需額外 npm 套件（純 HTML/CSS/JavaScript）

## 📱 響應式設計

- 專為手機優化
- 支援橫屏和豎屏
- 觸控友好的界面
- 快速載入和流暢動畫

## 🎨 設計特色

- 現代化的卡片式設計
- 漸層色彩搭配
- 流暢的頁面切換動畫
- 直觀的底部導航
- 清晰的資訊層次

## 🔐 注意事項

1. **Google Maps API Key**：需要確保 API Key 有效且有足夠的配額
2. **CORS**：API 已設置 CORS，允許跨域訪問
3. **數據同步**：與樹莓派系統使用相同的 Firebase 數據源，確保數據同步

## 🐛 故障排除

### 地圖不顯示
- 檢查 Google Maps API Key 是否正確
- 確認 API Key 有啟用 Maps JavaScript API

### 數據不顯示
- 檢查 Firebase 是否有數據
- 確認 `userDisplayName` 為 'Pi User'
- 查看瀏覽器控制台的錯誤訊息

### 樣式異常
- 清除瀏覽器快取
- 確認 CSS 文件正確載入


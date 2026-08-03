# takeoff2.mp4 壓縮指南

## 為什麼要壓縮？

壓縮 `takeoff2.mp4` 可以：
1. **減少 CPU 負擔**：較小的檔案解碼更快，減少主線程阻塞
2. **提升按鈕響應**：降低 CPU 使用率，讓按鈕偵測更精確
3. **加快載入速度**：檔案越小，載入越快
4. **減少記憶體佔用**：更少的記憶體使用，系統更流暢

## 推薦壓縮參數

### 使用 FFmpeg 壓縮

```bash
# 基本壓縮（平衡品質和檔案大小）
ffmpeg -i takeoff2.mp4 -c:v libx264 -preset slow -crf 28 -c:a aac -b:a 128k -movflags +faststart takeoff2_compressed.mp4

# 更激進的壓縮（檔案更小，但品質略降）
ffmpeg -i takeoff2.mp4 -c:v libx264 -preset slow -crf 32 -vf "scale=800:800" -c:a aac -b:a 96k -movflags +faststart takeoff2_compressed.mp4

# 極致壓縮（最小檔案，適合背景影片）
ffmpeg -i takeoff2.mp4 -c:v libx264 -preset slow -crf 35 -vf "scale=800:800" -r 24 -c:a aac -b:a 64k -movflags +faststart takeoff2_compressed.mp4
```

### 參數說明

- `-c:v libx264`：使用 H.264 編碼器（瀏覽器兼容性好）
- `-preset slow`：較慢的編碼速度，但壓縮率更高
- `-crf 28-35`：品質參數（28=較高品質，35=較低品質但檔案更小）
- `-vf "scale=800:800"`：縮放至 800x800（如果原檔更大）
- `-r 24`：降低幀率至 24fps（背景影片不需要 60fps）
- `-c:a aac -b:a 64k`：音訊編碼（如果影片有聲音，但背景影片通常不需要）
- `-movflags +faststart`：優化載入，讓影片可以邊下載邊播放

### 使用 HandBrake（GUI 工具）

1. 打開 HandBrake
2. 選擇 `takeoff2.mp4`
3. 預設：選擇 "Fast 1080p30" 或 "Fast 720p30"
4. 調整設定：
   - **品質**：RF 28-32（較低數值=較高品質）
   - **幀率**：24 或 30 fps（不需要 60fps）
   - **解析度**：800x800（如果原檔更大）
   - **音訊**：如果不需要聲音，可以移除音軌
5. 開始編碼

### 使用線上工具

- **CloudConvert**：https://cloudconvert.com/mp4-compressor
- **FreeConvert**：https://www.freeconvert.com/video-compressor
- **Clideo**：https://clideo.com/compress-video

## 目標檔案大小

- **理想大小**：< 5MB（如果原檔很大）
- **可接受大小**：5-10MB
- **最大建議**：< 20MB

## 測試建議

壓縮後請測試：
1. 影片播放是否流暢
2. 按鈕響應是否更精確
3. 頁面載入速度是否提升
4. CPU 使用率是否降低（可在瀏覽器開發者工具的 Performance 面板查看）

## 其他優化建議

1. **使用 WebM 格式**（如果瀏覽器支持）：
   ```bash
   ffmpeg -i takeoff2.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus takeoff2.webm
   ```
   WebM 通常比 MP4 更小，但需要檢查瀏覽器兼容性

2. **移除音軌**（如果不需要聲音）：
   ```bash
   ffmpeg -i takeoff2.mp4 -c:v copy -an takeoff2_no_audio.mp4
   ```

3. **降低解析度**（如果原檔很大）：
   ```bash
   ffmpeg -i takeoff2.mp4 -vf "scale=800:800" -c:v libx264 -crf 28 takeoff2_800.mp4
   ```


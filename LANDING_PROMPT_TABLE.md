# 機長降落 Prompt 表格

## 降落狀況分類

根據 `timeDiffMinutes`（實際時間與預期時間的差異）分為以下情況：

| 時間差異 | 降落狀況 | 代碼標記 |
|---------|---------|---------|
| < -15 分鐘 | 緊急迫降 | `timeDiffMinutes < -15` |
| -15 ~ -5 分鐘 | 提早抵達 | `timeDiffMinutes < -5` |
| -5 ~ +5 分鐘 | 準時降落 | `timeDiffMinutes <= 5 && timeDiffMinutes >= -5` |
| +5 ~ +15 分鐘 | 延遲降落（風大盤旋） | `timeDiffMinutes <= 15` |
| > +15 分鐘 | 延遲降落（導航問題） | `timeDiffMinutes > 15` |

---

## Prompt 參數表格

### 1. 緊急迫降（提早超過 15 分鐘）

| 參數 | 值 |
|-----|-----|
| **landingSituation** | `'緊急迫降'` |
| **situationNarrative** | 隨機選擇以下之一：<br>1. `'由於緊急情況需要提前降落，機長已決定進行緊急降落程序。這是一個需要保持冷靜的時刻，但我們已經安全著陸。'`<br>2. `'哈哈，告訴您一個有趣的小插曲！我們剛才發現${cityName}的機場工作人員還在準備開門，所以我們決定提前降落，給他們一個驚喜！雖然這不是原計劃，但我們已經安全著陸，而且您還多了一些時間欣賞這座城市。'`<br>3. `'各位旅客，有個特別的消息要告訴您！我們的機長剛才發現了一個"時空加速器"（開玩笑的），所以我們比預期提早了 ${Math.abs(timeDiffMinutes)} 分鐘抵達。雖然這很意外，但請放心，我們已經安全著陸，而且這可能是一段特別的旅程！'` |
| **toneAdjustment** | `'專業、沉穩、安撫，帶有緊急情況下的專業處理感，但同時要傳達強烈的安全感和控制感，語氣要有力度和信心，可以加入輕微的幽默緩解緊張，但整體要讓乘客感受到機長的專業和可靠'` |
| **culturalContext** | 根據目的地國家代碼從 `COUNTRY_MENTAL_STATE` 獲取，或預設為 `'親切自然'` |

---

### 2. 提早抵達（提早 5-15 分鐘）

| 參數 | 值 |
|-----|-----|
| **landingSituation** | `'提早抵達'` |
| **situationNarrative** | 隨機選擇以下之一：<br>1. `'由於航路優化，我們比預期時間提早了 ${Math.abs(timeDiffMinutes)} 分鐘抵達。這是一個意外的驚喜，讓您有更多時間探索這座城市。'`<br>2. `'哈哈，好消息！我們的機長剛才發現了一條"捷徑"（其實是風向特別好），所以我們比預期提早了 ${Math.abs(timeDiffMinutes)} 分鐘抵達。這是一個意外的驚喜，讓您有更多時間探索這座城市！'`<br>3. `'各位旅客，告訴您一個有趣的小秘密！我們剛才遇到了一陣特別順的氣流，就像搭上了順風車一樣，所以我們比預期提早了 ${Math.abs(timeDiffMinutes)} 分鐘抵達。這是一個意外的驚喜，讓您有更多時間探索這座城市！'`<br>4. `'好消息！我們的機長剛才發現${cityName}的機場提前開門了（開玩笑的），所以我們決定提前降落。雖然這不是原計劃，但我們已經安全抵達，而且您還多了一些時間欣賞這座城市！'` |
| **toneAdjustment** | `'輕鬆、愉快、驚喜，帶有強烈的"意外收穫"正面情緒，語氣要活潑有活力，充滿興奮感，可以加入幽默元素，讓乘客感受到這是一個值得慶祝的驚喜'` |
| **culturalContext** | 根據目的地國家代碼從 `COUNTRY_MENTAL_STATE` 獲取，或預設為 `'親切自然'` |

---

### 3. 準時降落（±5 分鐘內）

| 參數 | 值 |
|-----|-----|
| **landingSituation** | `'準時降落'` |
| **situationNarrative** | 隨機選擇以下之一：<br>1. `'我們已經準時抵達目的地。這是一次完美的飛行，一切都按照計劃進行。'`<br>2. `'完美！我們就像瑞士手錶一樣精準，準時抵達了${cityName}。這次飛行完美得像教科書一樣，一切都按照計劃進行。'`<br>3. `'各位旅客，告訴您一個好消息！我們的機長剛才完美地計算了時間，就像數學家一樣精準，所以我們準時抵達了目的地。這是一次完美的飛行，一切都按照計劃進行！'`<br>4. `'哈哈，我們剛才完美地"踩點"抵達了${cityName}！就像約會時準時到達一樣完美。這次飛行完美得像教科書一樣，一切都按照計劃進行。'` |
| **toneAdjustment** | `'專業、滿意、慶祝，帶有強烈的"完美執行"成就感，語氣要自豪且自信，充滿滿足感，可以加入輕微的幽默，讓乘客感受到這是一次完美的旅程'` |
| **culturalContext** | 根據目的地國家代碼從 `COUNTRY_MENTAL_STATE` 獲取，或預設為 `'親切自然'` |

---

### 4. 延遲降落（風大盤旋，晚 5-15 分鐘）

| 參數 | 值 |
|-----|-----|
| **landingSituation** | `'延遲降落（風大盤旋）'` |
| **situationNarrative** | 隨機選擇以下之一：<br>1. `'由於上空風勢較大，我們在上方盤旋了約 ${timeDiffMinutes} 分鐘。雖然讓您多等了一會兒，但我們已經安全調整好航線，現在準備降落。'`<br>2. `'哈哈，告訴您一個有趣的情況！我們剛才在上空"兜風"了約 ${timeDiffMinutes} 分鐘（其實是風勢較大需要盤旋）。雖然讓您多等了一會兒，但我們已經安全調整好航線，現在準備降落。而且，您還多了一些時間從空中欣賞${cityName}的風景！'`<br>3. `'各位旅客，有個小插曲要告訴您！我們剛才在上空遇到了一陣"調皮的風"，所以我們在上方盤旋了約 ${timeDiffMinutes} 分鐘。雖然讓您多等了一會兒，但我們已經安全調整好航線，現在準備降落。而且，您還多了一些時間從空中欣賞這座城市的風景！'`<br>4. `'告訴您一個有趣的小秘密！我們剛才在上空"繞了一圈"（其實是風勢較大需要盤旋），所以讓您多等了約 ${timeDiffMinutes} 分鐘。不過不用擔心，我們已經安全調整好航線，現在準備降落。而且，您還多了一些時間從空中欣賞${cityName}的風景！'` |
| **toneAdjustment** | `'歉意、專業、安撫，帶有"雖然延遲但已處理好"的強烈專業感，語氣要誠懇且溫暖，不過度道歉但要有明顯的關懷，可以加入輕微的幽默緩解緊張，讓乘客感受到機組人員的用心'` |
| **culturalContext** | 根據目的地國家代碼從 `COUNTRY_MENTAL_STATE` 獲取，或預設為 `'親切自然'` |

---

### 5. 延遲降落（導航問題，晚超過 15 分鐘）

| 參數 | 值 |
|-----|-----|
| **landingSituation** | `'延遲降落（導航問題）'` |
| **situationNarrative** | 隨機選擇以下之一：<br>1. `'由於導航系統的小小誤差，我們剛才飛到了另一個機場附近，讓您多等了約 ${timeDiffMinutes} 分鐘。不過不用擔心，機長已經重新導航，我們現在正在前往正確的目的地。'`<br>2. `'哈哈，告訴您一個有趣的小插曲！我們的機長剛才可能有點"迷路"了（開玩笑的），所以我們飛到了另一個機場附近，讓您多等了約 ${timeDiffMinutes} 分鐘。不過不用擔心，機長已經重新導航，我們現在正在前往正確的目的地。而且，您還多了一些時間從空中欣賞不同的風景！'`<br>3. `'各位旅客，有個特別的消息要告訴您！我們剛才發現${cityName}的機場工作人員可能還在"準備開門"（開玩笑的），所以我們決定先繞一圈，讓您多等了約 ${timeDiffMinutes} 分鐘。不過不用擔心，機長已經重新導航，我們現在正在前往正確的目的地。'`<br>4. `'告訴您一個有趣的小秘密！我們的機長剛才可能熬夜了（開玩笑的），不小心開錯路了，所以我們飛到了另一個機場附近，讓您多等了約 ${timeDiffMinutes} 分鐘。不過不用擔心，機長已經重新導航，我們現在正在前往正確的目的地。而且，您還多了一些時間從空中欣賞不同的風景！'`<br>5. `'哈哈，有個小插曲要告訴您！我們剛才的導航系統可能"打瞌睡"了（開玩笑的），所以我們飛到了另一個機場附近，讓您多等了約 ${timeDiffMinutes} 分鐘。不過不用擔心，機長已經重新導航，我們現在正在前往正確的目的地。而且，您還多了一些時間從空中欣賞不同的風景！'` |
| **toneAdjustment** | `'歉意、專業、幽默（適度），帶有"小插曲但已解決"的輕鬆感，語氣要誠懇且溫暖，可以用適度的幽默緩解緊張，要讓乘客感覺這是一個有趣的小插曲而不是嚴重的問題，同時要傳達強烈的專業處理能力'` |
| **culturalContext** | 根據目的地國家代碼從 `COUNTRY_MENTAL_STATE` 獲取，或預設為 `'親切自然'` |

---

## Prompt 轉換邏輯結構

所有降落情況都遵循以下 Prompt 轉換邏輯：

```
【輸入變數 (Inputs)】
- 目的地：${cityName}，${countryName} (${countryCode})
- 降落狀況：${landingSituation}
- 當地時間：${timeString}（${timeContext}）
- 文化特色：${culturalContext}
- 時間差異：${timeDiffMinutes > 0 ? '晚' : '提早'} ${Math.abs(timeDiffMinutes)} 分鐘

【Prompt 轉換邏輯 (Design Logic)】
1. 降落狀況 → 敘事背景：${situationNarrative}
2. 文化特色 → 當地文化語氣：${culturalContext}
3. 時間情境 → 音調調整：${toneAdjustment}
```

---

## API 調用參數

這些參數會被傳遞到 `/api/generateSleepFlightAnnouncement` API：

```javascript
{
    announcementType: 'landing',
    city: cityName,
    country: countryName,
    countryCode: countryCode,
    currentLocation: 'Taipei',
    flightTime: Math.floor(actualDuration / 60),
    timerDuration: actualDuration,
    punctuality: punctuality,
    localTimeInfo: localTimeInfo,
    taskType: 'REST',
    uiLanguage: 'zh-TW',
    // 🔧 Prompt 轉換邏輯參數
    landingSituation: landingSituation,
    situationNarrative: situationNarrative,
    toneAdjustment: toneAdjustment,
    culturalContext: culturalContext,
    timeDiffMinutes: timeDiffMinutes
}
```

---

## 備註

1. **幽默元素**：每個降落情況都包含多個幽默版本的 `situationNarrative`，系統會隨機選擇其中一個，增加趣味性。

2. **文化特色**：`culturalContext` 會根據目的地國家代碼從 `window.COUNTRY_MENTAL_STATE` 獲取，如果找不到則使用預設值 `'親切自然'`。

3. **時間資訊**：系統會自動計算目的地的當地時間和時間段（清晨、早晨、午間、午後、傍晚、夜晚），並包含在 `localTimeInfo` 中。

4. **最終生成**：這些參數會被傳遞到 API，由 AI 生成最終的降落廣播文字（60-80字，繁體中文）。


# 🔍 除錯命令（Console 使用）

## 檢查當前狀態
```javascript
// 檢查當前 Phase 和 State
console.log('當前 Phase:', currentPhase);
console.log('當前 State:', currentState);
console.log('目的地資料:', destinationData);
console.log('已選擇時間:', selectedTimer);
console.log('已選擇氣候:', selectedDirection);
```

## 檢查按鈕狀態
```javascript
// 檢查按鈕監控狀態
window.checkButtonStatus();

// 檢查按鈕 API 連接
fetch('http://127.0.0.1:5001/api/button/state')
  .then(r => r.json())
  .then(d => console.log('按鈕狀態:', d))
  .catch(e => console.error('按鈕 API 錯誤:', e));
```

## 手動觸發功能
```javascript
// 手動觸發降落（測試用）
window.testLanding = async function() {
  currentPhase = Phase.LANDING;
  landingExecuted = false;
  await handleLanding();
};

// 手動觸發飛機餐
window.testMeal = function() {
  triggerMidnightService();
};

// 手動觸發提前降落確認
window.testEarlyLanding = function() {
  showLandingConfirmation();
};

// 手動顯示情緒量表
window.testFeedback = async function() {
  const testDest = {
    city: 'Tokyo',
    city_zh: '東京',
    country: 'Japan',
    country_zh: '日本',
    country_iso_code: 'JP'
  };
  await showFlightFeedback(testDest);
};
```

## 檢查 Firebase 資料
```javascript
// 檢查最新的降落記錄
window.checkLatestRecord = async function() {
  const record = await getLatestFlightRecord();
  console.log('最新記錄:', record);
  return record;
};

// 檢查所有飛行記錄
window.checkAllRecords = async function() {
  const records = await loadFlightHistory();
  console.log('所有記錄:', records);
  return records;
};
```

## 檢查 UI 元素
```javascript
// 檢查情緒量表是否顯示
const feedback = document.getElementById('stateFlightFeedback');
console.log('情緒量表:', {
  exists: !!feedback,
  display: feedback?.style.display,
  zIndex: feedback?.style.zIndex,
  hasActive: feedback?.classList.contains('active')
});

// 檢查進度條
const progress = document.getElementById('flightProgressWrapper');
console.log('進度條:', {
  exists: !!progress,
  display: progress?.style.display,
  visible: progress?.style.visibility
});

// 檢查國家資訊
const countryInfo = document.getElementById('stateLandingCountryInfo');
console.log('國家資訊:', {
  exists: !!countryInfo,
  display: countryInfo?.style.display,
  hasActive: countryInfo?.classList.contains('active')
});
```

## 重置狀態（緊急用）
```javascript
// 重置降落狀態
window.resetLanding = function() {
  landingExecuted = false;
  manualLandingTriggered = false;
  midnightServiceActive = false;
  landingConfirmActive = false;
  console.log('✅ 降落狀態已重置');
};

// 強制切換到 Phase 0
window.forcePhase0 = function() {
  currentPhase = Phase.POST_ARRIVAL;
  currentState = State.COUNTRY;
  switchState(State.COUNTRY);
  console.log('✅ 已強制切換到 Phase 0');
};

// 強制顯示情緒量表
window.forceShowFeedback = async function() {
  const dest = destinationData || {
    city: 'Tokyo',
    city_zh: '東京',
    country: 'Japan',
    country_zh: '日本',
    country_iso_code: 'JP'
  };
  const feedbackState = document.getElementById('stateFlightFeedback');
  if (feedbackState) {
    feedbackState.style.display = 'flex';
    feedbackState.style.zIndex = '100';
    feedbackState.classList.add('active');
  }
  await showFlightFeedback(dest);
};
```

## 檢查變數值
```javascript
// 檢查所有關鍵變數
window.debugVars = function() {
  console.log('=== 除錯變數 ===');
  console.log('currentPhase:', currentPhase);
  console.log('currentState:', currentState);
  console.log('selectedTimer:', selectedTimer);
  console.log('selectedDirection:', selectedDirection);
  console.log('destinationData:', destinationData);
  console.log('landingExecuted:', landingExecuted);
  console.log('manualLandingTriggered:', manualLandingTriggered);
  console.log('midnightServiceActive:', midnightServiceActive);
  console.log('landingConfirmActive:', landingConfirmActive);
  console.log('sleepStartTime:', sleepStartTime);
  console.log('sleepTimer:', sleepTimer);
};
```

## 常用除錯流程
```javascript
// 完整除錯檢查
window.fullDebug = async function() {
  console.log('=== 完整除錯檢查 ===');
  window.debugVars();
  window.checkButtonStatus();
  await window.checkLatestRecord();
  
  // 檢查 UI 元素
  const feedback = document.getElementById('stateFlightFeedback');
  const progress = document.getElementById('flightProgressWrapper');
  const countryInfo = document.getElementById('stateLandingCountryInfo');
  
  console.log('UI 狀態:', {
    feedback: {
      exists: !!feedback,
      display: feedback?.style.display,
      zIndex: feedback?.style.zIndex
    },
    progress: {
      exists: !!progress,
      display: progress?.style.display
    },
    countryInfo: {
      exists: !!countryInfo,
      display: countryInfo?.style.display
    }
  });
};
```


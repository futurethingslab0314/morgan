import admin from 'firebase-admin';

// 初始化 Firebase Admin SDK（如果尚未初始化）
if (!admin.apps.length) {
    // 從環境變數獲取服務帳戶金鑰
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}

const db = admin.firestore();

// 常數定義
const APP_ID = 'default-app-id-worldclock-history';

export default async function handler(req, res) {
    // 設定 CORS 標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: '只允許 POST 請求' 
        });
    }

    try {
        const {
            userDisplayName,
            dataIdentifier,
            groupName, // 🔧 添加 groupName 參數
            city,
            country,
            city_zh,
            country_zh,
            country_iso_code,
            latitude,
            longitude,
            timezone,
            localTime,
            targetUTCOffset,
            matchedCityUTCOffset,
            source,
            translationSource,
            timeMinutes,
            latitudePreference,
            latitudeDescription,
            deviceType = 'raspberry_pi',
            story,
            greeting,
            language,
            languageCode,
            // 睡眠航班相關字段
            plannedMinutes,
            sleepDuration,
            timeDiffMinutes,
            punctuality,
            direction,
            climateZoneName,
            isWormhole,
            destinationImage, // 降落圖片 URL（前端使用 destinationImage，API 需要映射到 imageUrl）
            announcementText,
            flightFeedback,
            wakeTime
        } = req.body;

        // 驗證必要欄位
        if (!userDisplayName || !city || !country) {
            return res.status(400).json({
                success: false,
                error: '缺少必要欄位：userDisplayName, city, country'
            });
        }

        // 🔧 使用 Intl.DateTimeFormat 獲取用戶本地時區的當前日期字串
        function getLocalDate({ now = new Date(), timeZone, offsetHours, fallbackTZ = 'Asia/Taipei' }) {
            const fmt = (date, tz) =>
                new Intl.DateTimeFormat('en-CA', { // en-CA 直接輸出 YYYY-MM-DD
                    timeZone: tz,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                }).format(date);

            // 1) 如果給 IANA 時區 -> 正確處理 DST
            if (typeof timeZone === 'string' && timeZone.trim()) {
                try {
                    return fmt(now, timeZone);
                } catch {
                    // 如果 timeZone 名稱無效，就落到偏移量或預設
                }
            }

            // 2) 沒有 IANA 時區，改用數字偏移量（不含 DST）
            const isValidOffset = typeof offsetHours === 'number' && offsetHours >= -12 && offsetHours <= 14;
            if (isValidOffset) {
                // 先把 UTC 時間加上偏移量後，再用 UTC 格式化，得到對應日期
                const shifted = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
                return fmt(shifted, 'UTC');
            }

            // 3) 最後預設使用台灣時區（含 DST 規則：台灣沒有 DST，但這裡依舊走 IANA 時區）
            return fmt(now, fallbackTZ);
        }

        const now = new Date();
        const userUTCOffset = parseFloat(targetUTCOffset);
        
        // 使用優雅的時區處理獲取本地日期
        const recordedDateString = getLocalDate({ 
            now: now, 
            timeZone: timezone, // 優先使用 IANA 時區名稱
            offsetHours: userUTCOffset, // fallback 到數字偏移量
            fallbackTZ: 'Asia/Taipei' // 最終 fallback
        });
        
        // 記錄使用的時區資訊
        if (typeof timezone === 'string' && timezone.trim()) {
            console.log(`📅 使用 IANA 時區: ${timezone}, 本地日期: ${recordedDateString}`);
        } else if (!isNaN(userUTCOffset) && userUTCOffset >= -12 && userUTCOffset <= 14) {
            console.log(`📅 使用 UTC 偏移量: ${userUTCOffset >= 0 ? '+' : ''}${userUTCOffset}, 本地日期: ${recordedDateString}`);
        } else {
            console.log(`📅 使用預設台灣時區, 本地日期: ${recordedDateString} (原始時區: ${timezone}, 偏移量: ${targetUTCOffset})`);
        }

        // 準備基本記錄資料
        const baseRecordData = {
            dataIdentifier: dataIdentifier || userDisplayName.toLowerCase(),
            userDisplayName,
            groupName: groupName || '', // 🔧 確保 groupName 儲存到 artifacts
            recordedAt: admin.firestore.FieldValue.serverTimestamp(),
            localTime: localTime || now.toLocaleTimeString(),
            city,
            country,
            city_zh: city_zh || city,
            country_zh: country_zh || country,
            country_iso_code: country_iso_code || '',
            latitude: (latitude !== undefined && latitude !== null && latitude !== '') ? parseFloat(latitude) : 0,
            longitude: (longitude !== undefined && longitude !== null && longitude !== '') ? parseFloat(longitude) : 0,
            targetUTCOffset: parseFloat(targetUTCOffset) || 0,
            matchedCityUTCOffset: parseFloat(matchedCityUTCOffset) || 0,
            recordedDateString,
            timezone: timezone || 'UTC',
            source: source || 'raspberry_pi_api',
            translationSource: translationSource || 'local_database',
            timeMinutes: parseInt(timeMinutes) || 0,
            latitudePreference: parseFloat(latitudePreference) || 0,
            latitudeDescription: latitudeDescription || '',
            deviceType,
            story: story || '', // 🔧 確保 story 儲存到 artifacts
            greeting: greeting || '', // 🔧 確保 greeting 儲存到 artifacts
            language: language || '',
            languageCode: languageCode || '',
            imageUrl: destinationImage || null, // 使用 destinationImage（前端字段名）映射到 imageUrl（API 字段名）
            // 睡眠航班相關字段（如果存在，全部保存）
            plannedMinutes: plannedMinutes !== undefined ? plannedMinutes : null,
            sleepDuration: sleepDuration !== undefined ? sleepDuration : null,
            timeDiffMinutes: timeDiffMinutes !== undefined ? timeDiffMinutes : null,
            punctuality: punctuality !== undefined ? punctuality : null,
            direction: direction !== undefined ? direction : null,
            climateZoneName: climateZoneName !== undefined ? climateZoneName : null,
            isWormhole: isWormhole !== undefined ? isWormhole : false,
            announcementText: announcementText !== undefined ? announcementText : null,
            flightFeedback: flightFeedback !== undefined ? flightFeedback : null,
            wakeTime: wakeTime !== undefined ? wakeTime : null
        };

        // 準備全域記錄資料
        const baseGlobalRecordData = {
            userDisplayName,
            groupName: groupName || '', // 🔧 確保 groupName 儲存到全域記錄
            city,
            country,
            city_zh: city_zh || city,
            country_zh: country_zh || country,
            country_iso_code: country_iso_code || '',
            latitude: (latitude !== undefined && latitude !== null && latitude !== '') ? parseFloat(latitude) : 0,
            longitude: (longitude !== undefined && longitude !== null && longitude !== '') ? parseFloat(longitude) : 0,
            timezone: timezone || 'UTC',
            recordedAt: admin.firestore.FieldValue.serverTimestamp(),
            recordedDateString,
            deviceType,
            story: story || '', // 🔧 確保 story 儲存到全域記錄
            greeting: greeting || '', // 🔧 確保 greeting 儲存到全域記錄
            language: language || '',
            languageCode: languageCode || ''
        };

        // 準備 artifacts 結構所需的額外資料
        const sanitizedDisplayName = userDisplayName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const artifactsData = {
            appId: APP_ID,
            sanitizedDisplayName,
            source: 'raspberry_pi_api'
        };

        // 主要儲存：artifacts 結構
        try {
            // 儲存到個人檔案結構（對應網頁版個人軌跡）
            // 🔄 需求更新：所有記錄一律寫入同一個 Sleep Airline 路徑
            // 目標路徑：
            //   /artifacts/default-app-id-worldclock-history/userProfiles/sleepAirline/sleepAirline/flight
            const userProfilePath = `artifacts/${APP_ID}/userProfiles/sleepAirline/sleepAirline/flight`;
                        
            const userProfileDocRef = await db.collection(userProfilePath).add({
                ...baseRecordData,
                ...artifactsData
            });
            console.log('✅ 個人檔案記錄已儲存到 artifacts，文件 ID:', userProfileDocRef.id);
            console.log('📁 儲存路徑:', userProfilePath);

            // 儲存到公共資料結構（對應網頁版眾人地圖）
            const publicDataPath = `artifacts/${APP_ID}/publicData/allSharedEntries/dailyRecords`;
            const publicDocRef = await db.collection(publicDataPath).add({
                ...baseGlobalRecordData,
                ...artifactsData
            });
            console.log('✅ 公共資料記錄已儲存到 artifacts，文件 ID:', publicDocRef.id);

            // === 棄用：為了向後兼容，暫時保留寫入到根層級 ===
            // 儲存到個人歷史記錄
            const historyDocRef = await db.collection('userHistory').add(baseRecordData);
            console.log('⚠️ [棄用] 個人歷史記錄已儲存到根層級，文件 ID:', historyDocRef.id);

            // 儲存到全域每日記錄
            const globalDocRef = await db.collection('globalDailyRecords').add(baseGlobalRecordData);
            console.log('⚠️ [棄用] 全域每日記錄已儲存到根層級，文件 ID:', globalDocRef.id);

            return res.status(200).json({
                success: true,
                message: '記錄已成功儲存',
                artifactsIds: {
                    userProfileId: userProfileDocRef.id,
                    publicDataId: publicDocRef.id
                },
                legacyIds: {  // 棄用
                    historyId: historyDocRef.id,
                    globalId: globalDocRef.id
                },
                recordData: {
                    ...baseRecordData,
                    recordedAt: now.toISOString()
                }
            });

        } catch (error) {
            console.error('儲存記錄時發生錯誤:', error);
            return res.status(500).json({
                success: false,
                error: '內部伺服器錯誤',
                details: error.message
            });
        }

    } catch (error) {
        console.error('處理請求時發生錯誤:', error);
        return res.status(500).json({
            success: false,
            error: '內部伺服器錯誤',
            details: error.message
        });
    }
} 
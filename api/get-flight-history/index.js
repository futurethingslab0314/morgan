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
            userDisplayName = 'Pi User',
            limit = 50  // 增加限制，允許查看更多歷史記錄
        } = req.body;

        const APP_ID = 'default-app-id-worldclock-history';

        // 查詢 sleepAirline/flight collection 中的所有記錄
        // 新路徑：artifacts/APP_ID/userProfiles/sleepAirline/flight
        // 舊路徑（已棄用）：artifacts/APP_ID/userProfiles/sleepAirline/sleepAirline/sleepAirline/flight
        let flightCollectionRef;
        let querySnapshot;

        try {
            // 優先嘗試新路徑
            flightCollectionRef = db
                .collection('artifacts')
                .doc(APP_ID)
                .collection('userProfiles')
                .doc('sleepAirline')
                .collection('flight');

            console.log('📂 嘗試從新路徑讀取: artifacts/' + APP_ID + '/userProfiles/sleepAirline/flight');

            // 嘗試按 recordedAt 倒序排列（最新的在前）
            try {
                const historyQuery = flightCollectionRef
                    .orderBy('recordedAt', 'desc')
                    .limit(parseInt(limit));

                querySnapshot = await historyQuery.get();
                console.log('✅ 從新路徑成功讀取 ' + querySnapshot.size + ' 筆記錄');
            } catch (orderByError) {
                // 如果 orderBy 失敗（可能是沒有索引或 recordedAt 不存在），改用獲取所有記錄然後在客戶端排序
                console.warn('⚠️ 無法使用 orderBy，改用獲取所有記錄後排序:', orderByError.message);
                const allDocs = await flightCollectionRef.limit(parseInt(limit * 2)).get(); // 獲取更多記錄以確保有足夠的數據

                // 轉換為數組並在客戶端排序
                const docsArray = [];
                allDocs.forEach((doc) => {
                    docsArray.push(doc);
                });

                // 按 recordedAt 或 wakeTime 排序（降序）
                docsArray.sort((a, b) => {
                    const aData = a.data();
                    const bData = b.data();
                    const aTime = aData.recordedAt?.toMillis?.() ||
                        (aData.wakeTime ? new Date(aData.wakeTime).getTime() : 0) ||
                        (aData.recordedAt ? aData.recordedAt.getTime() : 0);
                    const bTime = bData.recordedAt?.toMillis?.() ||
                        (bData.wakeTime ? new Date(bData.wakeTime).getTime() : 0) ||
                        (bData.recordedAt ? bData.recordedAt.getTime() : 0);
                    return bTime - aTime; // 降序
                });

                // 只取前 limit 筆
                querySnapshot = {
                    forEach: (callback) => {
                        docsArray.slice(0, parseInt(limit)).forEach(callback);
                    },
                    size: Math.min(docsArray.length, parseInt(limit))
                };
                console.log('✅ 從新路徑成功讀取並排序 ' + querySnapshot.size + ' 筆記錄');
            }
        } catch (newPathError) {
            // 如果新路徑失敗，嘗試舊路徑（向後兼容）
            console.warn('⚠️ 新路徑讀取失敗，嘗試舊路徑:', newPathError.message);
            try {
                flightCollectionRef = db
                    .collection('artifacts')
                    .doc(APP_ID)
                    .collection('userProfiles')
                    .doc('sleepAirline')
                    .collection('sleepAirline')
                    .doc('sleepAirline')
                    .collection('flight');

                console.log('📂 嘗試從舊路徑讀取: artifacts/' + APP_ID + '/userProfiles/sleepAirline/sleepAirline/sleepAirline/flight');

                const allDocs = await flightCollectionRef.limit(parseInt(limit * 2)).get();
                const docsArray = [];
                allDocs.forEach((doc) => {
                    docsArray.push(doc);
                });

                // 按 recordedAt 或 wakeTime 排序（降序）
                docsArray.sort((a, b) => {
                    const aData = a.data();
                    const bData = b.data();
                    const aTime = aData.recordedAt?.toMillis?.() ||
                        (aData.wakeTime ? new Date(aData.wakeTime).getTime() : 0) ||
                        (aData.recordedAt ? aData.recordedAt.getTime() : 0);
                    const bTime = bData.recordedAt?.toMillis?.() ||
                        (bData.wakeTime ? new Date(bData.wakeTime).getTime() : 0) ||
                        (bData.recordedAt ? bData.recordedAt.getTime() : 0);
                    return bTime - aTime; // 降序
                });

                querySnapshot = {
                    forEach: (callback) => {
                        docsArray.slice(0, parseInt(limit)).forEach(callback);
                    },
                    size: Math.min(docsArray.length, parseInt(limit))
                };
                console.log('✅ 從舊路徑成功讀取 ' + querySnapshot.size + ' 筆記錄');
            } catch (oldPathError) {
                // 如果兩個路徑都失敗，返回空數組
                console.error('❌ 新舊路徑都讀取失敗:', oldPathError.message);
                querySnapshot = {
                    forEach: () => { },
                    size: 0
                };
            }
        }
        const records = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            records.push({
                id: doc.id,
                city: data.city || data.destinationCity || '',
                city_zh: data.city_zh || data.destinationCityZh || '',
                country: data.country || data.destinationCountry || '',
                country_zh: data.country_zh || data.destinationCountryZh || '',
                latitude: parseFloat(data.latitude) || parseFloat(data.destinationLatitude) || 0,
                longitude: parseFloat(data.longitude) || parseFloat(data.destinationLongitude) || 0,
                imageUrl: data.destinationImage || data.imageUrl || '',
                wakeTime: data.wakeTime || data.recordedAt || '',
                recordedDateString: data.recordedDateString || '',
                plannedMinutes: data.plannedMinutes || null,
                sleepDuration: data.sleepDuration || data.durationMinutes || 0,
                timeDiffMinutes: data.timeDiffMinutes || null,
                punctuality: data.punctuality || null,
                direction: data.direction || data.directionPosition || null,
                climateZoneName: data.climateZoneName || null,
                isWormhole: data.isWormhole || false,
                announcementText: data.announcementText || '',
                timezone: data.timezone || 'UTC',
                country_iso_code: data.country_iso_code || data.countryCode || '',
                flightFeedback: data.flightFeedback || null,  // 飛行回饋數據
                // 🔧 新增：起飛和狀態相關字段
                takeoffTime: data.takeoffTime || null,
                expectedArrivalTime: data.expectedArrivalTime || null,
                flightStatus: data.flightStatus || null,  // 'in_flight' 或 'completed'
                phase: data.phase || null  // 當前階段
            });
        });

        console.log(`✅ 成功讀取 ${records.length} 筆飛行記錄`);

        return res.status(200).json({
            success: true,
            records: records,
            count: records.length
        });

    } catch (error) {
        console.error('❌ 讀取歷史記錄失敗:', error);
        return res.status(500).json({
            success: false,
            error: '讀取歷史記錄失敗',
            details: error.message
        });
    }
}


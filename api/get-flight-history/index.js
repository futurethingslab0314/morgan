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
            limit = 5
        } = req.body;

        // 查詢最近 N 筆記錄（按時間倒序）
        const historyQuery = db.collection('wakeup_records')
            .where('userDisplayName', '==', userDisplayName)
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limit));

        const querySnapshot = await historyQuery.get();
        const records = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            records.push({
                id: doc.id,
                city: data.city || data.destinationCity || '',
                city_zh: data.city_zh || data.destinationCityZh || '',
                country: data.country || data.destinationCountry || '',
                country_zh: data.country_zh || data.destinationCountryZh || '',
                latitude: parseFloat(data.latitude) || 0,
                longitude: parseFloat(data.longitude) || 0,
                imageUrl: data.destinationImage || data.imageUrl || '',
                wakeTime: data.wakeTime || data.timestamp || data.localTime || data.recordedAt || '',
                recordedDateString: data.recordedDateString || '',
                plannedMinutes: data.plannedMinutes || null,
                sleepDuration: data.sleepDuration || data.durationMinutes || 0,
                punctuality: data.punctuality || null,
                climateZoneName: data.climateZoneName || null,
                announcementText: data.announcementText || '',
                timezone: data.timezone || 'UTC'
            });
        });

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


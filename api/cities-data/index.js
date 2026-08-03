// /api/cities-data/index.js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // 設置 CORS 標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 快取 1 小時

  // 如果是 OPTIONS 請求，直接返回
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允許 GET 請求
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `方法 ${req.method} 不被允許` });
    return;
  }

  try {
    // 讀取 sleepcity.json 檔案
    const filePath = path.join(process.cwd(), 'sleepcity.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContents);

    // 新格式是 { "cities": [...] }，需要轉換為舊格式或直接返回
    // 將字段映射：lat -> latitude, lon -> longitude
    if (jsonData.cities) {
      const mappedCities = jsonData.cities.map(city => ({
        ...city,
        latitude: city.lat || city.latitude,
        longitude: city.lon || city.longitude
      }));
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(mappedCities);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(jsonData);
    }
  } catch (error) {
    console.error('讀取 sleepcity.json 失敗:', error);
    res.status(500).json({ error: '無法讀取城市資料', details: error.message });
  }
}


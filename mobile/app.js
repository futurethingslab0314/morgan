// Sleep Airline Mobile App
const API_BASE = 'https://morgan-orcin.vercel.app/api';
const TAIPEI_LAT = 25.033;
const TAIPEI_LON = 121.565;

class SleepAirlineMobile {
    constructor() {
        this.records = [];
        this.map = null;
        this.markers = [];
        this.polylines = [];
        this.init();
    }

    async init() {
        this.setupNavigation();
        this.setupModal();
        await this.loadJourneys();
        this.hideLoading();
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    // 載入所有旅程記錄
    async loadJourneys() {
        try {
            const response = await fetch(`${API_BASE}/get-flight-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userDisplayName: 'Pi User',
                    limit: 100
                })
            });

            const data = await response.json();
            if (data.success && data.records) {
                this.records = data.records;
                this.renderJourneys();
                this.initMap();
                this.renderStats();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('載入旅程失敗:', error);
            this.showEmptyState();
        }
    }

    // 顯示空狀態
    showEmptyState() {
        const emptyState = document.getElementById('empty-state');
        const journeysList = document.getElementById('journeys-list');
        if (this.records.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (journeysList) journeysList.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (journeysList) journeysList.style.display = 'block';
        }
    }

    // 根據飛行時長獲取機票顏色
    getTicketColor(durationMinutes) {
        if (!durationMinutes || durationMinutes === 0) {
            return { primary: '#FF6B35', secondary: '#FF8C5A' }; // 預設橘色
        }

        const hours = durationMinutes / 60;

        // 根據時長分配顏色
        if (hours < 2) {
            // 短程：淺藍色
            return { primary: '#4ECDC4', secondary: '#6EDDD6' };
        } else if (hours < 4) {
            // 中短程：橘色（3小時左右）
            return { primary: '#FF6B35', secondary: '#FF8C5A' };
        } else if (hours < 6) {
            // 中程：黃橙色
            return { primary: '#FFA500', secondary: '#FFB84D' };
        } else if (hours < 8) {
            // 中長程：粉紅色
            return { primary: '#FF6B9D', secondary: '#FF8CB5' };
        } else if (hours < 10) {
            // 長程：藍紫色（9小時左右）
            return { primary: '#667eea', secondary: '#764ba2' };
        } else {
            // 超長程：深紫色
            return { primary: '#764ba2', secondary: '#9B59B6' };
        }
    }

    // 渲染旅程列表（機票設計）
    renderJourneys() {
        const container = document.getElementById('journeys-list');
        if (!container) return;

        if (this.records.length === 0) {
            this.showEmptyState();
            return;
        }

        container.innerHTML = this.records.map((record, index) => {
            // 獲取出發地（上一個記錄的城市，或台北）
            // records 是按時間倒序排列（最新的在前），所以上一個記錄是 index + 1
            const previousRecord = index < this.records.length - 1 ? this.records[index + 1] : null;
            const departureCity = previousRecord
                ? (previousRecord.city_zh || previousRecord.city || '台北')
                : '台北';
            const departureCountry = previousRecord
                ? (previousRecord.country_zh || previousRecord.country || '台灣')
                : '台灣';

            // 目的地
            const arrivalCity = record.city_zh || record.city || '未知城市';
            const arrivalCountry = record.country_zh || record.country || '未知國家';

            // 計算距離（從出發地到目的地）
            let distance = 0;
            if (previousRecord && previousRecord.latitude && previousRecord.longitude &&
                record.latitude && record.longitude) {
                distance = this.calculateDistance(
                    parseFloat(previousRecord.latitude),
                    parseFloat(previousRecord.longitude),
                    parseFloat(record.latitude),
                    parseFloat(record.longitude)
                );
            } else if (record.latitude && record.longitude) {
                // 如果沒有上一個記錄，從台北計算
                distance = this.calculateDistance(
                    TAIPEI_LAT, TAIPEI_LON,
                    parseFloat(record.latitude),
                    parseFloat(record.longitude)
                );
            }

            // 計算時間
            const arrivalTime = record.wakeTime || record.recordedDateString || '';
            const departureTime = previousRecord
                ? (previousRecord.wakeTime || previousRecord.recordedDateString || '')
                : '';

            // 計算台灣時間的起飛時間（睡覺時間）
            const sleepTime = this.calculateSleepTime(record);

            // 生成國家資訊（簡化版）
            const countryInfo = this.generateCountryInfo(record);

            // 獲取機票顏色
            const colors = this.getTicketColor(record.sleepDuration);

            // 嘗試多種可能的圖片欄位名稱
            const imageUrl = record.imageUrl || record.destinationImage || record.image_url || '';

            // 生成條碼數字（基於記錄ID或時間戳）
            const barcodeNumber = this.generateBarcodeNumber(record);

            return `
            <div class="ticket-card" data-index="${index}" style="--ticket-primary: ${colors.primary}; --ticket-secondary: ${colors.secondary};">
                <div class="ticket-header">
                    <div class="ticket-airline">Sleep Airline</div>
                    <div class="ticket-badge">${this.getPunctualityBadge(record.punctuality)}</div>
                </div>
                ${imageUrl ? `
                <div class="ticket-image" style="background-image: url('${imageUrl}')" data-image-url="${imageUrl}"></div>
                ` : ''}
                <div class="ticket-route">
                    <div class="route-section">
                        <div class="route-city">${departureCity}</div>
                        <div class="route-country">${departureCountry}</div>
                        <div class="route-time">${departureTime ? this.formatTime(departureTime) : '--:--'}</div>
                    </div>
                    <div class="route-dots">• • •</div>
                    <div class="route-section">
                        <div class="route-city">${arrivalCity}</div>
                        <div class="route-country">${arrivalCountry}</div>
                        <div class="route-time">${arrivalTime ? this.formatTime(arrivalTime) : '--:--'}</div>
                    </div>
                </div>
                <div class="ticket-info">
                    <div class="info-item">
                        <span class="info-label">距離</span>
                        <span class="info-value">${distance > 0 ? distance.toFixed(0) + ' km' : '--'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">飛行時長</span>
                        <span class="info-value">${this.formatDuration(record.sleepDuration)}</span>
                    </div>
                    ${sleepTime ? `
                    <div class="info-item">
                        <span class="info-label">起飛時間</span>
                        <span class="info-value">${sleepTime}</span>
                    </div>
                    ` : ''}
                    ${record.climateZoneName ? `
                    <div class="info-item">
                        <span class="info-label">氣候帶</span>
                        <span class="info-value">${record.climateZoneName}</span>
                    </div>
                    ` : ''}
                </div>
                ${countryInfo ? `
                <div class="ticket-country-info">
                    <div class="country-info-item">🌤️ ${countryInfo.weather}</div>
                    <div class="country-info-item">✨ ${countryInfo.feature}</div>
                </div>
                ` : ''}
                <div class="ticket-barcode-section">
                    <div class="ticket-perforation"></div>
                    <div class="ticket-barcode">
                        <div class="barcode-lines"></div>
                        <div class="barcode-number">${barcodeNumber}</div>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        // 添加點擊事件
        container.querySelectorAll('.ticket-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                this.showJourneyDetail(this.records[index]);
            });
        });

        // 處理圖片載入錯誤（403 或其他錯誤）
        container.querySelectorAll('.ticket-image').forEach(imgEl => {
            const imgUrl = imgEl.dataset.imageUrl;
            if (imgUrl) {
                const testImg = new Image();
                testImg.onload = () => {
                    // 圖片載入成功
                };
                testImg.onerror = () => {
                    // 圖片載入失敗，隱藏圖片區塊
                    console.warn('⚠️ 圖片載入失敗:', imgUrl);
                    imgEl.style.display = 'none';
                };
                testImg.src = imgUrl;
            }
        });

        this.showEmptyState();
    }

    // 初始化地圖
    initMap() {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) {
            console.warn('⚠️ 地圖容器不存在');
            return;
        }

        // 檢查 Leaflet 是否已載入
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet 未載入，請檢查網路連線');
            mapContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3 style="margin: 0 0 10px 0; color: #333;">地圖庫載入失敗</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">請檢查網路連線或重新整理頁面</p>
                </div>
            `;
            return;
        }

        try {
            // 清除容器中可能存在的舊內容（包括 Google Maps 錯誤訊息）
            mapContainer.innerHTML = '';

            // 使用 Leaflet 初始化地圖
            this.map = L.map(mapContainer, {
                zoomControl: true,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                touchZoom: true,
                dragging: true
            }).setView([TAIPEI_LAT, TAIPEI_LON], 3);

            // 添加 OpenStreetMap 圖層
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.map);

            // 等待地圖容器可見後再調整大小
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 100);

            console.log('✅ Leaflet 地圖初始化成功');

            // 如果切換到地圖頁，渲染地圖
            if (document.getElementById('map-page').classList.contains('active')) {
                this.renderMap();
            }
        } catch (error) {
            console.error('❌ 地圖初始化失敗:', error);
            // 顯示錯誤訊息
            mapContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3 style="margin: 0 0 10px 0; color: #333;">地圖載入失敗</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">錯誤: ${error.message}</p>
                </div>
            `;
        }
    }

    // 渲染地圖標記和路徑
    renderMap() {
        if (!this.map || this.records.length === 0) {
            console.log('⚠️ 地圖未初始化或沒有記錄');
            return;
        }

        // 清除舊的標記和路徑
        this.markers.forEach(m => this.map.removeLayer(m));
        this.polylines.forEach(p => this.map.removeLayer(p));
        this.markers = [];
        this.polylines = [];

        // 創建圖層組
        const markersLayer = L.layerGroup().addTo(this.map);
        const polylinesLayer = L.layerGroup().addTo(this.map);

        // 起點：台北
        const taipeiIcon = L.divIcon({
            className: 'custom-marker start-marker',
            html: '<div style="width: 40px; height: 40px; border-radius: 50%; background: #4CAF50; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">起</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        const taipeiMarker = L.marker([TAIPEI_LAT, TAIPEI_LON], { icon: taipeiIcon })
            .addTo(markersLayer)
            .bindPopup('<div style="padding: 10px;"><h3 style="margin: 0;">起點：台北</h3><p style="margin: 5px 0 0 0; color: #666;">你的旅程起點</p></div>');

        this.markers.push(taipeiMarker);

        let previousPosition = [TAIPEI_LAT, TAIPEI_LON];
        const bounds = L.latLngBounds([[TAIPEI_LAT, TAIPEI_LON]]);

        // 為每個記錄創建標記和路徑
        this.records.forEach((record, index) => {
            if (!record.latitude || !record.longitude ||
                record.latitude === 0 || record.longitude === 0) {
                return;
            }

            const position = [
                parseFloat(record.latitude),
                parseFloat(record.longitude)
            ];

            // 創建自定義標記圖標
            const markerIcon = L.divIcon({
                className: 'custom-marker destination-marker',
                html: `<div style="width: 30px; height: 30px; border-radius: 50%; background: #FF6B35; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${index + 1}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            // 創建標記
            const marker = L.marker(position, { icon: markerIcon })
                .addTo(markersLayer)
                .bindPopup(`
                    <div style="padding: 10px; min-width: 200px;">
                        <h3 style="margin: 0 0 5px 0; font-size: 16px;">${record.city_zh || record.city}</h3>
                        <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">${record.country_zh || record.country}</p>
                        <p style="margin: 0; font-size: 12px; color: #999;">${this.formatDate(record.wakeTime || record.recordedDateString)}</p>
                        ${record.sleepDuration ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">飛行時長: ${this.formatDuration(record.sleepDuration)}</p>` : ''}
                    </div>
                `);

            this.markers.push(marker);
            bounds.extend(position);

            // 繪製飛行路徑
            const flightPath = L.polyline([previousPosition, position], {
                color: '#FF6B35',
                weight: 3,
                opacity: 0.6,
                smoothFactor: 1
            }).addTo(polylinesLayer);

            this.polylines.push(flightPath);
            previousPosition = position;
        });

        // 調整地圖視圖以包含所有標記
        if (this.markers.length > 0) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }

        // 確保地圖大小正確
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 100);
    }

    // 渲染統計
    renderStats() {
        const stats = this.calculateStats();
        const container = document.querySelector('.stats-container');
        if (!container) return;

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.totalFlights}</div>
                <div class="stat-label">總飛行次數</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalDistance.toFixed(0)}</div>
                <div class="stat-label">總飛行距離 (km)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.onTimeRate}%</div>
                <div class="stat-label">準時率</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.topCountry}</div>
                <div class="stat-label">最常去的國家</div>
            </div>
        `;

        // 渲染圖表
        this.renderCharts(stats);

        // 渲染起飛時間列表
        this.renderSleepTimes();
    }

    // 渲染圖表
    renderCharts(stats) {
        // 氣候帶分布
        const climateChart = document.getElementById('climate-chart');
        if (climateChart && stats.climateDistribution) {
            climateChart.innerHTML = Object.entries(stats.climateDistribution)
                .map(([climate, count]) => `
                    <div class="chart-item">
                        <div class="chart-item-value">${count}</div>
                        <div class="chart-item-label">${climate}</div>
                    </div>
                `).join('');
        }

        // 準時率分析
        const punctualityChart = document.getElementById('punctuality-chart');
        if (punctualityChart && stats.punctualityDistribution) {
            punctualityChart.innerHTML = Object.entries(stats.punctualityDistribution)
                .map(([status, count]) => `
                    <div class="chart-item">
                        <div class="chart-item-value">${count}</div>
                        <div class="chart-item-label">${this.getPunctualityText(status)}</div>
                    </div>
                `).join('');
        }

        // 時長分布
        const durationChart = document.getElementById('duration-chart');
        if (durationChart && stats.durationDistribution) {
            // 定義排序順序（根據90分鐘單位）
            const order = ['< 90分鐘', '90分鐘', '180分鐘', '270分鐘', '360分鐘', '450分鐘', '540分鐘'];
            durationChart.innerHTML = Object.entries(stats.durationDistribution)
                .sort((a, b) => {
                    // 按時長排序
                    const aIndex = order.findIndex(o => a[0].includes(o));
                    const bIndex = order.findIndex(o => b[0].includes(o));
                    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                })
                .map(([duration, count]) => `
                    <div class="chart-item">
                        <div class="chart-item-value">${count}</div>
                        <div class="chart-item-label">${duration}</div>
                    </div>
                `).join('');
        }
    }

    // 計算統計數據
    calculateStats() {
        const totalFlights = this.records.length;
        let totalDistance = 0;
        let onTimeCount = 0;
        const countryCount = {};
        const climateDistribution = {};
        const punctualityDistribution = {};
        const durationDistribution = {};

        let previousLat = TAIPEI_LAT;
        let previousLon = TAIPEI_LON;

        this.records.forEach((record) => {
            // 計算距離
            if (record.latitude && record.longitude &&
                record.latitude !== 0 && record.longitude !== 0) {
                const distance = this.calculateDistance(
                    previousLat, previousLon,
                    parseFloat(record.latitude), parseFloat(record.longitude)
                );
                totalDistance += distance;
                previousLat = parseFloat(record.latitude);
                previousLon = parseFloat(record.longitude);
            }

            // 準時統計
            if (record.punctuality === 'PERFECT' || record.punctuality === 'ON_TIME') {
                onTimeCount++;
            }

            // 國家統計
            const country = record.country_zh || record.country || '未知';
            countryCount[country] = (countryCount[country] || 0) + 1;

            // 氣候帶分布
            if (record.climateZoneName) {
                climateDistribution[record.climateZoneName] =
                    (climateDistribution[record.climateZoneName] || 0) + 1;
            }

            // 準時率分布
            const punctuality = record.punctuality || '未知';
            punctualityDistribution[punctuality] =
                (punctualityDistribution[punctuality] || 0) + 1;

            // 時長分布（根據 plannedMinutes 或 sleepDuration，使用90分鐘單位）
            const duration = record.plannedMinutes || record.sleepDuration || 0;
            if (duration > 0) {
                let durationLabel = '';
                // 根據90分鐘單位分類
                if (duration < 90) {
                    durationLabel = '< 90分鐘';
                } else if (duration < 180) {
                    durationLabel = '90分鐘';
                } else if (duration < 270) {
                    durationLabel = '180分鐘 (3小時)';
                } else if (duration < 360) {
                    durationLabel = '270分鐘 (4.5小時)';
                } else if (duration < 450) {
                    durationLabel = '360分鐘 (6小時)';
                } else if (duration < 540) {
                    durationLabel = '450分鐘 (7.5小時)';
                } else {
                    durationLabel = '540分鐘 (9小時)';
                }
                durationDistribution[durationLabel] = (durationDistribution[durationLabel] || 0) + 1;
            }
        });

        const topCountry = Object.entries(countryCount)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '未知';

        return {
            totalFlights,
            totalDistance,
            onTimeRate: totalFlights > 0 ? Math.round((onTimeCount / totalFlights) * 100) : 0,
            topCountry,
            climateDistribution,
            punctualityDistribution,
            durationDistribution
        };
    }

    // 計算兩點間距離（Haversine 公式）
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // 地球半徑（公里）
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // 生成國家資訊
    generateCountryInfo(record) {
        try {
            const timezone = record.timezone || 'UTC';
            const now = new Date();
            const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
            const hour = localTime.getHours();
            const minutes = localTime.getMinutes();
            const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            let weather = '';
            let feature = '';

            if (hour >= 5 && hour < 9) {
                weather = '清晨，空氣清新';
                feature = '適合晨間散步';
            } else if (hour >= 9 && hour < 12) {
                weather = '早晨，陽光和煦';
                feature = '適合戶外活動';
            } else if (hour >= 12 && hour < 15) {
                weather = '午間，天氣晴朗';
                feature = '適合探索城市';
            } else if (hour >= 15 && hour < 18) {
                weather = '午後，溫暖舒適';
                feature = '適合觀光遊覽';
            } else if (hour >= 18 && hour < 21) {
                weather = '傍晚，微風徐徐';
                feature = '適合欣賞夜景';
            } else {
                weather = '夜晚，寧靜祥和';
                feature = '適合放鬆休息';
            }

            const features = [
                '擁有豐富的文化底蘊',
                '風景優美，適合觀光',
                '美食文化豐富',
                '歷史悠久，古蹟眾多',
                '現代化都市，充滿活力'
            ];
            const randomFeature = features[Math.floor(Math.random() * features.length)];

            return {
                time: timeString,
                weather: weather,
                feature: randomFeature
            };
        } catch (error) {
            return null;
        }
    }

    // 顯示旅程詳情（機票詳情）
    showJourneyDetail(record) {
        const modal = document.getElementById('journey-modal');
        const modalBody = document.getElementById('modal-body');
        if (!modal || !modalBody) return;

        // 獲取出發地
        // records 是按時間倒序排列（最新的在前），所以上一個記錄是 index + 1
        const recordIndex = this.records.findIndex(r => r.id === record.id || r === record);
        const previousRecord = recordIndex < this.records.length - 1 ? this.records[recordIndex + 1] : null;
        const departureCity = previousRecord
            ? (previousRecord.city_zh || previousRecord.city || '台北')
            : '台北';
        const departureCountry = previousRecord
            ? (previousRecord.country_zh || previousRecord.country || '台灣')
            : '台灣';

        // 目的地
        const arrivalCity = record.city_zh || record.city || '未知城市';
        const arrivalCountry = record.country_zh || record.country || '未知國家';

        // 計算距離
        let distance = 0;
        if (previousRecord && previousRecord.latitude && previousRecord.longitude &&
            record.latitude && record.longitude) {
            distance = this.calculateDistance(
                parseFloat(previousRecord.latitude),
                parseFloat(previousRecord.longitude),
                parseFloat(record.latitude),
                parseFloat(record.longitude)
            );
        } else if (record.latitude && record.longitude) {
            distance = this.calculateDistance(
                TAIPEI_LAT, TAIPEI_LON,
                parseFloat(record.latitude),
                parseFloat(record.longitude)
            );
        }

        // 時間
        const arrivalTime = record.wakeTime || record.recordedDateString || '';
        const departureTime = previousRecord
            ? (previousRecord.wakeTime || previousRecord.recordedDateString || '')
            : '';

        // 國家資訊
        const countryInfo = this.generateCountryInfo(record);

        // 獲取機票顏色
        const colors = this.getTicketColor(record.sleepDuration);

        // 嘗試多種可能的圖片欄位名稱
        const imageUrl = record.imageUrl || record.destinationImage || record.image_url || '';

        modalBody.innerHTML = `
            <div class="ticket-detail-header" style="--ticket-primary: ${colors.primary}; --ticket-secondary: ${colors.secondary};">
                <h2 class="modal-title">${arrivalCity}</h2>
                <p class="modal-subtitle">${arrivalCountry}</p>
            </div>
            ${imageUrl ? `
            <div class="modal-image" style="background-image: url('${imageUrl}')" data-image-url="${imageUrl}"></div>
            ` : ''}
            
            <div class="ticket-detail-route">
                <div class="route-section">
                    <div class="route-city">${departureCity}</div>
                    <div class="route-country">${departureCountry}</div>
                    <div class="route-time">${departureTime ? this.formatTime(departureTime) : '--:--'}</div>
                </div>
                <div class="route-dots">• • •</div>
                <div class="route-section">
                    <div class="route-city">${arrivalCity}</div>
                    <div class="route-country">${arrivalCountry}</div>
                    <div class="route-time">${arrivalTime ? this.formatTime(arrivalTime) : '--:--'}</div>
                </div>
            </div>
            
            <div class="ticket-detail-info">
                <div class="modal-detail">
                    <div class="modal-detail-label">飛行距離</div>
                    <div class="modal-detail-value">${distance > 0 ? distance.toFixed(0) + ' 公里' : '--'}</div>
                </div>
                
                ${record.sleepDuration ? `
                <div class="modal-detail">
                    <div class="modal-detail-label">飛行時長</div>
                    <div class="modal-detail-value">${this.formatDuration(record.sleepDuration)}</div>
                </div>
                ` : ''}
                
                ${this.calculateSleepTime(record) ? `
                <div class="modal-detail">
                    <div class="modal-detail-label">起飛時間（台灣時間）</div>
                    <div class="modal-detail-value">${this.calculateSleepTime(record)}</div>
                </div>
                ` : ''}
                
                ${record.plannedMinutes ? `
                <div class="modal-detail">
                    <div class="modal-detail-label">預期時長</div>
                    <div class="modal-detail-value">${this.formatDuration(record.plannedMinutes)}</div>
                </div>
                ` : ''}
                
                ${record.punctuality ? `
                <div class="modal-detail">
                    <div class="modal-detail-label">準時狀態</div>
                    <div class="modal-detail-value">${this.getPunctualityText(record.punctuality)}</div>
                </div>
                ` : ''}
                
                ${record.climateZoneName ? `
                <div class="modal-detail">
                    <div class="modal-detail-label">氣候帶</div>
                    <div class="modal-detail-value">${record.climateZoneName}</div>
                </div>
                ` : ''}
            </div>
            
            ${countryInfo ? `
            <div class="ticket-detail-country">
                <h3 class="country-info-title">目的地資訊</h3>
                <div class="country-info-item">🌤️ ${countryInfo.weather}</div>
                <div class="country-info-item">✨ ${countryInfo.feature}</div>
            </div>
            ` : ''}
            
            <div class="ticket-detail-barcode-section">
                <div class="ticket-perforation"></div>
                <div class="ticket-barcode">
                    <div class="barcode-lines"></div>
                    <div class="barcode-number">${this.generateBarcodeNumber(record)}</div>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // 處理模態框中的圖片載入錯誤
        const modalImage = modalBody.querySelector('.modal-image');
        if (modalImage && imageUrl) {
            const testImg = new Image();
            testImg.onload = () => {
                // 圖片載入成功
            };
            testImg.onerror = () => {
                // 圖片載入失敗，使用漸層背景
                console.warn('⚠️ 模態框圖片載入失敗，使用預設背景:', imageUrl);
                modalImage.style.backgroundImage = 'none';
                modalImage.style.background = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;
            };
            testImg.src = imageUrl;
        }
    }

    // 設置導航
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.switchPage(page);
            });
        });
    }

    // 切換頁面
    switchPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        const targetPage = document.getElementById(`${page}-page`);
        const targetBtn = document.querySelector(`[data-page="${page}"]`);

        if (targetPage) targetPage.classList.add('active');
        if (targetBtn) targetBtn.classList.add('active');

        // 如果切換到地圖頁，渲染地圖
        if (page === 'map') {
            if (!this.map) {
                // 如果地圖還沒初始化，先初始化
                this.initMap();
            }
            // 等待地圖容器可見後再渲染
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                    this.renderMap();
                }
            }, 200);
        }
    }

    // 設置模態框
    setupModal() {
        const modal = document.getElementById('journey-modal');
        const closeBtn = document.querySelector('.modal-close');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (modal) modal.classList.remove('active');
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    }

    // 工具函數
    formatDate(dateString) {
        if (!dateString) return '未知日期';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '未知日期';
            return date.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    formatDuration(minutes) {
        if (!minutes || minutes === 0) return '未知';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}小時${mins}分鐘` : `${mins}分鐘`;
    }

    formatTime(dateString) {
        if (!dateString) return '--:--';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '--:--';
            return date.toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (e) {
            return '--:--';
        }
    }

    // 計算台灣時間的起飛時間（睡覺時間）
    calculateSleepTime(record) {
        try {
            const wakeTime = record.wakeTime || record.recordedDateString;
            if (!wakeTime) return null;

            const wakeDate = new Date(wakeTime);
            if (isNaN(wakeDate.getTime())) return null;

            // 獲取睡眠時長（分鐘）
            const sleepDuration = record.sleepDuration || record.plannedMinutes || 0;
            if (sleepDuration === 0) return null;

            // 計算起飛時間（睡覺時間）= 醒來時間 - 睡眠時長
            const sleepDate = new Date(wakeDate.getTime() - sleepDuration * 60 * 1000);

            // 轉換為台灣時間
            const taiwanTime = sleepDate.toLocaleString('zh-TW', {
                timeZone: 'Asia/Taipei',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            return taiwanTime;
        } catch (e) {
            console.error('計算起飛時間失敗:', e);
            return null;
        }
    }

    // 生成條碼數字
    generateBarcodeNumber(record) {
        // 使用記錄ID或時間戳生成一個唯一的條碼數字
        const id = record.id || '';
        const timestamp = record.wakeTime || record.recordedDateString || '';

        if (id) {
            // 從ID中提取數字並格式化
            const numbers = id.replace(/\D/g, '').slice(0, 12);
            if (numbers.length >= 10) {
                return numbers.match(/.{1,4}/g).join(' ');
            }
        }

        if (timestamp) {
            try {
                const date = new Date(timestamp);
                const year = date.getFullYear().toString().slice(-2);
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const hour = date.getHours().toString().padStart(2, '0');
                const min = date.getMinutes().toString().padStart(2, '0');
                return `${year}${month}${day} ${hour}${min}`;
            } catch (e) {
                // fallback
            }
        }

        // 生成隨機條碼
        const random = Math.floor(Math.random() * 1000000000000);
        return random.toString().padStart(12, '0').match(/.{1,4}/g).join(' ');
    }

    getPunctualityBadge(punctuality) {
        const badges = {
            'PERFECT': '✨ 完美',
            'ON_TIME': '✅ 準時',
            'EARLY': '⏰ 提早',
            'LATE': '⏳ 延遲'
        };
        return badges[punctuality] || '❓';
    }

    getPunctualityText(punctuality) {
        const texts = {
            'PERFECT': '完美準時',
            'ON_TIME': '準時',
            'EARLY': '提早抵達',
            'LATE': '延遲抵達'
        };
        return texts[punctuality] || '未知';
    }

    // 計算台灣時間的降落時間
    calculateArrivalTime(record) {
        try {
            const wakeTime = record.wakeTime || record.recordedDateString;
            if (!wakeTime) return null;

            const wakeDate = new Date(wakeTime);
            if (isNaN(wakeDate.getTime())) return null;

            // 轉換為台灣時間
            const taiwanTime = wakeDate.toLocaleString('zh-TW', {
                timeZone: 'Asia/Taipei',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            return taiwanTime;
        } catch (e) {
            console.error('計算降落時間失敗:', e);
            return null;
        }
    }

    // 渲染起飛時間列表
    renderSleepTimes() {
        const chartsContainer = document.querySelector('.stats-charts');
        if (!chartsContainer) return;

        // 檢查是否已經存在起飛時間區塊
        let sleepTimesCard = document.getElementById('sleep-times-card');
        if (!sleepTimesCard) {
            sleepTimesCard = document.createElement('div');
            sleepTimesCard.id = 'sleep-times-card';
            sleepTimesCard.className = 'chart-card';
            chartsContainer.appendChild(sleepTimesCard);
        }

        // 計算所有起飛時間和降落時間
        const sleepTimes = this.records
            .map(record => {
                const sleepTime = this.calculateSleepTime(record);
                const arrivalTime = this.calculateArrivalTime(record);
                const arrivalCity = record.city_zh || record.city || '未知城市';
                const arrivalCountry = record.country_zh || record.country || '未知國家';
                const arrivalDate = record.wakeTime || record.recordedDateString || '';

                // 只要有起飛時間或降落時間就顯示
                if (!sleepTime && !arrivalTime) return null;

                return {
                    sleepTime,
                    arrivalTime,
                    arrivalCity,
                    arrivalCountry,
                    arrivalDate: this.formatDate(arrivalDate),
                    duration: this.formatDuration(record.sleepDuration || record.plannedMinutes || 0)
                };
            })
            .filter(item => item !== null)
            .sort((a, b) => {
                // 按日期倒序排列（最新的在前）
                return new Date(b.arrivalDate) - new Date(a.arrivalDate);
            });

        if (sleepTimes.length === 0) {
            sleepTimesCard.innerHTML = `
                <h3>起飛時間記錄</h3>
                <p style="text-align: center; color: var(--text-light); padding: 20px;">暫無起飛時間記錄</p>
            `;
            return;
        }

        sleepTimesCard.innerHTML = `
            <h3>起飛時間記錄（台灣時間）</h3>
            <div class="sleep-times-list">
                ${sleepTimes.map(item => `
                    <div class="sleep-time-item">
                        <div class="sleep-time-header">
                            <div class="sleep-time-date">${item.arrivalDate}</div>
                            ${item.sleepTime ? `<div class="sleep-time-time">${item.sleepTime}</div>` : ''}
                        </div>
                        ${item.arrivalTime ? `
                        <div class="arrival-time">
                            <span class="arrival-time-label">降落時間：</span>
                            <span class="arrival-time-value">${item.arrivalTime}</span>
                        </div>
                        ` : ''}
                        <div class="sleep-time-destination">
                            <span class="sleep-time-city">${item.arrivalCity}</span>
                            <span class="sleep-time-country">${item.arrivalCountry}</span>
                        </div>
                        <div class="sleep-time-duration">飛行時長：${item.duration}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    new SleepAirlineMobile();
});


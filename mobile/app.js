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

    // 渲染旅程列表
    renderJourneys() {
        const container = document.getElementById('journeys-list');
        if (!container) return;

        if (this.records.length === 0) {
            this.showEmptyState();
            return;
        }

        container.innerHTML = this.records.map((record, index) => {
            // 嘗試多種可能的圖片欄位名稱
            const imageUrl = record.imageUrl || record.destinationImage || record.image_url || '';
            // 使用 data 屬性存儲圖片 URL，方便後續處理
            const imageStyle = imageUrl ? `background-image: url('${imageUrl}')` : 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
            
            return `
            <div class="journey-card" data-index="${index}">
                <div class="journey-image" style="${imageStyle}" data-image-url="${imageUrl || ''}" data-city="${record.city_zh || record.city || ''}" data-country="${record.country_zh || record.country || ''}">
                    <div class="journey-badge">${this.getPunctualityBadge(record.punctuality)}</div>
                </div>
                <div class="journey-info">
                    <h3>${record.city_zh || record.city || '未知城市'}</h3>
                    <p class="country">${record.country_zh || record.country || '未知國家'}</p>
                    <div class="journey-meta">
                        <span>🕐 ${this.formatDuration(record.sleepDuration)}</span>
                        <span>📅 ${this.formatDate(record.wakeTime || record.recordedDateString)}</span>
                    </div>
                    ${record.climateZoneName ? `<div class="climate-tag">${record.climateZoneName}</div>` : ''}
                </div>
            </div>
        `;
        }).join('');

        // 添加點擊事件
        container.querySelectorAll('.journey-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                this.showJourneyDetail(this.records[index]);
            });
        });

        // 處理圖片載入錯誤（403 或其他錯誤）
        container.querySelectorAll('.journey-image').forEach(imgEl => {
            const imgUrl = imgEl.dataset.imageUrl;
            if (imgUrl) {
                // 創建一個隱藏的 img 元素來測試圖片是否可載入
                const testImg = new Image();
                testImg.onload = () => {
                    // 圖片載入成功，不需要做任何事
                };
                testImg.onerror = () => {
                    // 圖片載入失敗（可能是 403 過期），使用漸層背景
                    console.warn('⚠️ 圖片載入失敗，使用預設背景:', imgUrl);
                    imgEl.style.backgroundImage = 'none';
                    imgEl.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
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
    }

    // 計算統計數據
    calculateStats() {
        const totalFlights = this.records.length;
        let totalDistance = 0;
        let onTimeCount = 0;
        const countryCount = {};
        const climateDistribution = {};
        const punctualityDistribution = {};

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
        });

        const topCountry = Object.entries(countryCount)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '未知';

        return {
            totalFlights,
            totalDistance,
            onTimeRate: totalFlights > 0 ? Math.round((onTimeCount / totalFlights) * 100) : 0,
            topCountry,
            climateDistribution,
            punctualityDistribution
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

    // 顯示旅程詳情
    showJourneyDetail(record) {
        const modal = document.getElementById('journey-modal');
        const modalBody = document.getElementById('modal-body');
        if (!modal || !modalBody) return;

        // 嘗試多種可能的圖片欄位名稱
        const imageUrl = record.imageUrl || record.destinationImage || record.image_url || '';
        
        // 創建圖片元素，並添加錯誤處理
        let imageHtml = '';
        if (imageUrl) {
            imageHtml = `<div class="modal-image" style="background-image: url('${imageUrl}')" data-image-url="${imageUrl}"></div>`;
        }
        
        modalBody.innerHTML = `
            ${imageHtml}
            <h2 class="modal-title">${record.city_zh || record.city || '未知城市'}</h2>
            <p class="modal-subtitle">${record.country_zh || record.country || '未知國家'}</p>
            
            <div class="modal-detail">
                <div class="modal-detail-label">抵達時間</div>
                <div class="modal-detail-value">${this.formatDate(record.wakeTime || record.recordedDateString)}</div>
            </div>
            
            ${record.sleepDuration ? `
            <div class="modal-detail">
                <div class="modal-detail-label">飛行時長</div>
                <div class="modal-detail-value">${this.formatDuration(record.sleepDuration)}</div>
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
            
            ${record.latitude && record.longitude && record.latitude !== 0 && record.longitude !== 0 ? `
            <div class="modal-detail">
                <div class="modal-detail-label">座標</div>
                <div class="modal-detail-value">${parseFloat(record.latitude).toFixed(3)}°N, ${parseFloat(record.longitude).toFixed(3)}°E</div>
            </div>
            ` : ''}
            
            ${record.announcementText ? `
            <div class="modal-detail">
                <div class="modal-detail-label">降落語音</div>
                <div class="modal-detail-value" style="font-size: 14px; line-height: 1.6;">${record.announcementText}</div>
            </div>
            ` : ''}
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
                modalImage.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
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
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    new SleepAirlineMobile();
});


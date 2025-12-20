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

        container.innerHTML = this.records.map((record, index) => `
            <div class="journey-card" data-index="${index}">
                <div class="journey-image" style="background-image: url('${record.imageUrl || ''}')">
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
        `).join('');

        // 添加點擊事件
        container.querySelectorAll('.journey-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                this.showJourneyDetail(this.records[index]);
            });
        });

        this.showEmptyState();
    }

    // 初始化地圖
    initMap() {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;

        this.map = new google.maps.Map(mapContainer, {
            zoom: 3,
            center: { lat: TAIPEI_LAT, lng: TAIPEI_LON },
            mapTypeId: 'terrain',
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        // 如果切換到地圖頁，渲染地圖
        if (document.getElementById('map-page').classList.contains('active')) {
            this.renderMap();
        }
    }

    // 渲染地圖標記和路徑
    renderMap() {
        if (!this.map || this.records.length === 0) return;

        // 清除舊的標記和路徑
        this.markers.forEach(m => m.setMap(null));
        this.polylines.forEach(p => p.setMap(null));
        this.markers = [];
        this.polylines = [];

        // 起點：台北
        const taipeiMarker = new google.maps.Marker({
            position: { lat: TAIPEI_LAT, lng: TAIPEI_LON },
            map: this.map,
            title: '起點：台北',
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="20" cy="20" r="15" fill="#4CAF50" stroke="white" stroke-width="3"/>
                        <text x="20" y="26" font-size="16" fill="white" text-anchor="middle" font-weight="bold">起</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20)
            }
        });

        const taipeiInfoWindow = new google.maps.InfoWindow({
            content: '<div style="padding: 10px;"><h3 style="margin: 0;">起點：台北</h3><p style="margin: 5px 0 0 0; color: #666;">你的旅程起點</p></div>'
        });

        taipeiMarker.addListener('click', () => {
            taipeiInfoWindow.open(this.map, taipeiMarker);
        });

        let previousPosition = { lat: TAIPEI_LAT, lng: TAIPEI_LON };
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: TAIPEI_LAT, lng: TAIPEI_LON });

        // 為每個記錄創建標記和路徑
        this.records.forEach((record, index) => {
            if (!record.latitude || !record.longitude || 
                record.latitude === 0 || record.longitude === 0) {
                return;
            }

            const position = {
                lat: parseFloat(record.latitude),
                lng: parseFloat(record.longitude)
            };

            // 創建標記
            const marker = new google.maps.Marker({
                position: position,
                map: this.map,
                title: `${record.city_zh || record.city}`,
                label: {
                    text: `${index + 1}`,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#FF6B35',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2
                }
            });

            // 添加資訊視窗
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 10px; min-width: 200px;">
                        <h3 style="margin: 0 0 5px 0; font-size: 16px;">${record.city_zh || record.city}</h3>
                        <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">${record.country_zh || record.country}</p>
                        <p style="margin: 0; font-size: 12px; color: #999;">${this.formatDate(record.wakeTime || record.recordedDateString)}</p>
                        ${record.sleepDuration ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">飛行時長: ${this.formatDuration(record.sleepDuration)}</p>` : ''}
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });

            this.markers.push(marker);
            bounds.extend(position);

            // 繪製飛行路徑
            const flightPath = new google.maps.Polyline({
                path: [previousPosition, position],
                geodesic: true,
                strokeColor: '#FF6B35',
                strokeOpacity: 0.6,
                strokeWeight: 3
            });

            flightPath.setMap(this.map);
            this.polylines.push(flightPath);

            previousPosition = position;
        });

        // 調整地圖視圖以包含所有標記
        if (this.markers.length > 0) {
            this.map.fitBounds(bounds);
        }
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

        modalBody.innerHTML = `
            ${record.imageUrl ? `<div class="modal-image" style="background-image: url('${record.imageUrl}')"></div>` : ''}
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
        if (page === 'map' && this.map) {
            setTimeout(() => this.renderMap(), 100);
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


// Backend API Configuration (100% Live Data)
const BACKEND_API_CONFIG = {
    BASE_URL: 'https://doravaru.onrender.com',
    ENDPOINTS: {
        HEALTH: '/health',
        AUTH_TEST: '/api/auth/test',
        LIVE_DATA: '/api/live-data',
        BATCH_LTP: '/api/batch-ltp',
        ANALYSIS: '/api/analysis',
        SIGNALS: '/api/signals',
        SYMBOLS: '/api/symbols',
        DASHBOARD: '/api/dashboard'
    }
};

class LiveDataAPI {
    constructor() {
        this.backendURL = BACKEND_API_CONFIG.BASE_URL;
        this.isLiveMode = false;
        this.authStatus = 'unknown';
    }

    // Test and initialize live connection
    async initialize() {
        try {
            console.log('🚀 Initializing Live Data Connection...');
            
            const authResult = await this.testAuth();
            if (authResult.success) {
                this.isLiveMode = true;
                this.authStatus = 'authenticated';
                console.log('✅ LIVE MODE ACTIVATED - Angel One Connected!');
            } else {
                this.isLiveMode = false;
                this.authStatus = 'failed';
                console.log('❌ Live mode failed - Check backend logs');
            }
            
            return authResult;
        } catch (error) {
            console.error('🚫 Initialization failed:', error);
            this.isLiveMode = false;
            this.authStatus = 'error';
            return { success: false, error: error.message };
        }
    }

    // Test authentication
    async testAuth() {
        try {
            const response = await fetch(`${this.backendURL}${BACKEND_API_CONFIG.ENDPOINTS.AUTH_TEST}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get REAL LIVE market data
    async getLiveData(symbol, exchange = 'NSE') {
        try {
            console.log(`📊 Fetching LIVE data for ${symbol}...`);
            
            const response = await fetch(
                `${this.backendURL}${BACKEND_API_CONFIG.ENDPOINTS.LIVE_DATA}/${symbol}?exchange=${exchange}`
            );
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ LIVE: ${symbol} = ₹${result.data.ltp} (${result.data.change_percent.toFixed(2)}%)`);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Live data failed for ${symbol}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Get multiple symbols at once
    async getBatchLTP(symbols, exchange = 'NSE') {
        try {
            console.log(`📊 Fetching batch LTP for ${symbols.length} symbols...`);
            
            const symbolsParam = symbols.join(',');
            const response = await fetch(
                `${this.backendURL}${BACKEND_API_CONFIG.ENDPOINTS.BATCH_LTP}?symbols=${symbolsParam}&exchange=${exchange}`
            );
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Batch LTP: ${result.count} symbols updated`);
                Object.entries(result.data).forEach(([symbol, data]) => {
                    console.log(`  ${symbol}: ₹${data.ltp} (${data.change_percent.toFixed(2)}%)`);
                });
            }
            
            return result;
        } catch (error) {
            console.error('❌ Batch LTP failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get technical analysis with live data
    async getAnalysis(symbol) {
        try {
            console.log(`🔍 Getting analysis for ${symbol} with LIVE data...`);
            
            const response = await fetch(`${this.backendURL}${BACKEND_API_CONFIG.ENDPOINTS.ANALYSIS}/${symbol}`);
            const result = await response.json();
            
            if (result.success && result.live_data) {
                console.log(`✅ Analysis: ${symbol} - ${result.trend} trend, ₹${result.live_data.ltp}`);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Analysis failed for ${symbol}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Get trading signals with live data
    async getSignals(symbol) {
        try {
            console.log(`🎯 Getting trading signals for ${symbol}...`);
            
            const response = await fetch(`${this.backendURL}${BACKEND_API_CONFIG.ENDPOINTS.SIGNALS}/${symbol}`);
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Signals: ${symbol} - ${result.signals.length} signals generated`);
                result.signals.forEach(signal => {
                    console.log(`  ${signal.type}: ${signal.reason} (${signal.confidence}% confidence)`);
                });
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Signals failed for ${symbol}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Get dashboard data
    async getDashboard() {
        try {
            console.log('📈 Loading live dashboard...');
            
            const response = await fetch(`${this.backendURL}${BACKEND_API_CONFIG.ENDPOINTS.DASHBOARD}`);
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Dashboard: ${result.total_symbols} symbols loaded (${result.market_status})`);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Dashboard failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Auto-refresh live data
    startAutoRefresh(symbols, interval = 5000) {
        console.log(`🔄 Starting auto-refresh every ${interval/1000}s for:`, symbols);
        
        return setInterval(async () => {
            if (this.isLiveMode) {
                const result = await this.getBatchLTP(symbols);
                if (result.success) {
                    // Emit custom event with live data
                    window.dispatchEvent(new CustomEvent('liveDataUpdate', {
                        detail: { symbols: result.data, timestamp: result.timestamp }
                    }));
                }
            }
        }, interval);
    }

    // Get market status
    getMarketStatus() {
        return {
            isLive: this.isLiveMode,
            authStatus: this.authStatus,
            message: this.isLiveMode ? 'LIVE - Angel One Connected' : 'Offline - Check authentication'
        };
    }
}

// Global instance
window.liveDataAPI = new LiveDataAPI();

// Utility functions
// Utility functions (continued)
window.initializeLiveData = async function() {
    console.log('🚀 Initializing Doravaru Live Data System...');
    const result = await liveDataAPI.initialize();
    
    if (result.success) {
        console.log('✅ Live Data System Ready!');
        console.log('📊 You can now use:');
        console.log('  - liveDataAPI.getLiveData("RELIANCE")');
        console.log('  - liveDataAPI.getBatchLTP(["NIFTY50", "BANKNIFTY"])');
        console.log('  - liveDataAPI.getSignals("TCS")');
        console.log('  - liveDataAPI.getDashboard()');
    } else {
        console.log('⚠️ Live mode unavailable. Check backend authentication.');
    }
    
    return result;
};

window.startLiveMonitoring = function(symbols = ['NIFTY50', 'BANKNIFTY', 'RELIANCE', 'TCS']) {
    console.log('🔄 Starting live monitoring...');
    
    // Auto-refresh every 5 seconds
    const refreshInterval = liveDataAPI.startAutoRefresh(symbols, 5000);
    
    // Listen for live data updates
    window.addEventListener('liveDataUpdate', (event) => {
        const { symbols: data, timestamp } = event.detail;
        console.log(`📊 Live Update [${new Date(timestamp).toLocaleTimeString()}]:`);
        Object.entries(data).forEach(([symbol, info]) => {
            const trend = info.change_percent >= 0 ? '📈' : '📉';
            console.log(`  ${trend} ${symbol}: ₹${info.ltp} (${info.change_percent.toFixed(2)}%)`);
        });
    });
    
    return refreshInterval;
};

window.testLiveConnection = async function() {
    console.log('🔍 Testing live connection...');
    
    // Test authentication
    const auth = await liveDataAPI.testAuth();
    console.log('Auth test:', auth.success ? '✅ PASS' : '❌ FAIL');
    
    // Test live data
    const liveData = await liveDataAPI.getLiveData('RELIANCE');
    console.log('Live data test:', liveData.success ? '✅ PASS' : '❌ FAIL');
    
    // Test batch data
    const batchData = await liveDataAPI.getBatchLTP(['NIFTY50', 'BANKNIFTY']);
    console.log('Batch data test:', batchData.success ? '✅ PASS' : '❌ FAIL');
    
    return { auth, liveData, batchData };
};

window.showMarketStatus = function() {
    const status = liveDataAPI.getMarketStatus();
    console.log('🏢 Market Status:');
    console.log(`  Live Mode: ${status.isLive ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`  Auth Status: ${status.authStatus}`);
    console.log(`  Message: ${status.message}`);
    return status;
};

// Auto-initialize on page load
console.log('✅ Doravaru Live Data API loaded');
console.log('🔧 Run initializeLiveData() to start live mode');
console.log('📊 100% Angel One integration ready');

// Initialize automatically
window.initializeLiveData();
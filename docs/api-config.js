// Backend API Configuration (Fixed URLs)
const BACKEND_API_CONFIG = {
    BASE_URL: 'https://doravaru.onrender.com',
    ENDPOINTS: {
        HEALTH: '/health',  // Changed from /health1
        AUTH_TEST: '/api/auth/test',
        AUTH_DEBUG: '/api/auth/debug',
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
            
            // First check if backend is healthy
            const healthCheck = await this.checkHealth();
            if (!healthCheck.success) {
                console.log('❌ Backend health check failed');
                this.isLiveMode = false;
                this.authStatus = 'backend_down';
                return { success: false, error: 'Backend not available' };
            }
            
            console.log('✅ Backend is healthy, testing authentication...');
            
            const authResult = await this.testAuth();
            if (authResult.success) {
                this.isLiveMode = true;
                this.authStatus = 'authenticated';
                console.log('✅ LIVE MODE ACTIVATED - Angel One Connected!');
            } else {
                this.isLiveMode = false;
                this.authStatus = 'auth_failed';
                console.log('❌ Authentication failed:', authResult.error);
            }
            
            return authResult;
        } catch (error) {
            console.error('🚫 Initialization failed:', error);
            this.isLiveMode = false;
            this.authStatus = 'error';
            return { success: false, error: error.message };
        }
    }

    // Check backend health
    async checkHealth() {
        try {
            console.log('🔍 Checking backend health...');
            const response = await fetch(`${this.backendURL}${BACKEND_API_CONFIG.ENDPOINTS.HEALTH}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend health check passed');
                return { success: true, data: result };
            } else {
                console.log('❌ Backend health check failed:', response.status);
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            console.error('❌ Health check error:', error);
            return { success: false, error: error.message };
        }
    }

    // Test authentication
    async testAuth() {
        try {
            console.log('🔐 Testing Angel One authentication...');
            const response = await fetch(`${this.backendURL}${BACKEND_API_CONFIG.ENDPOINTS.AUTH_TEST}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Authentication successful!');
                if (result.totp_used) {
                    console.log(`📱 TOTP used: ${result.totp_used}`);
                }
            } else {
                console.log('❌ Authentication failed:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Auth test error:', error);
            return { success: false, error: error.message };
        }
    }

    // Debug authentication
    async debugAuth() {
        try {
            console.log('🔍 Running authentication debug...');
            const response = await fetch(`${this.backendURL}${BACKEND_API_CONFIG.ENDPOINTS.AUTH_DEBUG}`);
            const result = await response.json();
            
            console.log('🔧 Debug Results:');
            console.log('Configuration:', result.configuration);
            console.log('TOTP Generation:', result.totp_generation);
            
            return result;
        } catch (error) {
            console.error('❌ Debug error:', error);
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
            } else {
                console.log(`❌ Live data failed for ${symbol}:`, result.error);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Live data error for ${symbol}:`, error);
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
            } else {
                console.log('❌ Batch LTP failed:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Batch LTP error:', error);
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
            } else {
                console.log(`❌ Analysis failed for ${symbol}:`, result.error);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Analysis error for ${symbol}:`, error);
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
            } else {
                console.log(`❌ Signals failed for ${symbol}:`, result.error);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Signals error for ${symbol}:`, error);
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
            } else {
                console.log('❌ Dashboard failed:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Dashboard error:', error);
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
window.initializeLiveData = async function() {
    console.log('🚀 Initializing Doravaru Live Data System...');
    const result = await liveDataAPI.initialize();
    
    if (result.success) {
        console.log('✅ Live Data System Ready!');
        console.log('📊 Available commands:');
        console.log('  - liveDataAPI.getLiveData("RELIANCE")');
        console.log('  - liveDataAPI.getBatchLTP(["NIFTY50", "BANKNIFTY"])');
        console.log('  - liveDataAPI.getSignals("TCS")');
        console.log('  - liveDataAPI.getDashboard()');
        console.log('  - liveDataAPI.debugAuth()');
    } else {
        console.log('⚠️ Live mode unavailable:', result.error);
        console.log('🔧 Try: liveDataAPI.debugAuth() for detailed info');
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

window.testConnection = async function() {
    console.log('🔍 Testing complete connection...');
    
    // Test health
    const health = await liveDataAPI.checkHealth();
    console.log('Health test:', health.success ? '✅ PASS' : '❌ FAIL');
    
    // Test authentication
    const auth = await liveDataAPI.testAuth();
    console.log('Auth test:', auth.success ? '✅ PASS' : '❌ FAIL');
    
    // Test live data
    const liveData = await liveDataAPI.getLiveData('RELIANCE');
    console.log('Live data test:', liveData.success ? '✅ PASS' : '❌ FAIL');
    
    return { health, auth, liveData };
};

window.debugSystem = async function() {
    console.log('🔧 Running complete system debug...');
    
    const debug = await liveDataAPI.debugAuth();
    console.log('Debug results:', debug);
    
    return debug;
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

// Initialize automatically after a short delay
setTimeout(() => {
    window.initializeLiveData();
}, 1000);
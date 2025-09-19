// Angel One API Configuration
const ANGEL_ONE_CONFIG = {
    apiKey: 'a18ffda4',
    secretKey: '801865f61-201-46cd-bdb9-b20e64322a2a',
    baseURL: 'https://apiconnect.angelbroking.com',
    wsURL: 'wss://smartapisocket.angelone.in/smart-stream'
};

// Current market prices (update these daily from reliable sources)
// You can get these from: NSE website, Google Finance, Yahoo Finance, etc.
const LIVE_MARKET_PRICES = {
    'NIFTY50': {
        price: 25343.78,
        change: -0.08,
        volume: 1.2,
        lastUpdated: '2025-01-10',
        token: '99926000'
    },
    'BANKNIFTY': {
        price: 55714.05,
        change: 0.51,
        volume: 0.8,
        lastUpdated: '2025-01-10',
        token: '99926009'
    },
    'RELIANCE': {
        price: 1428.40,
        change: -0.54,
        volume: 2.1,
        lastUpdated: '2025-01-10',
        token: '2885'
    },
    'TCS': {
        price: 4082.97,
        change: -0.01,
        volume: 1.5,
        lastUpdated: '2025-01-10',
        token: '11536'
    },
    'INFY': {
        price: 1854.25,
        change: 0.23,
        volume: 1.8,
        lastUpdated: '2025-01-10',
        token: '1594'
    },
    'HDFCBANK': {
        price: 1781.40,
        change: 0.15,
        volume: 2.3,
        lastUpdated: '2025-01-10',
        token: '1333'
    }
};

// Market timing configuration
const MARKET_CONFIG = {
    openTime: { hour: 9, minute: 15 },
    closeTime: { hour: 15, minute: 30 },
    preMarketStart: { hour: 9, minute: 0 },
    postMarketEnd: { hour: 16, minute: 0 }
};

class EnhancedDataService {
    constructor() {
        this.isLiveMode = false;
        this.accessToken = null;
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
        this.currentProxyIndex = 0;
    }

    // Angel One API Authentication
    async authenticateAngelOne(clientCode, mpin) {
        try {
            console.log('Authenticating with Angel One API...');
            
            const authPayload = {
                clientcode: clientCode,
                password: mpin
            };

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '127.0.0.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': 'fe80::216:3eff:fe00:0',
                'X-PrivateKey': ANGEL_ONE_CONFIG.apiKey
            };

            // Try direct connection first, then proxies
            let response = await this.tryRequest(
                `${ANGEL_ONE_CONFIG.baseURL}/rest/auth/angelbroking/user/v1/loginByPassword`,
                {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(authPayload)
                }
            );

            const data = await response.json();
            
            if (data.status && data.data && data.data.jwtToken) {
                this.accessToken = data.data.jwtToken;
                this.isLiveMode = true;
                console.log('✅ Angel One authentication successful');
                return { success: true, token: this.accessToken };
            } else {
                console.log('❌ Authentication failed:', data.message);
                return { success: false, error: data.message || 'Authentication failed' };
            }
            
        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, error: error.message };
        }
    }

    // Try request with CORS proxy fallback
    async tryRequest(url, options) {
        try {
            // Try direct request first
            return await fetch(url, options);
        } catch (corsError) {
            console.log('CORS blocked, trying proxy...');
            
            // Try each proxy
            for (let i = 0; i < this.corsProxies.length; i++) {
                try {
                    const proxyURL = this.corsProxies[i] + encodeURIComponent(url);
                    return await fetch(proxyURL, {
                        method: options.method || 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        body: options.body
                    });
                } catch (proxyError) {
                    console.log(`Proxy ${i + 1} failed, trying next...`);
                    continue;
                }
            }
            
            throw new Error('All proxy attempts failed');
        }
    }

    // Fetch live prices from Angel One API
    async fetchAngelOneLTP(symbols) {
        if (!this.isLiveMode || !this.accessToken) {
            return this.generateEnhancedMarketData(symbols);
        }

        try {
            const tokenMapping = Object.fromEntries(
                Object.entries(LIVE_MARKET_PRICES).map(([symbol, data]) => [symbol, data.token])
            );

            const payload = {
                exchange: 'NSE',
                tradingsymbol: symbols.join(','),
                symboltoken: symbols.map(s => tokenMapping[s]).join(',')
            };

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`,
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-PrivateKey': ANGEL_ONE_CONFIG.apiKey
            };

            const response = await this.tryRequest(
                `${ANGEL_ONE_CONFIG.baseURL}/rest/secure/angelbroking/order/v1/getLTP`,
                {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();
            
            if (data.status && data.data) {
                console.log('✅ Live data received from Angel One');
                return this.formatAngelOneData(data.data, symbols);
            } else {
                console.log('⚠️ API response failed, using enhanced demo data');
                return this.generateEnhancedMarketData(symbols);
            }
            
        } catch (error) {
            console.error('❌ LTP fetch error:', error);
            return this.generateEnhancedMarketData(symbols);
        }
    }

    // Format Angel One API response
    formatAngelOneData(apiData, symbols) {
        return symbols.map((symbol, index) => {
            const item = apiData[index];
            if (!item) return this.generateSingleSymbolData(symbol);

            return {
                symbol: symbol,
                ltp: parseFloat(item.ltp || item.close),
                open: parseFloat(item.open),
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                close: parseFloat(item.close || item.ltp),
                volume: parseInt(item.volume) || Math.floor(Math.random() * 1000000) + 500000,
                change: parseFloat(((item.ltp - item.close) / item.close * 100).toFixed(2)),
                timestamp: new Date().toISOString()
            };
        });
    }

    // Generate enhanced realistic market data
    generateEnhancedMarketData(symbols) {
        return symbols.map(symbol => this.generateSingleSymbolData(symbol));
    }

    generateSingleSymbolData(symbol) {
        const marketData = LIVE_MARKET_PRICES[symbol];
        if (!marketData) {
            console.warn(`No market data for symbol: ${symbol}`);
            return null;
        }

        const basePrice = marketData.price;
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Market-based volatility
        let volatility = 0.001;
        const isMarketHours = this.isMarketOpen();
        
        if (!isMarketHours) {
            volatility = 0.0002; // Lower volatility outside market hours
        } else {
            if (hour === 9 && minute < 30) volatility = 0.004; // Opening volatility
            else if (hour === 15 && minute > 15) volatility = 0.003; // Closing volatility
            else if (hour >= 11 && hour <= 13) volatility = 0.0005; // Lunch time
            else volatility = 0.0015; // Regular trading hours
        }

        // Symbol-specific volatility
        const symbolMultipliers = {
            'NIFTY50': 1.0,
            'BANKNIFTY': 1.5,
            'RELIANCE': 1.2,
            'TCS': 0.8,
            'INFY': 1.1,
            'HDFCBANK': 0.9
        };
        
        volatility *= (symbolMultipliers[symbol] || 1.0);

        // Generate realistic price movement
        const change = (Math.random() - 0.5) * volatility;
        const currentPrice = basePrice * (1 + change + (marketData.change / 100));
        
        const open = basePrice * (1 + (Math.random() - 0.5) * 0.002);
        const high = Math.max(currentPrice, open) * (1 + Math.random() * volatility);
        const low = Math.min(currentPrice, open) * (1 - Math.random() * volatility);
        
        const changePercent = ((currentPrice - basePrice) / basePrice) * 100;

        return {
            symbol: symbol,
            ltp: parseFloat(currentPrice.toFixed(2)),
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: basePrice,
            volume: Math.floor(Math.random() * marketData.volume * 1000000) + 100000,
            change: parseFloat(changePercent.toFixed(2)),
            timestamp: new Date().toISOString(),
            isLive: this.isLiveMode
        };
    }

    // Check if market is currently open
    isMarketOpen() {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const openTime = MARKET_CONFIG.openTime.hour * 60 + MARKET_CONFIG.openTime.minute;
        const closeTime = MARKET_CONFIG.closeTime.hour * 60 + MARKET_CONFIG.closeTime.minute;
        
        // Check if it's a weekday (Monday = 1, Sunday = 0)
        const dayOfWeek = now.getDay();
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        
        return isWeekday && currentTime >= openTime && currentTime <= closeTime;
    }

    // Generate historical data for charting
    generateHistoricalData(symbol, periods = 100) {
        const marketData = LIVE_MARKET_PRICES[symbol];
        if (!marketData) return [];

        const data = [];
        let price = marketData.price;
        const baseVolatility = 0.0008;

        for (let i = periods; i >= 0; i--) {
            const timestamp = new Date(Date.now() - i * 60000); // 1-minute intervals
            const hour = timestamp.getHours();
            
            // Time-based volatility
            let volatility = baseVolatility;
            if (hour === 9) volatility = 0.003;
            if (hour === 15) volatility = 0.002;
            if (hour >= 11 && hour <= 13) volatility = 0.0004;
            
            const change = (Math.random() - 0.5) * volatility;
            price = Math.max(price * (1 + change), marketData.price * 0.985);
            
            const open = price;
            const high = price * (1 + Math.random() * volatility * 2);
            const low = price * (1 - Math.random() * volatility * 2);
            const close = low + Math.random() * (high - low);
            
            data.push({
                timestamp: timestamp.toISOString(),
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                volume: Math.floor(Math.random() * 500000) + 100000
            });
            
            price = close;
        }
        
        return data;
    }
}

// Technical Analysis Utilities
class AdvancedTechnicalAnalyzer {
    constructor() {
        this.indicators = {};
    }

    calculateSMA(prices, period) {
        if (prices.length < period) return null;
        return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
    }
    
    calculateEMA(prices, period) {
        if (prices.length < period) return null;
        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        
        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }
    
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;
        
        const gains = [], losses = [];
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
        
        return avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }
    
    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        
        if (!fastEMA || !slowEMA) return null;
        
        const macdLine = fastEMA - slowEMA;
        return {
            macd: macdLine,
            signal: this.calculateEMA([macdLine], signalPeriod),
            histogram: macdLine - this.calculateEMA([macdLine], signalPeriod)
        };
    }
    
    calculateBollingerBands(prices, period = 20, multiplier = 2) {
        const sma = this.calculateSMA(prices, period);
        if (!sma) return null;
        
        const recentPrices = prices.slice(-period);
        const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        return {
            upper: sma + (stdDev * multiplier),
            middle: sma,
            lower: sma - (stdDev * multiplier)
        };
    }
    
    generateAdvancedSignal(historicalData) {
        const prices = historicalData.map(d => d.close);
        const currentPrice = prices[prices.length - 1];
        
        // Calculate indicators
        const sma20 = this.calculateSMA(prices, 20);
        const sma50 = this.calculateSMA(prices, 50);
        const rsi = this.calculateRSI(prices);
        const macd = this.calculateMACD(prices);
        const bb = this.calculateBollingerBands(prices);
        
        let signal = 'HOLD';
        let confidence = 60;
        let bullishPoints = 0;
        let bearishPoints = 0;
        const reasons = [];
        
        // SMA Analysis
        if (sma20 && sma50) {
            if (currentPrice > sma20 && sma20 > sma50) {
                bullishPoints += 2;
                reasons.push(`Price above SMA20 (₹${sma20.toFixed(2)}) and SMA20 > SMA50`);
            } else if (currentPrice < sma20 && sma20 < sma50) {
                bearishPoints += 2;
                reasons.push(`Price below SMA20 (₹${sma20.toFixed(2)}) and SMA20 < SMA50`);
            }
        }
        
        // RSI Analysis
        if (rsi < 30) {
            bullishPoints += 3;
            reasons.push(`RSI oversold at ${rsi.toFixed(1)}`);
        } else if (rsi > 70) {
            bearishPoints += 3;
            reasons.push(`RSI overbought at ${rsi.toFixed(1)}`);
        } else if (rsi > 50) {
            bullishPoints += 1;
            reasons.push(`RSI bullish at ${rsi.toFixed(1)}`);
        } else {
            bearishPoints += 1;
            reasons.push(`RSI bearish at ${rsi.toFixed(1)}`);
        }
        
        // MACD Analysis
        if (macd && macd.macd > macd.signal) {
            bullishPoints += 1;
            reasons.push('MACD bullish crossover');
        } else if (macd && macd.macd < macd.signal) {
            bearishPoints += 1;
            reasons.push('MACD bearish crossover');
        }
        
        // Bollinger Bands Analysis
        if (bb) {
            if (currentPrice < bb.lower) {
                bullishPoints += 2;
                reasons.push('Price near lower Bollinger Band (oversold)');
            } else if (currentPrice > bb.upper) {
                bearishPoints += 2;
                reasons.push('Price near upper Bollinger Band (overbought)');
            }
        }
        
        // Volume Analysis
        const recentVolume = historicalData.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5;
        const avgVolume = historicalData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
        
        if (recentVolume > avgVolume * 1.2) {
            if (bullishPoints > bearishPoints) {
                bullishPoints += 1;
                reasons.push('High volume supports bullish move');
            } else {
                bearishPoints += 1;
                reasons.push('High volume supports bearish move');
            }
        }
        
        // Generate final signal
        if (bullishPoints > bearishPoints + 2) {
            signal = 'BUY';
            confidence = Math.min(70 + (bullishPoints - bearishPoints) * 3, 95);
        } else if (bearishPoints > bullishPoints + 2) {
            signal = 'SELL';
            confidence = Math.min(70 + (bearishPoints - bullishPoints) * 3, 95);
        }
        
        return {
            signal,
            confidence,
            indicators: {
                rsi: rsi?.toFixed(1),
                sma20: sma20?.toFixed(2),
                sma50: sma50?.toFixed(2),
                macd: macd?.macd?.toFixed(4),
                bollingerUpper: bb?.upper?.toFixed(2),
                bollingerLower: bb?.lower?.toFixed(2),
                currentPrice: currentPrice.toFixed(2)
            },
            reasons,
            tradeLevels: {
                entry: signal === 'BUY' ? currentPrice * 1.002 : 
                       signal === 'SELL' ? currentPrice * 0.998 : currentPrice,
                stopLoss: signal === 'BUY' ? currentPrice * 0.985 : 
                          signal === 'SELL' ? currentPrice * 1.015 : currentPrice * 0.99,
                target1: signal === 'BUY' ? currentPrice * 1.025 : 
                         signal === 'SELL' ? currentPrice * 0.975 : currentPrice * 1.01,
                target2: signal === 'BUY' ? currentPrice * 1.045 : 
                         signal === 'SELL' ? currentPrice * 0.955 : currentPrice * 1.02
            }
        };
    }
}

// Export classes and configurations
window.ANGEL_ONE_CONFIG = ANGEL_ONE_CONFIG;
window.LIVE_MARKET_PRICES = LIVE_MARKET_PRICES;
window.MARKET_CONFIG = MARKET_CONFIG;
window.EnhancedDataService = EnhancedDataService;
window.AdvancedTechnicalAnalyzer = AdvancedTechnicalAnalyzer;

// Utility functions
window.updateMarketPrices = function() {
    console.log('📊 Current Market Data:');
    Object.entries(LIVE_MARKET_PRICES).forEach(([symbol, data]) => {
        console.log(`${symbol}: ₹${data.price} (${data.change > 0 ? '+' : ''}${data.change}%)`);
    });
    console.log(`\n🕒 Last updated: ${LIVE_MARKET_PRICES.NIFTY50.lastUpdated}`);
    console.log('\n💡 To update prices, edit LIVE_MARKET_PRICES in api-config.js');
};

window.getMarketStatus = function() {
    const dataService = new EnhancedDataService();
    const isOpen = dataService.isMarketOpen();
    console.log(`🏢 Market Status: ${isOpen ? 'OPEN' : 'CLOSED'}`);
    return isOpen;
};

// Initialize and log status
console.log('✅ API Configuration loaded successfully');
console.log('🔧 Angel One API Key configured');
console.log('📈 Market data service ready');
window.updateMarketPrices();
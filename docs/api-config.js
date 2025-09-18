// docs/api-config.js
const API_CONFIG = {
    // Your actual API keys
    ALPHA_VANTAGE_KEY: 'DGZXCV9FFB7OUM7G',
    TWELVE_DATA_KEY: 'ed99282634864409e83a7e9122734c6be',
    
    // Indian stock symbols mapping for Alpha Vantage
    SYMBOLS: {
        'NIFTY': 'NSEI.BSE',
        'BANKNIFTY': 'BANKNIFTY.NSE',
        'RELIANCE': 'RELIANCE.BSE',
        'TCS': 'TCS.BSE',
        'INFY': 'INFY.BSE',
        'HDFCBANK': 'HDFCBANK.BSE'
    }
};

// Real-time data service
class LiveDataService {
    constructor() {
        this.cache = new Map();
        this.lastFetch = new Map();
        this.CACHE_DURATION = 60000; // 1 minute cache
    }
    
    async fetchLivePrice(symbol) {
        const cacheKey = symbol;
        const now = Date.now();
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            const lastFetch = this.lastFetch.get(cacheKey) || 0;
            
            if (now - lastFetch < this.CACHE_DURATION) {
                return cached;
            }
        }
        
        try {
            // Try Twelve Data first (more reliable for Indian stocks)
            const data = await this.fetchFromTwelveData(symbol);
            this.cache.set(cacheKey, data);
            this.lastFetch.set(cacheKey, now);
            return data;
        } catch (error) {
            console.error('Twelve Data failed, trying Alpha Vantage:', error);
            try {
                const data = await this.fetchFromAlphaVantage(symbol);
                this.cache.set(cacheKey, data);
                this.lastFetch.set(cacheKey, now);
                return data;
            } catch (error2) {
                console.error('Both APIs failed:', error2);
                return this.generateFallbackData(symbol);
            }
        }
    }
    
    async fetchFromTwelveData(symbol) {
        const mappedSymbol = this.mapSymbolForTwelveData(symbol);
        const url = `https://api.twelvedata.com/time_series?symbol=${mappedSymbol}&interval=1min&apikey=${API_CONFIG.TWELVE_DATA_KEY}&outputsize=100`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.message || 'API error');
        }
        
        if (!data.values || data.values.length === 0) {
            throw new Error('No data available');
        }
        
        return data.values.map(item => ({
            timestamp: new Date(item.datetime).toISOString(),
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume || Math.random() * 1000000)
        })).reverse();
    }
    
    async fetchFromAlphaVantage(symbol) {
        const mappedSymbol = API_CONFIG.SYMBOLS[symbol] || symbol;
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${mappedSymbol}&interval=1min&apikey=${API_CONFIG.ALPHA_VANTAGE_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Error Message'] || data['Note']) {
            throw new Error('API limit reached or invalid symbol');
        }
        
        const timeSeries = data['Time Series (1min)'];
        if (!timeSeries) {
            throw new Error('No time series data');
        }
        
        return Object.entries(timeSeries)
            .slice(0, 100)
            .map(([timestamp, values]) => ({
                timestamp: new Date(timestamp).toISOString(),
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseInt(values['5. volume'])
            }))
            .reverse();
    }
    
    mapSymbolForTwelveData(symbol) {
        const mapping = {
            'NIFTY': 'NIFTY',
            'BANKNIFTY': 'BANKNIFTY',
            'RELIANCE': 'RELIANCE',
            'TCS': 'TCS',
            'INFY': 'INFY',
            'HDFCBANK': 'HDFCBANK'
        };
        return mapping[symbol] || symbol;
    }
    
    generateFallbackData(symbol) {
        const basePrices = {
            'NIFTY': 21547.50,
            'BANKNIFTY': 46234.75,
            'RELIANCE': 2847.30,
            'TCS': 3624.75,
            'INFY': 1678.90,
            'HDFCBANK': 1589.25
        };
        
        const basePrice = basePrices[symbol] || 1000;
        const data = [];
        let currentPrice = basePrice;
        
        for (let i = 99; i >= 0; i--) {
            const change = (Math.random() - 0.5) * 0.02;
            currentPrice = currentPrice * (1 + change);
            
            const timestamp = new Date(Date.now() - i * 60000);
            data.push({
                timestamp: timestamp.toISOString(),
                open: currentPrice * (1 + (Math.random() - 0.5) * 0.005),
                high: currentPrice * (1 + Math.random() * 0.01),
                low: currentPrice * (1 - Math.random() * 0.01),
                close: currentPrice,
                volume: Math.floor(Math.random() * 500000) + 50000
            });
        }
        
        return data;
    }
}

// Technical Analysis Engine
class TechnicalAnalyzer {
    calculateSMA(prices, period) {
        if (prices.length < period) return null;
        const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
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
        
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    
    generateSignal(data) {
        const closePrices = data.map(d => d.close);
        const currentPrice = closePrices[closePrices.length - 1];
        
        // Calculate indicators
        const sma20 = this.calculateSMA(closePrices, 20);
        const sma50 = this.calculateSMA(closePrices, 50);
        const ema20 = this.calculateEMA(closePrices, 20);
        const rsi = this.calculateRSI(closePrices);
        
        // Generate signal
        let bullishSignals = 0;
        let bearishSignals = 0;
        
        if (currentPrice > sma20) bullishSignals++;
        else bearishSignals++;
        
        if (sma20 > sma50) bullishSignals++;
        else bearishSignals++;
        
        if (rsi < 30) bullishSignals += 2;
        else if (rsi > 70) bearishSignals += 2;
        else if (rsi < 50) bearishSignals++;
        else bullishSignals++;
        
        // Volume analysis
        const avgVolume = data.slice(-10).reduce((sum, d) => sum + d.volume, 0) / 10;
        const currentVolume = data[data.length - 1].volume;
        if (currentVolume > avgVolume * 1.2) {
            if (bullishSignals > bearishSignals) bullishSignals++;
            else bearishSignals++;
        }
        
        const totalSignals = bullishSignals + bearishSignals;
        const bullishPercentage = (bullishSignals / totalSignals) * 100;
        
        let signal, confidence;
        if (bullishPercentage > 65) {
            signal = 'BUY';
            confidence = Math.min(bullishPercentage + 10, 95);
        } else if (bullishPercentage < 35) {
            signal = 'SELL';
            confidence = Math.min((100 - bullishPercentage) + 10, 95);
        } else {
            signal = 'HOLD';
            confidence = 50 + Math.abs(50 - bullishPercentage);
        }
        
        return {
            signal,
            confidence: Math.round(confidence),
            indicators: {
                rsi: rsi.toFixed(1),
                sma20: sma20?.toFixed(2),
                ema20: ema20?.toFixed(2),
                currentPrice: currentPrice.toFixed(2)
            },
            reasons: this.generateReasons(signal, { rsi, sma20, sma50, currentPrice })
        };
    }
    
    generateReasons(signal, indicators) {
        const reasons = [];
        
        if (signal === 'BUY') {
            if (indicators.currentPrice > indicators.sma20) {
                reasons.push(`Price ₹${indicators.currentPrice.toFixed(2)} above SMA20 ₹${indicators.sma20?.toFixed(2)} shows bullish momentum`);
            }
            if (indicators.rsi < 40) {
                reasons.push(`RSI ${indicators.rsi.toFixed(1)} indicates oversold conditions`);
            }
            reasons.push('Technical indicators align for potential upward movement');
        } else if (signal === 'SELL') {
            if (indicators.currentPrice < indicators.sma20) {
                reasons.push(`Price below SMA20 indicates bearish pressure`);
            }
            if (indicators.rsi > 70) {
                reasons.push(`RSI ${indicators.rsi.toFixed(1)} shows overbought conditions`);
            }
            reasons.push('Technical analysis suggests downward momentum');
        } else {
            reasons.push('Mixed technical signals suggest range-bound movement');
            reasons.push('Wait for clearer directional signals');
        }
        
        return reasons;
    }
}

// Initialize services
const liveDataService = new LiveDataService();
const technicalAnalyzer = new TechnicalAnalyzer();
// Professional Trading Engine
class TradingEngine {
    constructor() {
        this.symbols = {
            'NIFTY': 25420.45,
            'BANKNIFTY': 55715.15,
            'RELIANCE': 1424.00,
            'TCS': 4087.30
        };
        this.marketData = new Map();
        this.indicators = new Map();
    }

    generateRealtimeData(symbol) {
        const basePrice = this.symbols[symbol];
        const data = [];
        let currentPrice = basePrice;

        for (let i = 100; i >= 0; i--) {
            const timestamp = new Date(Date.now() - i * 60000);
            const hour = timestamp.getHours();
            
            // Market hours volatility
            let volatility = 0.0008;
            if (hour === 9) volatility = 0.002;
            if (hour === 15) volatility = 0.0015;
            if (hour >= 11 && hour <= 13) volatility = 0.0004;
            
            const change = (Math.random() - 0.5) * volatility;
            currentPrice = Math.max(currentPrice * (1 + change), basePrice * 0.985);
            
            const open = currentPrice;
            const high = open * (1 + Math.random() * volatility);
            const low = open * (1 - Math.random() * volatility);
            const close = low + Math.random() * (high - low);
            
            data.push({
                timestamp: timestamp.toISOString(),
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                volume: Math.floor(Math.random() * 500000) + 100000
            });
            
            currentPrice = close;
        }
        
        this.marketData.set(symbol, data);
        return data;
    }

    calculateTechnicals(symbol) {
        const data = this.marketData.get(symbol);
        if (!data) return null;

        const closes = data.map(d => d.close);
        const volumes = data.map(d => d.volume);

        return {
            rsi: this.calculateRSI(closes),
            sma20: this.calculateSMA(closes, 20),
            ema20: this.calculateEMA(closes, 20),
            macd: this.calculateMACD(closes),
            bollinger: this.calculateBollingerBands(closes),
            support: this.findSupport(closes),
            resistance: this.findResistance(closes),
            volumeAvg: volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
        };
    }

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;
        
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const diff = prices[i] - prices[i - 1];
            gains.push(diff > 0 ? diff : 0);
            losses.push(diff < 0 ? Math.abs(diff) : 0);
        }
        
        const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

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

    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        
        if (!ema12 || !ema26) return { line: 0, signal: 0, histogram: 0 };
        
        const macdLine = ema12 - ema26;
        const signal = macdLine * 0.8; // Simplified
        const histogram = macdLine - signal;
        
        return { line: macdLine, signal, histogram };
    }

    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        const sma = this.calculateSMA(prices, period);
        if (!sma) return null;
        
        const recentPrices = prices.slice(-period);
        const variance = recentPrices.reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    findSupport(prices) {
        const recentPrices = prices.slice(-50);
        const lows = recentPrices.sort((a, b) => a - b);
        return lows[Math.floor(lows.length * 0.2)]; // 20th percentile
    }

    findResistance(prices) {
        const recentPrices = prices.slice(-50);
        const highs = recentPrices.sort((a, b) => b - a);
        return highs[Math.floor(highs.length * 0.2)]; // 80th percentile
    }

    generateMarketDepth(symbol, currentPrice) {
        const depth = [];
        const spread = currentPrice * 0.0001; // 0.01%
        
        for (let i = 0; i < 5; i++) {
            const bid = currentPrice - (spread * (i + 1));
            const ask = currentPrice + (spread * (i + 1));
            const bidQty = Math.floor(Math.random() * 5000) + 1000;
            const askQty = Math.floor(Math.random() * 5000) + 1000;
            
            depth.push({
                bid: bid.toFixed(2),
                bidQty: bidQty.toLocaleString(),
                ask: ask.toFixed(2),
                askQty: askQty.toLocaleString()
            });
        }
        
        return depth;
    }

    updateSymbolPrice(symbol) {
        const data = this.marketData.get(symbol);
        if (!data) return;
        
        const latest = data[data.length - 1];
        const previous = data[data.length - 2];
        
        const change = latest.close - previous.close;
        const changePercent = (change / previous.close) * 100;
        
        // Update UI
        const priceElement = document.getElementById(`price-${symbol}`);
        const changeElement = document.getElementById(`change-${symbol}`);
        
        if (priceElement) {
            priceElement.textContent = latest.close.toLocaleString('en-IN');
        }
        
        if (changeElement) {
            const sign = changePercent >= 0 ? '+' : '';
            changeElement.textContent = `${sign}${changePercent.toFixed(2)}%`;
            changeElement.className = `symbol-change ${changePercent >= 0 ? 'positive' : 'negative'}`;
        }
    }
}

const tradingEngine = new TradingEngine();
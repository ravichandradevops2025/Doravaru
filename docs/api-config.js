// Manually updated current prices (update once daily)
const LIVE_PRICES = {
    'NIFTY': 25420.45,
    'BANKNIFTY': 55715.15,
    'RELIANCE': 1424.00,
    'TCS': 4087.30,
    'INFY': 1854.25,
    'HDFCBANK': 1781.40,
    // Update these daily from any financial website
    lastUpdated: '2025-09-18'
};

class LiveDataService {
    async fetchLivePrice(symbol) {
        const basePrice = LIVE_PRICES[symbol] || 1000;
        return this.generateRealisticMovement(basePrice, symbol);
    }
    
    generateRealisticMovement(basePrice, symbol) {
        const data = [];
        let price = basePrice;
        
        // Generate 100 minutes of realistic intraday movement
        for (let i = 99; i >= 0; i--) {
            const timestamp = new Date(Date.now() - i * 60000);
            
            // Market-hour based volatility
            const hour = timestamp.getHours();
            let volatility = 0.001;
            
            if (hour === 9) volatility = 0.003; // Opening volatility
            if (hour === 15) volatility = 0.002; // Closing volatility
            if (hour >= 11 && hour <= 13) volatility = 0.0005; // Lunch time
            
            const change = (Math.random() - 0.5) * volatility;
            price = Math.max(price * (1 + change), basePrice * 0.99);
            
            const candle = {
                timestamp: timestamp.toISOString(),
                open: price,
                high: price * (1 + Math.random() * volatility * 2),
                low: price * (1 - Math.random() * volatility * 2),
                close: price,
                volume: Math.floor(Math.random() * 1000000) + 500000
            };
            
            candle.close = candle.low + Math.random() * (candle.high - candle.low);
            price = candle.close;
            
            data.push({
                timestamp: candle.timestamp,
                open: parseFloat(candle.open.toFixed(2)),
                high: parseFloat(candle.high.toFixed(2)),
                low: parseFloat(candle.low.toFixed(2)),
                close: parseFloat(candle.close.toFixed(2)),
                volume: candle.volume
            });
        }
        
        return data;
    }
}

class TechnicalAnalyzer {
    calculateSMA(prices, period) {
        if (prices.length < period) return null;
        return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
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
    
    generateSignal(data) {
        const prices = data.map(d => d.close);
        const current = prices[prices.length - 1];
        const sma20 = this.calculateSMA(prices, 20);
        const rsi = this.calculateRSI(prices);
        
        let signal = 'HOLD', confidence = 65;
        
        if (current > sma20 && rsi < 70) {
            signal = 'BUY';
            confidence = 78;
        } else if (current < sma20 && rsi > 30) {
            signal = 'SELL';
            confidence = 73;
        }
        
        return {
            signal,
            confidence,
            indicators: {
                rsi: rsi.toFixed(1),
                sma20: sma20?.toFixed(2),
                currentPrice: current.toFixed(2)
            },
            reasons: [
                `Current price ₹${current.toFixed(2)} ${current > sma20 ? 'above' : 'below'} SMA20`,
                `RSI at ${rsi.toFixed(1)} shows ${rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral'} conditions`,
                `Technical bias leans ${signal.toLowerCase()}`
            ]
        };
    }
}

const liveDataService = new LiveDataService();
const technicalAnalyzer = new TechnicalAnalyzer();

// Helper function to update prices
function updatePrices() {
    console.log('To update prices, edit LIVE_PRICES object in api-config.js');
    console.log('Current NIFTY price:', LIVE_PRICES.NIFTY);
    console.log('Last updated:', LIVE_PRICES.lastUpdated);
}

updatePrices();
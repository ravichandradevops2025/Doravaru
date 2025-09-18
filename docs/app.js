// Main Application Controller
class TradingApp {
    constructor() {
        this.tradingEngine = new TradingEngine();
        this.signalAnalyzer = new SignalAnalyzer(this.tradingEngine);
        this.chartRenderer = new ChartRenderer('tradingChart');
        this.currentSymbol = 'NIFTY';
        this.updateInterval = null;
        
        this.init();
    }

    async init() {
        // Hide loading overlay
        setTimeout(() => {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }, 2000);

        // Initialize data for all symbols
        Object.keys(this.tradingEngine.symbols).forEach(symbol => {
            this.tradingEngine.generateRealtimeData(symbol);
        });

        // Setup event listeners
        this.setupEventListeners();
        
        // Update initial display
        this.updateDisplay();
        
        // Start real-time updates
        this.startRealTimeUpdates();
        
        // Update market time
        this.updateMarketTime();
        setInterval(() => this.updateMarketTime(), 1000);
    }

    setupEventListeners() {
        // Symbol selection
        document.querySelectorAll('.symbol-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const symbol = card.dataset.symbol;
                this.selectSymbol(symbol);
            });
        });

        // Signal generation
        document.getElementById('generateSignal').addEventListener('click', () => {
            this.generateSignal();
        });

        // Time frame selection
        document.querySelectorAll('.time-frame').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-frame').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateChart();
            });
        });
    }

    selectSymbol(symbol) {
        this.currentSymbol = symbol;
        
        // Update active state
        document.querySelectorAll('.symbol-card').forEach(card => {
            card.classList.remove('active');
            if (card.dataset.symbol === symbol) {
                card.classList.add('active');
            }
        });
        
        // Update display
        this.updateDisplay();
    }

    updateDisplay() {
        this.updateChart();
        this.updatePriceDisplay();
        this.updateTechnicalIndicators();
        this.updateMarketDepth();
    }

    updateChart() {
        const data = this.tradingEngine.marketData.get(this.currentSymbol);
        if (data) {
            this.chartRenderer.setData(data);
        }
    }

    updatePriceDisplay() {
        const data = this.tradingEngine.marketData.get(this.currentSymbol);
        if (!data || data.length === 0) return;

        const current = data[data.length - 1];
        const previous = data[data.length - 2];
        
        const change = current.close - previous.close;
        const changePercent = (change / previous.close) * 100;
        
        // Update chart title
        document.getElementById('chart-title').textContent = `${this.currentSymbol} - Live Chart`;
        
        // Update current price
        document.getElementById('currentPrice').textContent = current.close.toLocaleString();
        
        // Update price change
        const priceChangeEl = document.getElementById('priceChange');
        const sign = change >= 0 ? '+' : '';
        priceChangeEl.textContent = `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
        priceChangeEl.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        
        // Update volume
        document.getElementById('volume').textContent = (current.volume / 1000000).toFixed(1) + 'M';
    }

    updateTechnicalIndicators() {
        const technicals = this.tradingEngine.calculateTechnicals(this.currentSymbol);
        if (!technicals) return;

        // Update RSI
        const rsiEl = document.getElementById('rsi');
        const rsiValue = technicals.rsi;
        rsiEl.textContent = rsiValue.toFixed(1);
        rsiEl.className = rsiValue > 70 ? 'bearish' : rsiValue < 30 ? 'bullish' : 'neutral';

        // Update MACD
        const macdEl = document.getElementById('macd');
        const isBullish = technicals.macd.line > technicals.macd.signal;
        macdEl.textContent = isBullish ? 'Bullish' : 'Bearish';
        macdEl.className = isBullish ? 'bullish' : 'bearish';

        // Update SMA20
        document.getElementById('sma20').textContent = technicals.sma20.toFixed(2);

        // Update Support/Resistance
        document.getElementById('support').textContent = technicals.support.toFixed(2);
        document.getElementById('resistance').textContent = technicals.resistance.toFixed(2);
    }

    updateMarketDepth() {
        const data = this.tradingEngine.marketData.get(this.currentSymbol);
        if (!data || data.length === 0) return;

        const currentPrice = data[data.length - 1].close;
        const depth = this.tradingEngine.generateMarketDepth(this.currentSymbol, currentPrice);
        
        const depthContainer = document.getElementById('marketDepth');
        depthContainer.innerHTML = depth.map(level => `
            <div class="depth-row">
                <span style="color: #00ff88">${level.bidQty}</span>
                <span style="color: #00ff88">${level.bid}</span>
                <span style="color: #ff4757">${level.ask}</span>
                <span style="color: #ff4757">${level.askQty}</span>
            </div>
        `).join('');
    }

    generateSignal() {
        const btn = document.getElementById('generateSignal');
        const originalText = btn.textContent;
        
        btn.textContent = 'Analyzing...';
        btn.disabled = true;
        
        setTimeout(() => {
            const signal = this.signalAnalyzer.generateProfessionalSignal(this.currentSymbol);
            
            if (signal.error) {
                document.getElementById('signalResult').innerHTML = `
                    <div class="error-message">
                        <p>${signal.error}</p>
                    </div>
                `;
            } else {
                document.getElementById('signalResult').innerHTML = 
                    this.signalAnalyzer.formatSignalForDisplay(signal);
            }
            
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    }

    startRealTimeUpdates() {
        this.updateInterval = setInterval(() => {
            // Generate new data point for each symbol
            Object.keys(this.tradingEngine.symbols).forEach(symbol => {
                const data = this.tradingEngine.marketData.get(symbol);
                if (data && data.length > 0) {
                    const lastCandle = data[data.length - 1];
                    const newPrice = this.generateNextPrice(lastCandle.close, symbol);
                    
                    const newCandle = {
                        timestamp: new Date().toISOString(),
                        open: newPrice * (1 + (Math.random() - 0.5) * 0.001),
                        high: newPrice * (1 + Math.random() * 0.002),
                        low: newPrice * (1 - Math.random() * 0.002),
                        close: newPrice,
                        volume: Math.floor(Math.random() * 100000) + 50000
                    };
                    
                    data.push(newCandle);
                    if (data.length > 200) data.shift(); // Keep last 200 candles
                    
                    // Update symbol prices in watchlist
                    this.tradingEngine.updateSymbolPrice(symbol);
                }
            });
            
            // Update current symbol display
            if (this.currentSymbol) {
                this.updateDisplay();
            }
        }, 5000); // Update every 5 seconds
    }

    generateNextPrice(currentPrice, symbol) {
        const hour = new Date().getHours();
        let volatility = 0.0005;
        
        // Market hours volatility
        if (hour >= 9 && hour < 10) volatility = 0.002;
        else if (hour >= 15 && hour < 16) volatility = 0.0015;
        else if (hour >= 11 && hour <= 13) volatility = 0.0003;
        
        const change = (Math.random() - 0.5) * volatility;
        return Math.max(currentPrice * (1 + change), 
                       this.tradingEngine.symbols[symbol] * 0.98);
    }

    updateMarketTime() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const isMarketOpen = (hour >= 9 && hour < 15) || (hour === 15 && minute < 30);
        
        const timeStr = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        document.getElementById('market-time').textContent = 
            `NSE: ${isMarketOpen ? 'OPEN' : 'CLOSED'} | ${timeStr}`;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.tradingApp = new TradingApp();
});

// Add professional signal styles
const signalStyles = `
<style>
.professional-signal {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 20px;
    margin-top: 15px;
    border: 1px solid var(--border-color);
}

.signal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.signal-badge {
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.confidence-score {
    text-align: right;
}

.confidence-label {
    display: block;
    font-size: 11px;
    color: var(--text-secondary);
    margin-bottom: 2px;
}

.confidence-value {
    font-size: 18px;
    font-weight: 700;
}

.signal-metrics {
    margin-bottom: 20px;
}

.metric-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 12px;
}

.metric {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: var(--primary-bg);
    border-radius: 6px;
}

.metric label {
    font-size: 12px;
    color: var(--text-secondary);
}

.stop-loss { color: var(--accent-red); }
.target { color: var(--accent-green); }
.rr-ratio { color: var(--accent-blue); }

.technical-summary h4 {
    margin-bottom: 10px;
    font-size: 14px;
}

.tech-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 12px;
}

.reasoning-section h4 {
    margin-bottom: 10px;
    font-size: 14px;
}

.reasoning-list {
    margin-left: 15px;
    font-size: 12px;
    color: var(--text-secondary);
}

.reasoning-list li {
    margin-bottom: 5px;
}

.risk-disclaimer {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 10px;
}

.risk-badge {
    font-size: 10px;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
}

.risk-badge.low { background: rgba(0, 255, 136, 0.2); color: var(--accent-green); }
.risk-badge.medium { background: rgba(255, 215, 0, 0.2); color: #ffd700; }
.risk-badge.high { background: rgba(255, 71, 87, 0.2); color: var(--accent-red); }

.risk-disclaimer p {
    font-size: 11px;
    color: var(--text-secondary);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', signalStyles);
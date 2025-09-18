class SignalAnalyzer {
    constructor(tradingEngine) {
        this.engine = tradingEngine;
    }

    generateProfessionalSignal(symbol) {
        const data = this.engine.marketData.get(symbol);
        const technicals = this.engine.calculateTechnicals(symbol);
        
        if (!data || !technicals) {
            return { error: 'Insufficient data for analysis' };
        }

        const currentPrice = data[data.length - 1].close;
        const analysis = this.performMultiFactorAnalysis(technicals, currentPrice);
        
        return {
            symbol: symbol,
            timestamp: new Date().toISOString(),
            currentPrice: currentPrice,
            signal: analysis.signal,
            confidence: analysis.confidence,
            timeframe: '1H',
            entry: analysis.entry,
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: analysis.riskReward,
            technicals: {
                rsi: technicals.rsi.toFixed(1),
                macd: technicals.macd.line > 0 ? 'Bullish' : 'Bearish',
                sma20: technicals.sma20.toFixed(2),
                support: technicals.support.toFixed(2),
                resistance: technicals.resistance.toFixed(2)
            },
            reasoning: analysis.reasoning,
            riskLevel: analysis.riskLevel
        };
    }

    performMultiFactorAnalysis(technicals, currentPrice) {
        let bullishScore = 0;
        let bearishScore = 0;
        let reasoning = [];

        // RSI Analysis
        if (technicals.rsi < 30) {
            bullishScore += 3;
            reasoning.push('RSI oversold - strong reversal signal');
        } else if (technicals.rsi > 70) {
            bearishScore += 3;
            reasoning.push('RSI overbought - potential correction');
        } else if (technicals.rsi > 50) {
            bullishScore += 1;
        } else {
            bearishScore += 1;
        }

        // Price vs Moving Average
        if (currentPrice > technicals.sma20) {
            bullishScore += 2;
            reasoning.push('Price above SMA20 - bullish trend');
        } else {
            bearishScore += 2;
            reasoning.push('Price below SMA20 - bearish pressure');
        }

        // MACD Analysis
        if (technicals.macd.line > technicals.macd.signal) {
            bullishScore += 2;
            reasoning.push('MACD bullish crossover');
        } else {
            bearishScore += 2;
            reasoning.push('MACD bearish momentum');
        }

        // Support/Resistance
        const distanceToSupport = (currentPrice - technicals.support) / currentPrice;
        const distanceToResistance = (technicals.resistance - currentPrice) / currentPrice;

        if (distanceToSupport < 0.01) {
            bullishScore += 2;
            reasoning.push('Near support level - bounce expected');
        }

        if (distanceToResistance < 0.01) {
            bearishScore += 2;
            reasoning.push('Near resistance - pullback likely');
        }

        // Generate final signal
        const totalScore = bullishScore + bearishScore;
        const bullishPercentage = (bullishScore / totalScore) * 100;

        let signal, confidence, entry, stopLoss, targets, riskLevel;

        if (bullishPercentage > 70) {
            signal = 'BUY';
            confidence = Math.min(bullishPercentage, 95);
            entry = currentPrice * 1.002;
            stopLoss = Math.max(currentPrice * 0.985, technicals.support * 0.995);
            targets = [
                currentPrice * 1.02,
                currentPrice * 1.035,
                Math.min(currentPrice * 1.05, technicals.resistance * 0.995)
            ];
            riskLevel = 'MEDIUM';
        } else if (bullishPercentage < 30) {
            signal = 'SELL';
            confidence = Math.min(100 - bullishPercentage, 95);
            entry = currentPrice * 0.998;
            stopLoss = Math.min(currentPrice * 1.015, technicals.resistance * 1.005);
            targets = [
                currentPrice * 0.98,
                currentPrice * 0.965,
                Math.max(currentPrice * 0.95, technicals.support * 1.005)
            ];
            riskLevel = 'MEDIUM';
        } else {
            signal = 'HOLD';
            confidence = 50 + Math.abs(50 - bullishPercentage);
            entry = currentPrice;
            stopLoss = currentPrice * 0.985;
            targets = [currentPrice * 1.015];
            riskLevel = 'LOW';
            reasoning.push('Mixed signals - await clearer direction');
        }

        const riskReward = Math.abs(targets[0] - entry) / Math.abs(entry - stopLoss);

        return {
            signal,
            confidence: Math.round(confidence),
            entry: parseFloat(entry.toFixed(2)),
            stopLoss: parseFloat(stopLoss.toFixed(2)),
            targets: targets.map(t => parseFloat(t.toFixed(2))),
            riskReward: parseFloat(riskReward.toFixed(1)),
            reasoning,
            riskLevel
        };
    }

    formatSignalForDisplay(signalData) {
        const signalColor = {
            'BUY': '#00ff88',
            'SELL': '#ff4757',
            'HOLD': '#ffd700'
        }[signalData.signal];

        return `
            <div class="professional-signal">
                <div class="signal-header">
                    <div class="signal-badge" style="background: ${signalColor}20; color: ${signalColor}; border: 1px solid ${signalColor};">
                        ${signalData.signal} SIGNAL
                    </div>
                    <div class="confidence-score">
                        <span class="confidence-label">Confidence</span>
                        <span class="confidence-value" style="color: ${signalColor};">${signalData.confidence}%</span>
                    </div>
                </div>
                
                <div class="signal-metrics">
                    <div class="metric-row">
                        <div class="metric">
                            <label>Entry Price</label>
                            <span>₹${signalData.entry.toLocaleString()}</span>
                        </div>
                        <div class="metric">
                            <label>Stop Loss</label>
                            <span class="stop-loss">₹${signalData.stopLoss.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="metric-row">
                        <div class="metric">
                            <label>Target 1</label>
                            <span class="target">₹${signalData.targets[0].toLocaleString()}</span>
                        </div>
                        <div class="metric">
                            <label>Risk:Reward</label>
                            <span class="rr-ratio">1:${signalData.riskReward}</span>
                        </div>
                    </div>
                </div>

                <div class="technical-summary">
                    <h4>Technical Overview</h4>
                    <div class="tech-grid">
                        <div>RSI: <span>${signalData.technicals.rsi}</span></div>
                        <div>MACD: <span class="${signalData.technicals.macd.toLowerCase()}">${signalData.technicals.macd}</span></div>
                        <div>Support: <span>₹${parseFloat(signalData.technicals.support).toLocaleString()}</span></div>
                        <div>Resistance: <span>₹${parseFloat(signalData.technicals.resistance).toLocaleString()}</span></div>
                    </div>
                </div>

                <div class="reasoning-section">
                    <h4>Analysis Reasoning</h4>
                    <ul class="reasoning-list">
                        ${signalData.reasoning.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>

                <div class="risk-disclaimer">
                    <span class="risk-badge ${signalData.riskLevel.toLowerCase()}">${signalData.riskLevel} RISK</span>
                    <p>This analysis is for educational purposes. Please conduct your own research before trading.</p>
                </div>
            </div>
        `;
    }
}
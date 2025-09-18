class AdvancedOptionsAnalyzer {
    constructor() {
        this.optionsChain = new Map();
        this.greeksCalculator = new GreeksCalculator();
    }

    generateOptionsChain(symbol, spotPrice) {
        const expiries = this.getNextExpiries();
        const chain = {};

        expiries.forEach(expiry => {
            chain[expiry] = this.generateStrikesForExpiry(symbol, spotPrice, expiry);
        });

        this.optionsChain.set(symbol, chain);
        return chain;
    }

    getNextExpiries() {
        const now = new Date();
        const expiries = [];
        
        // Weekly expiry (Thursday)
        const thisWeek = new Date(now);
        const daysToThursday = (4 - now.getDay() + 7) % 7;
        thisWeek.setDate(now.getDate() + daysToThursday);
        expiries.push(thisWeek.toISOString().split('T')[0]);
        
        // Next week
        const nextWeek = new Date(thisWeek);
        nextWeek.setDate(thisWeek.getDate() + 7);
        expiries.push(nextWeek.toISOString().split('T')[0]);
        
        // Monthly expiry
        const monthlyExpiry = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        if (monthlyExpiry > nextWeek) {
            expiries.push(monthlyExpiry.toISOString().split('T')[0]);
        }
        
        return expiries;
    }

    generateStrikesForExpiry(symbol, spotPrice, expiry) {
        const strikes = {};
        const daysToExpiry = this.getDaysToExpiry(expiry);
        
        // Generate strikes around spot price
        for (let i = -10; i <= 10; i++) {
            const strike = Math.round((spotPrice + (spotPrice * 0.01 * i)) / 50) * 50;
            
            const callData = this.generateOptionData('CALL', strike, spotPrice, daysToExpiry);
            const putData = this.generateOptionData('PUT', strike, spotPrice, daysToExpiry);
            
            strikes[strike] = {
                call: callData,
                put: putData
            };
        }
        
        return strikes;
    }

    generateOptionData(type, strike, spot, daysToExpiry) {
        const timeToExpiry = daysToExpiry / 365;
        const riskFreeRate = 0.06;
        const impliedVolatility = 0.15 + (Math.random() * 0.1); // 15-25% IV
        
        const greeks = this.greeksCalculator.calculate(
            spot, strike, timeToExpiry, riskFreeRate, impliedVolatility, type
        );
        
        // Generate realistic option prices
        const theoreticalPrice = greeks.price;
        const bid = theoreticalPrice * (0.98 - Math.random() * 0.02);
        const ask = theoreticalPrice * (1.02 + Math.random() * 0.02);
        
        const openInterest = Math.floor(Math.random() * 50000) + 1000;
        const volume = Math.floor(openInterest * 0.1 * Math.random());
        
        return {
            bid: parseFloat(bid.toFixed(2)),
            ask: parseFloat(ask.toFixed(2)),
            ltp: parseFloat(((bid + ask) / 2).toFixed(2)),
            volume: volume,
            openInterest: openInterest,
            impliedVolatility: parseFloat((impliedVolatility * 100).toFixed(1)),
            delta: parseFloat(greeks.delta.toFixed(4)),
            gamma: parseFloat(greeks.gamma.toFixed(4)),
            theta: parseFloat(greeks.theta.toFixed(4)),
            vega: parseFloat(greeks.vega.toFixed(4))
        };
    }

    analyzeOptionsForSignal(symbol, spotPrice, technicalSignal) {
        const optionsChain = this.optionsChain.get(symbol);
        if (!optionsChain) return null;

        const nearExpiry = Object.keys(optionsChain)[0];
        const strikes = optionsChain[nearExpiry];
        
        return this.generateOptionsStrategy(strikes, spotPrice, technicalSignal, nearExpiry);
    }

    generateOptionsStrategy(strikes, spotPrice, signal, expiry) {
        const daysToExpiry = this.getDaysToExpiry(expiry);
        
        if (signal.signal === 'BUY' && signal.confidence > 75) {
            return this.generateBullishStrategy(strikes, spotPrice, signal.targets, daysToExpiry);
        } else if (signal.signal === 'SELL' && signal.confidence > 75) {
            return this.generateBearishStrategy(strikes, spotPrice, signal.targets, daysToExpiry);
        } else {
            return this.generateNeutralStrategy(strikes, spotPrice, daysToExpiry);
        }
    }

    generateBullishStrategy(strikes, spotPrice, targets, days) {
        const atmStrike = this.findATMStrike(strikes, spotPrice);
        const otmCallStrike = atmStrike + 100;
        
        const strategies = [
            // Long Call
            {
                name: 'Long Call',
                type: 'BULLISH',
                legs: [{
                    action: 'BUY',
                    option: 'CALL',
                    strike: atmStrike,
                    quantity: 1,
                    premium: strikes[atmStrike].call.ask,
                    maxProfit: 'Unlimited',
                    maxLoss: strikes[atmStrike].call.ask,
                    breakeven: atmStrike + strikes[atmStrike].call.ask,
                    delta: strikes[atmStrike].call.delta
                }]
            },
            // Bull Call Spread
            {
                name: 'Bull Call Spread',
                type: 'BULLISH',
                legs: [
                    {
                        action: 'BUY',
                        option: 'CALL',
                        strike: atmStrike,
                        quantity: 1,
                        premium: strikes[atmStrike].call.ask
                    },
                    {
                        action: 'SELL',
                        option: 'CALL',
                        strike: otmCallStrike,
                        quantity: 1,
                        premium: strikes[otmCallStrike].call.bid
                    }
                ]
            }
        ];

        // Select best strategy based on risk-reward
        return this.selectOptimalStrategy(strategies, targets, days);
    }

    generateBearishStrategy(strikes, spotPrice, targets, days) {
        const atmStrike = this.findATMStrike(strikes, spotPrice);
        const otmPutStrike = atmStrike - 100;
        
        const strategies = [
            // Long Put
            {
                name: 'Long Put',
                type: 'BEARISH',
                legs: [{
                    action: 'BUY',
                    option: 'PUT',
                    strike: atmStrike,
                    quantity: 1,
                    premium: strikes[atmStrike].put.ask,
                    maxProfit: atmStrike - strikes[atmStrike].put.ask,
                    maxLoss: strikes[atmStrike].put.ask,
                    breakeven: atmStrike - strikes[atmStrike].put.ask,
                    delta: strikes[atmStrike].put.delta
                }]
            }
        ];

        return this.selectOptimalStrategy(strategies, targets, days);
    }

    generateNeutralStrategy(strikes, spotPrice, days) {
        const atmStrike = this.findATMStrike(strikes, spotPrice);
        
        return {
            name: 'Iron Condor',
            type: 'NEUTRAL',
            recommendation: 'Market showing mixed signals. Consider range-bound strategies.',
            legs: []
        };
    }

    findATMStrike(strikes, spotPrice) {
        let closestStrike = null;
        let minDiff = Infinity;
        
        Object.keys(strikes).forEach(strike => {
            const diff = Math.abs(parseFloat(strike) - spotPrice);
            if (diff < minDiff) {
                minDiff = diff;
                closestStrike = parseFloat(strike);
            }
        });
        
        return closestStrike;
    }

    selectOptimalStrategy(strategies, targets, days) {
        // Select based on risk-reward and probability
        return strategies[0]; // Simplified selection
    }

    getDaysToExpiry(expiryDate) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }
}

class GreeksCalculator {
    calculate(S, K, T, r, sigma, type) {
        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);
        
        const Nd1 = this.normalCDF(d1);
        const Nd2 = this.normalCDF(d2);
        const nd1 = this.normalPDF(d1);
        
        if (type === 'CALL') {
            const price = S * Nd1 - K * Math.exp(-r * T) * Nd2;
            const delta = Nd1;
            const gamma = nd1 / (S * sigma * Math.sqrt(T));
            const theta = -(S * nd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * Nd2;
            const vega = S * nd1 * Math.sqrt(T);
            
            return { price, delta, gamma, theta: theta / 365, vega: vega / 100 };
        } else {
            const price = K * Math.exp(-r * T) * (1 - Nd2) - S * (1 - Nd1);
            const delta = Nd1 - 1;
            const gamma = nd1 / (S * sigma * Math.sqrt(T));
            const theta = -(S * nd1 * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * (1 - Nd2);
            const vega = S * nd1 * Math.sqrt(T);
            
            return { price, delta, gamma, theta: theta / 365, vega: vega / 100 };
        }
    }

    normalCDF(x) {
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2);
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return 0.5 * (1.0 + sign * y);
    }

    normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }
}
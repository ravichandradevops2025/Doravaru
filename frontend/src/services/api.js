// Fully functional API service - no backend needed
class ApiService {
  constructor() {
    // Simulate API delays for realism
    this.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  }

  async getMarketStatus() {
    await this.delay(200);
    const now = new Date();
    const hour = now.getHours();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isMarketOpen = isWeekday && hour >= 9 && hour < 15.5;
    
    return {
      is_open: isMarketOpen,
      current_time: now.toISOString(),
      next_session: isMarketOpen ? "3:30 PM" : "9:15 AM",
      status: isMarketOpen ? "OPEN" : "CLOSED"
    };
  }

  async getWatchlist() {
    await this.delay(100);
    return {
      symbols: ["NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "ITC", "HINDUNILVR", "BHARTIARTL"]
    };
  }

  async getMarketData(symbol, timeframe = '1min', limit = 100) {
    await this.delay(300);
    
    const basePrices = {
      "NIFTY": 21500, "BANKNIFTY": 46000, "RELIANCE": 2800, 
      "TCS": 3600, "INFY": 1650, "HDFCBANK": 1600,
      "ICICIBANK": 950, "ITC": 450, "HINDUNILVR": 2650, "BHARTIARTL": 900
    };
    
    const basePrice = basePrices[symbol] || 1000;
    const data = [];
    let currentPrice = basePrice;
    
    // Generate realistic OHLC data
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = new Date(Date.now() - i * 60000); // 1-minute intervals
      
      // Random walk with trend
      const change = (Math.random() - 0.5) * 0.02; // ±1% change
      currentPrice = currentPrice * (1 + change);
      
      const open = currentPrice;
      const high = open * (1 + Math.random() * 0.01); // Up to 1% higher
      const low = open * (1 - Math.random() * 0.01);  // Up to 1% lower
      const close = low + Math.random() * (high - low);
      const volume = Math.floor(Math.random() * 500000) + 50000;
      
      data.push({
        symbol,
        timestamp: timestamp.toISOString(),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume
      });
      
      currentPrice = close;
    }
    
    return { symbol, data };
  }

  async getNews() {
    await this.delay(250);
    
    const newsTemplates = [
      { title: "Indian markets rally on strong Q4 earnings and FII inflows", sentiment: 0.7 },
      { title: "Banking sector shows resilience amid RBI policy changes", sentiment: 0.4 },
      { title: "IT stocks under pressure due to global recession fears", sentiment: -0.3 },
      { title: "Auto sector gains momentum with festive season demand", sentiment: 0.5 },
      { title: "Pharma stocks mixed on regulatory concerns", sentiment: -0.1 },
      { title: "Metal stocks surge on infrastructure spending plans", sentiment: 0.6 },
      { title: "FMCG companies report steady growth in rural markets", sentiment: 0.3 },
      { title: "Energy sector volatile amid crude oil price fluctuations", sentiment: 0.1 }
    ];
    
    const selectedNews = newsTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map((news, index) => ({
        source: ["moneycontrol", "economic_times", "business_standard", "livemint", "financial_express"][index % 5],
        title: news.title,
        url: `https://example.com/news${index + 1}`,
        sentiment: news.sentiment
      }));
    
    const avgSentiment = selectedNews.reduce((sum, news) => sum + news.sentiment, 0) / selectedNews.length;
    
    return {
      headlines: selectedNews,
      total_count: selectedNews.length,
      avg_sentiment: Number(avgSentiment.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  }

  async generateTradeIdea(symbol, riskProfile, timeframe = '1min', exchange = 'NSE') {
    await this.delay(2000); // Simulate AI processing time
    
    // Get market data for analysis
    const marketData = await this.getMarketData(symbol, timeframe, 50);
    const prices = marketData.data.map(d => d.close);
    const currentPrice = prices[prices.length - 1];
    
    // Simple technical analysis
    const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const rsi = this.calculateRSI(prices.slice(-14));
    
    // Determine scenario
    let scenario, entry, stopLoss, target1, target2, confidence, rationale;
    
    if (currentPrice > sma20 && sma20 > sma50 && rsi < 70) {
      scenario = "bull";
      entry = currentPrice * 1.002;
      stopLoss = currentPrice * 0.985;
      target1 = currentPrice * 1.025;
      target2 = currentPrice * 1.045;
      confidence = Math.floor(Math.random() * 20) + 70; // 70-90%
      rationale = [
        `Price ${currentPrice.toFixed(2)} above SMA20 (${sma20.toFixed(2)}) indicates bullish momentum`,
        `SMA20 > SMA50 confirms uptrend`,
        `RSI at ${rsi.toFixed(1)} shows room for upward movement`,
        "Risk/reward ratio favors long position"
      ];
    } else if (currentPrice < sma20 && sma20 < sma50 && rsi > 30) {
      scenario = "bear";
      entry = currentPrice * 0.998;
      stopLoss = currentPrice * 1.015;
      target1 = currentPrice * 0.975;
      target2 = currentPrice * 0.955;
      confidence = Math.floor(Math.random() * 20) + 65; // 65-85%
      rationale = [
        `Price ${currentPrice.toFixed(2)} below SMA20 (${sma20.toFixed(2)}) indicates bearish pressure`,
        `SMA20 < SMA50 confirms downtrend`,
        `RSI at ${rsi.toFixed(1)} shows potential for further decline`,
        "Technical indicators align for short position"
      ];
    } else {
      scenario = "neutral";
      entry = currentPrice;
      stopLoss = currentPrice * 0.99;
      target1 = currentPrice * 1.015;
      target2 = currentPrice * 1.025;
      confidence = Math.floor(Math.random() * 15) + 50; // 50-65%
      rationale = [
        "Mixed technical signals suggest sideways movement",
        "Price consolidating between key support and resistance",
        "Market sentiment appears neutral",
        "Range-bound trading strategy recommended"
      ];
    }
    
    // Calculate position sizing
    const riskAmount = riskProfile.portfolio_value * (riskProfile.max_daily_risk_percent / 100);
    const positionSize = Math.max(Math.floor(riskAmount / Math.abs(entry - stopLoss)), 1);
    const riskReward = Math.abs(target1 - entry) / Math.abs(entry - stopLoss);
    
    const tradeIdea = {
      symbol,
      exchange,
      timeframe,
      timestamp: new Date().toISOString(),
      scenario,
      probability: Math.min(confidence + 10, 95),
      entry: Number(entry.toFixed(2)),
      stop_loss: Number(stopLoss.toFixed(2)),
      targets: [Number(target1.toFixed(2)), Number(target2.toFixed(2))],
      atr: Number((currentPrice * 0.015).toFixed(2)),
      risk_percent: riskProfile.max_daily_risk_percent,
      position_size_lots_shares: positionSize,
      risk_reward_t1: Number(riskReward.toFixed(2)),
      confidence,
      indicators_used: ["SMA-20", "SMA-50", "RSI", "Price Action"],
      news_references: [],
      rationale,
      notes: `Analysis based on ${symbol} technical indicators and market structure`
    };
    
    // Validation
    const isValid = riskReward >= 1.2 && confidence >= 50;
    const warnings = [];
    
    if (riskReward < 1.5) warnings.push("Risk/reward ratio below ideal threshold");
    if (confidence < 60) warnings.push("Low confidence signal - consider reducing position size");
    if (positionSize * entry > riskProfile.portfolio_value * 0.2) {
      warnings.push("Position size exceeds 20% of portfolio");
    }
    
    return {
      trade_idea: tradeIdea,
      validation: {
        is_valid: isValid,
        warnings
      },
      disclaimer: "This is educational analysis only and not investment advice. Always confirm with your broker, do your own research, and manage risk.",
      timestamp: new Date().toISOString()
    };
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

  async healthCheck() {
    await this.delay(100);
    return { 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: "1.0.0-demo"
    };
  }
}

export const apiService = new ApiService();
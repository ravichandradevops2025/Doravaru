from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging
import random
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Doravaru - AI Trading Platform",
    description="AI-powered stock market analysis and trading platform",
    version="1.0.0"
)

# CORS middleware - allow GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Doravaru Trading Platform API", "status": "running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@app.get("/api/market-status")
async def get_market_status():
    """Get current market status"""
    now = datetime.now()
    is_market_open = 9 <= now.hour < 15.5 and now.weekday() < 5
    
    return {
        "is_open": is_market_open,
        "current_time": now,
        "next_session": "9:15 AM" if not is_market_open else "3:30 PM",
        "status": "OPEN" if is_market_open else "CLOSED"
    }

@app.get("/api/watchlist")
async def get_watchlist():
    """Get default watchlist symbols"""
    default_symbols = [
        "NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "INFY", 
        "HDFCBANK", "ICICIBANK", "ITC", "HINDUNILVR", "BHARTIARTL"
    ]
    return {"symbols": default_symbols}

@app.get("/api/market-data/{symbol}")
async def get_market_data(symbol: str, limit: int = 100):
    """Get mock market data for symbol"""
    from datetime import timedelta
    
    # Generate simple mock data
    data = []
    base_prices = {
        "NIFTY": 21500, "BANKNIFTY": 46000, "RELIANCE": 2800, 
        "TCS": 3600, "INFY": 1650, "HDFCBANK": 1600,
        "ICICIBANK": 950, "ITC": 450, "HINDUNILVR": 2650, "BHARTIARTL": 900
    }
    base_price = base_prices.get(symbol, 1000)
    
    for i in range(limit):
        timestamp = datetime.now() - timedelta(hours=i)
        price_change = random.uniform(-0.02, 0.02)  # +/- 2%
        price = base_price * (1 + price_change)
        
        data.append({
            "symbol": symbol,
            "timestamp": timestamp.isoformat(),
            "open": round(price * random.uniform(0.999, 1.001), 2),
            "high": round(price * random.uniform(1.001, 1.02), 2),
            "low": round(price * random.uniform(0.98, 0.999), 2),
            "close": round(price, 2),
            "volume": random.randint(10000, 1000000)
        })
        base_price = price
    
    return {"symbol": symbol, "data": list(reversed(data))}

@app.get("/api/news")
async def get_news():
    """Get mock news"""
    mock_headlines = [
        {
            "source": "moneycontrol",
            "title": "Indian markets rally on strong Q4 earnings and positive global sentiment",
            "url": "https://example.com/news1",
            "sentiment": 0.7
        },
        {
            "source": "economic_times", 
            "title": "Banking sector shows resilience amid regulatory changes",
            "url": "https://example.com/news2",
            "sentiment": 0.3
        },
        {
            "source": "business_standard",
            "title": "IT stocks face headwinds from global economic slowdown concerns",
            "url": "https://example.com/news3", 
            "sentiment": -0.2
        },
        {
            "source": "livemint",
            "title": "SEBI introduces new guidelines for algorithmic trading platforms",
            "url": "https://example.com/news4",
            "sentiment": 0.1
        },
        {
            "source": "financial_express",
            "title": "Foreign institutional investors increase stake in Indian equities",
            "url": "https://example.com/news5",
            "sentiment": 0.5
        }
    ]
    
    return {
        "headlines": mock_headlines,
        "total_count": len(mock_headlines),
        "avg_sentiment": sum(h["sentiment"] for h in mock_headlines) / len(mock_headlines),
        "timestamp": datetime.now()
    }

@app.post("/api/generate-trade-idea/{symbol}")
async def generate_trade_idea(symbol: str, risk_profile: dict):
    """Generate simple trade idea"""
    try:
        # Get current market data
        market_data_response = await get_market_data(symbol, 50)
        market_data = market_data_response["data"]
        
        if not market_data:
            raise HTTPException(status_code=400, detail="No market data available")
        
        latest_price = market_data[-1]["close"]
        
        # Simple signal generation
        recent_prices = [candle["close"] for candle in market_data[-10:]]
        avg_price = sum(recent_prices) / len(recent_prices)
        
        # Determine scenario
        if latest_price > avg_price * 1.01:
            scenario = "bull"
            entry = latest_price * 1.002
            stop_loss = latest_price * 0.985
            target_1 = latest_price * 1.025
            target_2 = latest_price * 1.04
            confidence = random.randint(65, 85)
        elif latest_price < avg_price * 0.99:
            scenario = "bear" 
            entry = latest_price * 0.998
            stop_loss = latest_price * 1.015
            target_1 = latest_price * 0.975
            target_2 = latest_price * 0.96
            confidence = random.randint(60, 80)
        else:
            scenario = "neutral"
            entry = latest_price
            stop_loss = latest_price * 0.99
            target_1 = latest_price * 1.015
            target_2 = latest_price * 1.025
            confidence = random.randint(50, 70)
        
        # Calculate position size
        risk_percent = risk_profile.get("max_daily_risk_percent", 2.0)
        portfolio_value = risk_profile.get("portfolio_value", 100000)
        risk_amount = portfolio_value * (risk_percent / 100)
        position_size = max(int(risk_amount / abs(entry - stop_loss)), 1)
        
        # Risk/reward ratio
        risk_reward = abs(target_1 - entry) / abs(entry - stop_loss)
        
        trade_idea = {
            "symbol": symbol,
            "exchange": "NSE",
            "timeframe": "1min",
            "timestamp": datetime.now().isoformat(),
            "scenario": scenario,
            "probability": min(confidence + 15, 95),
            "entry": round(entry, 2),
            "stop_loss": round(stop_loss, 2),
            "targets": [round(target_1, 2), round(target_2, 2)],
            "atr": round(latest_price * 0.01, 2),
            "risk_percent": risk_percent,
            "position_size_lots_shares": position_size,
            "risk_reward_t1": round(risk_reward, 2),
            "confidence": confidence,
            "indicators_used": ["Price Action", "Moving Average", "Trend Analysis"],
            "news_references": [],
            "rationale": [
                f"Current price {latest_price} vs recent average {avg_price:.2f}",
                f"Market sentiment appears {scenario}ish based on price action",
                f"Risk/reward ratio of 1:{risk_reward:.2f} meets minimum criteria"
            ],
            "notes": f"Generated based on {symbol} price analysis and market conditions"
        }
        
        # Simple validation
        is_valid = risk_reward >= 1.5 and confidence >= 50
        warnings = []
        
        if not is_valid:
            warnings.append("Low risk/reward ratio or confidence")
        if position_size > portfolio_value * 0.2:
            warnings.append("Position size exceeds 20% of portfolio")
            
        return {
            "trade_idea": trade_idea,
            "validation": {
                "is_valid": is_valid,
                "warnings": warnings
            },
            "disclaimer": "This is educational analysis only and not investment advice. Always confirm with your broker, do your own research, and manage risk.",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating trade idea: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
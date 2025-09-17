# app/main.py
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio
from datetime import datetime, timedelta

from app.database.database import get_db, engine
from app.database.models import Base
from app.models.schemas import (
    TradeIdea, UserRiskProfile, MarketData, 
    TechnicalIndicators, NewsReference
)
from app.services.data_ingestion import (
    NewsIngestionService, MarketDataService, SocialSentimentService
)
from app.services.technical_analysis import TechnicalAnalysisEngine
from app.services.ai_signal_generator import AISignalGenerator
from app.services.risk_management import RiskManagementEngine
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Doravaru - AI Trading Platform",
    description="AI-powered stock market analysis and trading platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ai_generator = AISignalGenerator(api_key=settings.OPENAI_API_KEY)
risk_manager = RiskManagementEngine()
ta_engine = TechnicalAnalysisEngine()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Doravaru API starting up...")
    
@app.on_event("shutdown") 
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Doravaru API shutting down...")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# Market data endpoints
@app.get("/api/market-data/{symbol}")
async def get_market_data(symbol: str, timeframe: str = "1min", limit: int = 100):
    """Get real-time market data for symbol"""
    try:
        async with MarketDataService() as market_service:
            data = await market_service.fetch_real_time_data(symbol, timeframe)
            return {"symbol": symbol, "data": data[-limit:]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/technical-indicators/{symbol}")
async def get_technical_indicators(symbol: str):
    """Get technical indicators for symbol"""
    try:
        async with MarketDataService() as market_service:
            market_data = await market_service.fetch_real_time_data(symbol)
            
        indicators = ta_engine.calculate_indicators(market_data)
        support_resistance = ta_engine.detect_support_resistance(market_data)
        patterns = ta_engine.detect_patterns(market_data)
        
        return {
            "symbol": symbol,
            "indicators": indicators,
            "support_resistance": support_resistance,
            "patterns": patterns,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# News and sentiment endpoints
@app.get("/api/news")
async def get_market_news():
    """Get latest market news and sentiment"""
    try:
        async with NewsIngestionService() as news_service:
            headlines = await news_service.fetch_news_headlines()
            
        return {
            "headlines": headlines,
            "total_count": len(headlines),
            "avg_sentiment": sum(h.sentiment for h in headlines) / len(headlines) if headlines else 0,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AI trade idea generation
@app.post("/api/generate-trade-idea/{symbol}")
async def generate_trade_idea(
    symbol: str, 
    risk_profile: UserRiskProfile,
    timeframe: str = "1min",
    exchange: str = "NSE"
):
    """Generate AI-powered trade idea for symbol"""
    try:
        # Gather all required data
        async with MarketDataService() as market_service, \
                   NewsIngestionService() as news_service, \
                   SocialSentimentService() as social_service:
            
            # Get market data and technical analysis
            market_data = await market_service.fetch_real_time_data(symbol, timeframe)
            indicators = ta_engine.calculate_indicators(market_data)
            support_resistance = ta_engine.detect_support_resistance(market_data)
            patterns = ta_engine.detect_patterns(market_data)
            
            # Get news sentiment
            news_headlines = await news_service.fetch_news_headlines()
            
            # Filter news relevant to symbol (simple keyword matching)
            relevant_news = [
                news for news in news_headlines 
                if symbol.lower() in news.title.lower() or any(
                    keyword in news.title.lower() 
                    for keyword in ["market", "stock", "trading", "nifty", "sensex"]
                )
            ][:5]  # Top 5 relevant headlines
            
        # Generate trade idea using AI
        trade_idea = await ai_generator.generate_trade_idea(
            symbol=symbol,
            exchange=exchange,
            timeframe=timeframe,
            market_data=market_data,
            indicators=indicators,
            news_headlines=relevant_news,
            risk_profile=risk_profile,
            support_resistance=support_resistance,
            patterns=patterns
        )
        
        if not trade_idea:
            raise HTTPException(status_code=500, detail="Failed to generate trade idea")
        
        # Validate trade idea
        is_valid, warnings = risk_manager.validate_trade_idea(trade_idea, risk_profile)
        
        return {
            "trade_idea": trade_idea,
            "validation": {
                "is_valid": is_valid,
                "warnings": warnings
            },
            "disclaimer": "This is educational analysis only and not investment advice. Always confirm with your broker, do your own research, and manage risk.",
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Error generating trade idea: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Watchlist management
@app.get("/api/watchlist")
async def get_watchlist():
    """Get default watchlist symbols"""
    default_symbols = [
        "NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "INFY", 
        "HDFCBANK", "ICICIBANK", "ITC", "HINDUNILVR", "BHARTIARTL"
    ]
    return {"symbols": default_symbols}

@app.post("/api/batch-analysis")
async def batch_analysis(
    symbols: List[str],
    risk_profile: UserRiskProfile,
    background_tasks: BackgroundTasks
):
    """Generate trade ideas for multiple symbols"""
    try:
        results = {}
        
        for symbol in symbols[:10]:  # Limit to 10 symbols to avoid timeout
            try:
                # This is a simplified version - in production, use background tasks
                async with MarketDataService() as market_service, \
                           NewsIngestionService() as news_service:
                    
                    market_data = await market_service.fetch_real_time_data(symbol)
                    indicators = ta_engine.calculate_indicators(market_data)
                    support_resistance = ta_engine.detect_support_resistance(market_data)
                    patterns = ta_engine.detect_patterns(market_data)
                    news_headlines = await news_service.fetch_news_headlines()
                    
                    trade_idea = await ai_generator.generate_trade_idea(
                        symbol=symbol,
                        exchange="NSE",
                        timeframe="1min",
                        market_data=market_data,
                        indicators=indicators,
                        news_headlines=news_headlines[:3],
                        risk_profile=risk_profile,
                        support_resistance=support_resistance,
                        patterns=patterns
                    )
                    
                    if trade_idea:
                        is_valid, warnings = risk_manager.validate_trade_idea(trade_idea, risk_profile)
                        results[symbol] = {
                            "trade_idea": trade_idea,
                            "validation": {"is_valid": is_valid, "warnings": warnings}
                        }
                    else:
                        results[symbol] = {"error": "Failed to generate trade idea"}
                        
            except Exception as e:
                results[symbol] = {"error": str(e)}
        
        return {
            "results": results,
            "disclaimer": "This is educational analysis only and not investment advice. Always confirm with your broker, do your own research, and manage risk.",
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Risk management endpoints
@app.post("/api/risk-assessment")
async def assess_portfolio_risk(trade_ideas: List[TradeIdea]):
    """Assess overall portfolio risk"""
    try:
        risk_report = risk_manager.generate_risk_report(trade_ideas)
        return {
            "risk_assessment": risk_report,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/market-status")
async def get_market_status():
    """Get current market status and conditions"""
    try:
        # Mock market status - integrate with real market hours API
        now = datetime.now()
        is_market_open = 9 <= now.hour < 15.5 and now.weekday() < 5  # Simple check
        
        return {
            "is_open": is_market_open,
            "current_time": now,
            "next_session": "9:15 AM" if not is_market_open else "3:30 PM",
            "status": "OPEN" if is_market_open else "CLOSED"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
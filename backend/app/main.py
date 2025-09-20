from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import re
from datetime import datetime
from typing import List, Optional

from .services.angel_one_service import angel_service
from .services.technical_analysis import technical_analyzer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Doravaru Trading Platform - Live Data", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Doravaru Trading Platform - LIVE Angel One Integration",
        "status": "active",
        "features": ["live_data", "totp_auth", "technical_analysis", "ai_signals"],
        "version": "2.0.0"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Doravaru Trading Platform",
        "live_data": "enabled"
    }

@app.post("/api/auth/test")
async def test_angel_auth():
    """Test Angel One authentication with TOTP"""
    try:
        logger.info("🔐 Testing Angel One TOTP authentication...")
        result = await angel_service.authenticate()
        return result
    except Exception as e:
        logger.error(f"Auth test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/live-data/{symbol}")
async def get_live_market_data(
    symbol: str, 
    exchange: str = Query(default="NSE", description="Exchange (NSE/BSE)")
):
    """Get REAL LIVE market data from Angel One API"""
    try:
        logger.info(f"📊 Getting LIVE data for {symbol} from Angel One...")
        result = await angel_service.get_live_market_data(symbol.upper(), exchange)
        return result
    except Exception as e:
        logger.error(f"Live data fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/batch-ltp")
async def get_batch_ltp(
    symbols: str = Query(..., description="Comma-separated symbols"),
    exchange: str = Query(default="NSE", description="Exchange")
):
    """Get LTP for multiple symbols at once"""
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        logger.info(f"📊 Getting batch LTP for {len(symbol_list)} symbols...")
        result = await angel_service.get_multiple_ltp(symbol_list, exchange)
        return result
    except Exception as e:
        logger.error(f"Batch LTP failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/market-data/{symbol}")
async def get_market_data(symbol: str):
    """Get live market data (legacy endpoint)"""
    return await get_live_market_data(symbol)

@app.get("/api/analysis/{symbol}")
async def get_technical_analysis(symbol: str):
    """Get technical analysis with LIVE data"""
    try:
        # Get LIVE market data first
        live_data = await angel_service.get_live_market_data(symbol.upper())
        
        if not live_data.get("success"):
            return live_data
        
        # Get historical data for analysis
        historical_data = await angel_service.get_historical_data(symbol.upper())
        
        if historical_data.get("success"):
            # Perform technical analysis with live data
            analysis = technical_analyzer.analyze_trend(historical_data)
            
            # Enhance analysis with live data
            if analysis.get("success"):
                analysis["live_data"] = live_data["data"]
                analysis["current_price"] = live_data["data"]["ltp"]
                
            return analysis
        else:
            # Fallback analysis with live price only
            return {
                "success": True,
                "symbol": symbol.upper(),
                "current_price": live_data["data"]["ltp"],
                "live_data": live_data["data"],
                "signals": [{"type": "HOLD", "reason": "Insufficient historical data", "strength": "LOW"}],
                "trend": "UNKNOWN",
                "source": "live_data_only"
            }
        
    except Exception as e:
        logger.error(f"Technical analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/signals/{symbol}")
async def get_trading_signals(symbol: str):
    """Get AI-powered trading signals with LIVE data"""
    try:
        # Get technical analysis with live data
        analysis = await get_technical_analysis(symbol)
        
        if not analysis.get("success"):
            return analysis
        
        # Extract and enhance signals
        signals = analysis.get("signals", [])
        live_data = analysis.get("live_data", {})
        
        # Add AI confidence and live data context
        for signal in signals:
            signal["confidence"] = calculate_signal_confidence(
                signal, 
                analysis.get("indicators", {}), 
                analysis.get("trend", "UNKNOWN"),
                live_data
            )
            signal["live_price"] = live_data.get("ltp", 0)
            signal["timestamp"] = datetime.now().isoformat()
        
        return {
            "success": True,
            "symbol": symbol.upper(),
            "live_data": live_data,
            "current_price": live_data.get("ltp", 0),
            "trend": analysis.get("trend"),
            "signals": signals,
            "indicators": analysis.get("indicators", {}),
            "timestamp": datetime.now().isoformat(),
            "source": "live_angel_one"
        }
        
    except Exception as e:
        logger.error(f"Signal generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def calculate_signal_confidence(signal: dict, indicators: dict, trend: str, live_data: dict) -> int:
    """Enhanced confidence calculation with live data"""
    confidence = 50
    
    # Trend alignment
    if signal["type"] == "BUY" and trend == "BULLISH":
        confidence += 20
    elif signal["type"] == "SELL" and trend == "BEARISH":
        confidence += 20
    
    # Signal strength
    if signal.get("strength") == "HIGH":
        confidence += 15
    elif signal.get("strength") == "LOW":
        confidence -= 10
    
    # Volume confirmation (if available)
    if live_data.get("volume", 0) > 0:
        # High volume adds confidence
        confidence += 5
    
    # Price movement confirmation
    change_percent = live_data.get("change_percent", 0)
    if signal["type"] == "BUY" and change_percent < -1:  # Buy on dip
        confidence += 10
    elif signal["type"] == "SELL" and change_percent > 1:  # Sell on rise
        confidence += 10
    
    return min(max(confidence, 0), 100)

def format_symbol_name(symbol: str) -> str:
    """Format symbol name properly in Python"""
    # Convert camelCase to spaced words
    # HDFCBANK -> HDFC BANK, TCS -> TCS, etc.
    formatted = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', symbol)
    formatted = re.sub(r'([a-z])([A-Z])', r'\1 \2', formatted)
    return formatted.strip()

@app.get("/api/symbols")
async def get_available_symbols():
    """Get available symbols with Angel One tokens"""
    try:
        if angel_service.symbol_master is not None:
            # Get popular symbols from symbol master
            popular_symbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'LT', 'WIPRO']
            
            symbols = []
            for symbol in popular_symbols:
                token = angel_service.get_symbol_token(symbol)
                if token:
                    symbols.append({
                        "symbol": symbol,
                        "name": format_symbol_name(symbol),  # ✅ Fixed Python function
                        "token": token,
                        "exchange": "NSE"
                    })
            
            # Add indices
            symbols.extend([
                {"symbol": "NIFTY50", "name": "Nifty 50 Index", "token": "99926000", "exchange": "NSE"},
                {"symbol": "BANKNIFTY", "name": "Bank Nifty Index", "token": "99926009", "exchange": "NSE"}
            ])
            
            return {"symbols": symbols, "source": "angel_one_master"}
        else:
            # Fallback symbols
            return {
                "symbols": [
                    {"symbol": "RELIANCE", "name": "Reliance Industries", "exchange": "NSE"},
                    {"symbol": "TCS", "name": "Tata Consultancy Services", "exchange": "NSE"},
                    {"symbol": "INFY", "name": "Infosys", "exchange": "NSE"},
                    {"symbol": "HDFCBANK", "name": "HDFC Bank", "exchange": "NSE"},
                    {"symbol": "ICICIBANK", "name": "ICICI Bank", "exchange": "NSE"},
                    {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE"}
                ],
                "source": "fallback"
            }
    except Exception as e:
        logger.error(f"Symbols fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard")
async def get_dashboard_data():
    """Get complete dashboard with live data for multiple symbols"""
    try:
        symbols = ["NIFTY50", "BANKNIFTY", "RELIANCE", "TCS", "INFY", "HDFCBANK"]
        
        # Get batch live data
        batch_result = await angel_service.get_multiple_ltp(symbols)
        
        if batch_result.get("success"):
            dashboard_data = {
                "success": True,
                "market_status": "LIVE" if angel_service.access_token else "SIMULATION",
                "timestamp": datetime.now().isoformat(),
                "symbols": batch_result["data"],
                "total_symbols": len(batch_result["data"])
            }
            
            return dashboard_data
        else:
            return {"success": False, "error": "Failed to fetch dashboard data"}
            
    except Exception as e:
        logger.error(f"Dashboard data failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
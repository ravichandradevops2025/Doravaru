from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.services.data_ingestion import AngelOneDataService, RealtimeDataSimulator
from app.services.technical_analysis import TechnicalAnalyzer
from app.services.ai_signal_generator import AISignalGenerator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Doravaru Trading API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
angel_service = AngelOneDataService()
simulator_service = RealtimeDataSimulator()
technical_analyzer = TechnicalAnalyzer()
signal_generator = AISignalGenerator()

# Pydantic models
class AuthRequest(BaseModel):
    client_code: str
    totp: str

class SymbolsRequest(BaseModel):
    symbols: List[str]

# API Routes
@app.get("/")
async def root():
    return {"message": "Doravaru Trading API", "status": "running"}

@app.post("/api/auth/angelone")
async def authenticate_angelone(request: AuthRequest):
    """Authenticate with Angel One API"""
    try:
        result = angel_service.authenticate(request.client_code, request.totp)
        return result
    except Exception as e:
        logger.error(f"Authentication endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/data/live-prices")
async def get_live_prices(request: SymbolsRequest):
    """Get live prices - tries Angel One first, falls back to realistic simulation"""
    try:
        # Try Angel One API first
        if angel_service.access_token:
            result = angel_service.get_live_prices(request.symbols)
            if result.get('success'):
                return result
        
        # Fallback to realistic simulation
        logger.info("Using realistic data simulation")
        result = simulator_service.get_realistic_data(request.symbols)
        return result
        
    except Exception as e:
        logger.error(f"Live prices endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analysis/technical")
async def get_technical_analysis(request: SymbolsRequest):
    """Get technical analysis for symbols"""
    try:
        # Get price data first
        price_result = simulator_service.get_realistic_data(request.symbols)
        if not price_result.get('success'):
            raise HTTPException(status_code=400, detail="Failed to get price data")
        
        analysis_results = {}
        for symbol_data in price_result['data']:
            symbol = symbol_data['symbol']
            # Generate some historical data for analysis
            historical_prices = technical_analyzer.generate_historical_data(symbol_data['ltp'])
            analysis = technical_analyzer.analyze(historical_prices)
            analysis_results[symbol] = analysis
        
        return {"success": True, "data": analysis_results}
        
    except Exception as e:
        logger.error(f"Technical analysis endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/signals/generate")
async def generate_trading_signals(request: SymbolsRequest):
    """Generate AI trading signals"""
    try:
        signals = {}
        for symbol in request.symbols:
            # Get realistic data
            price_data = simulator_service.get_realistic_data([symbol])
            if price_data.get('success') and price_data['data']:
                symbol_data = price_data['data'][0]
                historical_prices = technical_analyzer.generate_historical_data(symbol_data['ltp'])
                signal = signal_generator.generate_signal(symbol, historical_prices, symbol_data)
                signals[symbol] = signal
        
        return {"success": True, "data": signals}
        
    except Exception as e:
        logger.error(f"Signal generation endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "angel_one_connected": angel_service.access_token is not None,
        "services": ["data_ingestion", "technical_analysis", "signal_generation"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
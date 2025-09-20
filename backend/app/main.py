from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import requests
import logging
from datetime import datetime
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Doravaru Trading API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Angel One API Configuration
ANGEL_ONE_CONFIG = {
    "api_key": "a18ffda4",
    "secret_key": "801865f61-201-46cd-bdb9-b20e64322a2a",
    "base_url": "https://apiconnect.angelbroking.com"
}

# Global variables
access_token = None
client_code = None

# Realistic data for fallback
REALISTIC_DATA = {
    'NIFTY50': {'price': 25294.30, 'change': -0.08},
    'BANKNIFTY': {'price': 55408.45, 'change': 0.51},
    'RELIANCE': {'price': 1428.16, 'change': -0.54},
    'TCS': {'price': 4084.12, 'change': -0.01}
}

@app.get("/")
async def root():
    return {"message": "Doravaru Trading API", "status": "running", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "angel_one_connected": access_token is not None,
        "services": ["authentication", "data_service", "realistic_simulation"]
    }

@app.post("/api/auth/angelone")
async def authenticate_angelone(request: Dict[str, Any]):
    global access_token, client_code
    
    try:
        client_code_input = request.get("client_code")
        totp_input = request.get("totp")
        
        if not client_code_input or not totp_input:
            return {"success": False, "message": "Client code and TOTP are required"}
        
        logger.info(f"Authentication attempt for client: {client_code_input}")
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '106.193.147.98',
            'X-MACAddress': 'fe80::216:3eff:fe00:0',
            'X-PrivateKey': ANGEL_ONE_CONFIG["api_key"]
        }
        
        payload = {
            "clientcode": client_code_input,
            "password": totp_input
        }
        
        # Try Angel One API
        response = requests.post(
            f"{ANGEL_ONE_CONFIG['base_url']}/rest/auth/angelbroking/user/v1/loginByPassword",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        data = response.json()
        
        if data.get('status') and data.get('data'):
            access_token = data['data']['jwtToken']
            client_code = client_code_input
            logger.info("Angel One authentication successful")
            return {"success": True, "message": "Authentication successful"}
        else:
            logger.warning(f"Angel One authentication failed: {data.get('message')}")
            return {"success": False, "message": data.get('message', 'Authentication failed')}
            
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        return {"success": False, "message": f"Authentication error: {str(e)}"}

@app.post("/api/data/live-prices")
async def get_live_prices(request: Dict[str, Any]):
    try:
        symbols = request.get("symbols", [])
        if not symbols:
            return {"success": False, "message": "Symbols are required"}
        
        # Try Angel One API if authenticated
        if access_token:
            try:
                token_mapping = {
                    'NIFTY50': '99926000',
                    'BANKNIFTY': '99926009',
                    'RELIANCE': '2885',
                    'TCS': '11536'
                }
                
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {access_token}',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-PrivateKey': ANGEL_ONE_CONFIG["api_key"]
                }
                
                payload = {
                    "exchange": "NSE",
                    "tradingsymbol": ",".join(symbols),
                    "symboltoken": ",".join([token_mapping.get(s, '1234') for s in symbols])
                }
                
                response = requests.post(
                    f"{ANGEL_ONE_CONFIG['base_url']}/rest/secure/angelbroking/order/v1/getLTP",
                    headers=headers,
                    json=payload,
                    timeout=15
                )
                
                data = response.json()
                
                if data.get('status') and data.get('data'):
                    formatted_data = []
                    for i, symbol in enumerate(symbols):
                        if i < len(data['data']):
                            item = data['data'][i]
                            formatted_data.append({
                                'symbol': symbol,
                                'ltp': float(item.get('ltp', 0)),
                                'open': float(item.get('open', 0)),
                                'high': float(item.get('high', 0)),
                                'low': float(item.get('low', 0)),
                                'close': float(item.get('close', 0)),
                                'volume': int(item.get('volume', 0)),
                                'timestamp': datetime.now().isoformat(),
                                'change': ((float(item.get('ltp', 0)) - float(item.get('close', 0))) / float(item.get('close', 1)) * 100) if float(item.get('close', 0)) > 0 else 0,
                                'isLive': True
                            })
                    
                    logger.info("Live data fetched successfully from Angel One")
                    return {"success": True, "data": formatted_data}
            except Exception as api_error:
                logger.warning(f"Angel One API failed: {api_error}, using realistic fallback")
        
        # Fallback to realistic simulation
        logger.info("Using realistic market simulation")
        realistic_data = []
        current_time = datetime.now()
        
        for symbol in symbols:
            base_data = REALISTIC_DATA.get(symbol, {'price': 1000, 'change': 0})
            base_price = base_data['price']
            
            # Market hours based volatility
            hour = current_time.hour
            if 9 <= hour <= 15:
                if hour == 9: volatility = 0.002
                elif hour == 15: volatility = 0.0015  
                elif 11 <= hour <= 13: volatility = 0.0005
                else: volatility = 0.001
            else:
                volatility = 0.0003
            
            # Generate realistic movement
            change_percent = (random.random() - 0.5) * volatility * 2
            current_price = base_price * (1 + change_percent)
            
            realistic_data.append({
                'symbol': symbol,
                'ltp': round(current_price, 2),
                'open': round(base_price * (1 + (random.random() - 0.5) * volatility * 0.5), 2),
                'high': round(current_price * (1 + random.random() * volatility * 0.5), 2),
                'low': round(current_price * (1 - random.random() * volatility * 0.5), 2),
                'close': base_price,
                'volume': random.randint(500000, 2000000),
                'change': round(change_percent * 100, 2),
                'timestamp': current_time.isoformat(),
                'isLive': False,
                'isRealistic': True
            })
        
        return {"success": True, "data": realistic_data}
        
    except Exception as e:
        logger.error(f"Live prices error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/signals/generate")
async def generate_signals(request: Dict[str, Any]):
    try:
        symbols = request.get("symbols", [])
        signals = {}
        
        for symbol in symbols:
            # Simple signal generation logic
            base_data = REALISTIC_DATA.get(symbol, {'price': 1000, 'change': 0})
            current_price = base_data['price']
            
            # Mock technical indicators
            rsi = random.uniform(30, 70)
            
            if rsi < 35:
                signal = "BUY"
                confidence = random.randint(75, 90)
            elif rsi > 65:
                signal = "SELL" 
                confidence = random.randint(75, 90)
            else:
                signal = "HOLD"
                confidence = random.randint(60, 75)
            
            signals[symbol] = {
                "signal": signal,
                "confidence": confidence,
                "current_price": current_price,
                "rsi": round(rsi, 1),
                "entry": current_price * (1.002 if signal == "BUY" else 0.998 if signal == "SELL" else 1),
                "stop_loss": current_price * (0.985 if signal == "BUY" else 1.015 if signal == "SELL" else 0.99),
                "target": current_price * (1.025 if signal == "BUY" else 0.975 if signal == "SELL" else 1.01),
                "timestamp": datetime.now().isoformat()
            }
        
        return {"success": True, "data": signals}
        
    except Exception as e:
        logger.error(f"Signal generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
import pyotp
import requests
import json
import logging
from typing import Dict, Optional, List
from datetime import datetime
import time
from ..core.config import settings

logger = logging.getLogger(__name__)

class AngelOneService:
    def __init__(self):
        self.api_key = settings.ANGEL_API_KEY
        self.client_code = settings.ANGEL_CLIENT_CODE
        self.mpin = settings.ANGEL_MPIN
        self.totp_secret = settings.ANGEL_TOTP_SECRET
        self.base_url = settings.ANGEL_BASE_URL
        self.access_token = None
        self.refresh_token = None
        self.feed_token = None
        self.symbol_master = None
        
        # Load symbol master on initialization
        self.load_symbol_master()
        
    def load_symbol_master(self):
        """Load Angel One symbol master data as dict"""
        try:
            url = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json'
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                self.symbol_master = response.json()  # Keep as list of dicts
                logger.info(f"✅ Loaded {len(self.symbol_master)} symbols from Angel One")
            else:
                logger.error("Failed to load symbol master")
                self.symbol_master = []
        except Exception as e:
            logger.error(f"Symbol master loading failed: {e}")
            self.symbol_master = []
    
    def get_symbol_token(self, symbol: str, exchange: str = "NSE") -> Optional[str]:
        """Get symbol token from Angel One symbol master"""
        if not self.symbol_master:
            # Fallback tokens for popular symbols
            fallback_tokens = {
                'RELIANCE-EQ': '2885',
                'TCS-EQ': '11536',
                'INFY-EQ': '1594',
                'HDFCBANK-EQ': '1333',
                'ICICIBANK-EQ': '4963',
                'SBIN-EQ': '3045',
                'NIFTY50': '99926000',
                'BANKNIFTY': '99926009'
            }
            search_key = f"{symbol}-EQ" if not symbol.endswith("-EQ") and exchange == "NSE" else symbol
            return fallback_tokens.get(search_key)
            
        try:
            # Format symbol for search
            if not symbol.endswith("-EQ") and exchange == "NSE":
                search_symbol = f"{symbol}-EQ"
            else:
                search_symbol = symbol
                
            # Search in symbol master (list of dicts)
            for item in self.symbol_master:
                if (item.get('symbol') == search_symbol and 
                    item.get('exch_seg') == exchange):
                    token = item.get('token')
                    logger.info(f"Found token {token} for {search_symbol}")
                    return str(token)
            
            logger.warning(f"Token not found for {search_symbol} in {exchange}")
            return None
                
        except Exception as e:
            logger.error(f"Token lookup failed for {symbol}: {e}")
            return None
    
    def generate_totp(self) -> str:
        """Generate current TOTP using the secret key"""
        try:
            totp = pyotp.TOTP(self.totp_secret)
            current_totp = totp.now()
            logger.info(f"Generated TOTP: {current_totp}")
            return current_totp
        except Exception as e:
            logger.error(f"TOTP generation failed: {e}")
            raise
    
    def get_auth_headers(self, include_auth=False) -> Dict[str, str]:
        """Get standard headers for Angel One API"""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '192.168.1.1',
            'X-ClientPublicIP': '203.192.1.1',
            'X-MACAddress': 'fe80::1',
            'X-PrivateKey': self.api_key
        }
        
        if include_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
            
        return headers
    
    async def authenticate(self) -> Dict:
        """Authenticate with Angel One API using TOTP"""
        try:
            current_totp = self.generate_totp()
            
            payload = {
                "clientcode": self.client_code,
                "password": self.mpin,
                "totp": current_totp
            }
            
            headers = self.get_auth_headers()
            
            logger.info(f"🔐 Authenticating with Angel One API...")
            
            response = requests.post(
                f"{self.base_url}/rest/auth/angelbroking/user/v1/loginByPassword",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            logger.info(f"Auth response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status'):
                    self.access_token = data['data']['jwtToken']
                    self.refresh_token = data['data']['refreshToken']
                    self.feed_token = data['data'].get('feedToken')
                    logger.info("✅ Angel One authentication successful!")
                    return {"success": True, "message": "Authentication successful", "data": data}
                else:
                    error_msg = data.get('message', 'Authentication failed')
                    logger.error(f"❌ Authentication failed: {error_msg}")
                    return {"success": False, "error": error_msg}
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                logger.error(f"❌ HTTP Error: {error_msg}")
                return {"success": False, "error": error_msg}
                
        except Exception as e:
            logger.error(f"❌ Authentication exception: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_live_market_data(self, symbol: str, exchange: str = "NSE") -> Dict:
        """Get REAL LIVE market data from Angel One API"""
        try:
            # Ensure we're authenticated
            if not self.access_token:
                auth_result = await self.authenticate()
                if not auth_result["success"]:
                    return auth_result
            
            # Get symbol token
            symbol_token = self.get_symbol_token(symbol, exchange)
            if not symbol_token:
                return {"success": False, "error": f"Symbol {symbol} not found in {exchange}"}
            
            # Format symbol properly
            trading_symbol = f"{symbol}-EQ" if not symbol.endswith("-EQ") and exchange == "NSE" else symbol
            
            headers = self.get_auth_headers(include_auth=True)
            
            # Use the Market Data API endpoint
            payload = {
                "exchange": exchange,
                "tradingsymbol": trading_symbol,
                "symboltoken": symbol_token
            }
            
            logger.info(f"📊 Fetching LIVE data for {trading_symbol} (token: {symbol_token})")
            
            response = requests.post(
                f"{self.base_url}/rest/secure/angelbroking/order/v1/getLtpData",
                headers=headers,
                json=payload,
                timeout=15
            )
            
            logger.info(f"Market data response: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') and data.get('data'):
                    market_data = data['data']
                    logger.info(f"✅ LIVE data received for {symbol}")
                    
                    # Calculate change percentage
                    ltp = float(market_data.get('ltp', 0))
                    close = float(market_data.get('close', 0))
                    change_percent = ((ltp - close) / close * 100) if close > 0 else 0
                    
                    # Format the response
                    return {
                        "success": True,
                        "data": {
                            "symbol": symbol.upper(),
                            "exchange": exchange,
                            "ltp": ltp,
                            "open": float(market_data.get('open', 0)),
                            "high": float(market_data.get('high', 0)),
                            "low": float(market_data.get('low', 0)),
                            "close": close,
                            "volume": int(market_data.get('volume', 0)),
                            "change": float(market_data.get('change', 0)),
                            "change_percent": round(change_percent, 2),
                            "timestamp": datetime.now().isoformat(),
                            "token": symbol_token,
                            "source": "angel_one_live"
                        }
                    }
                else:
                    logger.error(f"❌ No data in API response: {data}")
                    return {"success": False, "error": data.get('message', 'No data available')}
            else:
                logger.error(f"❌ API request failed: {response.status_code} - {response.text}")
                return {"success": False, "error": f"API Error: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"❌ Live market data exception: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_multiple_ltp(self, symbols: List[str], exchange: str = "NSE") -> Dict:
        """Get LTP for multiple symbols at once"""
        try:
            if not self.access_token:
                auth_result = await self.authenticate()
                if not auth_result["success"]:
                    return auth_result
            
            results = {}
            
            # Process each symbol individually (Angel One API limitation)
            for symbol in symbols:
                try:
                    symbol_data = await self.get_live_market_data(symbol, exchange)
                    if symbol_data.get("success"):
                        results[symbol] = symbol_data["data"]
                    
                    # Small delay to avoid rate limiting
                    time.sleep(0.1)
                    
                except Exception as e:
                    logger.error(f"Failed to get data for {symbol}: {e}")
                    continue
            
            return {
                "success": True,
                "data": results,
                "count": len(results),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Batch LTP fetch failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_historical_data(self, symbol: str, timeframe: str = "ONE_DAY", 
                                count: int = 100) -> Dict:
        """Get historical data for technical analysis"""
        try:
            if not self.access_token:
                auth_result = await self.authenticate()
                if not auth_result["success"]:
                    return auth_result
            
            headers = self.get_auth_headers(include_auth=True)
            symbol_token = self.get_symbol_token(symbol, "NSE")
            
            if not symbol_token:
                return {"success": False, "error": f"Symbol {symbol} not found"}
            
            payload = {
                "exchange": "NSE",
                "symboltoken": symbol_token,
                "interval": timeframe,
                "fromdate": "2024-01-01 09:15",
                "todate": datetime.now().strftime("%Y-%m-%d %H:%M")
            }
            
            response = requests.post(
                f"{self.base_url}/rest/secure/angelbroking/historical/v1/getCandleData",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "data": data}
            else:
                return {"success": False, "error": response.text}
                
        except Exception as e:
            logger.error(f"Historical data exception: {e}")
            return {"success": False, "error": str(e)}

# Global instance
angel_service = AngelOneService()
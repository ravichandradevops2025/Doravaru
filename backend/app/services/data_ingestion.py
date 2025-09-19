import requests
import json
import time
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class AngelOneDataService:
    def __init__(self):
        self.base_url = "https://apiconnect.angelbroking.com"
        self.access_token = None
        self.client_code = None
        self.api_key = "a18ffda4"
        self.secret_key = "801865f61-201-46cd-bdb9-b20e64322a2a"
        
    def authenticate(self, client_code: str, totp: str) -> Dict:
        """Authenticate with Angel One API"""
        try:
            url = f"{self.base_url}/rest/auth/angelbroking/user/v1/loginByPassword"
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '127.0.0.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': 'fe80::216:3eff:fe00:0',
                'X-PrivateKey': self.api_key
            }
            
            payload = {
                "clientcode": client_code,
                "password": totp
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            data = response.json()
            
            if data.get('status') and data.get('data'):
                self.access_token = data['data']['jwtToken']
                self.client_code = client_code
                logger.info(f"Angel One authentication successful for {client_code}")
                return {"success": True, "message": "Authentication successful"}
            else:
                logger.error(f"Angel One authentication failed: {data.get('message', 'Unknown error')}")
                return {"success": False, "message": data.get('message', 'Authentication failed')}
                
        except Exception as e:
            logger.error(f"Angel One authentication error: {str(e)}")
            return {"success": False, "message": f"Authentication error: {str(e)}"}
    
    def get_live_prices(self, symbols: List[str]) -> Dict:
        """Get live prices from Angel One API"""
        if not self.access_token:
            return {"success": False, "message": "Not authenticated"}
        
        try:
            # Symbol to token mapping
            token_mapping = {
                'NIFTY50': '99926000',
                'BANKNIFTY': '99926009', 
                'RELIANCE': '2885',
                'TCS': '11536'
            }
            
            url = f"{self.base_url}/rest/secure/angelbroking/order/v1/getLTP"
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.access_token}',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '127.0.0.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': 'fe80::216:3eff:fe00:0',
                'X-PrivateKey': self.api_key
            }
            
            # Prepare symbols and tokens
            symbol_tokens = [token_mapping.get(symbol, '1234') for symbol in symbols]
            
            payload = {
                "exchange": "NSE",
                "tradingsymbol": ",".join(symbols),
                "symboltoken": ",".join(symbol_tokens)
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            data = response.json()
            
            if data.get('status') and data.get('data'):
                # Format the response
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
                            'change': ((float(item.get('ltp', 0)) - float(item.get('close', 0))) / float(item.get('close', 1)) * 100) if float(item.get('close', 0)) > 0 else 0
                        })
                
                return {"success": True, "data": formatted_data}
            else:
                logger.error(f"LTP fetch failed: {data.get('message', 'Unknown error')}")
                return {"success": False, "message": data.get('message', 'LTP fetch failed')}
                
        except Exception as e:
            logger.error(f"Live price fetch error: {str(e)}")
            return {"success": False, "message": f"Price fetch error: {str(e)}"}

# Fallback realistic data service
class RealtimeDataSimulator:
    def __init__(self):
        # Current actual market prices (update these daily)
        self.base_prices = {
            'NIFTY50': 25294.30,  # From your TradingView screenshot
            'BANKNIFTY': 55408.45,
            'RELIANCE': 1428.16,
            'TCS': 4084.12
        }
    
    def get_realistic_data(self, symbols: List[str]) -> Dict:
        """Generate realistic live-like data"""
        data = []
        current_time = datetime.now()
        
        for symbol in symbols:
            base_price = self.base_prices.get(symbol, 1000)
            
            # Market hours based volatility
            hour = current_time.hour
            if 9 <= hour <= 15:
                if hour == 9:
                    volatility = 0.002  # Opening volatility
                elif hour == 15:
                    volatility = 0.0015  # Closing volatility
                elif 11 <= hour <= 13:
                    volatility = 0.0005  # Lunch time
                else:
                    volatility = 0.001  # Regular hours
            else:
                volatility = 0.0002  # After hours
            
            # Generate realistic movement
            import random
            change_percent = (random.random() - 0.5) * volatility * 2
            current_price = base_price * (1 + change_percent)
            
            # Calculate OHLC
            open_price = base_price * (1 + (random.random() - 0.5) * volatility * 0.5)
            high_price = max(current_price, open_price) * (1 + random.random() * volatility * 0.3)
            low_price = min(current_price, open_price) * (1 - random.random() * volatility * 0.3)
            
            data.append({
                'symbol': symbol,
                'ltp': round(current_price, 2),
                'open': round(open_price, 2),
                'high': round(high_price, 2),
                'low': round(low_price, 2),
                'close': base_price,
                'volume': random.randint(500000, 2000000),
                'timestamp': current_time.isoformat(),
                'change': round(change_percent * 100, 2),
                'isLive': False,
                'isRealistic': True
            })
        
        return {"success": True, "data": data}
import random
from datetime import datetime, timedelta
from typing import List
from app.models.schemas import MarketData

def generate_mock_data(symbol: str, days: int = 1) -> List[MarketData]:
    """Generate simple mock market data"""
    data = []
    base_price = get_base_price(symbol)
    
    # Generate hourly data for the specified days
    for i in range(days * 24):
        timestamp = datetime.now() - timedelta(hours=i)
        
        # Simple random walk
        change = random.uniform(-0.02, 0.02)  # +/- 2%
        price = base_price * (1 + change)
        
        data.append(MarketData(
            symbol=symbol,
            timestamp=timestamp,
            open=round(price * random.uniform(0.999, 1.001), 2),
            high=round(price * random.uniform(1.001, 1.02), 2),
            low=round(price * random.uniform(0.98, 0.999), 2),
            close=round(price, 2),
            volume=random.randint(10000, 1000000)
        ))
        
        base_price = price
    
    return list(reversed(data))  # Chronological order

def get_base_price(symbol: str) -> float:
    """Get base price for different symbols"""
    prices = {
        "NIFTY": 21500,
        "BANKNIFTY": 46000,
        "RELIANCE": 2800,
        "TCS": 3600,
        "INFY": 1650,
        "HDFCBANK": 1600,
        "ICICIBANK": 950,
        "ITC": 450,
        "HINDUNILVR": 2650,
        "BHARTIARTL": 900
    }
    return prices.get(symbol, 1000)
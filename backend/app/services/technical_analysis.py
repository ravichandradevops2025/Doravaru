import logging
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)

class TechnicalAnalyzer:
    def __init__(self):
        pass
    
    def calculate_sma(self, prices: List[float], period: int) -> Optional[float]:
        """Calculate Simple Moving Average"""
        if len(prices) < period:
            return None
        
        recent_prices = prices[-period:]
        return sum(recent_prices) / period
    
    def calculate_ema(self, prices: List[float], period: int) -> Optional[float]:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return None
        
        multiplier = 2 / (period + 1)
        # Start with SMA for initial EMA value
        sma = sum(prices[:period]) / period
        ema = sma
        
        # Calculate EMA for remaining values
        for price in prices[period:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        
        return ema
    
    def calculate_rsi(self, prices: List[float], period: int = 14) -> Optional[float]:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return None
        
        # Calculate price changes
        deltas = []
        for i in range(1, len(prices)):
            deltas.append(prices[i] - prices[i-1])
        
        # Separate gains and losses
        gains = [max(delta, 0) for delta in deltas]
        losses = [max(-delta, 0) for delta in deltas]
        
        # Calculate average gains and losses
        if len(gains) < period or len(losses) < period:
            return None
            
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def calculate_macd(self, prices: List[float], fast: int = 12, 
                      slow: int = 26, signal: int = 9) -> Optional[Dict]:
        """Calculate MACD"""
        if len(prices) < slow:
            return None
            
        ema_fast = self.calculate_ema(prices, fast)
        ema_slow = self.calculate_ema(prices, slow)
        
        if ema_fast is None or ema_slow is None:
            return None
        
        macd_line = ema_fast - ema_slow
        
        # For signal line, we'd need historical MACD values
        # Simplified version - using current MACD as signal approximation
        signal_line = macd_line * 0.9  # Simplified signal
        histogram = macd_line - signal_line
        
        return {
            "macd": macd_line,
            "signal": signal_line,
            "histogram": histogram
        }
    
    def calculate_bollinger_bands(self, prices: List[float], period: int = 20, 
                                std_dev: float = 2) -> Optional[Dict]:
        """Calculate Bollinger Bands"""
        if len(prices) < period:
            return None
        
        # Calculate SMA
        sma = self.calculate_sma(prices, period)
        if sma is None:
            return None
        
        # Calculate standard deviation
        recent_prices = prices[-period:]
        variance = sum((price - sma) ** 2 for price in recent_prices) / period
        std = variance ** 0.5
        
        return {
            "upper": sma + (std * std_dev),
            "middle": sma,
            "lower": sma - (std * std_dev)
        }
    
    def analyze_trend(self, data: Dict) -> Dict:
        """Analyze market trend and generate signals"""
        try:
            # Check if we have historical data
            if not data.get("success") or not data.get("data"):
                return {"success": False, "error": "Invalid data provided"}
            
            historical_data = data["data"]
            
            # Extract candle data if available
            if "data" in historical_data and isinstance(historical_data["data"], list):
                candles = historical_data["data"]
            else:
                return {"success": False, "error": "No historical candle data found"}
            
            if not candles or len(candles) < 20:
                return {"success": False, "error": "Insufficient historical data"}
            
            # Extract closing prices (assuming OHLCV format)
            closes = []
            for candle in candles:
                if isinstance(candle, list) and len(candle) >= 5:
                    # Format: [timestamp, open, high, low, close, volume]
                    closes.append(float(candle[4]))  # Close price
                elif isinstance(candle, dict):
                    closes.append(float(candle.get('close', 0)))
            
            if len(closes) < 20:
                return {"success": False, "error": "Insufficient price data"}
            
            # Calculate technical indicators
            current_price = closes[-1]
            sma_20 = self.calculate_sma(closes, 20)
            sma_50 = self.calculate_sma(closes, 50)
            ema_20 = self.calculate_ema(closes, 20)
            rsi = self.calculate_rsi(closes, 14)
            macd_data = self.calculate_macd(closes)
            bb_data = self.calculate_bollinger_bands(closes)
            
            # Generate trading signals
            signals = self.generate_signals(closes, sma_20, sma_50, rsi, macd_data, bb_data)
            
            # Determine trend
            trend = self.determine_trend(closes, sma_20, sma_50)
            
            return {
                "success": True,
                "current_price": current_price,
                "indicators": {
                    "sma_20": round(sma_20, 2) if sma_20 else None,
                    "sma_50": round(sma_50, 2) if sma_50 else None,
                    "ema_20": round(ema_20, 2) if ema_20 else None,
                    "rsi": round(rsi, 2) if rsi else None,
                    "macd": round(macd_data["macd"], 4) if macd_data else None,
                    "bb_upper": round(bb_data["upper"], 2) if bb_data else None,
                    "bb_lower": round(bb_data["lower"], 2) if bb_data else None
                },
                "signals": signals,
                "trend": trend,
                "timestamp": data.get("timestamp", "unknown")
            }
            
        except Exception as e:
            logger.error(f"Technical analysis error: {e}")
            return {"success": False, "error": str(e)}
    
    def generate_signals(self, closes: List[float], sma_20: Optional[float], 
                        sma_50: Optional[float], rsi: Optional[float], 
                        macd_data: Optional[Dict], bb_data: Optional[Dict]) -> List[Dict]:
        """Generate buy/sell signals based on technical indicators"""
        signals = []
        
        if len(closes) < 2:
            return signals
        
        current_price = closes[-1]
        prev_price = closes[-2]
        
        # RSI signals
        if rsi is not None:
            if rsi < 30:
                signals.append({
                    "type": "BUY",
                    "reason": f"RSI Oversold at {rsi:.1f}",
                    "strength": "HIGH",
                    "indicator": "RSI",
                    "value": rsi
                })
            elif rsi > 70:
                signals.append({
                    "type": "SELL", 
                    "reason": f"RSI Overbought at {rsi:.1f}",
                    "strength": "HIGH",
                    "indicator": "RSI",
                    "value": rsi
                })
            elif rsi > 55:
                signals.append({
                    "type": "BUY",
                    "reason": f"RSI Bullish at {rsi:.1f}",
                    "strength": "MEDIUM",
                    "indicator": "RSI",
                    "value": rsi
                })
            elif rsi < 45:
                signals.append({
                    "type": "SELL",
                    "reason": f"RSI Bearish at {rsi:.1f}",
                    "strength": "MEDIUM",
                    "indicator": "RSI",
                    "value": rsi
                })
        
        # Moving Average signals
        if sma_20 and sma_50:
            if current_price > sma_20 > sma_50:
                signals.append({
                    "type": "BUY",
                    "reason": f"Price above SMA20 (₹{sma_20:.2f}) > SMA50 (₹{sma_50:.2f})",
                    "strength": "MEDIUM",
                    "indicator": "SMA_TREND"
                })
            elif current_price < sma_20 < sma_50:
                signals.append({
                    "type": "SELL",
                    "reason": f"Price below SMA20 (₹{sma_20:.2f}) < SMA50 (₹{sma_50:.2f})",
                    "strength": "MEDIUM",
                    "indicator": "SMA_TREND"
                })
        
        # MACD signals
        if macd_data:
            macd_line = macd_data["macd"]
            signal_line = macd_data["signal"]
            
            if macd_line > signal_line and macd_line > 0:
                signals.append({
                    "type": "BUY",
                    "reason": "MACD Bullish (Above Signal & Zero)",
                    "strength": "MEDIUM",
                    "indicator": "MACD"
                })
            elif macd_line < signal_line and macd_line < 0:
                signals.append({
                    "type": "SELL",
                    "reason": "MACD Bearish (Below Signal & Zero)",
                    "strength": "MEDIUM",
                    "indicator": "MACD"
                })
        
        # Bollinger Bands signals
        if bb_data:
            if current_price < bb_data["lower"]:
                signals.append({
                    "type": "BUY",
                    "reason": f"Price below Lower Bollinger Band (₹{bb_data['lower']:.2f})",
                    "strength": "HIGH",
                    "indicator": "BOLLINGER"
                })
            elif current_price > bb_data["upper"]:
                signals.append({
                    "type": "SELL",
                    "reason": f"Price above Upper Bollinger Band (₹{bb_data['upper']:.2f})",
                    "strength": "HIGH",
                    "indicator": "BOLLINGER"
                })
        
        # Price momentum signals
        price_change = ((current_price - prev_price) / prev_price) * 100
        if abs(price_change) > 2:  # Significant price movement
            if price_change > 0:
                signals.append({
                    "type": "BUY" if price_change > 3 else "HOLD",
                    "reason": f"Strong upward momentum (+{price_change:.1f}%)",
                    "strength": "MEDIUM",
                    "indicator": "MOMENTUM"
                })
            else:
                signals.append({
                    "type": "SELL" if price_change < -3 else "HOLD",
                    "reason": f"Strong downward momentum ({price_change:.1f}%)",
                    "strength": "MEDIUM",
                    "indicator": "MOMENTUM"
                })
        
        return signals
    
    def determine_trend(self, closes: List[float], sma_20: Optional[float], 
                       sma_50: Optional[float]) -> str:
        """Determine overall market trend"""
        if len(closes) < 10:
            return "UNKNOWN"
        
        current_price = closes[-1]
        
        # Use moving averages if available
        if sma_20 and sma_50:
            if current_price > sma_20 > sma_50:
                return "BULLISH"
            elif current_price < sma_20 < sma_50:
                return "BEARISH"
        
        # Fallback to price momentum
        recent_avg = sum(closes[-5:]) / 5
        older_avg = sum(closes[-10:-5]) / 5
        
        change_percent = ((recent_avg - older_avg) / older_avg) * 100
        
        if change_percent > 1:
            return "BULLISH"
        elif change_percent < -1:
            return "BEARISH"
        else:
            return "SIDEWAYS"

# Global instance
technical_analyzer = TechnicalAnalyzer()
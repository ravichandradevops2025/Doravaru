import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

class TechnicalAnalyzer:
    def __init__(self):
        pass
    
    def calculate_sma(self, prices: List[float], period: int) -> List[float]:
        """Calculate Simple Moving Average"""
        if len(prices) < period:
            return []
        
        sma = []
        for i in range(period - 1, len(prices)):
            avg = sum(prices[i - period + 1:i + 1]) / period
            sma.append(avg)
        return sma
    
    def calculate_ema(self, prices: List[float], period: int) -> List[float]:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return []
        
        multiplier = 2 / (period + 1)
        ema = [prices[0]]
        
        for price in prices[1:]:
            ema_value = (price * multiplier) + (ema[-1] * (1 - multiplier))
            ema.append(ema_value)
        
        return ema[period - 1:]
    
    def calculate_rsi(self, prices: List[float], period: int = 14) -> List[float]:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return []
        
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = [delta if delta > 0 else 0 for delta in deltas]
        losses = [-delta if delta < 0 else 0 for delta in deltas]
        
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        
        rsi = []
        for i in range(period, len(deltas)):
            if avg_loss == 0:
                rsi.append(100)
            else:
                rs = avg_gain / avg_loss
                rsi.append(100 - (100 / (1 + rs)))
            
            # Update averages
            avg_gain = ((avg_gain * (period - 1)) + gains[i]) / period
            avg_loss = ((avg_loss * (period - 1)) + losses[i]) / period
        
        return rsi
    
    def calculate_macd(self, prices: List[float], fast: int = 12, 
                      slow: int = 26, signal: int = 9) -> Dict:
        """Calculate MACD"""
        ema_fast = self.calculate_ema(prices, fast)
        ema_slow = self.calculate_ema(prices, slow)
        
        if len(ema_fast) < len(ema_slow):
            ema_slow = ema_slow[-len(ema_fast):]
        elif len(ema_slow) < len(ema_fast):
            ema_fast = ema_fast[-len(ema_slow):]
        
        macd_line = [fast_val - slow_val for fast_val, slow_val in zip(ema_fast, ema_slow)]
        signal_line = self.calculate_ema(macd_line, signal)
        
        # Align arrays
        if len(signal_line) < len(macd_line):
            macd_line = macd_line[-len(signal_line):]
        
        histogram = [macd - signal for macd, signal in zip(macd_line, signal_line)]
        
        return {
            "macd": macd_line,
            "signal": signal_line,
            "histogram": histogram
        }
    
    def analyze_trend(self, data: Dict) -> Dict:
        """Analyze market trend and generate signals"""
        try:
            # Extract OHLC data
            if not data.get("success") or not data.get("data"):
                return {"error": "Invalid data"}
            
            candles = data["data"]["data"]
            if not candles:
                return {"error": "No candle data"}
            
            # Extract closing prices
            closes = [float(candle[4]) for candle in candles]  # Close price is index 4
            highs = [float(candle[2]) for candle in candles]   # High price is index 2
            lows = [float(candle[3]) for candle in candles]    # Low price is index 3
            
            if len(closes) < 50:
                return {"error": "Insufficient data for analysis"}
            
            # Calculate indicators
            sma_20 = self.calculate_sma(closes, 20)
            sma_50 = self.calculate_sma(closes, 50)
            ema_20 = self.calculate_ema(closes, 20)
            rsi = self.calculate_rsi(closes, 14)
            macd_data = self.calculate_macd(closes)
            
            # Generate signals
            signals = self.generate_signals(closes, sma_20, sma_50, ema_20, rsi, macd_data)
            
            current_price = closes[-1]
            
            return {
                "success": True,
                "current_price": current_price,
                "indicators": {
                    "sma_20": sma_20[-1] if sma_20 else None,
                    "sma_50": sma_50[-1] if sma_50 else None,
                    "ema_20": ema_20[-1] if ema_20 else None,
                    "rsi": rsi[-1] if rsi else None,
                    "macd": macd_data["macd"][-1] if macd_data["macd"] else None,
                    "signal": macd_data["signal"][-1] if macd_data["signal"] else None
                },
                "signals": signals,
                "trend": self.determine_trend(closes, sma_20, sma_50)
            }
            
        except Exception as e:
            logger.error(f"Technical analysis error: {e}")
            return {"error": str(e)}
    
    def generate_signals(self, closes: List[float], sma_20: List[float], 
                        sma_50: List[float], ema_20: List[float], 
                        rsi: List[float], macd_data: Dict) -> List[Dict]:
        """Generate buy/sell signals based on technical indicators"""
        signals = []
        
        if len(closes) < 2 or not all([sma_20, sma_50, rsi, macd_data["macd"]]):
            return signals
        
        current_price = closes[-1]
        prev_price = closes[-2]
        
        # RSI signals
        if rsi:
            current_rsi = rsi[-1]
            if current_rsi < 30:
                signals.append({
                    "type": "BUY",
                    "reason": "RSI Oversold",
                    "strength": "HIGH",
                    "indicator": "RSI",
                    "value": current_rsi
                })
            elif current_rsi > 70:
                signals.append({
                    "type": "SELL", 
                    "reason": "RSI Overbought",
                    "strength": "HIGH",
                    "indicator": "RSI",
                    "value": current_rsi
                })
        
        # Moving Average Crossover
        if len(sma_20) >= 2 and len(sma_50) >= 2:
            if sma_20[-1] > sma_50[-1] and sma_20[-2] <= sma_50[-2]:
                signals.append({
                    "type": "BUY",
                    "reason": "Golden Cross (SMA 20 > SMA 50)",
                    "strength": "MEDIUM",
                    "indicator": "SMA_CROSS"
                })
            elif sma_20[-1] < sma_50[-1] and sma_20[-2] >= sma_50[-2]:
                signals.append({
                    "type": "SELL",
                    "reason": "Death Cross (SMA 20 < SMA 50)",
                    "strength": "MEDIUM", 
                    "indicator": "SMA_CROSS"
                })
        
        # MACD signals
        if len(macd_data["macd"]) >= 2 and len(macd_data["signal"]) >= 2:
            macd_line = macd_data["macd"]
            signal_line = macd_data["signal"]
            
            if macd_line[-1] > signal_line[-1] and macd_line[-2] <= signal_line[-2]:
                signals.append({
                    "type": "BUY",
                    "reason": "MACD Bullish Crossover",
                    "strength": "MEDIUM",
                    "indicator": "MACD"
                })
            elif macd_line[-1] < signal_line[-1] and macd_line[-2] >= signal_line[-2]:
                signals.append({
                    "type": "SELL",
                    "reason": "MACD Bearish Crossover", 
                    "strength": "MEDIUM",
                    "indicator": "MACD"
                })
        
        return signals
    
    def determine_trend(self, closes: List[float], sma_20: List[float], 
                       sma_50: List[float]) -> str:
        """Determine overall market trend"""
        if not closes or len(closes) < 10:
            return "UNKNOWN"
        
        current_price = closes[-1]
        
        if sma_20 and sma_50:
            if current_price > sma_20[-1] > sma_50[-1]:
                return "BULLISH"
            elif current_price < sma_20[-1] < sma_50[-1]:
                return "BEARISH"
        
        # Price momentum check
        recent_avg = sum(closes[-5:]) / 5
        older_avg = sum(closes[-10:-5]) / 5
        
        if recent_avg > older_avg * 1.02:
            return "BULLISH"
        elif recent_avg < older_avg * 0.98:
            return "BEARISH"
        
        return "SIDEWAYS"

# Global instance
technical_analyzer = TechnicalAnalyzer()
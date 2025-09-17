# app/services/technical_analysis.py
import pandas as pd
import numpy as np
import talib
from typing import Dict, List, Optional, Tuple
from app.models.schemas import MarketData, TechnicalIndicators
import logging

logger = logging.getLogger(__name__)

class TechnicalAnalysisEngine:
    """Calculate technical indicators and detect patterns"""
    
    def __init__(self):
        pass
    
    def calculate_indicators(self, market_data: List[MarketData]) -> TechnicalIndicators:
        """Calculate all technical indicators for given market data"""
        if len(market_data) < 50:
            logger.warning("Insufficient data for reliable technical analysis")
            return None
            
        # Convert to pandas DataFrame
        df = pd.DataFrame([{
            'timestamp': d.timestamp,
            'open': d.open,
            'high': d.high,
            'low': d.low,
            'close': d.close,
            'volume': d.volume
        } for d in market_data])
        
        df = df.sort_values('timestamp')
        
        # Calculate indicators
        close_prices = df['close'].values
        high_prices = df['high'].values
        low_prices = df['low'].values
        volume = df['volume'].values
        
        try:
            # Moving Averages
            ema_20 = talib.EMA(close_prices, timeperiod=20)
            ema_50 = talib.EMA(close_prices, timeperiod=50)
            sma_200 = talib.SMA(close_prices, timeperiod=200) if len(close_prices) >= 200 else None
            
            # Momentum Indicators
            rsi = talib.RSI(close_prices, timeperiod=14)
            macd, macd_signal, _ = talib.MACD(close_prices, fastperiod=12, slowperiod=26, signalperiod=9)
            
            # Volatility Indicators
            atr = talib.ATR(high_prices, low_prices, close_prices, timeperiod=14)
            bb_upper, bb_middle, bb_lower = talib.BBANDS(close_prices, timeperiod=20, nbdevup=2, nbdevdn=2)
            
            # Trend Indicators
            adx = talib.ADX(high_prices, low_prices, close_prices, timeperiod=14)
            
            # Stochastic
            stoch_k, stoch_d = talib.STOCH(high_prices, low_prices, close_prices, 
                                          fastk_period=14, slowk_period=3, slowd_period=3)
            
            # Get latest values (most recent)
            latest_idx = -1
            
            indicators = TechnicalIndicators(
                symbol=market_data[0].symbol,
                timestamp=df.iloc[latest_idx]['timestamp'],
                ema_20=float(ema_20[latest_idx]) if not np.isnan(ema_20[latest_idx]) else None,
                ema_50=float(ema_50[latest_idx]) if not np.isnan(ema_50[latest_idx]) else None,
                sma_200=float(sma_200[latest_idx]) if sma_200 is not None and not np.isnan(sma_200[latest_idx]) else None,
                rsi=float(rsi[latest_idx]) if not np.isnan(rsi[latest_idx]) else None,
                macd=float(macd[latest_idx]) if not np.isnan(macd[latest_idx]) else None,
                macd_signal=float(macd_signal[latest_idx]) if not np.isnan(macd_signal[latest_idx]) else None,
                atr=float(atr[latest_idx]) if not np.isnan(atr[latest_idx]) else None,
                adx=float(adx[latest_idx]) if not np.isnan(adx[latest_idx]) else None,
                bb_upper=float(bb_upper[latest_idx]) if not np.isnan(bb_upper[latest_idx]) else None,
                bb_lower=float(bb_lower[latest_idx]) if not np.isnan(bb_lower[latest_idx]) else None,
                stoch_k=float(stoch_k[latest_idx]) if not np.isnan(stoch_k[latest_idx]) else None,
                stoch_d=float(stoch_d[latest_idx]) if not np.isnan(stoch_d[latest_idx]) else None
            )
            
            return indicators
            
        except Exception as e:
            logger.error(f"Error calculating technical indicators: {e}")
            return None
    
    def detect_support_resistance(self, market_data: List[MarketData], lookback: int = 20) -> Dict[str, List[float]]:
        """Detect key support and resistance levels"""
        if len(market_data) < lookback * 2:
            return {"support": [], "resistance": []}
        
        df = pd.DataFrame([{
            'high': d.high,
            'low': d.low,
            'close': d.close
        } for d in market_data])
        
        highs = df['high'].values
        lows = df['low'].values
        
        # Find local maxima (resistance) and minima (support)
        resistance_levels = []
        support_levels = []
        
        for i in range(lookback, len(highs) - lookback):
            # Resistance: local high
            if highs[i] == max(highs[i-lookback:i+lookback+1]):
                resistance_levels.append(highs[i])
            
            # Support: local low  
            if lows[i] == min(lows[i-lookback:i+lookback+1]):
                support_levels.append(lows[i])
        
        # Remove duplicates and sort
        resistance_levels = sorted(list(set([round(r, 2) for r in resistance_levels])), reverse=True)[:5]
        support_levels = sorted(list(set([round(s, 2) for s in support_levels])))[:5]
        
        return {
            "support": support_levels,
            "resistance": resistance_levels
        }
    
    def detect_patterns(self, market_data: List[MarketData]) -> List[str]:
        """Detect chart patterns"""
        if len(market_data) < 20:
            return []
            
        patterns = []
        df = pd.DataFrame([{
            'open': d.open,
            'high': d.high,
            'low': d.low,
            'close': d.close
        } for d in market_data])
        
        # Simple pattern detection
        close_prices = df['close'].values
        
        # Trending patterns
        if len(close_prices) >= 10:
            recent_trend = np.polyfit(range(10), close_prices[-10:], 1)[0]
            if recent_trend > 0.5:
                patterns.append("uptrend")
            elif recent_trend < -0.5:
                patterns.append("downtrend")
        
        # Breakout patterns
        recent_high = max(close_prices[-5:])
        previous_resistance = max(close_prices[-20:-5]) if len(close_prices) >= 20 else recent_high
        
        if recent_high > previous_resistance * 1.02:
            patterns.append("breakout_resistance")
        
        recent_low = min(close_prices[-5:])
        previous_support = min(close_prices[-20:-5]) if len(close_prices) >= 20 else recent_low
        
        if recent_low < previous_support * 0.98:
            patterns.append("breakdown_support")
        
        return patterns
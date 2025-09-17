from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum

class ScenarioType(str, Enum):
    BULL = "bull"
    BEAR = "bear" 
    NEUTRAL = "neutral"

class NewsReference(BaseModel):
    source: str
    title: str
    url: str
    sentiment: float = Field(ge=-1, le=1)

class TradeIdea(BaseModel):
    symbol: str
    exchange: str
    timeframe: str
    timestamp: datetime
    scenario: ScenarioType
    probability: int = Field(ge=0, le=100)
    entry: float
    stop_loss: float
    targets: List[float] = Field(min_items=2, max_items=2)
    atr: float
    risk_percent: float
    position_size_lots_shares: int
    risk_reward_t1: float
    confidence: int = Field(ge=0, le=100)
    indicators_used: List[str]
    news_references: List[NewsReference]
    rationale: List[str]
    notes: str

class UserRiskProfile(BaseModel):
    max_daily_risk_percent: float = 2.0
    default_position_size: float = 10000.0
    allow_shorting: bool = True
    portfolio_value: float = 100000.0

class MarketData(BaseModel):
    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    
class TechnicalIndicators(BaseModel):
    symbol: str
    timestamp: datetime
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    sma_200: Optional[float] = None
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    atr: Optional[float] = None
    adx: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_lower: Optional[float] = None
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class MarketDataDB(Base):
    __tablename__ = "market_data"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    exchange = Column(String)
    timestamp = Column(DateTime, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

class TechnicalIndicatorsDB(Base):
    __tablename__ = "technical_indicators"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    ema_20 = Column(Float)
    ema_50 = Column(Float)
    sma_200 = Column(Float)
    rsi = Column(Float)
    macd = Column(Float)
    macd_signal = Column(Float)
    atr = Column(Float)
    adx = Column(Float)
    bb_upper = Column(Float)
    bb_lower = Column(Float)
    stoch_k = Column(Float)
    stoch_d = Column(Float)
    created_at = Column(DateTime, server_default=func.now())

class NewsDB(Base):
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String)
    title = Column(String)
    url = Column(String, unique=True)
    content = Column(Text)
    sentiment_score = Column(Float)
    published_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

class TradeIdeasDB(Base):
    __tablename__ = "trade_ideas"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    exchange = Column(String)
    timeframe = Column(String)
    scenario = Column(String)
    entry = Column(Float)
    stop_loss = Column(Float)
    targets = Column(JSON)  # Store as JSON array
    confidence = Column(Integer)
    trade_data = Column(JSON)  # Store complete trade idea
    created_at = Column(DateTime, server_default=func.now())

class AuditLogDB(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)
    input_data = Column(JSON)
    output_data = Column(JSON)
    user_id = Column(String)
    timestamp = Column(DateTime, server_default=func.now())
# app/services/data_ingestion.py
import asyncio
import aiohttp
import feedparser
import requests
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from app.models.schemas import MarketData, NewsReference
from app.database.database import get_db
from app.database.models import NewsDB, MarketDataDB
import logging

logger = logging.getLogger(__name__)

class DataIngestionService:
    def __init__(self):
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

class NewsIngestionService(DataIngestionService):
    """Collect and parse news from multiple sources"""
    
    RSS_FEEDS = {
        "moneycontrol": "https://www.moneycontrol.com/rss/business.xml",
        "economic_times": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        "business_standard": "https://www.business-standard.com/rss/markets-106.rss"
    }
    
    async def fetch_news_headlines(self) -> List[NewsReference]:
        """Fetch latest news headlines from RSS feeds"""
        all_headlines = []
        
        for source, url in self.RSS_FEEDS.items():
            try:
                async with self.session.get(url) as response:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    for entry in feed.entries[:10]:  # Get top 10 from each source
                        sentiment = await self._analyze_sentiment(entry.title + " " + entry.get('summary', ''))
                        
                        headline = NewsReference(
                            source=source,
                            title=entry.title,
                            url=entry.link,
                            sentiment=sentiment
                        )
                        all_headlines.append(headline)
                        
            except Exception as e:
                logger.error(f"Error fetching news from {source}: {e}")
                
        return all_headlines
    
    async def _analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment of text using simple keyword-based approach"""
        # For production, integrate with proper sentiment analysis API
        positive_keywords = ['bullish', 'gain', 'rise', 'up', 'positive', 'growth', 'rally', 'surge', 'jump']
        negative_keywords = ['bearish', 'fall', 'down', 'negative', 'decline', 'crash', 'drop', 'loss', 'plunge']
        
        text_lower = text.lower()
        pos_count = sum(1 for word in positive_keywords if word in text_lower)
        neg_count = sum(1 for word in negative_keywords if word in text_lower)
        
        if pos_count + neg_count == 0:
            return 0.0
            
        return (pos_count - neg_count) / (pos_count + neg_count)

class MarketDataService(DataIngestionService):
    """Mock market data service - replace with real broker API"""
    
    SYMBOLS = ["NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "ITC", "HINDUNILVR", "BHARTIARTL"]
    
    async def fetch_real_time_data(self, symbol: str, timeframe: str = "1min") -> List[MarketData]:
        """Mock real-time market data - replace with actual API"""
        # Generate mock OHLC data
        base_price = self._get_base_price(symbol)
        data_points = []
        
        for i in range(100):  # Last 100 candles
            timestamp = datetime.now() - timedelta(minutes=i)
            
            # Simple random walk for mock data
            open_price = base_price + np.random.normal(0, base_price * 0.01)
            high_price = open_price + abs(np.random.normal(0, base_price * 0.005))
            low_price = open_price - abs(np.random.normal(0, base_price * 0.005))
            close_price = open_price + np.random.normal(0, base_price * 0.008)
            volume = int(np.random.normal(100000, 50000))
            
            data_points.append(MarketData(
                symbol=symbol,
                timestamp=timestamp,
                open=round(open_price, 2),
                high=round(high_price, 2),
                low=round(low_price, 2),
                close=round(close_price, 2),
                volume=max(volume, 1000)
            ))
            
            base_price = close_price
            
        return list(reversed(data_points))  # Chronological order
    
    def _get_base_price(self, symbol: str) -> float:
        """Get base price for mock data generation"""
        base_prices = {
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
        return base_prices.get(symbol, 1000)

class SocialSentimentService(DataIngestionService):
    """Mock social sentiment service - replace with Twitter API"""
    
    async def fetch_market_tweets(self, symbol: str) -> List[Dict]:
        """Mock social sentiment data"""
        # In production, integrate with Twitter API v2
        mock_tweets = [
            {"text": f"{symbol} looking bullish on technical charts", "sentiment": 0.6},
            {"text": f"Bearish divergence spotted in {symbol}", "sentiment": -0.4},
            {"text": f"{symbol} breaking key resistance levels", "sentiment": 0.7},
            {"text": f"Market sentiment turning negative for {symbol}", "sentiment": -0.5}
        ]
        return mock_tweets
# app/services/ai_signal_generator.py
import json
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
import openai
from app.models.schemas import (
    TradeIdea, MarketData, TechnicalIndicators, 
    NewsReference, UserRiskProfile, ScenarioType
)
from app.services.technical_analysis import TechnicalAnalysisEngine
import logging

logger = logging.getLogger(__name__)

class AISignalGenerator:
    """Generate trade ideas using LLM analysis"""
    
    def __init__(self, api_key: str):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.ta_engine = TechnicalAnalysisEngine()
        
    async def generate_trade_idea(
        self,
        symbol: str,
        exchange: str,
        timeframe: str,
        market_data: List[MarketData],
        indicators: TechnicalIndicators,
        news_headlines: List[NewsReference],
        risk_profile: UserRiskProfile,
        support_resistance: Dict[str, List[float]],
        patterns: List[str]
    ) -> Optional[TradeIdea]:
        """Generate comprehensive trade idea using AI analysis"""
        
        try:
            # Prepare structured input for LLM
            market_context = self._prepare_market_context(
                symbol, market_data, indicators, news_headlines,
                support_resistance, patterns
            )
            
            # Generate AI analysis
            ai_response = await self._call_llm(market_context, risk_profile)
            
            if not ai_response:
                return None
                
            # Parse and validate response
            trade_idea = self._parse_trade_response(
                ai_response, symbol, exchange, timeframe, 
                market_data[-1], indicators, news_headlines, risk_profile
            )
            
            return trade_idea
            
        except Exception as e:
            logger.error(f"Error generating trade idea for {symbol}: {e}")
            return None
    
    def _prepare_market_context(
        self,
        symbol: str,
        market_data: List[MarketData],
        indicators: TechnicalIndicators,
        news_headlines: List[NewsReference],
        support_resistance: Dict[str, List[float]],
        patterns: List[str]
    ) -> Dict:
        """Prepare structured market context for LLM"""
        
        latest_candle = market_data[-1]
        
        return {
            "symbol": symbol,
            "current_price": latest_candle.close,
            "timestamp": latest_candle.timestamp.isoformat(),
            "ohlc_last_5": [
                {
                    "timestamp": candle.timestamp.isoformat(),
                    "open": candle.open,
                    "high": candle.high,
                    "low": candle.low,
                    "close": candle.close,
                    "volume": candle.volume
                } for candle in market_data[-5:]
            ],
            "technical_indicators": {
                "ema_20": indicators.ema_20,
                "ema_50": indicators.ema_50,
                "sma_200": indicators.sma_200,
                "rsi": indicators.rsi,
                "macd": indicators.macd,
                "macd_signal": indicators.macd_signal,
                "atr": indicators.atr,
                "adx": indicators.adx,
                "bollinger_bands": {
                    "upper": indicators.bb_upper,
                    "lower": indicators.bb_lower
                },
                "stochastic": {
                    "k": indicators.stoch_k,
                    "d": indicators.stoch_d
                }
            },
            "support_resistance": support_resistance,
            "detected_patterns": patterns,
            "news_sentiment": {
                "headlines": [
                    {
                        "title": news.title,
                        "sentiment": news.sentiment,
                        "source": news.source
                    } for news in news_headlines[:5]  # Top 5 most relevant
                ],
                "average_sentiment": sum(n.sentiment for n in news_headlines) / len(news_headlines) if news_headlines else 0
            }
        }
    
    async def _call_llm(self, market_context: Dict, risk_profile: UserRiskProfile) -> Optional[str]:
        """Call LLM with market analysis prompt"""
        
        system_prompt = """You are a SEBI-registered and NISM-certified market analyst with deep expertise in technical analysis and risk management. 

Your role is to analyze the provided market data and generate actionable trade ideas with proper risk management.

CRITICAL RULES:
1. Always include proper disclaimers
2. Focus on risk management and position sizing
3. Provide clear entry, stop-loss, and target levels
4. Give confidence ratings based on confluence of signals
5. Reference specific technical indicators and news sentiment in rationale

Response format must be valid JSON only, no other text."""

        user_prompt = f"""
Analyze this market data and generate a trade idea:

MARKET CONTEXT:
{json.dumps(market_context, indent=2)}

USER RISK PROFILE:
- Max daily risk: {risk_profile.max_daily_risk_percent}%
- Portfolio value: ₹{risk_profile.portfolio_value:,.0f}
- Allow shorting: {risk_profile.allow_shorting}

Generate a trade idea following this exact JSON schema:
{{
  "scenario": "bull|bear|neutral",
  "probability": 0-100,
  "entry": <entry_price>,
  "stop_loss": <stop_loss_price>,
  "targets": [<target1>, <target2>],
  "risk_percent": <calculated_risk_percent>,
  "confidence": 0-100,
  "indicators_used": ["list", "of", "indicators"],
  "rationale": ["reason1", "reason2", "reason3"],
  "notes": "additional context"
}}

Consider:
- Current price: {market_context['current_price']}
- RSI: {market_context['technical_indicators']['rsi']}
- MACD: {market_context['technical_indicators']['macd']}
- Support levels: {market_context['support_resistance']['support']}
- Resistance levels: {market_context['support_resistance']['resistance']}
- News sentiment: {market_context['news_sentiment']['average_sentiment']}
- Detected patterns: {market_context['detected_patterns']}

Provide only the JSON response."""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error calling LLM: {e}")
            return None
    
    def _parse_trade_response(
        self,
        ai_response: str,
        symbol: str,
        exchange: str,
        timeframe: str,
        latest_candle: MarketData,
        indicators: TechnicalIndicators,
        news_headlines: List[NewsReference],
        risk_profile: UserRiskProfile
    ) -> Optional[TradeIdea]:
        """Parse and validate LLM response"""
        
        try:
            # Clean response and parse JSON
            clean_response = ai_response.replace("```json", "").replace("```", "").strip()
            trade_data = json.loads(clean_response)
            
            # Calculate position size
            entry = trade_data["entry"]
            stop_loss = trade_data["stop_loss"]
            risk_amount = risk_profile.portfolio_value * (trade_data["risk_percent"] / 100)
            position_size = int(risk_amount / abs(entry - stop_loss))
            
            # Calculate risk/reward ratio
            target_1 = trade_data["targets"][0]
            risk_reward = abs(target_1 - entry) / abs(entry - stop_loss)
            
            # Create trade idea
            trade_idea = TradeIdea(
                symbol=symbol,
                exchange=exchange,
                timeframe=timeframe,
                timestamp=datetime.now(),
                scenario=ScenarioType(trade_data["scenario"]),
                probability=trade_data["probability"],
                entry=entry,
                stop_loss=stop_loss,
                targets=trade_data["targets"],
                atr=indicators.atr or 0.0,
                risk_percent=trade_data["risk_percent"],
                position_size_lots_shares=position_size,
                risk_reward_t1=round(risk_reward, 2),
                confidence=trade_data["confidence"],
                indicators_used=trade_data["indicators_used"],
                news_references=news_headlines[:3],  # Top 3 most relevant
                rationale=trade_data["rationale"],
                notes=trade_data.get("notes", "")
            )
            
            return trade_idea
            
        except Exception as e:
            logger.error(f"Error parsing trade response: {e}")
            return None
from typing import Dict, List, Optional, Tuple
from app.models.schemas import TradeIdea, UserRiskProfile, TechnicalIndicators
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class RiskManagementEngine:
    """Comprehensive risk management and position sizing"""
    
    def __init__(self):
        self.max_portfolio_risk = 10.0  # Max 10% portfolio risk across all positions
        self.min_risk_reward = 1.5      # Minimum risk/reward ratio
        self.max_position_size = 0.20   # Max 20% of portfolio in single position
        
   def validate_trade_idea(self, trade_idea: TradeIdea, risk_profile: UserRiskProfile) -> Tuple[bool, List[str]]:
        """Validate trade idea against risk management rules"""
        
        warnings = []
        is_valid = True
        
        # 1. Stop loss validation
        stop_loss_percent = abs(trade_idea.entry - trade_idea.stop_loss) / trade_idea.entry * 100
        if stop_loss_percent < 0.5:
            warnings.append("Stop loss too tight (<0.5%), may get stopped out prematurely")
        elif stop_loss_percent > 5.0:
            warnings.append("Stop loss too wide (>5%), excessive risk per trade")
            
        # 2. Risk/reward validation
        if trade_idea.risk_reward_t1 < self.min_risk_reward:
            warnings.append(f"Risk/reward ratio {trade_idea.risk_reward_t1:.2f} below minimum {self.min_risk_reward}")
            is_valid = False
            
        # 3. Position size validation
        position_value = trade_idea.position_size_lots_shares * trade_idea.entry
        portfolio_percentage = position_value / risk_profile.portfolio_value
        
        if portfolio_percentage > self.max_position_size:
            warnings.append(f"Position size {portfolio_percentage:.1%} exceeds maximum {self.max_position_size:.1%}")
            is_valid = False
            
        # 4. Risk percentage validation
        if trade_idea.risk_percent > risk_profile.max_daily_risk_percent:
            warnings.append(f"Trade risk {trade_idea.risk_percent:.1f}% exceeds daily limit {risk_profile.max_daily_risk_percent:.1f}%")
            is_valid = False
            
        # 5. Confidence validation
        if trade_idea.confidence < 60:
            warnings.append("Low confidence trade (<60%), consider reducing position size")
            
        return is_valid, warnings
    
    def calculate_optimal_position_size(
        self, 
        entry_price: float, 
        stop_loss: float, 
        risk_profile: UserRiskProfile,
        confidence: int
    ) -> int:
        """Calculate optimal position size based on risk management rules"""
        
        # Base risk calculation
        base_risk_amount = risk_profile.portfolio_value * (risk_profile.max_daily_risk_percent / 100)
        
        # Adjust based on confidence
        confidence_multiplier = confidence / 100.0
        adjusted_risk_amount = base_risk_amount * confidence_multiplier
        
        # Calculate position size
        risk_per_share = abs(entry_price - stop_loss)
        position_size = int(adjusted_risk_amount / risk_per_share)
        
        # Cap at maximum position size
        max_shares_by_portfolio = int((risk_profile.portfolio_value * self.max_position_size) / entry_price)
        position_size = min(position_size, max_shares_by_portfolio)
        
        return max(position_size, 1)  # Minimum 1 share
    
    def assess_market_conditions(self, indicators: TechnicalIndicators) -> Dict[str, any]:
        """Assess overall market conditions for risk adjustment"""
        
        conditions = {
            "trend_strength": "neutral",
            "volatility": "normal",
            "risk_adjustment": 1.0
        }
        
        # Trend assessment
        if indicators.adx and indicators.adx > 25:
            conditions["trend_strength"] = "strong"
        elif indicators.adx and indicators.adx < 20:
            conditions["trend_strength"] = "weak"
            conditions["risk_adjustment"] *= 0.8  # Reduce position in weak trends
            
        # Volatility assessment using ATR
        if indicators.atr:
            # Assuming these are percentage-based thresholds
            if indicators.atr > 3.0:  # High volatility
                conditions["volatility"] = "high"
                conditions["risk_adjustment"] *= 0.7  # Reduce position in high volatility
            elif indicators.atr < 1.0:  # Low volatility
                conditions["volatility"] = "low"
                
        return conditions
    
    def generate_risk_report(self, trade_ideas: List[TradeIdea]) -> Dict[str, any]:
        """Generate comprehensive risk report for portfolio"""
        
        if not trade_ideas:
            return {"total_risk": 0, "recommendations": ["No active positions"]}
            
        total_risk = sum(idea.risk_percent for idea in trade_ideas)
        total_exposure = sum(idea.position_size_lots_shares * idea.entry for idea in trade_ideas)
        
        recommendations = []
        
        if total_risk > self.max_portfolio_risk:
            recommendations.append(f"Total portfolio risk {total_risk:.1f}% exceeds maximum {self.max_portfolio_risk:.1f}%")
            
        # Check correlation risk (simplified)
        symbols = [idea.symbol for idea in trade_ideas]
        if len(set(symbols)) < len(symbols):
            recommendations.append("Multiple positions in same symbol increases concentration risk")
            
        return {
            "total_risk_percent": total_risk,
            "total_exposure": total_exposure,
            "position_count": len(trade_ideas),
            "avg_confidence": sum(idea.confidence for idea in trade_ideas) / len(trade_ideas),
            "recommendations": recommendations
        }

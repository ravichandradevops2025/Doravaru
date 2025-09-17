import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Box,
  Chip,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  TrendingDown,
  ShowChart
} from '@mui/icons-material';

import TradeCard from '../components/TradeCard';
import MarketChart from '../components/MarketChart';
import NewsPanel from '../components/NewsPanel';
import { apiService } from '../services/api';

const Dashboard = () => {
  const [marketStatus, setMarketStatus] = useState(null);
  const [activeSymbol, setActiveSymbol] = useState('NIFTY');
  const [tradeIdea, setTradeIdea] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [news, setNews] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Default risk profile
  const defaultRiskProfile = {
    max_daily_risk_percent: 2.0,
    default_position_size: 10000.0,
    allow_shorting: true,
    portfolio_value: 100000.0
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeSymbol) {
      loadMarketData();
    }
  }, [activeSymbol]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const [statusData, newsData] = await Promise.all([
        apiService.getMarketStatus(),
        apiService.getNews()
      ]);
      setMarketStatus(statusData);
      setNews(newsData.headlines.slice(0, 5));
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadMarketData = async () => {
    try {
      const data = await apiService.getMarketData(activeSymbol);
      setMarketData(data);
    } catch (err) {
      console.error('Error loading market data:', err);
    }
  };

  const generateTradeIdea = async () => {
    setLoading(true);
    setError(null);
    setTradeIdea(null);
    
    try {
      const result = await apiService.generateTradeIdea(activeSymbol, defaultRiskProfile);
      setTradeIdea(result);
    } catch (err) {
      setError(err.message || 'Failed to generate trade idea');
    } finally {
      setLoading(false);
    }
  };

  const popularSymbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK'];

  if (loadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Doravaru Platform...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Market Status Bar */}
      <Card sx={{ mb: 3, bgcolor: marketStatus?.is_open ? '#1b5e20' : '#b71c1c' }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <ShowChart sx={{ mr: 1 }} />
            </Grid>
            <Grid item>
              <Typography variant="h6">
                Market Status: {marketStatus?.status || 'Loading...'}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2">
                {marketStatus?.current_time ? 
                  new Date(marketStatus.current_time).toLocaleString() : 
                  'Loading...'
                }
              </Typography>
            </Grid>
            <Grid item xs>
              <Typography variant="body2" sx={{ ml: 2 }}>
                Next Session: {marketStatus?.next_session || 'N/A'}
              </Typography>
            </Grid>
            <Grid item>
              <Chip 
                label="LIVE DEMO" 
                color="warning" 
                variant="filled"
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left Column - Chart and Analysis */}
        <Grid item xs={12} md={8}>
          {/* Symbol Selection */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Symbol for AI Analysis
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {popularSymbols.map(symbol => (
                  <Chip
                    key={symbol}
                    label={symbol}
                    clickable
                    color={activeSymbol === symbol ? 'primary' : 'default'}
                    onClick={() => setActiveSymbol(symbol)}
                    variant={activeSymbol === symbol ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {activeSymbol} - Live Chart
              </Typography>
              {marketData ? (
                <MarketChart data={marketData.data} symbol={activeSymbol} />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Loading market data...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis Button */}
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs>
                  <Typography variant="h6">
                    🤖 AI Trade Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate comprehensive trade idea using advanced algorithms
                  </Typography>
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={generateTradeIdea}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Assessment />}
                    sx={{
                      background: 'linear-gradient(45deg, #00e676, #00bcd4)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #00c853, #0097a7)',
                      }
                    }}
                  >
                    {loading ? 'Analyzing...' : 'Generate Trade Idea'}
                  </Button>
                </Grid>
              </Grid>
              
              {loading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    🔍 Analyzing market data, technical indicators, and news sentiment...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Trade Ideas and News */}
        <Grid item xs={12} md={4}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Trade Idea Card */}
          {tradeIdea && (
            <Box sx={{ mb: 2 }}>
              <TradeCard tradeIdea={tradeIdea.trade_idea} validation={tradeIdea.validation} />
            </Box>
          )}

          {/* Placeholder for no trade idea */}
          {!tradeIdea && !loading && (
            <Paper sx={{ p: 3, mb: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.05)' }}>
              <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Ready for Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a symbol and click "Generate Trade Idea" to see AI-powered trading recommendations
              </Typography>
            </Paper>
          )}

          {/* News Panel */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📰 Market News & Sentiment
              </Typography>
              <NewsPanel news={news} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
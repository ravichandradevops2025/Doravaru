// src/pages/Dashboard.js
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
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  Warning
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

  // Default risk profile
  const defaultRiskProfile = {
    max_daily_risk_percent: 2.0,
    default_position_size: 10000.0,
    allow_shorting: true,
    portfolio_value: 100000.0
  };

  useEffect(() => {
    loadMarketStatus();
    loadNews();
    loadMarketData();
  }, [activeSymbol]);

  const loadMarketStatus = async () => {
    try {
      const status = await apiService.getMarketStatus();
      setMarketStatus(status);
    } catch (err) {
      console.error('Error loading market status:', err);
    }
  };

  const loadNews = async () => {
    try {
      const newsData = await apiService.getNews();
      setNews(newsData.headlines.slice(0, 5));
    } catch (err) {
      console.error('Error loading news:', err);
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

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Market Status Bar */}
      <Card sx={{ mb: 3, bgcolor: marketStatus?.is_open ? '#1b5e20' : '#b71c1c' }}>
        <CardContent sx={{ py: 1 }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <Typography variant="h6">
                Market Status: {marketStatus?.status || 'Loading...'}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2">
                {marketStatus?.current_time ? 
                  new Date(marketStatus.current_time).toLocaleTimeString() : 
                  'Loading...'
                }
              </Typography>
            </Grid>
            <Grid item xs>
              <Typography variant="body2" sx={{ ml: 2 }}>
                Next Session: {marketStatus?.next_session || 'N/A'}
              </Typography>
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
                Select Symbol for Analysis
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {popularSymbols.map(symbol => (
                  <Chip
                    key={symbol}
                    label={symbol}
                    clickable
                    color={activeSymbol === symbol ? 'primary' : 'default'}
                    onClick={() => setActiveSymbol(symbol)}
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
                    AI Trade Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate comprehensive trade idea using AI analysis
                  </Typography>
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={generateTradeIdea}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Assessment />}
                  >
                    {loading ? 'Analyzing...' : 'Generate Trade Idea'}
                  </Button>
                </Grid>
              </Grid>
              
              {loading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Analyzing market data, technical indicators, and news sentiment...
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
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <TradeCard tradeIdea={tradeIdea.trade_idea} validation={tradeIdea.validation} />
              </CardContent>
            </Card>
          )}

          {/* News Panel */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Market News & Sentiment
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
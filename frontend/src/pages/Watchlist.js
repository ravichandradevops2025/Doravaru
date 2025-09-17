// src/pages/Watchlist.js
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
  Chip
} from '@mui/material';
import { Refresh } from '@mui/icons-material';

import TradeCard from '../components/TradeCard';
import { apiService } from '../services/api';

const Watchlist = () => {
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);
  const [batchResults, setBatchResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const defaultRiskProfile = {
    max_daily_risk_percent: 2.0,
    default_position_size: 10000.0,
    allow_shorting: true,
    portfolio_value: 100000.0
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      const data = await apiService.getWatchlist();
      setWatchlistSymbols(data.symbols);
    } catch (err) {
      setError('Failed to load watchlist');
    }
  };

  const runBatchAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await apiService.batchAnalysis(watchlistSymbols, defaultRiskProfile);
      setBatchResults(results.results);
    } catch (err) {
      setError(err.message || 'Failed to run batch analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <Typography variant="h5" gutterBottom>
                Watchlist Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI-powered analysis for your watchlist symbols
              </Typography>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
                onClick={runBatchAnalysis}
                disabled={loading}
                size="large"
              >
                {loading ? 'Analyzing...' : 'Analyze All'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {watchlistSymbols.map(symbol => (
          <Grid item xs={12} md={6} lg={4} key={symbol}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {symbol}
                </Typography>
                
                {batchResults[symbol] ? (
                  batchResults[symbol].trade_idea ? (
                    <TradeCard 
                      tradeIdea={batchResults[symbol].trade_idea}
                      validation={batchResults[symbol].validation}
                    />
                  ) : (
                    <Alert severity="error">
                      {batchResults[symbol].error || 'Analysis failed'}
                    </Alert>
                  )
                ) : loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Click "Analyze All" to generate trade ideas
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Watchlist;
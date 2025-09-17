import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { 
  Container, 
  AppBar, 
  Toolbar, 
  Typography, 
  Card, 
  CardContent,
  Button,
  Alert,
  Box,
  Chip
} from '@mui/material';
import axios from 'axios';

// Dark theme for trading platform
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00e676',
    },
    secondary: {
      main: '#ff1744',
    },
    background: {
      default: '#0a0e27',
      paper: '#1a1d3a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0bec5',
    },
  },
});

function App() {
  const [marketStatus, setMarketStatus] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, watchlistRes] = await Promise.all([
        axios.get('/api/market-status'),
        axios.get('/api/watchlist')
      ]);
      setMarketStatus(statusRes.data);
      setWatchlist(watchlistRes.data.symbols);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/health');
      alert('Backend connection successful! ' + JSON.stringify(response.data));
    } catch (error) {
      alert('Backend connection failed: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      
      {/* Top Navigation */}
      <AppBar position="static" sx={{ bgcolor: '#1a1d3a' }}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #00e676, #00bcd4)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Doravaru - AI Trading Platform
          </Typography>
          
          <Button 
            color="inherit" 
            onClick={testConnection}
            disabled={loading}
          >
            Test Connection
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Market Status */}
        {marketStatus && (
          <Card sx={{ mb: 3, bgcolor: marketStatus.is_open ? '#1b5e20' : '#b71c1c' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">
                  Market Status: {marketStatus.status}
                </Typography>
                <Typography variant="body2">
                  {new Date(marketStatus.current_time).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  Next Session: {marketStatus.next_session}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Welcome Message */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Welcome to Doravaru! 🚀
            </Typography>
            <Typography variant="body1" paragraph>
              Your AI-powered trading platform is now running. This is a basic version to get you started.
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>DISCLAIMER:</strong> This platform provides educational analysis only and is not investment advice. 
              Always do your own research and manage risk appropriately.
            </Alert>
          </CardContent>
        </Card>

        {/* Watchlist */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Default Watchlist
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {watchlist.map(symbol => (
                <Chip
                  key={symbol}
                  label={symbol}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </ThemeProvider>
  );
}

export default App;
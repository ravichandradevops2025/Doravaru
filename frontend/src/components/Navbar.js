import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  List as WatchlistIcon,
  Security as RiskIcon,
  Newspaper as NewsIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/analysis', label: 'Analysis', icon: <AnalyticsIcon /> },
    { path: '/watchlist', label: 'Watchlist', icon: <WatchlistIcon /> },
    { path: '/risk', label: 'Risk', icon: <RiskIcon /> },
    { path: '/news', label: 'News', icon: <NewsIcon /> }
  ];

  return (
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
          Doravaru
        </Typography>
        
        <Chip 
          label="LIVE" 
          color="success" 
          size="small" 
          sx={{ mr: 2 }}
        />
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                color: location.pathname === item.path ? '#00e676' : 'inherit',
                fontWeight: location.pathname === item.path ? 'bold' : 'normal'
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
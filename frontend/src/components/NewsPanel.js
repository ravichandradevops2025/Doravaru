// src/components/NewsPanel.js
import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Divider,
  Link
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat
} from '@mui/icons-material';

const NewsPanel = ({ news }) => {
  const getSentimentIcon = (sentiment) => {
    if (sentiment > 0.2) return <TrendingUp sx={{ color: '#4caf50', fontSize: 16 }} />;
    if (sentiment < -0.2) return <TrendingDown sx={{ color: '#f44336', fontSize: 16 }} />;
    return <TrendingFlat sx={{ color: '#ff9800', fontSize: 16 }} />;
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment > 0.2) return 'success';
    if (sentiment < -0.2) return 'error';
    return 'warning';
  };

  const getSentimentLabel = (sentiment) => {
    if (sentiment > 0.2) return 'Positive';
    if (sentiment < -0.2) return 'Negative';
    return 'Neutral';
  };

  if (!news || news.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No news available
      </Typography>
    );
  }

  return (
    <Box>
      {news.map((item, index) => (
        <Box key={index}>
          <Paper 
            sx={{ 
              p: 2, 
              mb: 2, 
              bgcolor: 'rgba(255,255,255,0.05)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.08)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
              {getSentimentIcon(item.sentiment)}
              <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.4 }}>
                <Link 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener"
                  sx={{ 
                    color: 'text.primary',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {item.title}
                </Link>
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Chip 
                label={item.source}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
              <Chip 
                label={getSentimentLabel(item.sentiment)}
                size="small"
                color={getSentimentColor(item.sentiment)}
                sx={{ fontSize: '0.7rem' }}
              />
            </Box>
          </Paper>
          
          {index < news.length - 1 && <Divider sx={{ my: 1 }} />}
        </Box>
      ))}
    </Box>
  );
};

export default NewsPanel;
// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || error.message);
      }
    );
  }

  // Market data endpoints
  async getMarketData(symbol, timeframe = '1min', limit = 100) {
    return this.client.get(`/api/market-data/${symbol}`, {
      params: { timeframe, limit }
    });
  }

  async getTechnicalIndicators(symbol) {
    return this.client.get(`/api/technical-indicators/${symbol}`);
  }

  // News endpoints
  async getNews() {
    return this.client.get('/api/news');
  }

  // AI trade generation
  async generateTradeIdea(symbol, riskProfile, timeframe = '1min', exchange = 'NSE') {
    return this.client.post(`/api/generate-trade-idea/${symbol}`, riskProfile, {
      params: { timeframe, exchange }
    });
  }

  // Batch analysis
  async batchAnalysis(symbols, riskProfile) {
    return this.client.post('/api/batch-analysis', {
      symbols,
      risk_profile: riskProfile
    });
  }

  // Watchlist
  async getWatchlist() {
    return this.client.get('/api/watchlist');
  }

  // Risk management
  async assessPortfolioRisk(tradeIdeas) {
    return this.client.post('/api/risk-assessment', tradeIdeas);
  }

  // Market status
  async getMarketStatus() {
    return this.client.get('/api/market-status');
  }

  // Health check
  async healthCheck() {
    return this.client.get('/health');
  }
}

export const apiService = new ApiService();
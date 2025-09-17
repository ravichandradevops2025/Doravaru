import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || error.message);
      }
    );
  }

  async getMarketData(symbol, timeframe = '1min', limit = 100) {
    return this.client.get(`/api/market-data/${symbol}`, {
      params: { timeframe, limit }
    });
  }

  async getNews() {
    return this.client.get('/api/news');
  }

  async generateTradeIdea(symbol, riskProfile, timeframe = '1min', exchange = 'NSE') {
    return this.client.post(`/api/generate-trade-idea/${symbol}`, riskProfile, {
      params: { timeframe, exchange }
    });
  }

  async getWatchlist() {
    return this.client.get('/api/watchlist');
  }

  async getMarketStatus() {
    return this.client.get('/api/market-status');
  }

  async healthCheck() {
    return this.client.get('/health');
  }
}

export const apiService = new ApiService();
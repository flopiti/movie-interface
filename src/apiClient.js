import axios from 'axios';

// Base URL for the API
const BASE_URL = 'http://natetrystuff.com:5000';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens or logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling responses and errors
apiClient.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status);
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // GET request
  get: async (endpoint, params = {}) => {
    try {
      const response = await apiClient.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw new Error(`GET ${endpoint} failed: ${error.message}`);
    }
  },

  // POST request
  post: async (endpoint, data = {}) => {
    try {
      const response = await apiClient.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw new Error(`POST ${endpoint} failed: ${error.message}`);
    }
  },

  // PUT request
  put: async (endpoint, data = {}) => {
    try {
      const response = await apiClient.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw new Error(`PUT ${endpoint} failed: ${error.message}`);
    }
  },

  // DELETE request
  delete: async (endpoint) => {
    try {
      const response = await apiClient.delete(endpoint);
      return response.data;
    } catch (error) {
      throw new Error(`DELETE ${endpoint} failed: ${error.message}`);
    }
  },

  // Example movie-related API calls
  movies: {
    // Get all movies
    getAll: () => api.get('/movies'),
    
    // Get movie by ID
    getById: (id) => api.get(`/movies/${id}`),
    
    // Search movies
    search: (query) => api.get('/movies/search', { q: query }),
    
    // Create new movie
    create: (movieData) => api.post('/movies', movieData),
    
    // Update movie
    update: (id, movieData) => api.put(`/movies/${id}`, movieData),
    
    // Delete movie
    delete: (id) => api.delete(`/movies/${id}`),
  },
};

export default api;

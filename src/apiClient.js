import axios from 'axios';

// Base URL for the API
const BASE_URL = 'http://192.168.0.10:5000';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds
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
  delete: async (endpoint, data = {}) => {
    try {
      const response = await apiClient.delete(endpoint, { data });
      return response.data;
    } catch (error) {
      throw new Error(`DELETE ${endpoint} failed: ${error.message}`);
    }
  },

  // Movie file management API calls
  moviePaths: {
    // Get all configured movie file paths
    getAll: () => api.get('/movie-file-paths'),
    
    // Add a new movie file path
    add: (path) => api.put('/movie-file-paths', { path }),
    
    // Remove a movie file path
    remove: (path) => api.delete('/movie-file-paths', { path }),
  },

  // Movie files API calls
  files: {
    // Get all media files from all configured paths
    getAll: () => api.get('/all-files'),
  },

  // Movie search API calls
  movies: {
    // Search movies using TMDB API
    search: (query) => api.get('/search-movie', { q: query }),
  },

  // Health check
  health: {
    check: () => api.get('/health'),
  },
};

export default api;

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

  // Media paths management API calls
  mediaPaths: {
    // Get all configured media paths with space information
    getAll: () => api.get('/media-paths'),
    
    // Add a new media path
    add: (path) => api.put('/media-paths', { path }),
    
    // Remove a media path
    remove: (path) => api.delete('/media-paths', { path }),
    
    // Refresh space information for all media paths
    refreshAll: () => api.post('/media-paths/refresh'),
    
    // Refresh space information for a specific media path
    refresh: (path) => api.post(`/media-paths/refresh`, { path }),
  },

  // Download paths management API calls
  downloadPaths: {
    // Get all configured download paths
    getAll: () => api.get('/download-paths'),
    
    // Add a new download path
    add: (path) => api.put('/download-paths', { path }),
    
    // Remove a download path
    remove: (path) => api.delete('/download-paths', { path }),
    
    // Get contents of a download path (folders and files)
    getContents: (path) => api.get('/download-paths/contents', { path }),
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
    
    // Assign a movie to a file
    assign: (filePath, movieData) => api.post('/assign-movie', { 
      file_path: filePath, 
      movie: movieData 
    }),
    
    // Verify if a movie assignment exists for a file
    verifyAssignment: (filePath) => api.get('/verify-assignment', { file_path: filePath }),
    
    // Remove movie assignment from a file
    removeAssignment: (filePath) => api.delete('/remove-movie-assignment', { 
      file_path: filePath 
    }),
    
    // Cleanup orphaned movie assignments
    cleanupOrphanedAssignments: () => api.post('/cleanup-orphaned-assignments'),
    
    // Rename a file to standard format
    renameFile: (currentPath, newFilename) => api.post('/rename-file', {
      file_path: currentPath,
      new_filename: newFilename
    }),

    // Rename a folder to standard format
    renameFolder: (currentFolderPath, newFoldername) => api.post('/rename-folder', {
      folder_path: currentFolderPath,
      new_foldername: newFoldername
    }),

    // Delete a movie file
    deleteFile: (filePath) => api.delete('/delete-file', { 
      file_path: filePath 
    }),
  },

  // Health check
  health: {
    check: () => api.get('/health'),
  },

  // Plex API calls
  plex: {
    // Get all Plex libraries
    getLibraries: () => api.get('/plex/libraries'),
    
    // Get movie count from Plex
    getMovieCount: () => api.get('/plex/movie-count'),
    
    // Get all movies from Plex
    getAllMovies: () => api.get('/plex/movies'),
    
    // Search movies in Plex
    searchMovies: (query, libraryId = null) => {
      const params = { q: query };
      if (libraryId) params.library_id = libraryId;
      return api.get('/plex/search', params);
    },
  },

  // Movie comparison API calls
  comparison: {
    // Compare Plex movies with assigned movies
    compareMovies: () => api.get('/compare-movies'),
  },

  // Duplicates API calls
  duplicates: {
    // Find files that are assigned to the same movie
    find: () => api.get('/duplicates'),
  },

  // Orphaned files API calls
  orphanedFiles: {
    // Find files that are assigned to movies but don't exist
    find: () => api.get('/orphaned-files'),
    
    // Move an orphaned file to its own folder
    moveToFolder: (filePath) => api.post('/move-to-folder', { 
      file_path: filePath 
    }),
  },

  // Firebase cleanup API calls
  firebase: {
    // Cleanup orphaned assignments in Firebase
    cleanup: () => api.post('/firebase-cleanup'),
  },


};

export default api;

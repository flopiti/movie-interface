import React, { useState, useEffect } from 'react';
import { api } from './apiClient';
import './App.css';

const App = () => {
  const [files, setFiles] = useState([]);
  const [moviePaths, setMoviePaths] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPath, setNewPath] = useState('');
  const [activeTab, setActiveTab] = useState('files'); // 'files', 'paths', 'search'
  const [selectedFile, setSelectedFile] = useState(null);
  const [movieSearchResults, setMovieSearchResults] = useState([]);
  const [isSearchingMovie, setIsSearchingMovie] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchFiles();
    fetchMoviePaths();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.files.getAll();
      setFiles(data.files || []);
    } catch (err) {
      setError('Failed to fetch files: ' + err.message);
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoviePaths = async () => {
    try {
      const data = await api.moviePaths.getAll();
      setMoviePaths(data.movie_file_paths || []);
    } catch (err) {
      console.error('Error fetching movie paths:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.movies.search(searchQuery);
      // Extract results from the nested TMDB response
      const results = data.tmdb_results?.results || [];
      setSearchResults(results);
    } catch (err) {
      setError('Search failed: ' + err.message);
      console.error('Error searching movies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPath = async (e) => {
    e.preventDefault();
    if (!newPath.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.moviePaths.add(newPath.trim());
      setNewPath('');
      await fetchMoviePaths();
      await fetchFiles(); // Refresh files after adding path
    } catch (err) {
      setError('Failed to add path: ' + err.message);
      console.error('Error adding path:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePath = async (path) => {
    setLoading(true);
    setError(null);
    try {
      await api.moviePaths.remove(path);
      await fetchMoviePaths();
      await fetchFiles(); // Refresh files after removing path
    } catch (err) {
      setError('Failed to remove path: ' + err.message);
      console.error('Error removing path:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setSearchQuery('');
    setSearchResults([]);
    fetchFiles();
    fetchMoviePaths();
  };

  const handleFindMovie = async (file) => {
    setIsSearchingMovie(true);
    setMovieSearchResults([]);
    try {
      // Extract movie name from filename for search
      const fileName = file.name.replace(/\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v)$/i, '');
      const searchTerm = fileName.replace(/[._-]/g, ' ').replace(/\d{4}/g, '').trim();
      
      const data = await api.movies.search(searchTerm);
      // Extract results from the nested TMDB response
      const results = data.tmdb_results?.results || [];
      setMovieSearchResults(results);
    } catch (err) {
      setError('Movie search failed: ' + err.message);
      console.error('Error searching movies:', err);
    } finally {
      setIsSearchingMovie(false);
    }
  };

  const handleAcceptMovie = async (movie) => {
    if (!selectedFile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Send the assignment to the backend
      await api.movies.assign(selectedFile.path, movie);
      
      // Update the file with the selected movie information
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file === selectedFile 
            ? { ...file, movie: movie }
            : file
        )
      );
      
      // Clear selection and search results
      setSelectedFile(null);
      setMovieSearchResults([]);
      
      console.log(`Successfully assigned "${movie.title}" to "${selectedFile.name}"`);
    } catch (err) {
      setError('Failed to assign movie: ' + err.message);
      console.error('Error assigning movie:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMovieAssignment = async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      // Send the removal request to the backend
      await api.movies.removeAssignment(file.path);
      
      // Update the file to remove the movie assignment
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f === file 
            ? { ...f, movie: undefined }
            : f
        )
      );
      
      console.log(`Successfully removed movie assignment from "${file.name}"`);
    } catch (err) {
      setError('Failed to remove movie assignment: ' + err.message);
      console.error('Error removing movie assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Movie Management Interface</h1>
          <p>Connected to natetrystuff.com:5000</p>
        </div>
        <button onClick={handleRefresh} className="refresh-button">
          Refresh All
        </button>
      </header>

      <main className="app-main">
        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button 
            className={activeTab === 'files' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('files')}
          >
            Media Files ({files.length})
          </button>
          <button 
            className={activeTab === 'paths' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('paths')}
          >
            Movie Paths ({moviePaths.length})
          </button>
          <button 
            className={activeTab === 'search' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('search')}
          >
            TMDB Search
          </button>
        </nav>

        {/* Loading State */}
        {loading && (
          <div className="loading">
            <p>Loading...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={handleRefresh} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {/* Tab Content */}
        {!loading && (
          <>
            {/* Media Files Tab */}
            {activeTab === 'files' && (
              <section className="files-section">
                <h2>Media Files ({files.length})</h2>
                {files.length === 0 ? (
                  <p className="no-files">No media files found. Add movie paths first.</p>
                ) : (
                  <FilesTable 
                    files={files} 
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    onFindMovie={handleFindMovie}
                    onAcceptMovie={handleAcceptMovie}
                    onRemoveMovieAssignment={handleRemoveMovieAssignment}
                    movieSearchResults={movieSearchResults}
                    isSearchingMovie={isSearchingMovie}
                  />
                )}
              </section>
            )}

            {/* Movie Paths Tab */}
            {activeTab === 'paths' && (
              <section className="paths-section">
                <h2>Movie Paths</h2>
                
                {/* Add Path Form */}
                <form onSubmit={handleAddPath} className="add-path-form">
                  <input
                    type="text"
                    placeholder="Enter directory path..."
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    className="path-input"
                  />
                  <button type="submit" className="add-button">
                    Add Path
                  </button>
                </form>

                {/* Paths List */}
                {moviePaths.length === 0 ? (
                  <p className="no-paths">No movie paths configured</p>
                ) : (
                  <div className="paths-list">
                    {moviePaths.map((path, index) => (
                      <div key={index} className="path-item">
                        <span className="path-text">{path}</span>
                        <button 
                          onClick={() => handleRemovePath(path)}
                          className="remove-button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <section className="search-section">
                <h2>TMDB Movie Search</h2>
                
                <form onSubmit={handleSearch} className="search-form">
                  <input
                    type="text"
                    placeholder="Search movies on TMDB..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  <button type="submit" className="search-button">
                    Search
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="search-results">
                    <h3>Search Results ({searchResults.length})</h3>
                    <div className="movies-grid">
                      {searchResults.map((movie, index) => (
                        <MovieCard key={movie.id || index} movie={movie} />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// Files Table Component
const FilesTable = ({ files, selectedFile, setSelectedFile, onFindMovie, onAcceptMovie, onRemoveMovieAssignment, movieSearchResults, isSearchingMovie }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const handleRowClick = (file) => {
    setSelectedFile(selectedFile === file ? null : file);
  };

  return (
    <div className="files-table-container">
      <table className="files-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Size</th>
            <th>Modified</th>
            <th>Directory</th>
            <th>Movie</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, index) => (
            <React.Fragment key={index}>
              <tr 
                className={`file-row ${selectedFile === file ? 'selected' : ''}`}
                onClick={() => handleRowClick(file)}
              >
                <td className="file-name-cell">{file.name}</td>
                <td>{formatFileSize(file.size)}</td>
                <td>{formatDate(file.modified)}</td>
                <td className="directory-cell">{file.directory}</td>
                <td className="movie-cell">
                  {file.movie ? (
                    <div className="movie-info">
                      <strong>{file.movie.title}</strong>
                      {file.movie.release_date && (
                        <span className="movie-year"> ({new Date(file.movie.release_date).getFullYear()})</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-movie">No movie assigned</span>
                  )}
                </td>
              </tr>
              {selectedFile === file && (
                <tr className="action-row">
                  <td colSpan="5">
                    <div className="action-buttons">
                      <div className="button-row">
                        <button 
                          className="find-movie-btn"
                          onClick={() => onFindMovie(file)}
                          disabled={isSearchingMovie}
                        >
                          {isSearchingMovie ? 'Searching...' : 'Find Movie'}
                        </button>
                        
                        {file.movie && (
                          <button 
                            className="remove-assignment-btn"
                            onClick={() => onRemoveMovieAssignment(file)}
                          >
                            Remove Assignment
                          </button>
                        )}
                      </div>
                      
                      {movieSearchResults.length > 0 && (
                        <div className="movie-suggestions">
                          <h4>Movie Suggestions:</h4>
                          <div className="suggestions-list">
                            {movieSearchResults.slice(0, 3).map((movie, idx) => (
                              <div key={movie.id || idx} className="movie-suggestion">
                                <div className="movie-suggestion-info">
                                  <strong>{movie.title}</strong>
                                  {movie.release_date && (
                                    <span className="movie-year"> ({new Date(movie.release_date).getFullYear()})</span>
                                  )}
                                  {movie.vote_average && (
                                    <span className="movie-rating"> - Rating: {movie.vote_average}/10</span>
                                  )}
                                </div>
                                <button 
                                  className="accept-movie-btn"
                                  onClick={() => onAcceptMovie(movie)}
                                >
                                  Accept
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// File Card Component
const FileCard = ({ file }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="file-card">
      <h3 className="file-name">{file.name}</h3>
      <p className="file-path">{file.path}</p>
      <div className="file-details">
        <span className="file-size">{formatFileSize(file.size)}</span>
        <span className="file-modified">Modified: {formatDate(file.modified)}</span>
      </div>
      <p className="file-directory">Directory: {file.directory}</p>
      {file.source_path && (
        <p className="file-source">Source: {file.source_path}</p>
      )}
    </div>
  );
};

// Movie Card Component (for TMDB search results)
const MovieCard = ({ movie }) => {
  return (
    <div className="movie-card">
      {movie.poster_path && (
        <img 
          src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
          alt={movie.title}
          className="movie-poster"
        />
      )}
      <h3 className="movie-title">
        {movie.title || movie.name || 'Unknown Title'}
      </h3>
      {movie.release_date && (
        <p className="movie-year">Year: {new Date(movie.release_date).getFullYear()}</p>
      )}
      {movie.vote_average && (
        <p className="movie-rating">Rating: {movie.vote_average}/10</p>
      )}
      {movie.overview && (
        <p className="movie-description">{movie.overview}</p>
      )}
    </div>
  );
};

export default App;

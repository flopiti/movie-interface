import React, { useState, useEffect } from 'react';
import { api } from './apiClient';
import './App.css';

const App = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch movies on component mount
  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.movies.getAll();
      setMovies(data);
    } catch (err) {
      setError('Failed to fetch movies: ' + err.message);
      console.error('Error fetching movies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMovies();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.movies.search(searchQuery);
      setMovies(data);
    } catch (err) {
      setError('Search failed: ' + err.message);
      console.error('Error searching movies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setSearchQuery('');
    fetchMovies();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Movie Interface</h1>
        <p>Connected to natetrystuff.com:5000</p>
      </header>

      <main className="app-main">
        {/* Search Form */}
        <section className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              Search
            </button>
            <button type="button" onClick={handleRefresh} className="refresh-button">
              Refresh
            </button>
          </form>
        </section>

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

        {/* Movies List */}
        {!loading && !error && (
          <section className="movies-section">
            <h2>Movies ({movies.length})</h2>
            {movies.length === 0 ? (
              <p className="no-movies">No movies found</p>
            ) : (
              <div className="movies-grid">
                {movies.map((movie, index) => (
                  <MovieCard key={movie.id || index} movie={movie} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

// Movie Card Component
const MovieCard = ({ movie }) => {
  return (
    <div className="movie-card">
      <h3 className="movie-title">
        {movie.title || movie.name || 'Unknown Title'}
      </h3>
      {movie.year && <p className="movie-year">Year: {movie.year}</p>}
      {movie.genre && <p className="movie-genre">Genre: {movie.genre}</p>}
      {movie.director && <p className="movie-director">Director: {movie.director}</p>}
      {movie.rating && <p className="movie-rating">Rating: {movie.rating}</p>}
      {movie.description && (
        <p className="movie-description">{movie.description}</p>
      )}
    </div>
  );
};

export default App;

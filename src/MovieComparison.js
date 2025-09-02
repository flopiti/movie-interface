import React, { useState, useEffect } from 'react';
import api from './apiClient';
import './MovieComparison.css';

const MovieComparison = () => {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.comparison.compareMovies();
      setComparison(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  if (loading) {
    return (
      <div className="comparison-container">
        <div className="loading">Loading comparison data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="comparison-container">
        <div className="error">Error: {error}</div>
        <button onClick={fetchComparison} className="retry-button">Retry</button>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="comparison-container">
        <div className="no-data">No comparison data available</div>
      </div>
    );
  }

  const { summary, only_in_plex, only_in_assigned } = comparison;

  return (
    <div className="comparison-container">
      <div className="comparison-header">
        <h2>Movie Comparison: Plex vs Assigned Movies</h2>
        <button onClick={fetchComparison} className="refresh-button">Refresh</button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card plex">
          <h3>Plex Movies</h3>
          <div className="count">{summary.plex_total}</div>
          <div className="label">Total in Plex</div>
        </div>
        
        <div className="summary-card assigned">
          <h3>Assigned Movies</h3>
          <div className="count">{summary.assigned_total}</div>
          <div className="label">Total Assigned</div>
        </div>
        
        <div className="summary-card difference">
          <h3>Difference</h3>
          <div className="count">{summary.plex_total - summary.assigned_total}</div>
          <div className="label">Plex - Assigned</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button 
          className={`tab ${activeTab === 'plex-only' ? 'active' : ''}`}
          onClick={() => setActiveTab('plex-only')}
          disabled={true}
        >
          Only in Plex (Disabled)
        </button>
        <button 
          className={`tab ${activeTab === 'assigned-only' ? 'active' : ''}`}
          onClick={() => setActiveTab('assigned-only')}
          disabled={true}
        >
          Only Assigned (Disabled)
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'summary' && (
          <div className="summary-details">
            <div className="summary-item">
              <strong>Plex Movies:</strong> {summary.plex_total}
            </div>
            <div className="summary-item">
              <strong>Assigned Movies:</strong> {summary.assigned_total}
            </div>
            {comparison.note && (
              <div className="summary-note">
                <strong>Note:</strong> {comparison.note}
              </div>
            )}
          </div>
        )}

        {activeTab === 'plex-only' && (
          <div className="movie-list">
            <h3>Movies in Plex but not assigned:</h3>
            {only_in_plex.length === 0 ? (
              <p>All Plex movies are assigned!</p>
            ) : (
              <div className="movie-grid">
                {only_in_plex.map((movie, index) => (
                  <div key={index} className="movie-item plex-only">
                    <div className="movie-title">{movie.title}</div>
                    <div className="movie-year">{movie.year}</div>
                    {movie.file_path && (
                      <div className="movie-path">{movie.file_path}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assigned-only' && (
          <div className="movie-list">
            <h3>Assigned movies not in Plex:</h3>
            {only_in_assigned.length === 0 ? (
              <p>All assigned movies are in Plex!</p>
            ) : (
              <div className="movie-grid">
                {only_in_assigned.map((movie, index) => (
                  <div key={index} className="movie-item assigned-only">
                    <div className="movie-title">{movie.title}</div>
                    <div className="movie-year">{movie.year}</div>
                    <div className="movie-path">{movie.file_path}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieComparison;

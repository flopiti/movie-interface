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

  const handleCleanup = async () => {
    if (!window.confirm('This will remove all movie assignments for files that no longer exist. Are you sure?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await api.movies.cleanupOrphanedAssignments();
      alert(`Cleanup completed!\n\nRemoved ${result.assignments_removed} orphaned assignments out of ${result.orphaned_assignments_found} found.\n\nTotal assignments checked: ${result.total_assignments_checked}`);
      
      // Refresh the comparison data
      await fetchComparison();
    } catch (err) {
      setError('Cleanup failed: ' + err.message);
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

  const { summary, only_in_plex, only_in_assigned, plex_movies, assigned_movies } = comparison;

  // Create side-by-side comparison data
  const createSideBySideComparison = () => {
    // The backend returns the actual movies that are in both lists
    const plexMovies = plex_movies || [];
    const assignedMovies = assigned_movies || [];
    
    const comparison = [];
    
    // Show the actual movies that are in both lists
    plexMovies.forEach((movieTitle, index) => {
      comparison.push({
        index: index + 1,
        plex: movieTitle,
        assigned: movieTitle,
        status: 'both'
      });
    });
    
    // Add the movies that are only in Plex
    only_in_plex.forEach((movieTitle, index) => {
      comparison.push({
        index: comparison.length + 1,
        plex: movieTitle,
        assigned: null,
        status: 'plex-only'
      });
    });
    
    // Add the movies that are only assigned
    only_in_assigned.forEach((movieTitle, index) => {
      comparison.push({
        index: comparison.length + 1,
        plex: null,
        assigned: movieTitle,
        status: 'assigned-only'
      });
    });
    
    return comparison;
  };

  const sideBySideData = createSideBySideComparison();

  return (
    <div className="comparison-container">
      <div className="comparison-header">
        <h2>Movie Comparison: Plex vs Assigned Movies</h2>
        <div className="header-buttons">
          <button onClick={fetchComparison} className="refresh-button">Refresh</button>
          <button onClick={handleCleanup} className="cleanup-button">Cleanup Orphaned Assignments</button>
        </div>
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
          className={`tab ${activeTab === 'side-by-side' ? 'active' : ''}`}
          onClick={() => setActiveTab('side-by-side')}
        >
          Side-by-Side Comparison ({sideBySideData.length})
        </button>
        <button 
          className={`tab ${activeTab === 'plex-only' ? 'active' : ''}`}
          onClick={() => setActiveTab('plex-only')}
        >
          Only in Plex ({summary.only_in_plex})
        </button>
        <button 
          className={`tab ${activeTab === 'assigned-only' ? 'active' : ''}`}
          onClick={() => setActiveTab('assigned-only')}
        >
          Only Assigned ({summary.only_in_assigned})
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

        {activeTab === 'side-by-side' && (
          <div className="side-by-side-comparison">
            <div className="comparison-header-row">
              <div className="comparison-number-header">#</div>
              <div className="comparison-plex-header">Plex Movies</div>
              <div className="comparison-assigned-header">Assigned Movies</div>
              <div className="comparison-status-header">Status</div>
            </div>
            
            <div className="comparison-list">
              {sideBySideData.map((item) => (
                <div key={item.index} className={`comparison-row ${item.status}`}>
                  <div className="comparison-number">{item.index}</div>
                  <div className="comparison-plex-movie">
                    {item.plex ? (
                      <span className="movie-title">{item.plex}</span>
                    ) : (
                      <span className="no-movie">—</span>
                    )}
                  </div>
                  <div className="comparison-assigned-movie">
                    {item.assigned ? (
                      <span className="movie-title">{item.assigned}</span>
                    ) : (
                      <span className="no-movie">—</span>
                    )}
                  </div>
                  <div className="comparison-status">
                    {item.status === 'both' && <span className="status-both">✓ Both</span>}
                    {item.status === 'plex-only' && <span className="status-plex-only">⚠ Plex Only</span>}
                    {item.status === 'assigned-only' && <span className="status-assigned-only">⚠ Assigned Only</span>}
                    {item.status === 'empty' && <span className="status-empty">—</span>}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="comparison-summary">
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Rows:</span>
                  <span className="stat-value">{sideBySideData.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Both Present:</span>
                  <span className="stat-value">{sideBySideData.filter(item => item.status === 'both').length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Plex Only:</span>
                  <span className="stat-value">{sideBySideData.filter(item => item.status === 'plex-only').length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Assigned Only:</span>
                  <span className="stat-value">{sideBySideData.filter(item => item.status === 'assigned-only').length}</span>
                </div>
              </div>
              <div className="comparison-note">
                <p><strong>Note:</strong> This shows the actual movies from the backend. 
                If the counts don't match the summary, the backend may not be returning all missing movies.</p>
              </div>
            </div>
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
                    <div className="movie-title">{movie}</div>
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
                    <div className="movie-title">{movie}</div>
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

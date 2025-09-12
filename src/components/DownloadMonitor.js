import React, { useState, useEffect } from 'react';
import { api } from '../services/apiClient';
import '../styles/DownloadMonitor.css';

const DownloadMonitor = () => {
  const [downloadRequests, setDownloadRequests] = useState([]);
  const [monitorStatus, setMonitorStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  // Fetch download requests and monitor status
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [requestsResponse, statusResponse] = await Promise.all([
        api.get('/api/sms/downloads'),
        api.get('/api/sms/download-monitor/status')
      ]);
      
      setDownloadRequests(requestsResponse.download_requests || []);
      setMonitorStatus(statusResponse);
    } catch (err) {
      console.error('Download Monitor fetch error:', err);
      setError(err.message || 'Failed to fetch download data');
    } finally {
      setLoading(false);
    }
  };


  // Cancel a specific download request
  const cancelDownload = async (tmdbId) => {
    setCancellingId(tmdbId);
    try {
      await api.delete(`/api/sms/downloads/${tmdbId}`);
      setSuccessMessage('Download request cancelled successfully');
      await fetchData();
    } catch (err) {
      console.error('Cancel download error:', err);
      setError(err.message || 'Failed to cancel download');
    } finally {
      setCancellingId(null);
    }
  };

  // Clear all download requests
  const clearAllRequests = async () => {
    if (!window.confirm('Are you sure you want to clear all download requests?')) {
      return;
    }
    
    try {
      await api.post('/api/sms/downloads/clear');
      setSuccessMessage('All download requests cleared successfully');
      await fetchData();
    } catch (err) {
      console.error('Clear requests error:', err);
      setError(err.message || 'Failed to clear requests');
    }
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Clear error message after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'requested': return '#ffa500';
      case 'added_to_radarr': return '#007bff';
      case 'downloading': return '#28a745';
      case 'completed': return '#6c757d';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'requested': return 'Requested';
      case 'added_to_radarr': return 'Added to Radarr';
      case 'downloading': return 'Downloading';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="download-monitor">
      <div className="download-monitor-header">
        <h2>Download Monitor</h2>
        <div className="monitor-controls">
          <button 
            className="btn btn-primary"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          
          {downloadRequests.length > 0 && (
            <button 
              className="btn btn-danger"
              onClick={clearAllRequests}
            >
              Clear All Requests
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {/* Monitor Status */}
      {monitorStatus && (
        <div className="monitor-status">
          <h3>System Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Monitor Status:</span>
              <span className={`status-value ${monitorStatus.running ? 'running' : 'stopped'}`}>
                {monitorStatus.running ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Radarr Connection:</span>
              <span className={`status-value ${monitorStatus.radarr_available ? 'available' : 'unavailable'}`}>
                {monitorStatus.radarr_available ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">SMS Service:</span>
              <span className={`status-value ${monitorStatus.twilio_available ? 'available' : 'unavailable'}`}>
                {monitorStatus.twilio_available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Active Requests:</span>
              <span className="status-value">{monitorStatus.active_requests}</span>
            </div>
          </div>
        </div>
      )}

      {/* Download Requests */}
      <div className="download-requests">
        <h3>Download Requests ({downloadRequests.length})</h3>
        
        {downloadRequests.length === 0 ? (
          <div className="no-requests">
            <p>No download requests found.</p>
          </div>
        ) : (
          <div className="requests-table">
            <table>
              <thead>
                <tr>
                  <th>Movie</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Requested By</th>
                  <th>Requested At</th>
                  <th>Started At</th>
                  <th>Completed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {downloadRequests.map((request) => (
                  <tr key={request.tmdb_id}>
                    <td className="movie-title">{request.movie_title}</td>
                    <td>{request.movie_year}</td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(request.status) }}
                      >
                        {getStatusText(request.status)}
                      </span>
                    </td>
                    <td>{request.phone_number}</td>
                    <td>{formatDate(request.requested_at)}</td>
                    <td>{formatDate(request.download_started_at)}</td>
                    <td>{formatDate(request.download_completed_at)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => cancelDownload(request.tmdb_id)}
                        disabled={cancellingId === request.tmdb_id}
                      >
                        {cancellingId === request.tmdb_id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {downloadRequests.some(req => req.error_message) && (
        <div className="error-messages">
          <h3>Error Messages</h3>
          {downloadRequests
            .filter(req => req.error_message)
            .map((request) => (
              <div key={request.tmdb_id} className="error-message">
                <strong>{request.movie_title} ({request.movie_year}):</strong>
                <span>{request.error_message}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default DownloadMonitor;

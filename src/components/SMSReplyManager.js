import React, { useState, useEffect } from 'react';
import { api } from '../services/apiClient';
import '../styles/SMSReplyManager.css';

const SMSReplyManager = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    auto_reply_enabled: true,
    fallback_message: "Thanks for your message! I received: '{message}' from {sender} at {timestamp}. Configure your number in the system to get personalized responses.",
    reply_delay_seconds: 0,
    max_replies_per_day: 10,
    blocked_numbers: [],
    use_chatgpt: true,
    chatgpt_prompt: "You are a helpful assistant. Please respond to this SMS message in a friendly and concise way. Keep your response under 160 characters and appropriate for SMS communication.\n\nMessage: {message}\nFrom: {sender}"
  });

  // Phone settings form state
  const [phoneSettingsForm, setPhoneSettingsForm] = useState({
    webhook_url: '',
    webhook_method: 'POST'
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statusResponse, phoneSettingsResponse] = await Promise.all([
        api.sms.getStatus(),
        api.sms.phoneSettings.get()
      ]);
      
      setStatus(statusResponse);
      
      // Load phone settings if available
      if (phoneSettingsResponse.webhook_url) {
        setPhoneSettingsForm({
          webhook_url: phoneSettingsResponse.webhook_url || '',
          webhook_method: phoneSettingsResponse.webhook_method || 'POST'
        });
      }
      
    } catch (err) {
      setError(err.message);
      console.error('Error loading SMS reply data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess('');
      
      await api.sms.replySettings.update(settingsForm);
      setSuccess('Settings updated successfully!');
      
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdatePhoneSettings = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess('');
      
      await api.sms.phoneSettings.update(phoneSettingsForm);
      setSuccess('Phone settings updated successfully!');
      
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateWebhookUrl = async () => {
    try {
      setError(null);
      setSuccess('');
      
      await api.sms.updateWebhookUrl(phoneSettingsForm.webhook_url);
      setSuccess('Webhook URL updated successfully!');
      
    } catch (err) {
      setError(err.message);
    }
  };

  const addBlockedNumber = () => {
    const number = prompt('Enter phone number to block:');
    if (number && !settingsForm.blocked_numbers.includes(number)) {
      setSettingsForm({
        ...settingsForm,
        blocked_numbers: [...settingsForm.blocked_numbers, number]
      });
    }
  };

  const removeBlockedNumber = (number) => {
    setSettingsForm({
      ...settingsForm,
      blocked_numbers: settingsForm.blocked_numbers.filter(n => n !== number)
    });
  };

  if (loading) {
    return (
      <div className="sms-reply-manager">
        <div className="loading">Loading SMS reply settings...</div>
      </div>
    );
  }

  return (
    <div className="sms-reply-manager">
      <div className="reply-manager-header">
        <h2>SMS Reply Management</h2>
        <button onClick={loadData} className="refresh-button">
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {success && (
        <div className="success-message">
          <p>{success}</p>
        </div>
      )}

      {/* Status Section */}
      {status && (
        <div className="status-section">
          <h3>SMS Service Status</h3>
          <div className="status-grid">
            <div className={`status-item ${status.configured ? 'configured' : 'not-configured'}`}>
              <span className="status-label">Twilio Status:</span>
              <span className="status-value">{status.configured ? 'Configured' : 'Not Configured'}</span>
            </div>
            <div className={`status-item ${status.redis_available ? 'available' : 'unavailable'}`}>
              <span className="status-label">Redis Status:</span>
              <span className="status-value">{status.redis_available ? 'Available' : 'Unavailable'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Phone Number:</span>
              <span className="status-value">{status.phone_number || 'Not Set'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Webhook URL:</span>
              <span className="status-value">{status.webhook_url || 'Not Set'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Settings Section */}
      <div className="settings-section">
        <h3>SMS Reply Settings</h3>
        <form onSubmit={handleUpdateSettings} className="settings-form">
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={settingsForm.auto_reply_enabled}
                onChange={(e) => setSettingsForm({...settingsForm, auto_reply_enabled: e.target.checked})}
              />
              Enable automatic replies
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={settingsForm.use_chatgpt}
                onChange={(e) => setSettingsForm({...settingsForm, use_chatgpt: e.target.checked})}
              />
              Use ChatGPT for responses
            </label>
            <small>
              When enabled, ChatGPT will generate responses instead of using templates. Requires OpenAI API key to be configured.
            </small>
          </div>

          <div className="form-group">
            <label>Fallback Message</label>
            <textarea
              value={settingsForm.fallback_message}
              onChange={(e) => setSettingsForm({...settingsForm, fallback_message: e.target.value})}
              placeholder="Fallback message when ChatGPT is unavailable"
              rows={3}
            />
            <small>Use placeholders: {'{sender}'}, {'{message}'}, {'{timestamp}'}, {'{phone_number}'}</small>
          </div>

          <div className="form-group">
            <label>ChatGPT Prompt</label>
            <textarea
              value={settingsForm.chatgpt_prompt}
              onChange={(e) => setSettingsForm({...settingsForm, chatgpt_prompt: e.target.value})}
              placeholder="Custom prompt for ChatGPT"
              rows={4}
            />
            <small>Use placeholders: {'{message}'}, {'{sender}'}</small>
          </div>

          <div className="form-group">
            <label>Reply Delay (seconds)</label>
            <input
              type="number"
              value={settingsForm.reply_delay_seconds}
              onChange={(e) => setSettingsForm({...settingsForm, reply_delay_seconds: parseInt(e.target.value) || 0})}
              min="0"
              max="3600"
            />
          </div>

          <div className="form-group">
            <label>Max Replies Per Day</label>
            <input
              type="number"
              value={settingsForm.max_replies_per_day}
              onChange={(e) => setSettingsForm({...settingsForm, max_replies_per_day: parseInt(e.target.value) || 0})}
              min="0"
              max="1000"
            />
          </div>

          <div className="form-group">
            <label>Blocked Numbers</label>
            <div className="blocked-numbers">
              {settingsForm.blocked_numbers.map((number, index) => (
                <div key={index} className="blocked-number-item">
                  <span>{number}</span>
                  <button
                    type="button"
                    onClick={() => removeBlockedNumber(number)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addBlockedNumber}
                className="add-button"
              >
                Add Number
              </button>
            </div>
          </div>

          <button type="submit" className="update-button">
            Update Settings
          </button>
        </form>
      </div>

      {/* Phone Settings Section */}
      <div className="phone-settings-section">
        <h3>Phone Settings</h3>
        <form onSubmit={handleUpdatePhoneSettings} className="phone-settings-form">
          <div className="form-group">
            <label>Webhook URL</label>
            <input
              type="url"
              value={phoneSettingsForm.webhook_url}
              onChange={(e) => setPhoneSettingsForm({...phoneSettingsForm, webhook_url: e.target.value})}
              placeholder="https://your-domain.com/api/sms/webhook"
            />
            <button
              type="button"
              onClick={handleUpdateWebhookUrl}
              className="update-webhook-button"
            >
              Update Webhook URL
            </button>
          </div>

          <div className="form-group">
            <label>Webhook Method</label>
            <select
              value={phoneSettingsForm.webhook_method}
              onChange={(e) => setPhoneSettingsForm({...phoneSettingsForm, webhook_method: e.target.value})}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </div>

          <button type="submit" className="update-button">
            Update Phone Settings
          </button>
        </form>
      </div>
    </div>
  );
};

export default SMSReplyManager;

import React, { useState, useEffect } from 'react';
import api from './apiClient';
import './SMSReplyManager.css';

const SMSReplyManager = () => {
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState({
    auto_reply_enabled: false,
    fallback_message: "",
    reply_delay_seconds: 0,
    max_replies_per_day: 10,
    blocked_numbers: []
  });
  
  // Phone settings state
  const [phoneSettings, setPhoneSettings] = useState({
    sms_url: '',
    sms_method: 'POST',
    voice_url: '',
    voice_method: 'POST',
    status_callback: '',
    status_callback_method: 'POST'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Template form state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    template: '',
    description: '',
    keywords: [],
    enabled: true
  });
  
  // Settings form state
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ ...settings });
  
  // Phone settings form state
  const [showPhoneSettingsForm, setShowPhoneSettingsForm] = useState(false);
  const [phoneSettingsForm, setPhoneSettingsForm] = useState({ ...phoneSettings });
  
  // New keyword input
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [templatesResponse, settingsResponse, phoneSettingsResponse] = await Promise.all([
        api.sms.replyTemplates.getAll(),
        api.sms.replySettings.get(),
        api.sms.phoneSettings.get()
      ]);
      
      setTemplates(templatesResponse.templates || []);
      setSettings(settingsResponse);
      setSettingsForm(settingsResponse);
      
      if (phoneSettingsResponse.success) {
        setPhoneSettings(phoneSettingsResponse);
        setPhoneSettingsForm(phoneSettingsResponse);
      }
    } catch (err) {
      console.error('Error loading SMS reply data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      
      const templateData = {
        ...templateForm,
        keywords: templateForm.keywords.filter(k => k.trim())
      };
      
      await api.sms.replyTemplates.create(templateData);
      setSuccess('Template created successfully!');
      setShowTemplateForm(false);
      resetTemplateForm();
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      
      const templateData = {
        ...templateForm,
        keywords: templateForm.keywords.filter(k => k.trim())
      };
      
      await api.sms.replyTemplates.update(editingTemplate.id, templateData);
      setSuccess('Template updated successfully!');
      setShowTemplateForm(false);
      setEditingTemplate(null);
      resetTemplateForm();
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    try {
      setError(null);
      setSuccess(null);
      
      await api.sms.replyTemplates.delete(templateId);
      setSuccess('Template deleted successfully!');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      
      await api.sms.replySettings.update(settingsForm);
      setSettings(settingsForm);
      setSuccess('Settings updated successfully!');
      setShowSettingsForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdatePhoneSettings = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      
      const result = await api.sms.phoneSettings.update(phoneSettingsForm);
      if (result.success) {
        setPhoneSettings(phoneSettingsForm);
        setSuccess('Phone settings updated successfully in Twilio!');
        setShowPhoneSettingsForm(false);
      } else {
        setError(result.error || 'Failed to update phone settings');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      template: '',
      description: '',
      keywords: [],
      enabled: true
    });
  };

  const openEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      template: template.template,
      description: template.description || '',
      keywords: template.keywords || [],
      enabled: template.enabled
    });
    setShowTemplateForm(true);
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !templateForm.keywords.includes(newKeyword.trim())) {
      setTemplateForm({
        ...templateForm,
        keywords: [...templateForm.keywords, newKeyword.trim()]
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword) => {
    setTemplateForm({
      ...templateForm,
      keywords: templateForm.keywords.filter(k => k !== keyword)
    });
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
      <div className="header">
        <h2>SMS Reply Management</h2>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowTemplateForm(true)}
          >
            Add Template
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowSettingsForm(true)}
          >
            Settings
          </button>
          <button 
            className="btn btn-info"
            onClick={() => setShowPhoneSettingsForm(true)}
          >
            Phone Settings
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Settings Summary */}
      <div className="settings-summary">
        <h3>Current Settings</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label>Auto Reply:</label>
            <span className={settings.auto_reply_enabled ? 'enabled' : 'disabled'}>
              {settings.auto_reply_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="setting-item">
            <label>Fallback Message:</label>
            <span>{settings.fallback_message}</span>
          </div>
          <div className="setting-item">
            <label>Max Replies/Day:</label>
            <span>{settings.max_replies_per_day}</span>
          </div>
          <div className="setting-item">
            <label>Blocked Numbers:</label>
            <span>{settings.blocked_numbers.length}</span>
          </div>
        </div>
      </div>

      {/* Phone Settings Summary */}
      <div className="settings-summary">
        <h3>Twilio Phone Settings</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label>SMS Webhook URL:</label>
            <span>{phoneSettings.sms_url || 'Not set'}</span>
          </div>
          <div className="setting-item">
            <label>SMS Method:</label>
            <span>{phoneSettings.sms_method}</span>
          </div>
          <div className="setting-item">
            <label>Voice URL:</label>
            <span>{phoneSettings.voice_url || 'Not set'}</span>
          </div>
          <div className="setting-item">
            <label>Voice Method:</label>
            <span>{phoneSettings.voice_method}</span>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="templates-section">
        <h3>Reply Templates ({templates.length})</h3>
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>No reply templates configured. Create one to get started!</p>
          </div>
        ) : (
          <div className="templates-grid">
            {templates.map(template => (
              <div key={template.id} className={`template-card ${template.enabled ? 'enabled' : 'disabled'}`}>
                <div className="template-header">
                  <h4>{template.name}</h4>
                  <div className="template-actions">
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => openEditTemplate(template)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="template-content">
                  <p className="template-text">{template.template}</p>
                  {template.description && (
                    <p className="template-description">{template.description}</p>
                  )}
                  {template.keywords && template.keywords.length > 0 && (
                    <div className="template-keywords">
                      <strong>Keywords:</strong>
                      <div className="keywords-list">
                        {template.keywords.map((keyword, index) => (
                          <span key={index} className="keyword-tag">{keyword}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="template-status">
                  Status: {template.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingTemplate ? 'Edit Template' : 'Create New Template'}</h3>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setShowTemplateForm(false);
                  setEditingTemplate(null);
                  resetTemplateForm();
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
              <div className="form-group">
                <label>Template Name *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                  required
                  placeholder="e.g., Default Reply, Movie Request"
                />
              </div>
              
              <div className="form-group">
                <label>Template Text *</label>
                <textarea
                  value={templateForm.template}
                  onChange={(e) => setTemplateForm({...templateForm, template: e.target.value})}
                  required
                  rows="4"
                  placeholder="Available placeholders: {sender}, {message}, {timestamp}, {phone_number}"
                />
                <small className="help-text">
                  Use placeholders: {'{sender}'}, {'{message}'}, {'{timestamp}'}, {'{phone_number}'}
                </small>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                  placeholder="Optional description"
                />
              </div>
              
              <div className="form-group">
                <label>Keywords (for auto-matching)</label>
                <div className="keywords-input">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Enter keyword and press Add"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <button type="button" onClick={addKeyword}>Add</button>
                </div>
                {templateForm.keywords.length > 0 && (
                  <div className="keywords-list">
                    {templateForm.keywords.map((keyword, index) => (
                      <span key={index} className="keyword-tag">
                        {keyword}
                        <button type="button" onClick={() => removeKeyword(keyword)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={templateForm.enabled}
                    onChange={(e) => setTemplateForm({...templateForm, enabled: e.target.checked})}
                  />
                  Enable this template
                </label>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowTemplateForm(false);
                    setEditingTemplate(null);
                    resetTemplateForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Form Modal */}
      {showSettingsForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>SMS Reply Settings</h3>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => setShowSettingsForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateSettings}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settingsForm.auto_reply_enabled}
                    onChange={(e) => setSettingsForm({...settingsForm, auto_reply_enabled: e.target.checked})}
                  />
                  Enable Auto Reply
                </label>
              </div>
              
              <div className="form-group">
                <label>Fallback Message</label>
                <textarea
                  value={settingsForm.fallback_message}
                  onChange={(e) => setSettingsForm({...settingsForm, fallback_message: e.target.value})}
                  rows="3"
                  placeholder="Thanks for your message! I received: '{message}' from {sender} at {timestamp}. Configure your number in the system to get personalized responses."
                />
                <small className="help-text">
                  Available placeholders: {'{sender}'}, {'{message}'}, {'{timestamp}'}, {'{phone_number}'}
                </small>
              </div>
              
              <div className="form-group">
                <label>Reply Delay (seconds)</label>
                <input
                  type="number"
                  value={settingsForm.reply_delay_seconds}
                  onChange={(e) => setSettingsForm({...settingsForm, reply_delay_seconds: parseInt(e.target.value) || 0})}
                  min="0"
                  max="300"
                />
              </div>
              
              <div className="form-group">
                <label>Max Replies Per Day</label>
                <input
                  type="number"
                  value={settingsForm.max_replies_per_day}
                  onChange={(e) => setSettingsForm({...settingsForm, max_replies_per_day: parseInt(e.target.value) || 10})}
                  min="1"
                  max="100"
                />
              </div>
              
              <div className="form-group">
                <label>Blocked Numbers</label>
                <div className="blocked-numbers">
                  <button type="button" onClick={addBlockedNumber}>Add Number</button>
                  {settingsForm.blocked_numbers.length > 0 && (
                    <div className="blocked-numbers-list">
                      {settingsForm.blocked_numbers.map((number, index) => (
                        <span key={index} className="blocked-number-tag">
                          {number}
                          <button type="button" onClick={() => removeBlockedNumber(number)}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Update Settings</button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowSettingsForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phone Settings Form Modal */}
      {showPhoneSettingsForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Twilio Phone Settings</h3>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => setShowPhoneSettingsForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdatePhoneSettings}>
              <div className="form-group">
                <label>SMS Webhook URL</label>
                <input
                  type="url"
                  value={phoneSettingsForm.sms_url}
                  onChange={(e) => setPhoneSettingsForm({...phoneSettingsForm, sms_url: e.target.value})}
                  placeholder="https://your-server.com/api/sms/webhook"
                />
                <small className="help-text">
                  URL where Twilio sends incoming SMS messages
                </small>
              </div>
              
              <div className="form-group">
                <label>SMS Method</label>
                <select
                  value={phoneSettingsForm.sms_method}
                  onChange={(e) => setPhoneSettingsForm({...phoneSettingsForm, sms_method: e.target.value})}
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Voice URL</label>
                <input
                  type="url"
                  value={phoneSettingsForm.voice_url}
                  onChange={(e) => setPhoneSettingsForm({...phoneSettingsForm, voice_url: e.target.value})}
                  placeholder="https://your-server.com/api/voice/webhook"
                />
                <small className="help-text">
                  URL where Twilio sends incoming voice calls
                </small>
              </div>
              
              <div className="form-group">
                <label>Voice Method</label>
                <select
                  value={phoneSettingsForm.voice_method}
                  onChange={(e) => setPhoneSettingsForm({...phoneSettingsForm, voice_method: e.target.value})}
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Status Callback URL</label>
                <input
                  type="url"
                  value={phoneSettingsForm.status_callback}
                  onChange={(e) => setPhoneSettingsForm({...phoneSettingsForm, status_callback: e.target.value})}
                  placeholder="https://your-server.com/api/sms/status-callback"
                />
                <small className="help-text">
                  URL where Twilio sends status updates
                </small>
              </div>
              
              <div className="form-group">
                <label>Status Callback Method</label>
                <select
                  value={phoneSettingsForm.status_callback_method}
                  onChange={(e) => setPhoneSettingsForm({...phoneSettingsForm, status_callback_method: e.target.value})}
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Update Phone Settings</button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowPhoneSettingsForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSReplyManager;

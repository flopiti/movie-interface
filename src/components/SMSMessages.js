import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/apiClient';
import SMSReplyManager from './SMSReplyManager';
import SMSConversations from './SMSConversations';
import '../styles/SMSMessages.css';

const SMSMessages = () => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendTo, setSendTo] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');
  const messagesEndRef = useRef(null);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);

  // Load SMS status and messages on component mount
  useEffect(() => {
    loadSMSData(true); // Show loading on initial load
    // Set up auto-refresh every 5 seconds (silent background refresh)
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when new messages arrive in messages tab
  useEffect(() => {
    if (activeTab === 'messages' && messagesEndRef.current) {
      const currentMessageCount = messages.length;
      
      // Scroll if it's the first load or if new messages arrived
      if (previousMessageCount === 0 || currentMessageCount > previousMessageCount) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      
      setPreviousMessageCount(currentMessageCount);
    }
  }, [messages, activeTab, previousMessageCount]);

  const loadSMSData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // Load status and messages in parallel
      const [statusData, messagesData] = await Promise.all([
        api.sms.getStatus(),
        api.sms.getMessages(20)
      ]);
      
      setStatus(statusData);
      setMessages(messagesData.messages || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading SMS data:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadMessages = async () => {
    try {
      const messagesData = await api.sms.getMessages(20);
      setMessages(messagesData.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendSMS = async (e) => {
    e.preventDefault();
    if (!sendTo.trim() || !sendMessage.trim()) {
      setSendError('Please enter both phone number and message');
      return;
    }

    try {
      setSending(true);
      setSendError(null);
      setSendSuccess(false);

      // Clean and format phone number
      let cleanPhoneNumber = sendTo.trim();
      
      // Remove all non-digit characters except +
      cleanPhoneNumber = cleanPhoneNumber.replace(/[^\d+]/g, '');
      
      // If it doesn't start with +, add +1 for US numbers
      if (!cleanPhoneNumber.startsWith('+')) {
        if (cleanPhoneNumber.length === 10) {
          cleanPhoneNumber = '+1' + cleanPhoneNumber;
        } else if (cleanPhoneNumber.length === 11 && cleanPhoneNumber.startsWith('1')) {
          cleanPhoneNumber = '+' + cleanPhoneNumber;
        } else {
          cleanPhoneNumber = '+' + cleanPhoneNumber;
        }
      }

      const result = await api.sms.send(cleanPhoneNumber, sendMessage.trim());
      
      if (result.success) {
        setSendSuccess(true);
        setSendTo('');
        setSendMessage('');
        // Refresh messages to show the sent message
        setTimeout(loadMessages, 1000);
      } else {
        setSendError(result.error || 'Failed to send SMS');
      }
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    // Basic phone number formatting
    if (!phoneNumber) return '';
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phoneNumber;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="sms-container">
        <div className="sms-header">
          <h2>SMS Messages</h2>
        </div>
        <div className="sms-loading">Loading SMS data...</div>
      </div>
    );
  }

  return (
    <div className="sms-container">
      <div className="sms-header">
        <h2>SMS Management</h2>
        <div className="sms-status">
          {status && (
            <div className={`status-indicator ${status.configured ? 'configured' : 'not-configured'}`}>
              <span className="status-dot"></span>
              {status.configured ? 'Twilio Configured' : 'Twilio Not Configured'}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sms-tabs">
        <button 
          className={`tab-button ${activeTab === 'conversations' ? 'active' : ''}`}
          onClick={() => setActiveTab('conversations')}
        >
          Conversations
        </button>
        <button 
          className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
        <button 
          className={`tab-button ${activeTab === 'replies' ? 'active' : ''}`}
          onClick={() => setActiveTab('replies')}
        >
          Reply Management
        </button>
      </div>

      {activeTab === 'conversations' && (
        <SMSConversations />
      )}

      {activeTab === 'messages' && (
        <>
          {error && (
            <div className="sms-error">
              <p>Error: {error}</p>
              <button onClick={() => loadSMSData(false)} className="retry-button">
                Retry
              </button>
            </div>
          )}

          {!status?.configured && (
            <div className="sms-warning">
              <p>⚠️ Twilio is not configured. Please add your Twilio credentials to the environment file.</p>
              <p>Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER</p>
            </div>
          )}

          {/* Send SMS Form */}
          {status?.configured && (
            <div className="sms-send-section">
              <h3>Send SMS</h3>
              <form onSubmit={handleSendSMS} className="sms-form">
                <div className="form-group">
                  <label htmlFor="sendTo">To (Phone Number):</label>
                  <input
                    type="tel"
                    id="sendTo"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                    placeholder="+1234567890 or (123) 456-7890"
                    disabled={sending}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sendMessage">Message:</label>
                  <textarea
                    id="sendMessage"
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                    placeholder="Enter your message..."
                    disabled={sending}
                    rows="3"
                    required
                  />
                </div>
                <button type="submit" disabled={sending} className="send-button">
                  {sending ? 'Sending...' : 'Send SMS'}
                </button>
              </form>

              {sendError && (
                <div className="send-error">
                  <p>Error: {sendError}</p>
                </div>
              )}

              {sendSuccess && (
                <div className="send-success">
                  <p>✅ SMS sent successfully!</p>
                </div>
              )}
            </div>
          )}

          {/* Messages List */}
          <div className="sms-messages-section">
            <div className="messages-header">
              <h3>Recent Messages ({messages.length})</h3>
              <button onClick={() => loadMessages()} className="refresh-button">
                Refresh
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="no-messages">
                <p>No messages received yet.</p>
                {status?.configured && (
                  <p>Send a text message to {formatPhoneNumber(status.phone_number)} to test the webhook.</p>
                )}
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((message, index) => (
                  <div key={message.MessageSid || index} className="message-item">
                    <div className="message-header">
                      <span className="message-from">
                        From: {formatPhoneNumber(message.From)}
                      </span>
                      <span className="message-timestamp">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div className="message-body">
                      {message.Body}
                    </div>
                    {message.NumMedia && message.NumMedia !== '0' && (
                      <div className="message-media">
                        📎 {message.NumMedia} media file(s)
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'replies' && (
        <SMSReplyManager />
      )}
    </div>
  );
};

export default SMSMessages;

import React, { useState, useEffect, useRef } from 'react';
import { api } from './apiClient';
import './SMSConversations.css';

const SMSConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const messagesEndRef = useRef(null);

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (selectedConversation && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load status and conversations in parallel
      const [statusData, conversationsData] = await Promise.all([
        api.sms.getStatus(),
        api.sms.getConversations(100)
      ]);
      
      setStatus(statusData);
      setConversations(conversationsData.conversations || []);
      
      // If no conversation is selected, select the first one
      if (!selectedConversation && conversationsData.conversations?.length > 0) {
        setSelectedConversation(conversationsData.conversations[0]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!sendMessage.trim() || !selectedConversation) {
      setSendError('Please enter a message');
      return;
    }

    try {
      setSending(true);
      setSendError(null);
      setSendSuccess(false);

      const result = await api.sms.send(selectedConversation.phone_number, sendMessage.trim());
      
      if (result.success) {
        setSendSuccess(true);
        setSendMessage('');
        // Refresh conversations to show the sent message
        setTimeout(loadConversations, 1000);
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
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return timestamp;
    }
  };

  const formatConversationTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="conversations-container">
        <div className="conversations-loading">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="conversations-container">
      <div className="conversations-header">
        <h2>SMS Conversations</h2>
        <div className="conversations-status">
          {status && (
            <div className={`status-indicator ${status.configured ? 'configured' : 'not-configured'}`}>
              <span className="status-dot"></span>
              {status.configured ? 'Twilio Configured' : 'Twilio Not Configured'}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="conversations-error">
          <p>Error: {error}</p>
          <button onClick={loadConversations} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {!status?.configured && (
        <div className="conversations-warning">
          <p>⚠️ Twilio is not configured. Please add your Twilio credentials to the environment file.</p>
        </div>
      )}

      <div className="conversations-layout">
        {/* Conversations List */}
        <div className="conversations-list">
          <div className="conversations-list-header">
            <h3>Conversations ({conversations.length})</h3>
            <button onClick={loadConversations} className="refresh-button">
              Refresh
            </button>
          </div>
          
          {conversations.length === 0 ? (
            <div className="no-conversations">
              <p>No conversations yet.</p>
              {status?.configured && (
                <p>Send a text message to {formatPhoneNumber(status.phone_number)} to start a conversation.</p>
              )}
            </div>
          ) : (
            <div className="conversations-items">
              {conversations.map((conversation) => (
                <div
                  key={conversation.phone_number}
                  className={`conversation-item ${selectedConversation?.phone_number === conversation.phone_number ? 'selected' : ''}`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="conversation-avatar">
                    <div className="avatar-circle">
                      {conversation.phone_number.slice(-2)}
                    </div>
                  </div>
                  <div className="conversation-content">
                    <div className="conversation-header">
                      <span className="conversation-name">
                        {formatPhoneNumber(conversation.phone_number)}
                      </span>
                      <span className="conversation-time">
                        {formatConversationTime(conversation.last_message_time)}
                      </span>
                    </div>
                    <div className="conversation-preview">
                      <span className={`conversation-message ${conversation.last_message?.is_from_us ? 'from-us' : 'from-them'}`}>
                        {conversation.last_message?.is_from_us ? 'You: ' : ''}
                        {conversation.last_message?.body || 'No messages'}
                      </span>
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="unread-badge">
                        {conversation.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat View */}
        <div className="chat-view">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div className="chat-avatar">
                  <div className="avatar-circle">
                    {selectedConversation.phone_number.slice(-2)}
                  </div>
                </div>
                <div className="chat-info">
                  <h3>{formatPhoneNumber(selectedConversation.phone_number)}</h3>
                  <span className="chat-status">
                    {selectedConversation.message_count} messages
                  </span>
                </div>
              </div>

              <div className="chat-messages">
                {selectedConversation.messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`message-bubble ${message.is_from_us ? 'from-us' : 'from-them'}`}
                  >
                    <div className="message-content">
                      {message.body}
                    </div>
                    <div className="message-time">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input">
                <form onSubmit={handleSendMessage} className="message-form">
                  <input
                    type="text"
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="message-input"
                  />
                  <button
                    type="submit"
                    disabled={sending || !sendMessage.trim()}
                    className="send-button"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>

                {sendError && (
                  <div className="send-error">
                    <p>Error: {sendError}</p>
                  </div>
                )}

                {sendSuccess && (
                  <div className="send-success">
                    <p>✅ Message sent!</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-conversation-selected">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SMSConversations;

import { useState, useRef, useEffect } from 'react';
import './ChatBot.css';

export default function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message immediately
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedMessage(null);
    setIsTyping(true);

    try {
      const contextMessage = selectedMessage
        ? { role: 'user', content: selectedMessage }
        : null;

      const messageList = [
        ...(contextMessage ? [contextMessage] : []),
        userMessage
      ];

      const res = await fetch(`${baseUrl}/api/user/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageList })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`ai-chatbot-container ${isOpen ? 'open' : ''}`}>
      {/* Floating Button */}
      <button 
        className="ai-chatbot-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Chat Window */}
      <div className="chatbot-window">
        <div className="chatbot-header">
          <div className="chatbot-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <h3>AI Assistant</h3>
          </div>
          <div className="chatbot-actions">
            <button className="chatbot-minimize" onClick={() => setIsOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div className="chatbot-messages">
          {messages.length === 0 && (
            <div className="chatbot-welcome">
              <div className="welcome-message">
                <h4>Hello! 👋</h4>
                <p>I'm your AI assistant. How can I help you today?</p>
              </div>
              <div className="quick-questions">
                <p>Try asking:</p>
                <button onClick={() => setInput("What can you do?")}>What can you do?</button>
                <button onClick={() => setInput("How does this work?")}>How does this work?</button>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`chatbot-message ${msg.role}`}
              onClick={() => msg.role === 'user' && setSelectedMessage(msg.content)}
            >
              <div className="message-content">
                {msg.content}
                {selectedMessage === msg.content && (
                  <div className="message-reply-indicator">
                    Replying to this message
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chatbot-message assistant">
              <div className="message-content typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {selectedMessage && (
          <div className="chatbot-reply-context">
            <div className="reply-context-content">
              <span>Replying to:</span>
              <p>{selectedMessage}</p>
            </div>
            <button 
              className="cancel-reply"
              onClick={() => setSelectedMessage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}

        <div className="chatbot-input-area">
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows="1"
            />
            <button 
              className="send-button"
              onClick={sendMessage}
              disabled={!input.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
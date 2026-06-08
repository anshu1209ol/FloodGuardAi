import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FloatingAIAssistant = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t('ai_greeting') }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Update initial message when language changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'assistant') {
      setMessages([{ role: 'assistant', content: t('ai_greeting') }]);
    }
  }, [i18n.language, t]);

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userMessage = { role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      
      console.log("Calling OpenRouter AI with language:", i18n.language);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Title': 'FloodGuard AI'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          max_tokens: 500,
          messages: [
            { 
              role: 'system', 
              content: `You are a helpful AI assistant for a Flood Emergency App named FloodGuard AI. 
              The user's current language is ${i18n.language}. 
              Please respond in ${i18n.language} if possible. 
              Provide short, practical, and concise advice.` 
            },
            ...messages.slice(-5), // Send last 5 messages for context
            userMessage
          ]
        })
      });
      
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.choices[0].message.content }]);
      } else {
        console.error("OpenRouter API Error:", data);
        setMessages(prev => [...prev, { role: 'assistant', content: t('ai_error') }]);
      }
    } catch (error) {
      console.error("Network Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: t('ai_network_error') }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)'
        }}
      >
        <Bot color="white" size={30} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="card shadow-lg border-0"
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '30px',
            width: '350px',
            height: '500px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
            <div className="d-flex align-items-center gap-2">
              <Bot color="#a855f7" size={24} />
              <h5 className="mb-0 text-white fw-bold">{t('ai_assistant_title')}</h5>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="btn btn-sm btn-link text-white-50 p-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow-1 p-3" style={{ overflowY: 'auto' }}>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`mb-3 d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                <div 
                  className={`p-2 px-3 rounded-4 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-dark text-light border border-secondary'}`}
                  style={{ maxWidth: '85%', fontSize: '0.9rem' }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="mb-3 d-flex justify-content-start">
                <div className="p-2 px-3 rounded-4 bg-dark text-light border border-secondary d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span>
                  <span style={{ fontSize: '0.9rem' }}>{t('ai_typing')}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-top border-secondary bg-dark">
            <div className="input-group">
              <input 
                type="text" 
                className="form-control bg-transparent text-white border-secondary shadow-none" 
                placeholder={t('ai_placeholder')} 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                className="btn btn-primary d-flex align-items-center justify-content-center" 
                onClick={handleSend}
                disabled={loading || !query.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAIAssistant;

import React, { useState, useRef, useEffect } from 'react';
import { useReviewStore } from '../../store/reviewStore';
import { Send, Sparkles, MessageSquare, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

export const ChatContext = () => {
  const { chatMessages = [], submitChatQuestion, currentReview } = useReviewStore();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll chat to bottom when new messages/chunks append
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async (textToSend) => {
    const query = textToSend || question;
    if (!query.trim()) return;

    setLoading(true);
    setQuestion('');
    try {
      await submitChatQuestion(query);
    } catch (error) {
      toast.error('Failed to submit question to Gemini');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestionChips = [
    "Why is this a vulnerability?",
    "Show me a secure alternative",
    "Explain the Big-O complexity",
    "Refactor to use ES Modules"
  ];

  return (
    <div className="w-full h-full flex flex-col border border-border rounded-lg bg-bg-1 overflow-hidden">
      
      {/* Header */}
      <div className="bg-bg-2 px-4 py-2.5 border-b border-border flex items-center gap-2">
        <MessageSquare size={14} className="text-accent2" />
        <span className="text-xs font-bold text-text-1">AI Review Assistant</span>
      </div>

      {/* Messages Drawer */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[450px]">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-text-2 py-10 space-y-2">
            <Sparkles className="text-accent2 animate-bounce" size={20} />
            <p className="font-semibold text-text-1">Contextual Code Chat</p>
            <p className="max-w-xs">Ask questions about this code scan. Gemini knows the complete code structure and current findings.</p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div 
              key={idx}
              className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <div 
                className={`p-3 rounded-lg text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-bg-0 font-medium rounded-tr-none'
                    : 'bg-bg-2 border border-border text-text-1 rounded-tl-none font-mono whitespace-pre-wrap'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[9px] text-text-2 mt-1 px-1">
                {msg.role === 'user' ? 'Developer' : 'CodeLens AI'}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion Chips */}
      {chatMessages.length === 0 && (
        <div className="px-4 py-2 border-t border-border bg-bg-0/35 flex flex-wrap gap-1.5">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="text-[10px] bg-bg-2 hover:bg-border border border-border px-2.5 py-1 rounded-full text-text-2 hover:text-text-1 transition-colors font-medium"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Inputs Textarea */}
      <div className="p-3 bg-bg-2 border-t border-border flex items-center gap-2">
        <textarea
          rows={1}
          placeholder="Ask a follow-up question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading || !currentReview}
          className="flex-1 bg-bg-0 border border-border rounded px-3 py-2 text-xs text-text-1 focus:outline-none focus:border-accent resize-none max-h-20 min-h-8 disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !question.trim() || !currentReview}
          className="bg-accent text-bg-0 disabled:bg-border disabled:text-text-2 p-2 rounded transition-colors shadow-md hover:bg-accent/80"
        >
          <Send size={14} />
        </button>
      </div>

    </div>
  );
};

export default ChatContext;

import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble.jsx';
import ChatInput from './ChatInput.jsx';

function ThinkingBubble() {
  return (
    <div className="msg-row">
      <div className="msg-avatar avatar-ross" style={{ fontSize: '0.6rem' }}>R</div>
      <div className="thinking-dots">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
    </div>
  );
}

export default function ChatPanel({ messages, isThinking, isListening, isSpeaking, onSend, onStartListen, onStopListen, waveformData, mode, onModeChange }) {
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div className="chat-area" ref={scrollRef} onScroll={handleScroll}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center', opacity: 0.6 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '3rem', fontWeight: 900, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ROSS</div>
            <p style={{ fontSize: '0.9rem', color: '#9d91c4', maxWidth: 300 }}>Your private AI OS. Powered by Groq. Say "Hey Ross" or type a message to begin.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
              {['What can you do?', 'Open YouTube', 'Search for AI news', 'Remember my name is...'].map(s => (
                <button key={s} onClick={() => onSend(s)} style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '6px 14px', fontSize: '0.78rem', color: '#c4b5fd', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        {isThinking && <ThinkingBubble />}
        <div ref={bottomRef} />
      </div>

      {showScrollBtn && (
        <button className="scroll-btn" onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          ↓ Scroll to bottom
        </button>
      )}

      <ChatInput
        onSend={onSend}
        onStartListen={onStartListen}
        onStopListen={onStopListen}
        isListening={isListening}
        isThinking={isThinking}
        waveformData={waveformData}
      />
    </div>
  );
}

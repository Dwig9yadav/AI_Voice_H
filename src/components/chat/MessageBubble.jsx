import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { emotionEngine } from '../../engines/EmotionEngine.js';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9d91c4', marginLeft: 4, padding: '2px 4px', borderRadius: 4 }}>
      {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
    </button>
  );
}

function CodeBlock({ children, className }) {
  const code = String(children).replace(/\n$/, '');
  const lang = /language-(\w+)/.exec(className || '')?.[1] || '';
  return (
    <div style={{ position: 'relative', margin: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '8px 8px 0 0', borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
        <span style={{ fontSize: '0.7rem', color: '#9d91c4', fontFamily: 'JetBrains Mono, monospace' }}>{lang || 'code'}</span>
        <CopyBtn text={code} />
      </div>
      <pre style={{ margin: 0, borderRadius: '0 0 8px 8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(124,58,237,0.2)', borderTop: 'none', padding: 12, overflowX: 'auto' }}>
        <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: '#e2e8f0' }}>{code}</code>
      </pre>
    </div>
  );
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message }) {
  const { role, content, streaming, timestamp, mode, emotion, model, ms, error, imageDataUrl, toolsUsed } = message;
  const isUser = role === 'user';
  const emotionCfg = emotionEngine.getConfig(emotion || 'neutral');

  return (
    <div className={`msg-row ${isUser ? 'user' : ''}`}>
      {!isUser && (
        <div className="msg-avatar avatar-ross" style={{ fontSize: '0.6rem', letterSpacing: 1 }}>R</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
        {imageDataUrl && (
          <img src={imageDataUrl} alt="Uploaded" style={{ maxWidth: 240, borderRadius: 12, marginBottom: 6, border: '1px solid rgba(124,58,237,0.3)' }} />
        )}

        <div className={`msg-bubble ${error ? 'error' : isUser ? 'user' : 'ross'}`}>
          {isUser ? (
            <span className="msg-content">{content}</span>
          ) : (
            <div className="msg-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children }) {
                    if (inline) return <code className={className}>{children}</code>;
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  },
                }}
              >
                {content}
              </ReactMarkdown>
              {streaming && <span className="cursor-blink" />}
            </div>
          )}
        </div>

        <div className="msg-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{formatTime(timestamp)}</span>
          {!isUser && model && model !== 'local-nlp' && model !== 'local-action' && model !== 'local-memory' && model !== 'local-mode' && (
            <>
              <span>·</span>
              <span style={{ color: '#7c6aad' }}>{model.split('/').pop()?.slice(0, 24)}</span>
            </>
          )}
          {ms > 0 && <><span>·</span><span style={{ color: '#7c6aad' }}>{(ms/1000).toFixed(1)}s</span></>}
          {emotion && emotion !== 'neutral' && (
            <span title={`Emotion: ${emotion}`}>{emotionCfg.emoji}</span>
          )}
          {toolsUsed?.length > 0 && (
            <span style={{ color: '#10b981', fontSize: '0.65rem' }}>⚙️ {toolsUsed.join(', ')}</span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="msg-avatar avatar-user">U</div>
      )}
    </div>
  );
}

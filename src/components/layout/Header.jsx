import { AI_MODES } from '../../config/models.js';
import { emotionEngine } from '../../engines/EmotionEngine.js';

export default function Header({ mode, onModeChange, isThinking, isListening, isSpeaking, currentEmotion, activeModel, wakeWordEnabled }) {
  const modeConfig = AI_MODES[mode];
  const emotionCfg = emotionEngine.getConfig(currentEmotion || 'neutral');

  const status = isListening ? 'listening' : isThinking ? 'thinking' : isSpeaking ? 'speaking' : 'idle';
  const statusLabel = isListening ? 'Listening' : isThinking ? 'Thinking' : isSpeaking ? 'Speaking' : 'Ready';

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="header-title">ROSS</span>
        <div className={`status-dot ${status}`} title={statusLabel} />
        <span style={{ fontSize: '0.72rem', color: '#7c6aad', fontFamily: 'Syne, sans-serif' }}>{statusLabel}</span>
        {activeModel && isThinking && (
          <span style={{ fontSize: '0.68rem', color: '#7c6aad', fontFamily: 'JetBrains Mono, monospace', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 4, padding: '2px 6px' }}>
            {activeModel.split('/').pop()?.slice(0, 20)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Wake word status */}
        {wakeWordEnabled && (
          <div title="Hey Ross wake word is active" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '3px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', animation: 'pulse-dot 1.5s infinite' }} />
            <span style={{ fontSize: '0.68rem', color: '#f87171', fontFamily: 'Orbitron, monospace', letterSpacing: 1 }}>HEY ROSS</span>
          </div>
        )}

        {currentEmotion && currentEmotion !== 'neutral' && (
          <span title={`Detected: ${currentEmotion}`} style={{ fontSize: '1rem' }}>{emotionCfg.emoji}</span>
        )}

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(AI_MODES).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => onModeChange(key)}
              title={cfg.description}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem',
                border: `1px solid ${mode === key ? cfg.color : 'transparent'}`,
                background: mode === key ? `${cfg.color}20` : 'transparent',
                color: mode === key ? cfg.color : '#9d91c4',
                cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
              }}
            >
              <span>{cfg.icon}</span>
              <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

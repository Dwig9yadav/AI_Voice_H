import { AI_MODES } from '../../config/models.js';
import { performanceEngine } from '../../engines/PerformanceEngine.js';
import { Cpu, Zap, ChevronRight } from 'lucide-react';

export default function SettingsPanel({ deviceProfile, wakeWordEnabled, onWakeWordToggle }) {

  const profile = deviceProfile;

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.1rem', fontWeight: 700, color: '#c4b5fd', marginBottom: 24 }}>Settings</h2>

      {/* Wake Word */}
      <div className="settings-section">
        <div className="settings-title">Wake Word</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,5,40,0.8)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: '12px 16px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#e8e0ff', marginBottom: 2 }}>"Hey Ross" Detection</div>
            <div style={{ fontSize: '0.75rem', color: '#7c6aad' }}>Activate hands-free with wake word</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={wakeWordEnabled} onChange={e => onWakeWordToggle(e.target.checked)} />
            <span className="toggle-track" />
          </label>
        </div>
      </div>

      {/* Device Profile */}
      {profile && (
        <div className="settings-section">
          <div className="settings-title"><Cpu size={12} style={{ display: 'inline', marginRight: 6 }} />Device Profile</div>
          <div className="dash-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontFamily: 'Orbitron, monospace', fontWeight: 700, background: profile.tier === 'high' ? 'rgba(16,185,129,0.15)' : profile.tier === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${profile.tier === 'high' ? 'rgba(16,185,129,0.4)' : profile.tier === 'medium' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`, color: profile.tier === 'high' ? '#6ee7b7' : profile.tier === 'medium' ? '#fcd34d' : '#f87171' }}>
                {profile.tier.toUpperCase()} TIER
              </div>
              {profile.hasWebGPU && <span style={{ fontSize: '0.72rem', color: '#67e8f9', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 20, padding: '3px 8px' }}>WebGPU ✓</span>}
              {profile.isMobile && <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '3px 8px' }}>Mobile</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.78rem' }}>
              {[
                { label: 'CPU Cores', value: profile.cpuCores },
                { label: 'RAM', value: `${profile.memoryGB} GB` },
                { label: 'Connection', value: profile.connection },
                { label: 'GPU', value: profile.gpuInfo?.slice(0, 30) || 'N/A' },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(5,1,20,0.6)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#7c6aad', fontSize: '0.7rem', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ color: '#e8e0ff', fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {profile.recommendations?.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(124,58,237,0.15)', paddingTop: 12 }}>
                {profile.recommendations.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: '#9d91c4', marginBottom: 4 }}>
                    <Zap size={12} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} /> {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance stats */}
      <div className="settings-section">
        <div className="settings-title"><Zap size={12} style={{ display: 'inline', marginRight: 6 }} />Performance</div>
        <div className="dash-card">
          {[
            { label: 'Avg Response Time', value: `${performanceEngine.getAvgResponseTime()}ms` },
            { label: 'Total Requests', value: performanceEngine.metrics.totalRequests },
            { label: 'Total Tokens Generated', value: performanceEngine.metrics.totalTokens.toLocaleString() },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '6px 0', borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
              <span style={{ color: '#9d91c4' }}>{s.label}</span>
              <span style={{ color: '#c4b5fd', fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 14, background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, fontSize: '0.75rem', color: '#7c6aad', lineHeight: 1.6 }}>
        <strong style={{ color: '#9d91c4' }}>ROSS v2.0</strong> — Private AI OS powered by Groq.<br />
        Models: Kimi K2 (complex) · Llama 4 Scout (fast) · Whisper v3 (voice) · PlayAI TTS<br />
        All data stays in your browser. Zero external logging.
      </div>
    </div>
  );
}

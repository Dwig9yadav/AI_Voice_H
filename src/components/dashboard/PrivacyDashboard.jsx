import { useState, useEffect } from 'react';
import { memoryEngine } from '../../engines/MemoryEngine.js';
import { Trash2, Eye, EyeOff, Database, Clock, Tag, BookOpen } from 'lucide-react';

export default function PrivacyDashboard({ memStats, onClearAll }) {
  const [memories, setMemories] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [view, setView] = useState('overview');

  useEffect(() => {
    async function load() {
      const [mems, convos, summs] = await Promise.all([
        memoryEngine.getAllNamedMemories(),
        memoryEngine.getConversations(20),
        memoryEngine.getRecentSummaries(5),
      ]);
      setMemories(mems);
      setConversations(convos);
      setSummaries(summs);
    }
    load();
  }, [memStats]);

  async function deleteMemory(key) {
    await memoryEngine.deleteNamedMemory(key);
    setMemories(p => p.filter(m => m.key !== key));
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Database size={14} /> },
    { id: 'memories', label: 'Memories', icon: <Tag size={14} /> },
    { id: 'history', label: 'History', icon: <Clock size={14} /> },
    { id: 'summaries', label: 'Summaries', icon: <BookOpen size={14} /> },
  ];

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.1rem', fontWeight: 700, color: '#c4b5fd' }}>Privacy Dashboard</h2>
          <p style={{ fontSize: '0.8rem', color: '#9d91c4', marginTop: 4 }}>All data stored locally in your browser. Zero external transmission.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '4px 12px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontFamily: 'Orbitron, monospace' }}>PRIVATE</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(124,58,237,0.2)', paddingBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid',
            borderColor: view === t.id ? 'rgba(124,58,237,0.6)' : 'transparent',
            background: view === t.id ? 'rgba(124,58,237,0.15)' : 'transparent',
            color: view === t.id ? '#c4b5fd' : '#9d91c4', cursor: 'pointer', fontSize: '0.8rem',
            fontFamily: 'Syne, sans-serif',
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {view === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {[
            { label: 'Conversations', value: memStats.conversations || 0, icon: '💬', color: '#7c3aed' },
            { label: 'Named Memories', value: memStats.namedMemories || 0, icon: '🏷️', color: '#06b6d4' },
            { label: 'Summaries', value: memStats.summaries || 0, icon: '📋', color: '#10b981' },
            { label: 'Session Messages', value: memStats.shortTerm || 0, icon: '🕐', color: '#f59e0b' },
          ].map(stat => (
            <div key={stat.label} className="dash-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{stat.icon}</div>
              <div className="stat-value" style={{ background: `linear-gradient(135deg, ${stat.color}, #e8e0ff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9d91c4', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}

          <div className="dash-card" style={{ gridColumn: '1/-1', background: 'rgba(124,58,237,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontSize: '0.85rem', color: '#6ee7b7', fontWeight: 600 }}>Data Privacy Status</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['No data sent to servers', 'Stored in IndexedDB only', 'API calls via Groq only', 'No tracking or telemetry'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#9d91c4' }}>
                  <span style={{ color: '#10b981' }}>✓</span> {item}
                </div>
              ))}
            </div>
          </div>

          <button onClick={onClearAll} style={{
            gridColumn: '1/-1', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 16px', color: '#f87171', cursor: 'pointer',
            fontFamily: 'Syne, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Trash2 size={15} /> Clear All Data
          </button>
        </div>
      )}

      {view === 'memories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {memories.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9d91c4', padding: 40, fontSize: '0.85rem' }}>
              No named memories yet.<br /><span style={{ color: '#7c6aad' }}>Say "Remember that [key] is [value]" to save facts.</span>
            </div>
          ) : memories.map(m => (
            <div key={m.key} className="dash-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.82rem', color: '#c4b5fd', fontWeight: 600, marginBottom: 2 }}>{m.key}</div>
                <div style={{ fontSize: '0.8rem', color: '#9d91c4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.value}</div>
              </div>
              <button onClick={() => deleteMemory(m.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {view === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9d91c4', padding: 40, fontSize: '0.85rem' }}>No conversation history yet.</div>
          ) : conversations.map(c => (
            <div key={c.id} className="dash-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', color: '#7c6aad', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(c.timestamp).toLocaleString()}</span>
                <span style={{ fontSize: '0.72rem', color: '#7c6aad' }}>{c.mode}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#c4b5fd', marginBottom: 4 }}>You: {c.userMessage?.slice(0, 80)}{c.userMessage?.length > 80 ? '…' : ''}</div>
              <div style={{ fontSize: '0.78rem', color: '#9d91c4' }}>ROSS: {c.assistantResponse?.slice(0, 100)}{c.assistantResponse?.length > 100 ? '…' : ''}</div>
            </div>
          ))}
        </div>
      )}

      {view === 'summaries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {summaries.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9d91c4', padding: 40, fontSize: '0.85rem' }}>No conversation summaries yet.<br /><span style={{ color: '#7c6aad' }}>Summaries are auto-generated every 30 messages.</span></div>
          ) : summaries.map(s => (
            <div key={s.id} className="dash-card">
              <div style={{ fontSize: '0.72rem', color: '#7c6aad', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>{new Date(s.timestamp).toLocaleString()}</div>
              <div style={{ fontSize: '0.85rem', color: '#e8e0ff', lineHeight: 1.6 }}>{s.summary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

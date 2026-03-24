import { MessageSquare, Shield, Code2, Settings, Zap, Brain } from 'lucide-react';
import { AI_MODES } from '../../config/models.js';

const navItems = [
  { id: 'chat',      icon: <MessageSquare size={19} />, label: 'Chat' },
  { id: 'dashboard', icon: <Shield size={19} />,        label: 'Privacy' },
  { id: 'sandbox',   icon: <Code2 size={19} />,         label: 'Sandbox' },
  { id: 'settings',  icon: <Settings size={19} />,      label: 'Settings' },
];

export default function Sidebar({ activePanel, onPanelChange, mode, onModeChange, memStats }) {
  const modeConfig = AI_MODES[mode];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo" style={{ marginBottom: 20 }}>R</div>

      {/* Nav */}
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-btn ${activePanel === item.id ? 'active' : ''}`}
          onClick={() => onPanelChange(item.id)}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Mode indicator */}
      <div style={{ marginBottom: 8 }}>
        <button
          title={`Mode: ${modeConfig?.label} — click to cycle`}
          onClick={() => {
            const keys = Object.keys(AI_MODES);
            const idx = keys.indexOf(mode);
            onModeChange(keys[(idx + 1) % keys.length]);
          }}
          style={{
            width: 44, height: 44, borderRadius: 12, border: `1px solid ${modeConfig?.color}40`,
            background: `${modeConfig?.color}15`, cursor: 'pointer', fontSize: '1.2rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {modeConfig?.icon}
        </button>
      </div>

      {/* Memory dot */}
      {memStats?.namedMemories > 0 && (
        <div title={`${memStats.namedMemories} memories stored`} style={{ width: 44, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
        </div>
      )}
    </aside>
  );
}

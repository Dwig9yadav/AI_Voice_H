import { useState, useEffect } from 'react';
import { useRoss } from './hooks/useRoss.js';
import StarField from './components/effects/StarField.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import ChatPanel from './components/chat/ChatPanel.jsx';
import VoiceFAB from './components/voice/VoiceFAB.jsx';
import LiveTranscript from './components/voice/LiveTranscript.jsx';
import PrivacyDashboard from './components/dashboard/PrivacyDashboard.jsx';
import CodeSandbox from './components/developer/CodeSandbox.jsx';
import SettingsPanel from './components/settings/SettingsPanel.jsx';

export default function App() {
  const [activePanel, setActivePanel] = useState('chat');
  const ross = useRoss();

  // Keyboard shortcut: Escape stops listening/speaking
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (ross.isListening) ross.stopListening();
        if (ross.isSpeaking) ross.stopSpeaking();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [ross.isListening, ross.isSpeaking]);

  if (!ross.initialized) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#030114', gap: 24 }}>
        <StarField />
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '3rem', fontWeight: 900, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'pulse 2s infinite' }}>ROSS</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="dot" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: '#7c6aad', letterSpacing: 3 }}>INITIALIZING AI SYSTEMS</p>
      </div>
    );
  }

  return (
    <div className="app-root">
      <StarField />
      <div className="nebula-overlay" />

      <Sidebar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        mode={ross.mode}
        onModeChange={ross.switchMode}
        memStats={ross.memStats}
      />

      <div className="main-area">
        <Header
          mode={ross.mode}
          onModeChange={ross.switchMode}
          isThinking={ross.isThinking}
          isListening={ross.isListening}
          isSpeaking={ross.isSpeaking}
          currentEmotion={ross.currentEmotion}
          activeModel={ross.activeModel}
          wakeWordEnabled={ross.wakeWordEnabled}
        />

        {/* Panels */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activePanel === 'chat' && (
            <ChatPanel
              messages={ross.messages}
              isThinking={ross.isThinking}
              isListening={ross.isListening}
              isSpeaking={ross.isSpeaking}
              onSend={ross.sendMessage}
              onStartListen={ross.startListening}
              onStopListen={ross.stopListening}
              waveformData={ross.waveformData}
              mode={ross.mode}
              onModeChange={ross.switchMode}
            />
          )}

          {activePanel === 'dashboard' && (
            <PrivacyDashboard
              memStats={ross.memStats}
              onClearAll={ross.clearChat}
            />
          )}

          {activePanel === 'sandbox' && (
            <CodeSandbox />
          )}

          {activePanel === 'settings' && (
            <SettingsPanel
              selectedVoice={ross.selectedVoice}
              onVoiceChange={ross.changeVoice}
              deviceProfile={ross.deviceProfile}
              wakeWordEnabled={ross.wakeWordEnabled}
              onWakeWordToggle={ross.toggleWakeWord}
            />
          )}
        </div>
      </div>

      {/* Floating voice button — only on chat panel */}
      {activePanel === 'chat' && (
        <>
          <VoiceFAB
            isListening={ross.isListening}
            isSpeaking={ross.isSpeaking}
            onStart={ross.startListening}
            onStop={ross.stopListening}
            onStopSpeaking={ross.stopSpeaking}
            waveformData={ross.waveformData}
          />
          <LiveTranscript transcript={ross.transcript} isListening={ross.isListening} />
        </>
      )}

      {/* Global error toast */}
      {ross.error && (
        <div style={{
          position: 'fixed', top: 70, right: 20, zIndex: 100,
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 12, padding: '10px 16px', fontSize: '0.8rem', color: '#f87171',
          maxWidth: 340, fontFamily: 'Syne, sans-serif', backdropFilter: 'blur(10px)',
          animation: 'msgIn 0.3s ease-out',
        }}>
          ⚠️ {ross.error}
        </div>
      )}
    </div>
  );
}

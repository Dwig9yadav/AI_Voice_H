import { Mic, Square, Volume2 } from 'lucide-react';

export default function VoiceFAB({ isListening, isSpeaking, onStart, onStop, onStopSpeaking, waveformData }) {
  const bars = (waveformData || []).slice(0, 20);

  if (isSpeaking) {
    return (
      <button className="voice-fab speaking" onClick={onStopSpeaking} title="Click to stop speaking">
        <Volume2 size={24} />
      </button>
    );
  }

  return (
    <button
      className={`voice-fab ${isListening ? 'listening' : ''}`}
      onClick={isListening ? onStop : onStart}
      title={isListening ? 'Click to send' : 'Click to speak'}
    >
      {isListening ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div className="waveform">
            {bars.map((v, i) => (
              <div key={i} className="wave-bar" style={{ height: Math.max(3, (v / 255) * 26) + 'px' }} />
            ))}
          </div>
          <Square size={10} style={{ opacity: 0.8 }} />
        </div>
      ) : (
        <Mic size={24} />
      )}
    </button>
  );
}

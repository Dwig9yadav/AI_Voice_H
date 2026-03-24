export default function LiveTranscript({ transcript, isListening }) {
  if (!transcript && !isListening) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 170, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(5,1,20,0.95)', border: '1px solid rgba(124,58,237,0.4)',
      borderRadius: 12, padding: '8px 16px', zIndex: 40,
      fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', color: '#e8e0ff',
      maxWidth: 400, textAlign: 'center', backdropFilter: 'blur(10px)',
    }}>
      {isListening ? (
        <span style={{ color: '#f87171' }}>🎙️ Listening…</span>
      ) : (
        <span>"{transcript}"</span>
      )}
    </div>
  );
}

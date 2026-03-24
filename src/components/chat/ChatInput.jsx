import { useState, useRef, useCallback } from 'react';
import { Send, Mic, Square, Paperclip, X } from 'lucide-react';

export default function ChatInput({ onSend, onStartListen, onStopListen, isListening, isThinking, waveformData }) {
  const [text, setText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);

  const submit = useCallback(() => {
    if (isThinking) return;
    if (!text.trim() && !imageDataUrl) return;
    onSend(text.trim(), imageDataUrl);
    setText('');
    setImageDataUrl(null);
    setImageFile(null);
    textareaRef.current?.focus();
  }, [text, imageDataUrl, isThinking, onSend]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setImageDataUrl(reader.result);
      reader.readAsDataURL(file);
      setImageFile(file);
    } else if (file.type === 'application/pdf') {
      processPDF(file);
    } else if (file.type === 'text/plain') {
      processText(file);
    }
    e.target.value = '';
  }

  async function processPDF(file) {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const ab = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      let fullText = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 15); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(it => it.str).join(' ') + '\n\n';
      }
      setText(`[PDF: ${file.name}]\n\n${fullText.slice(0, 8000)}\n\nPlease summarize this document.`);
    } catch (err) {
      setText(`[PDF: ${file.name}] — Could not extract text: ${err.message}`);
    }
  }

  function processText(file) {
    const reader = new FileReader();
    reader.onload = (e) => setText(`[File: ${file.name}]\n\n${e.target.result.slice(0, 8000)}`);
    reader.readAsText(file);
  }

  const bars = (waveformData || []).slice(0, 20);

  return (
    <div className="input-area">
      {imageDataUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <img src={imageDataUrl} alt="Preview" style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)' }} />
          <span style={{ fontSize: '0.8rem', color: '#9d91c4' }}>{imageFile?.name || 'Image'}</span>
          <button onClick={() => { setImageDataUrl(null); setImageFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><X size={14} /></button>
        </div>
      )}
      <div className="input-row">
        <input ref={fileRef} type="file" accept="image/*,.pdf,.txt" style={{ display: 'none' }} onChange={handleFile} />
        <button className="icon-btn" onClick={() => fileRef.current?.click()} title="Attach file (image, PDF, txt)">
          <Paperclip size={17} />
        </button>

        {isListening ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse-dot 0.5s infinite', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#f87171', fontFamily: 'Syne, sans-serif' }}>Listening… click mic to send</span>
            <div className="waveform" style={{ marginLeft: 'auto' }}>
              {bars.map((v, i) => (
                <div key={i} className="wave-bar" style={{ height: Math.max(3, (v / 255) * 26) + 'px', width: 3 }} />
              ))}
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Message ROSS… (Enter to send, Shift+Enter for newline)"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ maxHeight: 120 }}
          />
        )}

        {/* Mic button — click to start, click again to stop */}
        <button
          className={`icon-btn ${isListening ? 'active' : ''}`}
          onClick={isListening ? onStopListen : onStartListen}
          title={isListening ? 'Click to send voice' : 'Click to start speaking'}
        >
          {isListening ? <Square size={15} /> : <Mic size={17} />}
        </button>

        <button className="icon-btn send" onClick={submit} disabled={isThinking || (!text.trim() && !imageDataUrl)} title="Send (Enter)">
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

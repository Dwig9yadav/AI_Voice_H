import { useState, useRef, useCallback } from 'react';
import { Play, Trash2, Code2, Terminal, Download } from 'lucide-react';
import { groqClient } from '../../engines/GroqClient.js';
import { MODELS } from '../../config/models.js';

const STARTER_CODE = `// ROSS Developer Sandbox — Live JavaScript Execution
// Write any JavaScript below and press Run (or Ctrl+Enter)

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n-1) + fibonacci(n-2);
}

// Generate first 10 Fibonacci numbers
const fibs = Array.from({length: 10}, (_, i) => fibonacci(i));
console.log('Fibonacci sequence:', fibs);
console.log('Sum:', fibs.reduce((a, b) => a + b, 0));
`;

export default function CodeSandbox() {
  const [code, setCode] = useState(STARTER_CODE);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [tab, setTab] = useState('editor');
  const iframeRef = useRef(null);
  const textareaRef = useRef(null);

  const runCode = useCallback(() => {
    setIsRunning(true);
    setOutput('');
    setTab('output');

    const logs = [];
    const originalConsole = {};
    const methods = ['log', 'warn', 'error', 'info', 'table'];

    try {
      // Sandbox via iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const iWin = iframe.contentWindow;
      const iConsole = iWin.console;

      methods.forEach(m => {
        originalConsole[m] = iConsole[m];
        iConsole[m] = (...args) => {
          logs.push({ type: m, text: args.map(a => {
            try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); } catch { return String(a); }
          }).join(' ') });
        };
      });

      iWin.eval(code);
      document.body.removeChild(iframe);

      const output = logs.length > 0
        ? logs.map(l => {
            const prefix = l.type === 'error' ? '✗ ' : l.type === 'warn' ? '⚠ ' : '▸ ';
            return prefix + l.text;
          }).join('\n')
        : '✓ Executed (no output)';

      setOutput(output);
    } catch (err) {
      setOutput(`✗ Error: ${err.message}\n  at line: ${err.lineNumber || '?'}`);
    } finally {
      setIsRunning(false);
    }
  }, [code]);

  const explainCode = useCallback(async () => {
    setIsExplaining(true);
    setExplanation('');
    setTab('explain');
    try {
      let text = '';
      const stream = groqClient.chatStream(
        MODELS.SIMPLE,
        [{
          role: 'system',
          content: 'You are an expert JavaScript teacher. Explain the provided code clearly, covering what it does, how it works, and any important concepts. Use markdown. Be thorough but concise.',
        }, {
          role: 'user',
          content: `Explain this JavaScript code:\n\`\`\`javascript\n${code}\n\`\`\``,
        }]
      );
      for await (const token of stream) {
        if (token?.__meta) break;
        text += token;
        setExplanation(text);
      }
    } catch (err) {
      setExplanation(`Error getting explanation: ${err.message}`);
    } finally {
      setIsExplaining(false);
    }
  }, [code]);

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
    // Tab insertion
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
  }

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ross-sandbox.js';
    a.click();
  };

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>JS Sandbox</h2>
          <p style={{ fontSize: '0.75rem', color: '#9d91c4', marginTop: 2 }}>Ctrl+Enter to run • Live in-browser execution</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={downloadCode} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '6px 10px', color: '#6ee7b7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontFamily: 'Syne, sans-serif' }}>
            <Download size={13} /> Export
          </button>
          <button onClick={() => { setCode(''); setOutput(''); setExplanation(''); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 10px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontFamily: 'Syne, sans-serif' }}>
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        className="sandbox-editor"
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ flex: 1, padding: 14, minHeight: 220, maxHeight: 340 }}
        spellCheck={false}
        placeholder="// Write JavaScript here…"
      />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={runCode} disabled={isRunning || !code.trim()} style={{
          flex: 1, background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))',
          border: '1px solid rgba(16,185,129,0.4)', borderRadius: 10, padding: '10px 16px',
          color: '#6ee7b7', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: (isRunning || !code.trim()) ? 0.5 : 1,
        }}>
          <Play size={15} /> {isRunning ? 'Running…' : 'Run Code (Ctrl+Enter)'}
        </button>
        <button onClick={explainCode} disabled={isExplaining || !code.trim()} style={{
          flex: 1, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 10, padding: '10px 16px', color: '#c4b5fd', cursor: 'pointer',
          fontFamily: 'Syne, sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: (isExplaining || !code.trim()) ? 0.5 : 1,
        }}>
          <Code2 size={15} /> {isExplaining ? 'Explaining…' : 'Explain with AI'}
        </button>
      </div>

      {/* Output / Explanation tabs */}
      {(output || explanation) && (
        <div style={{ flex: 0, minHeight: 80, maxHeight: 200 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {output && <button onClick={() => setTab('output')} style={{ fontSize: '0.75rem', fontFamily: 'Syne, sans-serif', color: tab === 'output' ? '#6ee7b7' : '#9d91c4', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Terminal size={12} /> Output</button>}
            {explanation && <button onClick={() => setTab('explain')} style={{ fontSize: '0.75rem', fontFamily: 'Syne, sans-serif', color: tab === 'explain' ? '#c4b5fd' : '#9d91c4', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Code2 size={12} /> Explanation</button>}
          </div>
          {tab === 'output' && output && (
            <div className="sandbox-output" style={{ maxHeight: 160, overflow: 'auto' }}>{output}</div>
          )}
          {tab === 'explain' && explanation && (
            <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: 14, fontSize: '0.82rem', color: '#e8e0ff', lineHeight: 1.65, maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{explanation}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ROSS AI — Wake Word Engine
// Uses Web Speech API continuous recognition (like Hey Google)
// Detects "Hey Ross" passively in background, zero mic hold needed
// ============================================================

const WAKE_PHRASES = ['hey ross', 'hey ros', 'hey roz', 'a ross', 'ok ross', 'okay ross'];

class WakeWordEngine {
  constructor() {
    this.recognition = null;
    this.isRunning = false;
    this.onWake = null;       // callback(commandText) when wake word detected
    this.onError = null;
    this.restartTimer = null;
    this.supported = typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  start(onWake, onError) {
    if (!this.supported) {
      onError?.('Wake word not supported in this browser. Use Chrome or Edge.');
      return false;
    }
    if (this.isRunning) return true;

    this.onWake = onWake;
    this.onError = onError;
    this._startRecognition();
    return true;
  }

  _startRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isRunning = true;
    };

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Check all alternatives
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.toLowerCase().trim();
          const wakePhrase = WAKE_PHRASES.find(p => transcript.includes(p));
          if (wakePhrase) {
            // Extract command after wake word
            let command = transcript.slice(transcript.indexOf(wakePhrase) + wakePhrase.length).trim();
            // Clean up common artifacts
            command = command.replace(/^[,.\s]+/, '').trim();
            this.onWake?.(command || '');
            // Brief pause before restarting to avoid echo
            this.stop();
            setTimeout(() => this._startRecognition(), 1500);
            return;
          }
        }
      }
    };

    this.recognition.onerror = (e) => {
      if (e.error === 'no-speech') {
        // Normal — just restart silently
        this._scheduleRestart(500);
        return;
      }
      if (e.error === 'not-allowed') {
        this.isRunning = false;
        this.onError?.('Microphone permission denied. Please allow mic access.');
        return;
      }
      // Other errors — restart
      this._scheduleRestart(1000);
    };

    this.recognition.onend = () => {
      if (this.isRunning) {
        // Auto-restart to keep listening continuously
        this._scheduleRestart(200);
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      this._scheduleRestart(1000);
    }
  }

  _scheduleRestart(ms) {
    clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (this.isRunning) this._startRecognition();
    }, ms);
  }

  stop() {
    this.isRunning = false;
    clearTimeout(this.restartTimer);
    try { this.recognition?.stop(); } catch {}
    this.recognition = null;
  }

  get active() { return this.isRunning; }
}

export const wakeWordEngine = new WakeWordEngine();
export default WakeWordEngine;

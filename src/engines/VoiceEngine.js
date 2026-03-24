// ============================================================
// ROSS AI — Voice Engine
// STT: Groq Whisper (auto v3/Turbo) + browser fallback
// TTS: Groq PlayAI for English | Browser synthesis for all other languages
// ============================================================

import { groqClient } from './GroqClient.js';
import { MODELS, DEFAULT_VOICE } from '../config/models.js';

// Languages supported natively by Groq PlayAI TTS (English only)
const GROQ_TTS_LANGUAGES = new Set(['en']);

// BCP-47 language codes for browser speech synthesis
const LANG_CODES = {
  ar: 'ar-SA', hi: 'hi-IN', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
  fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-BR', ru: 'ru-RU',
  it: 'it-IT', tr: 'tr-TR', nl: 'nl-NL', pl: 'pl-PL', sv: 'sv-SE',
  id: 'id-ID', ms: 'ms-MY', th: 'th-TH', vi: 'vi-VN', uk: 'uk-UA',
};

class VoiceEngine {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.audioCtx = null;
    this.analyser = null;
    this.currentSource = null;
    this.currentVoice = DEFAULT_VOICE;
    this.stream = null;
    this.onWaveformUpdate = null;
    this.rafId = null;
    this.currentLanguage = 'en';
  }

  async initAudioContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    }
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
  }

  setVoice(voice) { this.currentVoice = voice; }
  setLanguage(lang) { this.currentLanguage = lang || 'en'; }

  selectSTTModel(blob) {
    return blob.size < 1024 * 1024 ? MODELS.STT_FAST : MODELS.STT_ACCURATE;
  }

  async startRecording(onWaveform) {
    await this.initAudioContext();
    this.onWaveformUpdate = onWaveform || null;
    this.audioChunks = [];
    this.isRecording = true;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    const source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    source.connect(this.analyser);

    if (onWaveform) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const tick = () => {
        if (!this.isRecording) return;
        this.analyser.getByteFrequencyData(dataArray);
        onWaveform(Array.from(dataArray.slice(0, 64)));
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    }

    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      .find(t => MediaRecorder.isTypeSupported(t)) || '';

    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
    this.mediaRecorder.ondataavailable = (e) => { if (e.data?.size > 0) this.audioChunks.push(e.data); };
    this.mediaRecorder.start(100);
  }

  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) return reject(new Error('Not recording'));
      cancelAnimationFrame(this.rafId);
      this.isRecording = false;

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
          this.stream?.getTracks().forEach(t => t.stop());
          if (blob.size < 1000) return resolve({ text: '', language: 'en' });
          const model = this.selectSTTModel(blob);
          const result = await groqClient.transcribe(blob, model);
          resolve(result);
        } catch (err) {
          console.warn('Groq STT failed:', err.message);
          resolve({ text: '', language: 'en' });
        }
      };
      this.mediaRecorder.stop();
    });
  }

  // ── Smart TTS: Groq for English, Browser for everything else ──
  async speak(text, language, onStart, onEnd) {
    this.stopSpeaking();
    if (!text?.trim()) return;

    const lang = language || this.currentLanguage || 'en';
    const clean = text.replace(/```[\s\S]*?```/g, ' code block ').replace(/[#*`_~\[\]]/g, '').slice(0, 600);

    if (GROQ_TTS_LANGUAGES.has(lang)) {
      await this._groqTTS(clean, onStart, onEnd);
    } else {
      this._browserTTS(clean, lang, onStart, onEnd);
    }
  }

  async _groqTTS(text, onStart, onEnd) {
    try {
      await this.initAudioContext();
      if (onStart) onStart();
      const audioBuffer = await groqClient.speak(text, this.currentVoice.model, this.currentVoice.id);
      const decoded = await this.audioCtx.decodeAudioData(audioBuffer.slice(0));
      this.currentSource = this.audioCtx.createBufferSource();
      this.currentSource.buffer = decoded;
      this.currentSource.connect(this.audioCtx.destination);
      this.currentSource.onended = () => { this.currentSource = null; onEnd?.(); };
      this.currentSource.start(0);
    } catch (err) {
      console.warn('Groq TTS failed, using browser fallback:', err.message);
      this._browserTTS(text, 'en', onStart, onEnd);
    }
  }

  _browserTTS(text, lang, onStart, onEnd) {
    if (!window.speechSynthesis) return onEnd?.();
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_CODES[lang] || lang || 'en-US';
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    // Try to find a native voice for this language
    const voices = window.speechSynthesis.getVoices();
    const langCode = LANG_CODES[lang] || lang;
    const match = voices.find(v => v.lang.startsWith(langCode?.split('-')[0]));
    if (match) utter.voice = match;

    utter.onstart = onStart;
    utter.onend = onEnd;
    utter.onerror = onEnd;
    window.speechSynthesis.speak(utter);
  }

  stopSpeaking() {
    try { this.currentSource?.stop(); } catch {}
    this.currentSource = null;
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  get isSpeaking() {
    return !!this.currentSource || (window.speechSynthesis?.speaking ?? false);
  }
}

export const voiceEngine = new VoiceEngine();
export default VoiceEngine;

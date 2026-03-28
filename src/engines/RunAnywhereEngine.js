// ============================================================
// ROSS AI — RunAnywhere Engine
// Optional local inference path: STT + LLM + TTS in-browser
// ============================================================

import { RUNANYWHERE_ENABLED, RUNANYWHERE_PREFER_LOCAL } from '../config/models.js';

class RunAnywhereEngine {
  constructor() {
    this.enabled = RUNANYWHERE_ENABLED;
    this.preferLocal = RUNANYWHERE_PREFER_LOCAL;
    this.client = null;
    this.initialized = false;
    this.status = {
      available: false,
      llm: false,
      stt: false,
      tts: false,
      provider: 'none',
    };
  }

  async init(options = {}) {
    if (!this.enabled) return this.status;
    if (this.initialized) return this.status;

    this.preferLocal = options.preferLocal ?? this.preferLocal;

    try {
      const sdk = await this._resolveSDK();
      if (!sdk) {
        this.initialized = true;
        return this.status;
      }

      this.client = this._resolveClient(sdk);
      this.status = {
        available: !!this.client,
        llm: this._hasAny([
          this.client?.llm?.stream,
          this.client?.llm?.chat,
          this.client?.chat?.stream,
          this.client?.chat?.complete,
          this.client?.generate,
        ]),
        stt: this._hasAny([
          this.client?.stt?.transcribe,
          this.client?.speech?.transcribe,
          this.client?.audio?.transcribe,
          this.client?.transcribe,
        ]),
        tts: this._hasAny([
          this.client?.tts?.speak,
          this.client?.speech?.speak,
          this.client?.audio?.speak,
          this.client?.speak,
        ]),
        provider: 'runanywhere',
      };
    } catch (err) {
      console.warn('RunAnywhere init failed:', err?.message || err);
    }

    this.initialized = true;
    return this.status;
  }

  _hasAny(fns) {
    return fns.some(fn => typeof fn === 'function');
  }

  async _resolveSDK() {
    if (typeof window !== 'undefined') {
      if (window.RunAnywhere) return window.RunAnywhere;
      if (window.runAnywhere) return window.runAnywhere;
    }

    const candidates = [
      '@runanywhere/sdk',
      'runanywhere-sdk',
      'runanywhere',
    ];

    for (const pkg of candidates) {
      try {
        const mod = await import(/* @vite-ignore */ pkg);
        if (mod?.default || mod?.RunAnywhere || mod?.createRunAnywhere || mod?.createClient) {
          return mod;
        }
      } catch {
        // optional dependency not installed
      }
    }

    return null;
  }

  _resolveClient(sdk) {
    if (!sdk) return null;

    if (sdk?.client) return sdk.client;
    if (sdk?.default?.client) return sdk.default.client;

    if (typeof sdk?.createClient === 'function') {
      try { return sdk.createClient(); } catch {}
    }

    if (typeof sdk?.default?.createClient === 'function') {
      try { return sdk.default.createClient(); } catch {}
    }

    if (typeof sdk?.createRunAnywhere === 'function') {
      try { return sdk.createRunAnywhere(); } catch {}
    }

    if (typeof sdk?.default?.createRunAnywhere === 'function') {
      try { return sdk.default.createRunAnywhere(); } catch {}
    }

    return sdk?.default || sdk;
  }

  shouldUseLocalLLM() {
    return this.enabled && this.preferLocal && this.status.available && this.status.llm;
  }

  shouldUseLocalSTT() {
    return this.enabled && this.preferLocal && this.status.available && this.status.stt;
  }

  shouldUseLocalTTS() {
    return this.enabled && this.preferLocal && this.status.available && this.status.tts;
  }

  async transcribe(audioBlob, options = {}) {
    if (!this.shouldUseLocalSTT()) throw new Error('Local STT unavailable');

    const calls = [
      () => this.client.stt?.transcribe?.(audioBlob, options),
      () => this.client.speech?.transcribe?.(audioBlob, options),
      () => this.client.audio?.transcribe?.(audioBlob, options),
      () => this.client.transcribe?.(audioBlob, options),
      () => this.client.stt?.transcribe?.({ audio: audioBlob, ...options }),
      () => this.client.speech?.transcribe?.({ audio: audioBlob, ...options }),
      () => this.client.audio?.transcribe?.({ audio: audioBlob, ...options }),
      () => this.client.transcribe?.({ audio: audioBlob, ...options }),
    ];

    const raw = await this._firstSuccessful(calls);
    return this._normalizeTranscription(raw);
  }

  async *chatStream(userText, context = {}) {
    if (!this.shouldUseLocalLLM()) throw new Error('Local LLM unavailable');

    const messages = this._buildMessages(userText, context);
    const prompt = this._buildPrompt(userText, context);

    const streamCalls = [
      () => this.client.llm?.stream?.(messages, context),
      () => this.client.chat?.stream?.(messages, context),
      () => this.client.llm?.stream?.({ messages, ...context }),
      () => this.client.chat?.stream?.({ messages, ...context }),
      () => this.client.generateStream?.(prompt, context),
      () => this.client.llm?.chat?.({ messages, stream: true, ...context }),
      () => this.client.chat?.complete?.({ messages, stream: true, ...context }),
    ];

    const source = await this._firstSuccessful(streamCalls);

    if (!source) throw new Error('RunAnywhere stream unavailable');

    if (typeof source === 'string') {
      yield source;
      return;
    }

    if (Symbol.asyncIterator in Object(source)) {
      for await (const chunk of source) {
        const token = this._chunkToText(chunk);
        if (token) yield token;
      }
      return;
    }

    if (source?.getReader) {
      const reader = source.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        if (buf) {
          yield buf;
          buf = '';
        }
      }
      return;
    }

    const text = this._chunkToText(source);
    if (text) yield text;
  }

  async chat(userText, context = {}) {
    let out = '';
    for await (const token of this.chatStream(userText, context)) {
      out += token;
    }
    return out.trim();
  }

  async speak(text, options = {}) {
    if (!this.shouldUseLocalTTS()) throw new Error('Local TTS unavailable');

    const calls = [
      () => this.client.tts?.speak?.(text, options),
      () => this.client.speech?.speak?.(text, options),
      () => this.client.audio?.speak?.(text, options),
      () => this.client.speak?.(text, options),
      () => this.client.tts?.speak?.({ text, ...options }),
      () => this.client.speech?.speak?.({ text, ...options }),
      () => this.client.audio?.speak?.({ text, ...options }),
      () => this.client.speak?.({ text, ...options }),
    ];

    return await this._firstSuccessful(calls);
  }

  _buildMessages(userText, context) {
    const systemPrompt = context.systemPrompt || '';
    const history = Array.isArray(context.history) ? context.history : [];
    const messages = [];

    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const m of history.slice(-12)) {
      messages.push({ role: m.role || 'user', content: String(m.content || '') });
    }
    messages.push({ role: 'user', content: userText });

    return messages;
  }

  _buildPrompt(userText, context) {
    const lines = [];
    if (context.systemPrompt) lines.push(`System: ${context.systemPrompt}`);
    if (Array.isArray(context.history) && context.history.length) {
      for (const m of context.history.slice(-12)) {
        lines.push(`${m.role === 'assistant' ? 'Assistant' : 'User'}: ${String(m.content || '')}`);
      }
    }
    lines.push(`User: ${userText}`);
    lines.push('Assistant:');
    return lines.join('\n\n');
  }

  _chunkToText(chunk) {
    if (!chunk) return '';
    if (typeof chunk === 'string') return chunk;
    if (typeof chunk?.text === 'string') return chunk.text;
    if (typeof chunk?.token === 'string') return chunk.token;
    if (typeof chunk?.delta === 'string') return chunk.delta;
    if (typeof chunk?.content === 'string') return chunk.content;
    if (typeof chunk?.message?.content === 'string') return chunk.message.content;
    if (typeof chunk?.choices?.[0]?.delta?.content === 'string') return chunk.choices[0].delta.content;
    return '';
  }

  _normalizeTranscription(raw) {
    if (!raw) return { text: '', language: 'en' };
    if (typeof raw === 'string') return { text: raw.trim(), language: 'en' };
    if (typeof raw?.text === 'string') return { text: raw.text.trim(), language: raw.language || 'en' };
    if (typeof raw?.transcript === 'string') return { text: raw.transcript.trim(), language: raw.language || 'en' };
    if (typeof raw?.result?.text === 'string') return { text: raw.result.text.trim(), language: raw.result.language || 'en' };
    return { text: '', language: 'en' };
  }

  async _firstSuccessful(calls) {
    let lastErr = null;
    for (const makeCall of calls) {
      try {
        const result = await makeCall();
        if (result !== undefined && result !== null) return result;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('RunAnywhere call failed');
  }
}

export const runAnywhereEngine = new RunAnywhereEngine();
export default RunAnywhereEngine;

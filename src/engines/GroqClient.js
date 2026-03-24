// ============================================================
// ROSS AI — Groq API Client
// Handles: Chat, Streaming, Tool Use, STT, TTS, Vision
// ============================================================

const GROQ_BASE = 'https://api.groq.com/openai/v1';

class GroqClient {
  constructor() {
    this.apiKey = '';
    this.baseUrl = GROQ_BASE;
  }

  setApiKey(key) { this.apiKey = key.trim(); }

  get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  // ── Non-streaming chat ────────────────────────────────────
  async chat(model, messages, options = {}) {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        top_p: options.topP ?? 0.95,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }

  // ── Streaming chat ────────────────────────────────────────
  async *chatStream(model, messages, options = {}) {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let modelName = model;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.model) modelName = parsed.model;
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch {}
      }
    }
  }

  // ── Tool / Function calling ───────────────────────────────
  async chatWithTools(model, messages, tools, options = {}) {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1024,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  // ── Speech-to-Text (Whisper) ──────────────────────────────
  async transcribe(audioBlob, model, language = null) {
    const formData = new FormData();
    const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    formData.append('file', audioBlob, `audio.${ext}`);
    formData.append('model', model);
    if (language) formData.append('language', language);
    formData.append('response_format', 'verbose_json');

    const res = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `STT error ${res.status}`);
    }
    const data = await res.json();
    return { text: data.text?.trim() || '', language: data.language || 'en' };
  }

  // ── Text-to-Speech ────────────────────────────────────────
  async speak(text, model, voice) {
    const res = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        input: text.slice(0, 4096),
        voice,
        response_format: 'wav',
        speed: 1.0,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `TTS error ${res.status}`);
    }
    return await res.arrayBuffer();
  }

  // ── Vision (image description) ────────────────────────────
  async describeImage(imageDataUrl, prompt = 'Describe this image in detail.', model) {
    return await this.chat(
      model || 'meta-llama/llama-4-scout-17b-16e-instruct',
      [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: prompt },
        ],
      }]
    );
  }

  // ── Safety check ──────────────────────────────────────────
  async safetyCheck(text) {
    try {
      const result = await this.chat(
        'llama-guard-3-8b',
        [{ role: 'user', content: text }],
        { maxTokens: 10, temperature: 0 }
      );
      return result.toLowerCase().includes('safe');
    } catch {
      return true; // Default safe if check fails
    }
  }
}

export const groqClient = new GroqClient();
export default GroqClient;

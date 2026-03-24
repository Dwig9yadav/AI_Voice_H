// ============================================================
// ROSS AI — Memory Engine
// Short-term: In-memory session | Long-term: IndexedDB
// Named memories | Auto-summarize | Settings storage
// ============================================================

import { openDB } from 'idb';

const DB_NAME = 'ross-ai-v2';
const DB_VERSION = 1;

class MemoryEngine {
  constructor() {
    this.db = null;
    this.shortTerm = [];         // Current session messages
    this.maxShortTerm = 100;
    this.sessionId = `sess_${Date.now()}`;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Conversations (long-term)
          if (!db.objectStoreNames.contains('conversations')) {
            const s = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
            s.createIndex('by_session', 'sessionId');
            s.createIndex('by_time', 'timestamp');
          }
          // Named memories
          if (!db.objectStoreNames.contains('memories')) {
            db.createObjectStore('memories', { keyPath: 'key' });
          }
          // Conversation summaries
          if (!db.objectStoreNames.contains('summaries')) {
            const s = db.createObjectStore('summaries', { keyPath: 'id', autoIncrement: true });
            s.createIndex('by_time', 'timestamp');
          }
          // App settings
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        },
      });
    } catch (err) {
      console.warn('IndexedDB unavailable, using memory-only mode:', err);
    }
    this.initialized = true;
  }

  // ── Short-term memory (session) ───────────────────────────
  addMessage(role, content) {
    const msg = { role, content, timestamp: Date.now(), sessionId: this.sessionId };
    this.shortTerm.push(msg);
    if (this.shortTerm.length > this.maxShortTerm) {
      this.shortTerm = this.shortTerm.slice(-this.maxShortTerm);
    }
    return msg;
  }

  getHistory(limit = 20) {
    return this.shortTerm.slice(-limit).map(m => ({ role: m.role, content: m.content }));
  }

  clearShortTerm() { this.shortTerm = []; }

  // ── Long-term memory (IndexedDB) ──────────────────────────
  async saveConversation(userMsg, assistantMsg, meta = {}) {
    if (!this.db) return;
    await this.db.add('conversations', {
      sessionId: this.sessionId,
      userMessage: userMsg,
      assistantResponse: assistantMsg,
      timestamp: Date.now(),
      mode: meta.mode || 'assistant',
      emotion: meta.emotion || null,
      model: meta.model || null,
    });
  }

  async getConversations(limit = 100) {
    if (!this.db) return [];
    const all = await this.db.getAllFromIndex('conversations', 'by_time');
    return all.slice(-limit).reverse();
  }

  async getSessionConversations(sessionId) {
    if (!this.db) return [];
    return await this.db.getAllFromIndex('conversations', 'by_session', sessionId);
  }

  // ── Named memories ────────────────────────────────────────
  async saveNamedMemory(key, value) {
    if (!this.db) return;
    const k = key.toLowerCase().trim();
    await this.db.put('memories', { key: k, value, updatedAt: Date.now() });
  }

  async getNamedMemory(key) {
    if (!this.db) return null;
    return await this.db.get('memories', key.toLowerCase().trim());
  }

  async getAllNamedMemories() {
    if (!this.db) return [];
    return await this.db.getAll('memories');
  }

  async deleteNamedMemory(key) {
    if (!this.db) return;
    await this.db.delete('memories', key.toLowerCase().trim());
  }

  // ── Summaries ─────────────────────────────────────────────
  async saveSummary(text) {
    if (!this.db) return;
    await this.db.add('summaries', {
      summary: text,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });
  }

  async getRecentSummaries(limit = 5) {
    if (!this.db) return [];
    const all = await this.db.getAllFromIndex('summaries', 'by_time');
    return all.slice(-limit).reverse();
  }

  // ── Settings ──────────────────────────────────────────────
  async saveSetting(key, value) {
    if (!this.db) return;
    await this.db.put('settings', { key, value });
  }

  async getSetting(key, defaultValue = null) {
    if (!this.db) return defaultValue;
    const r = await this.db.get('settings', key);
    return r?.value ?? defaultValue;
  }

  // ── Build memory context string for LLM ──────────────────
  async buildContext() {
    const [mems, summaries] = await Promise.all([
      this.getAllNamedMemories(),
      this.getRecentSummaries(3),
    ]);

    let ctx = '';
    if (mems.length > 0) {
      ctx += 'User saved memories:\n' + mems.map(m => `• ${m.key}: ${m.value}`).join('\n') + '\n\n';
    }
    if (summaries.length > 0) {
      ctx += 'Previous conversation summaries:\n' + summaries.map(s => `• ${s.summary}`).join('\n');
    }
    return ctx;
  }

  // ── Stats ─────────────────────────────────────────────────
  async getStats() {
    const base = { shortTerm: this.shortTerm.length, sessionId: this.sessionId };
    if (!this.db) return { ...base, conversations: 0, namedMemories: 0, summaries: 0 };
    const [conversations, namedMemories, summaries] = await Promise.all([
      this.db.count('conversations'),
      this.db.count('memories'),
      this.db.count('summaries'),
    ]);
    return { conversations, namedMemories, summaries, ...base };
  }

  // ── Clear all ─────────────────────────────────────────────
  async clearAll() {
    this.clearShortTerm();
    if (!this.db) return;
    await Promise.all([
      this.db.clear('conversations'),
      this.db.clear('memories'),
      this.db.clear('summaries'),
    ]);
  }
}

export const memoryEngine = new MemoryEngine();
export default MemoryEngine;

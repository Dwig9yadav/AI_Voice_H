// ================================================================
// ROSS AI — useRoss v3  "Cortex Brain"
// ================================================================
//
//  The central nervous system. Orchestrates every engine.
//
//  § 1   STATE MACHINE          — 18 state slices + refs
//  § 2   BOOT SEQUENCE          — parallel init, saved prefs, greeting
//  § 3   MESSAGE QUEUE          — debounced rapid-fire queue
//  § 4   PRE-CLASSIFY ROUTER    — sync action dispatch (no popup block)
//  § 5   NLP PIPELINE           — classify → route → handle
//  § 6   QUICK RESPONDERS       — zero-LLM answers (time/date/math etc)
//  § 7   MEMORY COMMANDS        — save/recall/clear/list
//  § 8   MODE SWITCHER          — 4 modes with persist
//  § 9   ACTION DISPATCHER      — navigation/search/media
//  § 10  LLM STREAMING          — token-by-token with abort
//  § 11  TOOL-CALLING PATH      — LLM → ActionEngine function calls
//  § 12  ERROR RECOVERY         — retries, fallbacks, friendly errors
//  § 13  POST-RESPONSE          — summarize, speak, stats, suggestions
//  § 14  VOICE PIPELINE         — STT → process → TTS
//  § 15  WAKE WORD              — continuous "Hey Ross" listener
//  § 16  REGENERATE             — redo last response with new params
//  § 17  EDIT MESSAGE           — fork conversation from any point
//  § 18  CONVERSATION EXPORT    — Markdown / JSON download
//  § 19  ANALYTICS              — session metrics, intent frequency
//  § 20  PROACTIVE SUGGESTIONS  — context-aware quick-reply chips
//  § 21  THINKING STAGES        — visual pipeline progress
//  § 22  NETWORK GUARD          — offline detection + queue drain
//  § 23  PUBLIC API             — everything returned to components
// ================================================================

import { useState, useCallback, useRef, useEffect, useReducer } from 'react';
import { groqClient }        from '../engines/GroqClient.js';
import { llmEngine }         from '../engines/LLMEngine.js';
import { voiceEngine }       from '../engines/VoiceEngine.js';
import { memoryEngine }      from '../engines/MemoryEngine.js';
import { nlpEngine }         from '../engines/NLPEngine.js';
import { actionEngine }      from '../engines/ActionEngine.js';
import { emotionEngine }     from '../engines/EmotionEngine.js';
import { performanceEngine } from '../engines/PerformanceEngine.js';
import { wakeWordEngine }    from '../engines/WakeWordEngine.js';
import { GROQ_API_KEY, AI_MODES } from '../config/models.js';

// ── § 0  CONSTANTS ────────────────────────────────────────────
const WAKE_WORD            = 'hey ross';
const MAX_QUEUE            = 8;
const AUTO_SUMMARIZE_EVERY = 30;
const RETRY_DELAYS         = [1000, 2000, 4000]; // ms
const MAX_SPEAK_CHARS      = 600;
const HISTORY_WINDOW       = 20;
const SUGGESTION_COUNT     = 3;

// Thinking stage labels shown in UI during processing
const THINKING_STAGES = [
  { id: 'nlp',     label: '🔍 Analysing intent…'       },
  { id: 'context', label: '🧠 Loading context…'         },
  { id: 'model',   label: '⚡ Selecting model…'         },
  { id: 'stream',  label: '💬 Generating response…'     },
  { id: 'post',    label: '✨ Finishing up…'            },
];

// Suggestion banks per intent group
const SUGGESTION_MAP = {
  CODE_WRITE:   ['Explain this code', 'Add error handling', 'Write tests for this', 'Optimise for performance'],
  EXPLAIN:      ['Give me an example', 'Explain more simply', 'What are the pros and cons?', 'How does this compare to alternatives?'],
  SEARCH:       ['Open the first result', 'Search YouTube instead', 'Find more about this', 'Save this to memory'],
  NAVIGATION:   ['Search YouTube here', 'Open another tab', 'Go back to Google'],
  COMPARE:      ['Which should I use?', 'Show me a code example', 'What do experts recommend?'],
  RECOMMEND:    ['Tell me more about #1', 'Compare top 2', 'Find tutorials for this'],
  WEATHER:      ['What should I wear?', 'Will it rain tomorrow?', 'Open Google Maps'],
  HEALTH_QUERY: ['Give me a home remedy', 'Should I see a doctor?', 'Open WebMD'],
  TRANSLATE:    ['Teach me more words', 'What does this phrase mean?', 'Open Google Translate'],
  NEWS:         ['Tell me more', 'Open BBC News', 'Search YouTube for this'],
  DEFAULT:      ['Tell me more', 'Give an example', 'Save this to memory', 'Search for this'],
};

// ── § 1  MESSAGES REDUCER (immutable message state) ──────────
function messagesReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, action.msg];
    case 'UPDATE':
      return state.map(m => m.id === action.id ? { ...m, ...action.patch } : m);
    case 'DELETE':
      return state.filter(m => m.id !== action.id);
    case 'FORK':
      // Edit: remove all messages after (and including) the edited one, re-add edited
      return [...state.filter(m => m.id < action.id), action.msg];
    case 'CLEAR':
      return action.keep ? state.filter(m => m.keep) : [];
    case 'PIN':
      return state.map(m => m.id === action.id ? { ...m, pinned: !m.pinned } : m);
    case 'REACT':
      return state.map(m => m.id === action.id ? { ...m, reaction: action.reaction } : m);
    default:
      return state;
  }
}

// ── UTILITIES ─────────────────────────────────────────────────
function makeId() { return Date.now() + Math.floor(Math.random() * 1000); }

function cleanForSpeech(text) {
  return text
    .replace(/```[\s\S]*?```/g, 'code block')
    .replace(/`[^`]+`/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[_~]/g, '')
    .slice(0, MAX_SPEAK_CHARS);
}

function getSuggestions(intent, lastResponse = '') {
  const bank = SUGGESTION_MAP[intent] || SUGGESTION_MAP.DEFAULT;
  // Shuffle and return first N
  return [...bank].sort(() => Math.random() - 0.5).slice(0, SUGGESTION_COUNT);
}

function formatError(err) {
  const msg = err?.message || String(err);
  if (msg.includes('401') || msg.includes('api_key') || msg.includes('API key'))
    return '⚠️ Invalid or missing API key. Go to **Settings** → paste your Groq key.';
  if (msg.includes('429') || msg.includes('rate'))
    return '⏳ Rate limit hit. ROSS will retry in a moment…';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch'))
    return '📡 Network error. Check your connection.';
  if (msg.includes('500') || msg.includes('502') || msg.includes('503'))
    return '🔧 Groq server hiccup. Retrying…';
  return `❌ ${msg.slice(0, 120)}`;
}

function isRetryable(err) {
  const msg = err?.message || '';
  return msg.includes('429') || msg.includes('500') || msg.includes('502') ||
         msg.includes('503') || msg.includes('network') || msg.includes('fetch');
}

// ── MAIN HOOK ─────────────────────────────────────────────────
export function useRoss() {

  // ── § 1  STATE ─────────────────────────────────────────────
  const [messages,       dispatchMessages] = useReducer(messagesReducer, []);
  const [isThinking,     setIsThinking]    = useState(false);
  const [isListening,    setIsListening]   = useState(false);
  const [isSpeaking,     setIsSpeaking]    = useState(false);
  const [mode,           setMode]          = useState('assistant');
  const [currentEmotion, setCurrentEmotion]= useState('neutral');
  const [waveformData,   setWaveformData]  = useState(new Array(32).fill(0));
  const [wakeWordEnabled,setWakeWordEnabled]= useState(false);
  const [transcript,     setTranscript]    = useState('');
  const [selectedVoice,  setSelectedVoice] = useState(null);
  const [apiKey,         setApiKeyState]   = useState(GROQ_API_KEY);
  const [initialized,    setInitialized]   = useState(false);
  const [deviceProfile,  setDeviceProfile] = useState(null);
  const [memStats,       setMemStats]      = useState({});
  const [error,          setError]         = useState(null);
  const [activeModel,    setActiveModel]   = useState('');
  const [responseMs,     setResponseMs]    = useState(0);
  const [thinkingStage,  setThinkingStage] = useState('');
  const [suggestions,    setSuggestions]   = useState([]);
  const [isOnline,       setIsOnline]      = useState(navigator.onLine);
  const [sessionStats,   setSessionStats]  = useState({
    messagesSent: 0, actionsTriggered: 0, llmCalls: 0,
    intentFrequency: {}, totalTokens: 0, sessionStart: Date.now(),
  });
  const [inputDraft,     setInputDraft]    = useState('');
  const [pinnedMessages, setPinnedMessages]= useState([]);
  const [lastIntent,     setLastIntent]    = useState(null);
  const [conversationTitle, setConversationTitle] = useState('');

  // ── REFS ────────────────────────────────────────────────────
  const abortRef        = useRef(false);
  const wakeWordRef     = useRef(false);
  const messageQueueRef = useRef([]);
  const processingRef   = useRef(false);
  const lastUserMsgRef  = useRef('');
  const lastAssistMsgRef= useRef('');
  const retryCountRef   = useRef(0);
  const streamingIdRef  = useRef(null);
  const offlineQueueRef = useRef([]);
  const modeRef         = useRef('assistant');  // kept in sync for callbacks

  // ── keep modeRef in sync ────────────────────────────────────
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── § 22  NETWORK GUARD ─────────────────────────────────────
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      // Drain offline queue
      if (offlineQueueRef.current.length > 0) {
        const pending = [...offlineQueueRef.current];
        offlineQueueRef.current = [];
        pending.forEach(text => sendMessage(text));
      }
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── § 2  BOOT SEQUENCE ──────────────────────────────────────
  useEffect(() => {
    async function boot() {
      try {
        // Set API key everywhere
        groqClient.setApiKey(GROQ_API_KEY);
        nlpEngine.setApiKey(GROQ_API_KEY);

        // Parallel init: DB + NLP + device profile
        const [, , profile] = await Promise.all([
          memoryEngine.init(),
          nlpEngine.init(),
          performanceEngine.detect(),
        ]);
        setDeviceProfile(profile);

        const stats = await memoryEngine.getStats();
        setMemStats(stats);

        // Restore saved preferences
        const [savedMode, savedVoice, savedTitle] = await Promise.all([
          memoryEngine.getSetting('mode', 'assistant'),
          memoryEngine.getSetting('voice', null),
          memoryEngine.getSetting('conversationTitle', ''),
        ]);
        if (savedMode && AI_MODES[savedMode]) { setMode(savedMode); modeRef.current = savedMode; }
        if (savedVoice) { voiceEngine.setVoice(savedVoice); setSelectedVoice(savedVoice); }
        if (savedTitle) setConversationTitle(savedTitle);

        // Country-aware ActionEngine (detect from browser locale)
        try {
          const locale = navigator.language || 'en-US';
          const cc = locale.split('-')[1]?.toLowerCase() || 'com';
          actionEngine.setCountry(cc);
        } catch {}

        setInitialized(true);

        // Dynamic greeting based on time of day
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const memCount = stats.namedMemories || 0;
        const memNote  = memCount > 0 ? ` I remember **${memCount}** thing${memCount > 1 ? 's' : ''} about you.` : '';
        _addMsg({
          role: 'assistant', content: `🌌 ${greeting}! ROSS v2.0 online — all systems nominal.${memNote} How can I help?`,
          mode: 'system', emotion: 'neutral', model: 'system', keep: true,
        });

      } catch (err) {
        setError('Boot failed: ' + err.message);
        setInitialized(true);
        _addMsg({ role: 'assistant', content: '⚠️ ROSS started in degraded mode. Some features may be unavailable.', mode: 'system', emotion: 'neutral', model: 'system', keep: true });
      }
    }
    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── INTERNAL MESSAGE HELPERS ────────────────────────────────
  function _addMsg(fields) {
    const msg = { id: makeId(), timestamp: Date.now(), mode: modeRef.current, emotion: 'neutral', ...fields };
    dispatchMessages({ type: 'ADD', msg });
    return msg.id;
  }

  function _updateMsg(id, patch) {
    dispatchMessages({ type: 'UPDATE', id, patch });
  }

  function _actionMsg(content, emotion = 'neutral') {
    const prefix = /^[✅🔍▶️🎵💾🗺️📝🌐🧭🎶☁️🍎⚠️❌🔇]/.test(content) ? '' : '✅ ';
    const id = _addMsg({ role: 'assistant', content: prefix + content, emotion, model: 'local-action', ms: 0 });
    memoryEngine.addMessage('assistant', prefix + content);
    return id;
  }

  function _trackIntent(intent) {
    setLastIntent(intent);
    setSessionStats(prev => ({
      ...prev,
      intentFrequency: {
        ...prev.intentFrequency,
        [intent]: (prev.intentFrequency[intent] || 0) + 1,
      },
    }));
  }

  function _setStage(stageId) {
    const stage = THINKING_STAGES.find(s => s.id === stageId);
    setThinkingStage(stage?.label || '');
  }

  // ── § 20  PROACTIVE SUGGESTIONS ─────────────────────────────
  function _updateSuggestions(intent, lastResponse) {
    const chips = getSuggestions(intent, lastResponse);
    setSuggestions(chips);
  }

  // ── § 3  MESSAGE QUEUE ───────────────────────────────────────
  // Queues messages if one is already processing, drains in order
  async function _enqueue(text, imageDataUrl = null) {
    if (messageQueueRef.current.length >= MAX_QUEUE) return;
    messageQueueRef.current.push({ text, imageDataUrl });
    if (!processingRef.current) _drainQueue();
  }

  async function _drainQueue() {
    if (processingRef.current || messageQueueRef.current.length === 0) return;
    processingRef.current = true;
    while (messageQueueRef.current.length > 0) {
      const { text, imageDataUrl } = messageQueueRef.current.shift();
      await _processMessage(text, imageDataUrl);
    }
    processingRef.current = false;
  }

  // ── § 4  SYNC PRE-CLASSIFY ROUTER ───────────────────────────
  // Runs BEFORE any await so anchor clicks are never blocked.
  function _trySyncAction(userText, emotion) {
    // 1. Multi-site
    const multi = actionEngine.detectMultipleSites(userText);
    if (multi) {
      actionEngine.openMultiple(multi);
      const list = multi.map(s => `**${s}**`).join(', ');
      _actionMsg(`Opening ${list} in new tabs…`, emotion);
      voiceEngine.speak(`Opening ${multi.join(', ')}`, 'en', () => setIsSpeaking(true), () => setIsSpeaking(false));
      _trackIntent('NAVIGATION');
      setSessionStats(s => ({ ...s, actionsTriggered: s.actionsTriggered + 1 }));
      return true;
    }

    // 2. Direct navigation "open X"
    const navM = userText.match(/^(?:open|launch|go\s+to|navigate\s+to|visit|load|take\s+me\s+to|show\s+me|pull\s+up|bring\s+up|head\s+to)\s+(.+)/i);
    if (navM) {
      const target = navM[1].replace(/\s*(website|site|page|app|portal|link|url)\s*$/i, '').trim();
      if (target && target.split(' ').length <= 4) {
        const r = actionEngine.openWebsite(target);
        if (r?.success) {
          _actionMsg(r.message, emotion);
          voiceEngine.speak(`Opening ${target}`, 'en', () => setIsSpeaking(true), () => setIsSpeaking(false));
          _trackIntent('NAVIGATION');
          setSessionStats(s => ({ ...s, actionsTriggered: s.actionsTriggered + 1 }));
          _updateSuggestions('NAVIGATION', '');
          return true;
        }
      }
    }

    // 3. Platform play "play X on spotify"
    const pp = actionEngine.detectPlatformPlay(userText);
    if (pp) {
      let r;
      if (pp.platform === 'spotify') r = actionEngine.spotifySearch(pp.query);
      else if (pp.platform === 'soundcloud') r = actionEngine.soundcloudSearch(pp.query);
      else if (pp.platform === 'applemusic') r = actionEngine.appleMusicSearch(pp.query);
      else r = actionEngine.youtubeSearch(pp.query);
      if (r?.success) {
        _actionMsg(r.message, emotion);
        voiceEngine.speak(r.message, 'en', () => setIsSpeaking(true), () => setIsSpeaking(false));
        _trackIntent('PLATFORM_PLAY');
        setSessionStats(s => ({ ...s, actionsTriggered: s.actionsTriggered + 1 }));
        return true;
      }
    }

    // 4. Search "search X" / "google X"
    const searchM = userText.match(/^(?:search|google|find|look\s+up|search\s+for|browse\s+for)\s+(.+)/i);
    if (searchM) {
      const q = searchM[1].replace(/[?.!]+$/, '').trim();
      const r = actionEngine.googleSearch(q);
      if (r?.success) {
        _actionMsg(r.message, emotion);
        _trackIntent('SEARCH');
        setSessionStats(s => ({ ...s, actionsTriggered: s.actionsTriggered + 1 }));
        return true;
      }
    }

    // 5. YouTube "search youtube for X"
    const ytM = userText.match(/(?:search\s+youtube|youtube\s+search|watch\s+on\s+youtube|find\s+on\s+youtube)\s+(.+)/i);
    if (ytM) {
      const r = actionEngine.youtubeSearch(ytM[1].trim());
      if (r?.success) {
        _actionMsg(r.message, emotion);
        _trackIntent('YOUTUBE_SEARCH');
        setSessionStats(s => ({ ...s, actionsTriggered: s.actionsTriggered + 1 }));
        return true;
      }
    }

    // 6. Maps "show on map" / "navigate to X"
    const mapsM = userText.match(/(?:show|find|open|get)\s+(?:on\s+)?(?:map|maps|directions?\s+to)\s+(.+)/i) ||
                  userText.match(/(?:how\s+do\s+i\s+get\s+to|directions?\s+to)\s+(.+)/i);
    if (mapsM) {
      const r = actionEngine.openMaps(mapsM[1].trim());
      if (r?.success) {
        _actionMsg(r.message, emotion);
        _trackIntent('MAPS');
        setSessionStats(s => ({ ...s, actionsTriggered: s.actionsTriggered + 1 }));
        return true;
      }
    }

    return false; // nothing handled
  }

  // ── § 5-13  CORE MESSAGE PROCESSOR ───────────────────────────
  async function _processMessage(text, imageDataUrl = null) {
    if (!text?.trim() && !imageDataUrl) return;

    const userText = text?.trim() || 'Describe this image.';
    setError(null);
    abortRef.current = false;
    setSuggestions([]);
    lastUserMsgRef.current = userText;

    // Add user message
    _addMsg({ role: 'user', content: userText, imageDataUrl });
    memoryEngine.addMessage('user', userText);
    setSessionStats(s => ({ ...s, messagesSent: s.messagesSent + 1 }));

    // Detect emotion
    const emotion = emotionEngine.detect(userText);
    setCurrentEmotion(emotion);

    // ── § 4: Sync pre-classify (no await — popup safe) ─────────
    if (!imageDataUrl && _trySyncAction(userText, emotion)) return;

    // ── § 5: Async NLP classify ─────────────────────────────────
    _setStage('nlp');
    const classification = await nlpEngine.classify(userText);
    _trackIntent(classification.intent);

    // ── § 6: Zero-LLM quick responses ──────────────────────────
    if (classification.quickResponse && !imageDataUrl) {
      const id = _addMsg({
        role: 'assistant', content: classification.quickResponse,
        emotion, model: 'local-nlp', ms: 0,
      });
      memoryEngine.addMessage('assistant', classification.quickResponse);
      voiceEngine.speak(cleanForSpeech(classification.quickResponse), classification.language, () => setIsSpeaking(true), () => setIsSpeaking(false));
      _updateSuggestions(classification.intent, classification.quickResponse);
      return;
    }

    // ── § 9: Post-classify action dispatch ─────────────────────
    const ACTION_INTENTS = new Set(['NAVIGATE','NAVIGATION','SEARCH_WEB','SEARCH_YOUTUBE','PLAY_MUSIC','YOUTUBE_SEARCH','PLATFORM_PLAY']);
    if (ACTION_INTENTS.has(classification.intent) && !imageDataUrl) {
      const r = actionEngine.processIntent(classification.intent, classification.entities, userText, classification.slots || {});
      if (r?.success) {
        _actionMsg(r.message, emotion);
        voiceEngine.speak(r.message, 'en', () => setIsSpeaking(true), () => setIsSpeaking(false));
        setSessionStats(s => ({ ...s, actionsTriggered: s.actionsTriggered + 1 }));
        _updateSuggestions(classification.intent, r.message);
        return;
      }
    }

    // Platform play NLP fallback
    if ((classification.intent === 'UNKNOWN' || classification.intent === 'PLATFORM_PLAY') && !imageDataUrl) {
      const pp = actionEngine.detectPlatformPlay(userText);
      if (pp) {
        let r;
        if (pp.platform === 'spotify') r = actionEngine.spotifySearch(pp.query);
        else if (pp.platform === 'soundcloud') r = actionEngine.soundcloudSearch(pp.query);
        else r = actionEngine.youtubeSearch(pp.query);
        if (r?.success) {
          _actionMsg(r.message, emotion);
          voiceEngine.speak(r.message, 'en', () => setIsSpeaking(true), () => setIsSpeaking(false));
          return;
        }
      }
    }

    // ── § 7: Memory commands ────────────────────────────────────
    if (classification.intent === 'MEMORY_SAVE' || classification.intent === 'MEM_SAVE') {
      const fact = classification.slots?.fact || classification.entities?.target || '';
      if (fact) {
        // Parse "my name is X" → key: name, value: X
        const m = fact.match(/^(?:my\s+)?(.+?)\s+(?:is|=|:)\s+(.+)/i);
        const key   = m ? m[1].trim() : fact.split(/\s/)[0];
        const value = m ? m[2].trim() : fact;
        await memoryEngine.saveNamedMemory(key, value);
        const id = _addMsg({ role: 'assistant', content: `💾 Got it! I'll remember that **${key}** = "${value}"`, emotion, model: 'local-memory', ms: 0 });
        const stats = await memoryEngine.getStats();
        setMemStats(stats);
        return;
      }
    }

    if (classification.intent === 'MEMORY_RECALL' || classification.intent === 'MEM_RECALL') {
      const mems = await memoryEngine.getAllNamedMemories();
      const content = mems.length > 0
        ? `📝 **Here's what I remember about you:**\n\n${mems.map(m => `• **${m.key}**: ${m.value}`).join('\n')}`
        : "📝 Nothing saved yet. Say **\"remember that my name is...\"** to save something!";
      _addMsg({ role: 'assistant', content, emotion, model: 'local-memory', ms: 0 });
      return;
    }

    if (classification.intent === 'MEMORY_CLEAR' || classification.intent === 'MEM_CLEAR') {
      await memoryEngine.clearAll();
      setMemStats({ conversations: 0, namedMemories: 0, summaries: 0, shortTerm: 0 });
      dispatchMessages({ type: 'CLEAR', keep: true });
      setTimeout(() => _addMsg({ role: 'assistant', content: '🗑️ All memories cleared. Fresh start!', model: 'system', keep: true }), 50);
      return;
    }

    // ── § 8: Mode switch ────────────────────────────────────────
    if (classification.intent === 'MODE_SWITCH') {
      const newMode = classification.slots?.mode || classification.entities?.target;
      if (newMode && AI_MODES[newMode]) {
        setMode(newMode);
        modeRef.current = newMode;
        await memoryEngine.saveSetting('mode', newMode);
        const cfg = AI_MODES[newMode];
        _addMsg({ role: 'assistant', content: `${cfg.icon} Switched to **${cfg.label} Mode**. ${cfg.description}`, mode: newMode, emotion, model: 'local-mode', ms: 0 });
        voiceEngine.speak(`Switched to ${cfg.label} Mode`, 'en', () => setIsSpeaking(true), () => setIsSpeaking(false));
        return;
      }
    }

    // Stop speaking
    if (classification.intent === 'STOP_SPEAKING' || classification.intent === 'STOP_SPEAK') {
      voiceEngine.stopSpeaking();
      setIsSpeaking(false);
      _addMsg({ role: 'assistant', content: '🔇 Stopped.', emotion, model: 'local', ms: 0 });
      return;
    }

    // Repeat last response
    if (classification.intent === 'REPEAT') {
      if (lastAssistMsgRef.current) {
        voiceEngine.speak(cleanForSpeech(lastAssistMsgRef.current), classification.language || 'en', () => setIsSpeaking(true), () => setIsSpeaking(false));
        _addMsg({ role: 'assistant', content: '🔁 Repeating last response…', emotion, model: 'local', ms: 0 });
      } else {
        _addMsg({ role: 'assistant', content: "Nothing to repeat yet!", emotion, model: 'local', ms: 0 });
      }
      return;
    }

    // Clarification needed?
    if (classification.clarificationScore > 0.7 && classification.intent === 'UNKNOWN') {
      const clarMsg = "🤔 I'm not sure what you mean. Could you be more specific? For example:\n• *\"Open YouTube\"*\n• *\"Search for...\"*\n• *\"Explain...\"*";
      _addMsg({ role: 'assistant', content: clarMsg, emotion, model: 'local-nlp', ms: 0 });
      return;
    }

    // ── § 10 & 11: LLM (streaming + tool-calling) ──────────────
    setIsThinking(true);
    _setStage('context');

    const startMs = Date.now();
    const assistantId = makeId();
    streamingIdRef.current = assistantId;

    // Placeholder message
    dispatchMessages({ type: 'ADD', msg: {
      id: assistantId, role: 'assistant', content: '', streaming: true,
      timestamp: Date.now(), mode: modeRef.current, emotion,
    }});

    let fullResponse = '';
    let modelName = '';
    let attempt = 0;

    while (attempt <= RETRY_DELAYS.length) {
      try {
        _setStage('context');
        const [memCtx, history] = await Promise.all([
          memoryEngine.buildContext(),
          Promise.resolve(memoryEngine.getHistory(HISTORY_WINDOW)),
        ]);

        // Decide: tool-call path or streaming path
        const isActionCmd = /^(open|launch|go\s+to|navigate|search\s+for|find\s+me|play|watch|show\s+me)\b/i.test(userText.trim())
          && classification.intent === 'UNKNOWN' && !imageDataUrl;

        _setStage('model');
        setSessionStats(s => ({ ...s, llmCalls: s.llmCalls + 1 }));

        if (isActionCmd) {
          // ── Tool-calling path ──────────────────────────────────
          setIsThinking(false);
          const { text, toolsUsed } = await llmEngine.queryWithTools(
            userText,
            { mode: modeRef.current, history, memoryContext: memCtx },
            (name, params) => actionEngine.execute(name, params)
          );
          fullResponse = text;
          _updateMsg(assistantId, {
            content: text, streaming: false, model: 'tool-use',
            ms: Date.now() - startMs, toolsUsed,
          });
        } else {
          // ── Streaming path ─────────────────────────────────────
          _setStage('stream');
          const stream = llmEngine.queryStream(userText, {
            mode: modeRef.current, history, language: classification.language,
            memoryContext: memCtx, imageDataUrl, emotion,
          });

          for await (const token of stream) {
            if (abortRef.current) {
              fullResponse += '\n\n*[Stopped]*';
              break;
            }
            if (token?.__meta) {
              modelName = token.model || '';
              setActiveModel(modelName);
              setSessionStats(s => ({ ...s, totalTokens: s.totalTokens + (token.tokens || 0) }));
              break;
            }
            fullResponse += token;
            _updateMsg(assistantId, { content: fullResponse, streaming: true });
          }

          const ms = Date.now() - startMs;
          setResponseMs(ms);
          performanceEngine.recordResponse(ms, fullResponse.split(' ').length);
          _updateMsg(assistantId, { content: fullResponse, streaming: false, model: modelName, ms });
        }

        // ── § 13: Post-response processing ──────────────────────
        _setStage('post');
        setIsThinking(false);
        setThinkingStage('');
        lastAssistMsgRef.current = fullResponse;

        memoryEngine.addMessage('assistant', fullResponse);
        memoryEngine.saveConversation(userText, fullResponse, { mode: modeRef.current, emotion }).catch(() => {});

        // Update memory stats
        memoryEngine.getStats().then(stats => setMemStats(stats)).catch(() => {});

        // Auto-generate conversation title after 3rd exchange
        if (!conversationTitle && memoryEngine.shortTerm.length === 6) {
          _generateTitle(userText, fullResponse);
        }

        // Auto-summarize every N messages
        if (memoryEngine.shortTerm.length % AUTO_SUMMARIZE_EVERY === 0 && memoryEngine.shortTerm.length > 0) {
          llmEngine.summarizeConversation(memoryEngine.shortTerm)
            .then(summary => memoryEngine.saveSummary(summary))
            .catch(() => {});
        }

        // Speak response
        if (fullResponse && !voiceEngine.isSpeaking) {
          voiceEngine.speak(
            cleanForSpeech(fullResponse),
            classification.language || 'en',
            () => setIsSpeaking(true),
            () => setIsSpeaking(false)
          );
        }

        // Proactive suggestions
        _updateSuggestions(classification.intent || lastIntent || 'DEFAULT', fullResponse);

        retryCountRef.current = 0;
        break; // success — exit retry loop

      } catch (err) {
        if (attempt < RETRY_DELAYS.length && isRetryable(err)) {
          attempt++;
          retryCountRef.current = attempt;
          _updateMsg(assistantId, { content: `⏳ Retrying (attempt ${attempt})…`, streaming: true });
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
        } else {
          setIsThinking(false);
          setThinkingStage('');
          const errMsg = formatError(err);
          _updateMsg(assistantId, { content: errMsg, streaming: false, error: true });
          setError(err.message);
          break;
        }
      }
    }
  }

  // ── Auto-generate conversation title ────────────────────────
  async function _generateTitle(userText, response) {
    try {
      const title = await groqClient.chat(
        'meta-llama/llama-4-scout-17b-16e-instruct',
        [{ role: 'user', content: `Generate a short (3-5 word) title for a conversation that starts with:\nUser: "${userText.slice(0,100)}"\nAI: "${response.slice(0,100)}"\nRespond with ONLY the title, no quotes.` }],
        { maxTokens: 20, temperature: 0.3 }
      );
      const clean = title.trim().replace(/^["']|["']$/g, '');
      setConversationTitle(clean);
      await memoryEngine.saveSetting('conversationTitle', clean);
    } catch {}
  }

  // ── § PUBLIC SEND (queued entry point) ──────────────────────
  const sendMessage = useCallback(async (text, imageDataUrl = null) => {
    if (!text?.trim() && !imageDataUrl) return;
    if (isThinking && !imageDataUrl) {
      // Queue it
      _enqueue(text, imageDataUrl);
      return;
    }
    // Offline: queue for later
    if (!navigator.onLine && !imageDataUrl) {
      offlineQueueRef.current.push(text);
      _addMsg({ role: 'assistant', content: '📡 You appear to be offline. Message queued — will send when reconnected.', model: 'system', ms: 0 });
      return;
    }
    await _processMessage(text, imageDataUrl);
  }, [isThinking]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── § 14: VOICE PIPELINE ────────────────────────────────────
  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      setTranscript('');
      await voiceEngine.startRecording((wf) => setWaveformData(wf));
    } catch (err) {
      setIsListening(false);
      setError('Mic error: ' + err.message);
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (!isListening) return;
    setIsListening(false);
    setWaveformData(new Array(32).fill(0));
    try {
      const { text, language } = await voiceEngine.stopRecording();
      if (text?.trim()) {
        setTranscript(text);
        if (wakeWordRef.current) {
          const lower = text.toLowerCase();
          if (!lower.includes(WAKE_WORD)) return;
          const stripped = lower.replace(WAKE_WORD, '').trim();
          if (stripped) sendMessage(stripped);
          return;
        }
        sendMessage(text);
      }
    } catch (err) {
      setError('STT error: ' + err.message);
    }
  }, [isListening, sendMessage]);

  // ── § 16: REGENERATE last response ─────────────────────────
  const regenerate = useCallback(async () => {
    if (!lastUserMsgRef.current || isThinking) return;
    // Remove last assistant message
    dispatchMessages({ type: 'DELETE', id: streamingIdRef.current });
    await _processMessage(lastUserMsgRef.current);
  }, [isThinking]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── § 17: EDIT MESSAGE (fork) ────────────────────────────────
  const editMessage = useCallback(async (msgId, newText) => {
    if (isThinking) return;
    dispatchMessages({ type: 'FORK', id: msgId, msg: { id: msgId, role: 'user', content: newText, timestamp: Date.now(), edited: true } });
    memoryEngine.clearShortTerm();
    await _processMessage(newText);
  }, [isThinking]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── § 18: EXPORT CONVERSATION ────────────────────────────────
  const exportConversation = useCallback((format = 'markdown') => {
    const title = conversationTitle || 'ROSS Conversation';
    const date  = new Date().toLocaleString();
    if (format === 'markdown') {
      const md = `# ${title}\n_Exported: ${date}_\n\n` +
        messages.filter(m => m.role !== 'system' || m.keep)
          .map(m => `**${m.role === 'user' ? '👤 You' : '🤖 ROSS'}:** ${m.content}`)
          .join('\n\n---\n\n');
      _download(`${title}.md`, md, 'text/markdown');
    } else {
      const json = JSON.stringify({ title, date, messages }, null, 2);
      _download(`${title}.json`, json, 'application/json');
    }
  }, [messages, conversationTitle]);

  function _download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 500);
  }

  // ── § 15: WAKE WORD ──────────────────────────────────────────
  const toggleWakeWord = useCallback((enabled) => {
    setWakeWordEnabled(enabled);
    wakeWordRef.current = enabled;
    if (enabled) {
      const started = wakeWordEngine.start(
        (command) => {
          _addMsg({ role: 'assistant', content: '🎙️ Wake word detected! Listening…', model: 'system' });
          if (command) setTimeout(() => sendMessage(command), 300);
          else setTimeout(() => startListening(), 300);
        },
        (err) => setError('Wake word: ' + err)
      );
      if (!started) setWakeWordEnabled(false);
    } else {
      wakeWordEngine.stop();
    }
  }, [sendMessage, startListening]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ABORT STREAMING ──────────────────────────────────────────
  const stopGenerating = useCallback(() => {
    abortRef.current = true;
    setIsThinking(false);
    setThinkingStage('');
  }, []);

  // ── MODE SWITCH ───────────────────────────────────────────────
  const switchMode = useCallback(async (newMode) => {
    setMode(newMode);
    modeRef.current = newMode;
    await memoryEngine.saveSetting('mode', newMode);
  }, []);

  // ── VOICE SELECTION ───────────────────────────────────────────
  const changeVoice = useCallback(async (voice) => {
    voiceEngine.setVoice(voice);
    setSelectedVoice(voice);
    await memoryEngine.saveSetting('voice', voice);
  }, []);

  // ── API KEY UPDATE ────────────────────────────────────────────
  const updateApiKey = useCallback((key) => {
    groqClient.setApiKey(key);
    nlpEngine.setApiKey(key);
    setApiKeyState(key);
  }, []);

  // ── STOP SPEAKING ─────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    voiceEngine.stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // ── CLEAR CHAT ────────────────────────────────────────────────
  const clearChat = useCallback(async () => {
    abortRef.current = true;
    memoryEngine.clearShortTerm();
    setSuggestions([]);
    setConversationTitle('');
    dispatchMessages({ type: 'CLEAR', keep: true });
    setTimeout(() => _addMsg({ role: 'assistant', content: '🌌 Memory cleared. Starting fresh.', model: 'system', keep: true }), 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PIN / REACT ───────────────────────────────────────────────
  const pinMessage = useCallback((id) => {
    dispatchMessages({ type: 'PIN', id });
    setPinnedMessages(prev => {
      const msg = messages.find(m => m.id === id);
      if (!msg) return prev;
      return prev.some(p => p.id === id) ? prev.filter(p => p.id !== id) : [...prev, msg];
    });
  }, [messages]);

  const reactToMessage = useCallback((id, reaction) => {
    dispatchMessages({ type: 'REACT', id, reaction });
  }, []);

  // ── USE SUGGESTION ────────────────────────────────────────────
  const useSuggestion = useCallback((text) => {
    setSuggestions([]);
    sendMessage(text);
  }, [sendMessage]);

  // ── § 19: SESSION ANALYTICS ───────────────────────────────────
  const getAnalytics = useCallback(() => {
    const elapsed = Math.floor((Date.now() - sessionStats.sessionStart) / 1000);
    const topIntent = Object.entries(sessionStats.intentFrequency)
      .sort((a, b) => b[1] - a[1])[0];
    return {
      ...sessionStats,
      sessionDurationSec: elapsed,
      topIntent: topIntent ? topIntent[0] : null,
      avgResponseMs: performanceEngine.getAvgResponseTime(),
      cacheStats: nlpEngine.cacheStats(),
      deviceTier: deviceProfile?.tier || 'unknown',
    };
  }, [sessionStats, deviceProfile]);

  // ── § 23: PUBLIC API ──────────────────────────────────────────
  return {
    // ── State ──────────────────────────────────────────────────
    messages,
    isThinking,
    isListening,
    isSpeaking,
    mode,
    currentEmotion,
    waveformData,
    wakeWordEnabled,
    transcript,
    selectedVoice,
    apiKey,
    initialized,
    deviceProfile,
    memStats,
    error,
    activeModel,
    responseMs,
    thinkingStage,
    suggestions,
    isOnline,
    sessionStats,
    inputDraft,
    pinnedMessages,
    lastIntent,
    conversationTitle,

    // ── Core actions ────────────────────────────────────────────
    sendMessage,
    stopGenerating,
    regenerate,
    editMessage,

    // ── Voice ───────────────────────────────────────────────────
    startListening,
    stopListening,
    stopSpeaking,
    toggleWakeWord,

    // ── Settings ────────────────────────────────────────────────
    switchMode,
    changeVoice,
    updateApiKey,

    // ── Conversation management ─────────────────────────────────
    clearChat,
    exportConversation,
    pinMessage,
    reactToMessage,
    useSuggestion,
    setInputDraft,

    // ── Analytics ───────────────────────────────────────────────
    getAnalytics,
  };
}

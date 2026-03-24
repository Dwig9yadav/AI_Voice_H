// ============================================================
// ROSS AI — Model Configuration
// ============================================================

export const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export const MODELS = {
  COMPLEX: 'moonshotai/kimi-k2-instruct',
  SIMPLE: 'meta-llama/llama-4-scout-17b-16e-instruct',
  REASONING_HEAVY: 'llama-3.3-70b-versatile',
  MULTILINGUAL: 'llama-3.3-70b-versatile',
  QWEN: 'qwen-qwq-32b',
  VISION: 'meta-llama/llama-4-scout-17b-16e-instruct',
  TOOL_USE: 'moonshotai/kimi-k2-instruct',
  SAFETY: 'llama-guard-3-8b',
  STT_ACCURATE: 'whisper-large-v3',
  STT_FAST: 'whisper-large-v3-turbo',
  TTS_EN: 'playai-tts',
  TTS_AR: 'playai-tts-arabic',
};

export const TTS_VOICES = {
  ELEVENLABS: [
    { id: 'Fritz-PlayAI',    name: 'Fritz',    provider: 'ElevenLabs', gender: 'male',   model: 'playai-tts' },
    { id: 'Celeste-PlayAI',  name: 'Celeste',  provider: 'ElevenLabs', gender: 'female', model: 'playai-tts' },
    { id: 'Chip-PlayAI',     name: 'Chip',     provider: 'ElevenLabs', gender: 'male',   model: 'playai-tts' },
    { id: 'Ava-PlayAI',      name: 'Ava',      provider: 'ElevenLabs', gender: 'female', model: 'playai-tts' },
    { id: 'Angelo-PlayAI',   name: 'Angelo',   provider: 'ElevenLabs', gender: 'male',   model: 'playai-tts' },
  ],
  ORPHEUS_EN: [
    { id: 'tara',  name: 'Tara',  provider: 'Orpheus EN', gender: 'female', model: 'playai-tts' },
    { id: 'leo',   name: 'Leo',   provider: 'Orpheus EN', gender: 'male',   model: 'playai-tts' },
    { id: 'luna',  name: 'Luna',  provider: 'Orpheus EN', gender: 'female', model: 'playai-tts' },
    { id: 'atlas', name: 'Atlas', provider: 'Orpheus EN', gender: 'male',   model: 'playai-tts' },
  ],
  ORPHEUS_AR: [
    { id: 'aisha',  name: 'Aisha',  provider: 'Orpheus AR', gender: 'female', model: 'playai-tts-arabic' },
    { id: 'khalid', name: 'Khalid', provider: 'Orpheus AR', gender: 'male',   model: 'playai-tts-arabic' },
  ],
};

export const DEFAULT_VOICE = TTS_VOICES.ELEVENLABS[0];

export function routeModel(complexity, task = 'chat') {
  if (task === 'vision')        return MODELS.VISION;
  if (task === 'tool_use')      return MODELS.TOOL_USE;
  if (task === 'safety')        return MODELS.SAFETY;
  if (task === 'multilingual')  return MODELS.MULTILINGUAL;
  if (complexity === 'complex') return MODELS.COMPLEX;
  if (complexity === 'heavy')   return MODELS.REASONING_HEAVY;
  return MODELS.SIMPLE;
}

export const AI_MODES = {
  assistant: {
    label: 'Assistant', icon: '⚡', color: '#7c3aed',
    description: 'General-purpose AI helper',
    systemPrompt: "You are ROSS, an advanced private AI assistant running fully in the user's browser. Be precise, helpful, and professional. Keep responses focused and actionable.",
  },
  study: {
    label: 'Study', icon: '📚', color: '#0ea5e9',
    description: 'Patient tutor & learning guide',
    systemPrompt: "You are ROSS in Study Mode — a patient, encouraging tutor. Break down complex concepts step-by-step. Use examples, analogies, and ask comprehension questions. Celebrate progress.",
  },
  developer: {
    label: 'Developer', icon: '💻', color: '#10b981',
    description: 'Expert coding companion',
    systemPrompt: "You are ROSS in Developer Mode — an expert engineer. Provide clean, efficient, well-commented code. Suggest best practices, spot bugs, explain architecture decisions.",
  },
  chill: {
    label: 'Chill', icon: '🌙', color: '#f59e0b',
    description: 'Casual & conversational',
    systemPrompt: "You are ROSS in Chill Mode — relaxed, friendly, conversational. Be witty, use humor appropriately, keep it fun. Don't be stiff.",
  },
};

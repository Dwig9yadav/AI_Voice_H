// ============================================================
// ROSS AI — Emotion Detection Engine
// Text-based + basic voice frequency analysis
// ============================================================

class EmotionEngine {
  constructor() {
    this.emotions = {
      happy: {
        words: ['happy', 'joy', 'great', 'awesome', 'wonderful', 'love', 'excited', 'fantastic', 'amazing', 'excellent', 'brilliant', 'yay', 'woohoo', 'perfect', 'delighted', '😊', '😄', '🎉', '❤️', '🥰'],
        color: '#f59e0b',
        emoji: '😊',
        style: 'upbeat and enthusiastic',
      },
      sad: {
        words: ['sad', 'unhappy', 'depressed', 'down', 'upset', 'cry', 'terrible', 'awful', 'miss', 'lonely', 'hopeless', 'broken', 'lost', '😢', '😔', '💔', 'sigh', 'unfortunately'],
        color: '#60a5fa',
        emoji: '💙',
        style: 'gentle and empathetic',
      },
      frustrated: {
        words: ['frustrated', 'annoyed', 'angry', 'mad', 'irritated', 'stupid', 'ridiculous', 'hate', 'ugh', 'argh', 'seriously', 'wtf', 'broken', 'not working', 'why wont', '😤', '😠', '🤬'],
        color: '#f87171',
        emoji: '😤',
        style: 'calm, patient, and solution-focused',
      },
      anxious: {
        words: ['anxious', 'worried', 'nervous', 'scared', 'afraid', 'panic', 'stress', 'overwhelmed', 'urgent', 'help', 'emergency', 'please', 'asap', '😰', '😨', '😱'],
        color: '#a78bfa',
        emoji: '💜',
        style: 'calm, reassuring, and structured',
      },
      excited: {
        words: ['excited', 'thrilled', 'pumped', 'stoked', 'incredible', 'mind blown', 'omg', 'insane', 'legendary', 'fire', 'lit', '🤩', '🚀', '🔥', '⚡', '!!!'],
        color: '#34d399',
        emoji: '🚀',
        style: 'energetic and enthusiastic',
      },
      curious: {
        words: ['curious', 'wonder', 'interesting', 'tell me', 'how does', 'explain', 'fascinating', 'intriguing', 'learn', 'understand', 'clarify', '🤔', '🧐', '🌟'],
        color: '#06b6d4',
        emoji: '🤔',
        style: 'thoughtful and exploratory',
      },
      neutral: {
        words: [],
        color: '#94a3b8',
        emoji: '🌟',
        style: 'clear and helpful',
      },
    };
  }

  detect(text) {
    if (!text?.trim()) return 'neutral';
    const lower = text.toLowerCase();
    const scores = {};

    for (const [emotion, cfg] of Object.entries(this.emotions)) {
      if (emotion === 'neutral') continue;
      scores[emotion] = cfg.words.reduce((acc, w) => acc + (lower.includes(w.toLowerCase()) ? 1 : 0), 0);
    }

    const max = Math.max(...Object.values(scores));
    if (max === 0) return 'neutral';

    return Object.entries(scores).find(([, s]) => s === max)?.[0] || 'neutral';
  }

  getConfig(emotion) {
    return this.emotions[emotion] || this.emotions.neutral;
  }

  getStyle(emotion) { return this.emotions[emotion]?.style || 'helpful'; }
  getEmoji(emotion) { return this.emotions[emotion]?.emoji || '🌟'; }
  getColor(emotion) { return this.emotions[emotion]?.color || '#94a3b8'; }

  // Basic voice tone analysis from frequency data
  analyzeVoiceTone(freqArray) {
    if (!freqArray?.length) return 'neutral';
    const avg = freqArray.reduce((a, b) => a + b, 0) / freqArray.length;
    const high = freqArray.slice(Math.floor(freqArray.length * 0.6)).reduce((a, b) => a + b, 0);

    if (avg > 160) return 'excited';
    if (avg < 40) return 'sad';
    if (high > avg * 1.8) return 'anxious';
    if (avg > 100) return 'happy';
    return 'neutral';
  }
}

export const emotionEngine = new EmotionEngine();
export default EmotionEngine;

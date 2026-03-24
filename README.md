# ROSS AI OS (v2.0)

ROSS is a futuristic, browser-based AI assistant interface built with React + Vite.
It combines:

- Conversational chat (streaming responses)
- Voice input/output (STT + TTS)
- Wake-word support (`Hey Ross`)
- Local memory (IndexedDB)
- Browser action automation (open/search/play sites)
- Multi-mode AI behavior (Assistant / Study / Developer / Chill)
- Privacy dashboard + in-browser JS sandbox

---

## Table of Contents

- [What this project is](#what-this-project-is)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [How ROSS works (message lifecycle)](#how-ross-works-message-lifecycle)
- [Installation](#installation)
- [Configuration](#configuration)
- [Run and build](#run-and-build)
- [Usage guide](#usage-guide)
- [Supported commands/examples](#supported-commandsexamples)
- [Data, privacy, and storage](#data-privacy-and-storage)
- [Performance model](#performance-model)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)
- [Roadmap ideas](#roadmap-ideas)
- [License](#license)

---

## What this project is

ROSS is a **single-page app** with a strong visual "AI OS" UX.
It runs fully in the browser frontend and calls Groq APIs for LLM/STT/TTS.

Important clarification:

- Conversation and settings memory are stored locally in browser storage (IndexedDB/session state).
- Model inference and audio transcription/synthesis still require network calls to Groq.

So it is privacy-focused at the app layer, but **not fully offline inference**.

---

## Key features

### 1) Conversational Chat UI

- Streaming AI responses
- Markdown + GitHub-Flavored Markdown rendering in assistant replies
- Inline/image message support
- Message metadata (time, model, latency)
- Thinking indicators and status dots

### 2) Voice Interaction

- Click-to-talk microphone flow
- Audio waveform visualization while recording
- STT via Groq Whisper (`whisper-large-v3` / turbo path)
- TTS via Groq PlayAI for English + browser speech synthesis fallback for other languages
- Dedicated floating voice action button (FAB)

### 3) Wake Word

- Continuous Web Speech API recognition
- Detects wake phrases like `hey ross`, `ok ross`, etc.
- Automatically routes post-wake command text

### 4) Smart Routing + Actions

- Rule-based + NLP intent routing
- Fast sync action pre-router (for popup-safe navigation)
- Website opening, Google/YouTube/Spotify/Maps/search actions
- Tool-calling path through LLM + action executor
- Multi-site open support and very large hardcoded URL map

### 5) Memory System

- Short-term in-memory message context
- Long-term IndexedDB stores for:
  - Conversations
  - Named memories
  - Summaries
  - Settings
- Memory commands: save/recall/clear
- Conversation context builder for prompts

### 6) Multi-Mode Personality

Modes configured in `src/config/models.js`:

- Assistant (general)
- Study (tutor)
- Developer (engineering-focused)
- Chill (casual)

Each mode has prompt, style label, and UI identity.

### 7) Privacy Dashboard

- Overview stats for local memory stores
- Named memory browsing + deletion
- Conversation history listing
- Summary view
- One-click clear-all data action

### 8) Developer Sandbox

- In-browser JavaScript code runner
- Console output capture
- AI explanation stream for entered code
- Export code to local `.js`

### 9) File Input Helpers

Chat input supports:

- Images (`image/*`) for vision prompts
- PDF parsing (`pdfjs-dist`) with extraction of up to 15 pages
- Plain text upload

---

## Tech stack

### Frontend

- React 18
- Vite 5
- Tailwind CSS 3 + custom CSS theme
- Lucide React icons

### AI + NLP + Content

- Groq API (chat, tool-calls, STT, TTS, vision)
- `compromise` for NLP enrichment
- `react-markdown` + `remark-gfm`
- `pdfjs-dist` for PDF parsing

### Storage

- IndexedDB via `idb`

---

## Architecture

High-level flow:

1. `App.jsx` mounts core shell and panels.
2. `useRoss` hook orchestrates all engines and app state.
3. Engines provide modular capabilities:
   - `GroqClient` → raw API transport
   - `LLMEngine` → prompting/model selection/streaming/tool-calls
   - `NLPEngine` → intent/entity/slots/classification pipeline
   - `ActionEngine` → browser actions + search/navigation dispatch
   - `MemoryEngine` → IndexedDB + short-term memory
   - `VoiceEngine` → recording/STT/TTS
   - `WakeWordEngine` → passive wake phrase detection
   - `EmotionEngine` → text/voice emotional labeling
   - `PerformanceEngine` → device profile + metrics

Core orchestrator: `src/hooks/useRoss.js`.

---

## Project structure

```text
AI_Voice_H/
├─ index.html
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
└─ src/
   ├─ main.jsx
   ├─ App.jsx
   ├─ index.css
   ├─ config/
   │  └─ models.js
   ├─ hooks/
   │  └─ useRoss.js
   ├─ engines/
   │  ├─ ActionEngine.js
   │  ├─ EmotionEngine.js
   │  ├─ GroqClient.js
   │  ├─ LLMEngine.js
   │  ├─ MemoryEngine.js
   │  ├─ NLPEngine.js
   │  ├─ PerformanceEngine.js
   │  ├─ VoiceEngine.js
   │  └─ WakeWordEngine.js
   └─ components/
      ├─ chat/
      │  ├─ ChatInput.jsx
      │  ├─ ChatPanel.jsx
      │  └─ MessageBubble.jsx
      ├─ dashboard/
      │  └─ PrivacyDashboard.jsx
      ├─ developer/
      │  └─ CodeSandbox.jsx
      ├─ effects/
      │  └─ StarField.jsx
      ├─ layout/
      │  ├─ Header.jsx
      │  └─ Sidebar.jsx
      ├─ settings/
      │  └─ SettingsPanel.jsx
      └─ voice/
         ├─ LiveTranscript.jsx
         └─ VoiceFAB.jsx
```

---

## How ROSS works (message lifecycle)

Inside `useRoss`:

1. User submits text/voice/image.
2. Message is queued (if busy) and added to chat history.
3. Emotion detection runs.
4. Fast sync action router checks direct commands (`open`, `search`, `play`, etc.).
5. NLP classification runs (intent, slots, language, confidence).
6. If quick local response is available, return immediately.
7. If action intent, dispatch through `ActionEngine`.
8. Otherwise run LLM:
   - Build memory/history/system prompt context
   - Stream response tokens
   - Optionally use tool-calling path for actions
9. Save memory/conversation stats + optionally summarize periodically.
10. Speak response via TTS and update suggestions/analytics.

---

## Installation

### Prerequisites

- Node.js 18+ (recommended: Node 20+)
- npm 9+
- Modern Chromium-based browser for best wake-word support

### Steps

```bash
git clone https://github.com/Dwig9yadav/AI_Voice_H.git
cd AI_Voice_H
npm install
```

---

## Configuration

### Groq API key

The project currently reads key config from `src/config/models.js` via `GROQ_API_KEY`.

Current behavior:

- `useRoss` sets this API key into `groqClient` and `nlpEngine` at boot.

Recommended for production:

- Move API key out of source and into environment variables + secure backend proxy.

Example (recommended pattern):

```bash
# .env
VITE_GROQ_API_KEY=your_key_here
```

Then consume with `import.meta.env.VITE_GROQ_API_KEY`.

---

## Run and build

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

---

## Usage guide

### Main panels

- **Chat**: Core conversation + file/image upload + voice entry
- **Privacy**: Local data stats/history/memory management
- **Sandbox**: Execute and explain JavaScript snippets
- **Settings**: Wake word toggle + device/perf profile

### Chat input behaviors

- `Enter` sends
- `Shift+Enter` inserts newline
- Mic button starts/stops recording
- Attachment button supports image/PDF/txt

### Global controls

- `Esc` stops active listening and speaking

---

## Supported commands/examples

Try prompts like:

### Navigation and search

- `Open GitHub`
- `Open YouTube and play lo-fi on spotify`
- `Search for AI agent architecture`
- `Show on map Times Square`

### Memory

- `Remember that my name is Alex`
- `What do you remember about me?`
- `Clear all memories`

### Utility

- `What time is it?`
- `What is the date today?`
- `Calculate 245*19`

### Language + knowledge

- `Explain vector databases in simple terms`
- `Compare React and Vue`
- `Translate hello to Arabic`

### Creative

- `Write a short story about Mars colonies`
- `Give me startup ideas in climate tech`

---

## Data, privacy, and storage

### Stored locally

- Conversation records (IndexedDB)
- Named memories (IndexedDB)
- Summaries (IndexedDB)
- Preferences like mode/voice/title (IndexedDB)
- Session short-term context (in-memory)

### Sent externally

- User prompts/content sent to Groq for model inference
- Audio sent to Groq STT when recording is processed
- Text sent to Groq TTS when speaking (English path)

No custom backend is present in this repo; API communication is browser → Groq.

---

## Performance model

`PerformanceEngine` computes device profile from browser capabilities:

- CPU cores
- Device memory
- Connection type
- WebGPU/WebGL availability
- Mobile detection

It classifies device tier (`low` / `medium` / `high`) and records response metrics:

- Average response time
- Total requests
- Total generated token estimate

---

## Known limitations

- API key is currently in client-side config (security risk for real deployment).
- Wake-word detection depends on Web Speech API availability and browser permissions.
- Action opening relies on browser popup behaviors (mitigated with anchor-click strategy).
- Some privacy copy says “fully offline,” but inference still requires Groq network access.
- Tool-calling and large action maps are broad but heuristic, so edge-case routing errors are possible.

---

## Troubleshooting

### App boots but replies fail

- Verify Groq key validity.
- Check network connectivity and browser console errors.

### Mic does not work

- Allow microphone permission in browser.
- Ensure secure context (`https` or localhost) for media APIs.

### Wake word not triggering

- Use Chrome/Edge.
- Keep tab active and microphone permission granted.
- Confirm wake-word toggle is enabled in Settings.

### TTS not audible

- Check browser autoplay/audio permissions.
- For non-English, browser synthesis voices may vary by OS/browser.

### PDF parsing issues

- Very large/scanned PDFs may extract poorly.
- Current extraction reads up to first 15 pages and truncates text length.

---

## Security notes

- Do not commit production secrets in `src/config/models.js`.
- Rotate keys immediately if exposed publicly.
- Consider adding server-side token brokerage/proxy for Groq requests.
- Review user-upload handling if extending beyond in-browser processing.

---

## Roadmap ideas

- Move secrets to secure backend/API proxy
- Add auth and per-user encrypted storage
- Add regression tests for NLP/action routing
- Improve offline UX messaging to reflect true network dependency
- Add export/import for memories and conversations

---

## License

No license file is currently present in this repository.
Add a `LICENSE` if you want explicit usage terms.
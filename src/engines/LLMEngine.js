// ============================================================
// ROSS AI — LLM Engine
// Routing: Simple → GPT OSS 20B | Complex → Kimi K2
// Vision → Llama 4 Scout | Tools → Kimi K2
// ============================================================

import { groqClient } from './GroqClient.js';
import { nlpEngine } from './NLPEngine.js';
import { MODELS, AI_MODES, routeModel } from '../config/models.js';

class LLMEngine {
  constructor() {
    // Tool definitions for function calling
    this.tools = [
      {
        type: 'function',
        function: {
          name: 'open_website',
          description: 'Open a website or web URL in a new browser tab',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Full URL (with https://) or domain name' },
              description: { type: 'string', description: 'Human-readable description of what was opened' },
            },
            required: ['url'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'google_search',
          description: 'Perform a Google search and open results in a new tab',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'youtube_search',
          description: 'Search YouTube for videos and open results',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'What to search for on YouTube' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'save_memory',
          description: 'Save important information to long-term memory for later recall',
          parameters: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Short descriptive label for this memory' },
              value: { type: 'string', description: 'The information to remember' },
            },
            required: ['key', 'value'],
          },
        },
      },
    ];
  }

  // ── Build context for LLM ─────────────────────────────────
  buildMessages(userText, context = {}) {
    const {
      mode = 'assistant',
      emotion = null,
      history = [],
      language = 'en',
      memoryContext = '',
      imageDataUrl = null,
      systemOverride = null,
    } = context;

    const systemPrompt = systemOverride || this.buildSystemPrompt(mode, emotion, language, memoryContext);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-20).map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })),
    ];

    // Add user message (with optional image)
    if (imageDataUrl) {
      const prompt = userText?.trim() || 'Please describe and analyze this image in detail. What do you see?';
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'auto' } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: userText });
    }

    return messages;
  }

  buildSystemPrompt(mode, emotion, language, memoryContext) {
    const base = AI_MODES[mode]?.systemPrompt || AI_MODES.assistant.systemPrompt;
    const coreIdentity = `\n\nYou are ROSS — a private AI OS running 100% in the browser via Groq API. Be concise and use markdown.

CRITICAL BROWSER AUTOMATION RULES — NEVER BREAK THESE:
- You CAN and DO open websites, tabs, and links. The action layer handles it automatically before you respond.
- NEVER say "I can't open websites", "I don't have the ability to open tabs", or "I'm just a text-based AI".
- When a website was opened, simply confirm it: "✅ Opened [site]" or "Done! I've opened [site] in a new tab."
- You have full browser automation. Treat every "open X", "go to X", "launch X" as already executed.
- NEVER suggest the user manually type a URL themselves — you already opened it for them.`;
    const emotionNote = emotion && emotion !== 'neutral'
      ? `\n\nUser emotion detected: ${emotion}. Respond with ${nlpEngine.getEmotionStyle(emotion)} tone.`
      : '';
    const langNote = language !== 'en'
      ? `\n\n⚠️ CRITICAL: Respond ONLY in the user's language (${language}). Do not switch to English.`
      : '';
    const memNote = memoryContext
      ? `\n\n📝 User Memory:\n${memoryContext}`
      : '';

    return base + coreIdentity + emotionNote + langNote + memNote;
  }

  // ── Select model based on context ────────────────────────
  selectModel(classification, hasImage) {
    if (hasImage) return MODELS.VISION;
    if (classification.complexity === 'complex') return MODELS.COMPLEX;
    if (classification.complexity === 'heavy') return MODELS.REASONING_HEAVY;
    if (classification.language !== 'en') return MODELS.MULTILINGUAL;
    return MODELS.SIMPLE;
  }

  // ── Streaming generator ───────────────────────────────────
  async *queryStream(userText, context = {}) {
    const classification = await nlpEngine.classify(userText);
    const hasImage = !!context.imageDataUrl;
    const model = this.selectModel(classification, hasImage);
    const messages = this.buildMessages(userText, {
      ...context,
      language: context.language || classification.language,
    });

    // Vision requests: Groq vision doesn't support streaming — use regular chat
    if (hasImage) {
      try {
        const text = await groqClient.chat(model, messages, {
          temperature: 0.7,
          maxTokens: 1024,
        });
        // Simulate streaming by yielding the full text then metadata
        yield text;
        yield { __meta: true, model, tokens: text.split(' ').length };
      } catch (err) {
        throw new Error(`Vision error: ${err.message}`);
      }
      return;
    }

    // Normal streaming for text-only
    let totalTokens = 0;
    for await (const token of groqClient.chatStream(model, messages, {
      temperature: context.mode === 'chill' ? 0.9 : context.mode === 'developer' ? 0.3 : 0.7,
      maxTokens: 2048,
    })) {
      totalTokens++;
      yield token;
    }

    yield { __meta: true, model, tokens: totalTokens };
  }

  // ── Non-streaming query ───────────────────────────────────
  async query(userText, context = {}) {
    const classification = await nlpEngine.classify(userText);
    const model = this.selectModel(classification, !!context.imageDataUrl);
    const messages = this.buildMessages(userText, {
      ...context,
      language: context.language || classification.language,
    });

    const text = await groqClient.chat(model, messages, {
      temperature: context.mode === 'developer' ? 0.3 : 0.7,
    });
    return { text, model, classification };
  }

  // ── Tool-calling query ────────────────────────────────────
  async queryWithTools(userText, context = {}, onToolCall) {
    const systemPrompt = this.buildSystemPrompt(context.mode || 'assistant', null, 'en', context.memoryContext || '') +
      '\n\nYou have browser automation. When user wants to open/search/navigate, use the provided tools. Confirm what you did concisely.';

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(context.history || []).slice(-8).map(m => ({ role: m.role, content: String(m.content || '') })),
      { role: 'user', content: userText },
    ];

    try {
      const response = await groqClient.chatWithTools(MODELS.TOOL_USE, messages, this.tools);
      const choice = response.choices?.[0];

      if (choice?.finish_reason === 'tool_calls' && choice?.message?.tool_calls?.length > 0) {
        const toolResults = [];

        for (const toolCall of choice.message.tool_calls) {
          try {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            const result = onToolCall ? await onToolCall(toolCall.function.name, args) : { success: false };
            toolResults.push({ tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch {
            toolResults.push({ tool_call_id: toolCall.id, content: JSON.stringify({ success: false }) });
          }
        }

        // Build follow-up messages with tool results
        const followMessages = [
          ...messages,
          { role: 'assistant', content: choice.message.content || '', tool_calls: choice.message.tool_calls },
          ...toolResults.map(r => ({ role: 'tool', tool_call_id: r.tool_call_id, content: r.content })),
        ];

        try {
          const finalText = await groqClient.chat(MODELS.SIMPLE, followMessages, { maxTokens: 256 });
          return { text: finalText, toolsUsed: choice.message.tool_calls.map(t => t.function.name) };
        } catch {
          // Follow-up failed — return a simple confirmation
          const toolName = choice.message.tool_calls[0]?.function?.name || 'action';
          return { text: `✅ Done! Action completed successfully.`, toolsUsed: [toolName] };
        }
      }

      // No tool call — return the plain response
      return { text: choice?.message?.content || '', toolsUsed: [] };

    } catch (err) {
      // Tool calling not supported or failed — fall back to plain streaming chat
      const fallbackText = await groqClient.chat(MODELS.SIMPLE, messages, { maxTokens: 512 });
      return { text: fallbackText, toolsUsed: [] };
    }
  }

  // ── Summarize conversation ────────────────────────────────
  async summarizeConversation(messages) {
    const convo = messages
      .filter(m => m.role !== 'system')
      .slice(-30)
      .map(m => `${m.role === 'user' ? 'User' : 'ROSS'}: ${typeof m.content === 'string' ? m.content : '[image]'}`)
      .join('\n');

    return await groqClient.chat(
      MODELS.SIMPLE,
      [{
        role: 'user',
        content: `Summarize this conversation in 2-3 sentences, capturing key topics and conclusions:\n\n${convo}`,
      }],
      { maxTokens: 200, temperature: 0.3 }
    );
  }
}

export const llmEngine = new LLMEngine();
export default LLMEngine;

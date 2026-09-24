import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { AI_CONFIG, LUXION_SYSTEM_INSTRUCTION } from './src/config/aiConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const port = parseInt(process.env.PORT || '3000', 10);

// Active model configuration (falls back to centralized config)
const ACTIVE_MODEL = process.env.GEMINI_MODEL || AI_CONFIG.model;

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAttachmentPayload {
  type: 'image' | 'file';
  name?: string;
  dataUrl?: string;
  content?: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatContentsForGemini(
  history: ChatHistoryItem[],
  currentPrompt: string,
  attachment?: ChatAttachmentPayload | null
) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, any>> }> = [];

  const validHistory = (history || []).filter(
    (h) => h && typeof h.content === 'string' && h.content.trim().length > 0
  );

  // Gemini requires strictly alternating roles starting with 'user'
  let lastRole: 'user' | 'model' | null = null;

  for (const item of validHistory) {
    const role: 'user' | 'model' = item.role === 'assistant' ? 'model' : 'user';

    // Model cannot be first turn
    if (contents.length === 0 && role === 'model') {
      continue;
    }

    if (role === lastRole && contents.length > 0) {
      contents[contents.length - 1].parts.push({ text: item.content });
    } else {
      contents.push({
        role,
        parts: [{ text: item.content }],
      });
      lastRole = role;
    }
  }

  // Create current turn parts
  const currentParts: Array<Record<string, any>> = [];

  // Handle multimodal image inline data if provided
  if (attachment?.dataUrl && attachment.type === 'image') {
    const match = attachment.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      currentParts.push({
        inlineData: {
          mimeType: match[1] || 'image/jpeg',
          data: match[2],
        },
      });
    }
  } else if (attachment?.content) {
    currentParts.push({
      text: `[Attached Document: ${attachment.name || 'document'}]\n\`\`\`\n${attachment.content}\n\`\`\`\n`,
    });
  }

  currentParts.push({ text: currentPrompt });

  if (lastRole === 'user' && contents.length > 0) {
    contents[contents.length - 1].parts.push(...currentParts);
  } else {
    contents.push({
      role: 'user',
      parts: currentParts,
    });
  }

  return contents;
}

function getSpecializedInstruction(command?: string): string {
  if (!command) return LUXION_SYSTEM_INSTRUCTION;

  const cmd = command.trim().toLowerCase();

  if (cmd.startsWith('/code')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION CODE ENGINE]
The user invoked the /code command. Focus specifically on:
- Delivering clean, production-grade, syntactically correct code.
- Explaining time and space complexity where relevant.
- Highlighting critical edge cases and security best practices.
- Providing idiomatic implementations with explicit language tags.`;
  }

  if (cmd.startsWith('/design')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION DESIGN SPECIFICATION]
The user invoked the /design command. Focus specifically on:
- UI/UX structural hierarchy and monochrome design system specs.
- System architecture, component relationships, and data flows.
- Clean typography and layout structures.`;
  }

  if (cmd.startsWith('/analyze')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION DEEP ANALYSIS]
The user invoked the /analyze command. Focus specifically on:
- Rigorous structural code review or technical reasoning analysis.
- Potential bottlenecks, edge cases, vulnerabilities, and trade-offs.
- Clear, prioritized recommendations.`;
  }

  if (cmd.startsWith('/build web')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION WEB BUILDER]
The user invoked the /build web workflow command. Focus specifically on:
- Generating complete, functional, single-file or component-level web application code.
- Providing HTML/CSS/JS ready to run directly in the LUXION sandbox preview.
- Include a brief note: "Scaffold generated for client sandbox preview. (Automated repository creation and container deployment are planned future integrations)."`;
  }

  if (cmd.startsWith('/build app') || cmd.startsWith('/build')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION APPLICATION BUILDER]
The user invoked the application build workflow command. Focus specifically on:
- Architecting the application interface and structure.
- Providing self-contained, working frontend code ready to preview in the client sandbox.
- State clearly: "Scaffold generated for client sandbox preview. (Automated repo creation and container hosting are planned future integrations)."`;
  }

  if (cmd.startsWith('/build game')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION GAME BUILDER]
The user invoked the /build game workflow command. Focus specifically on:
- Generating a complete, playable 2D HTML5 Canvas game with game loop, canvas rendering, controls, and score.
- Ensure the code is self-contained and runnable immediately in the sandbox preview.
- Clearly separate current sandbox preview capability from future multi-file build infrastructure.`;
  }

  return LUXION_SYSTEM_INSTRUCTION;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health and Provider Configuration Status
  app.get('/api/health', (_req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({
      status: 'online',
      engine: 'LUXION AI Engine',
      founder: 'Abir',
      provider: AI_CONFIG.provider,
      model: ACTIVE_MODEL,
      hasKey,
    });
  });

  // Future Capabilities Manifest
  app.get('/api/capabilities', (_req, res) => {
    res.json({
      active: [
        'general_chat',
        'reasoning_and_explanations',
        'coding_assistance',
        'slash_commands',
        'conversation_context',
        'client_sandbox_preview',
      ],
      future: [
        'web_research_grounding',
        'image_generation',
        'video_generation',
        'sandboxed_code_execution',
        'automated_container_deployment',
        'multi_agent_coordination',
      ],
      provider: AI_CONFIG.provider,
      model: ACTIVE_MODEL,
    });
  });

  // Cache and rate-limit tracking for TTS endpoint
  const ttsServerCache = new Map<string, { audioBase64: string; mimeType: string; voice: string }>();
  let ttsCooldownUntil = 0;

  // High-Fidelity Studio Male Voice TTS Endpoint (Charon: Deep Baritone Male AI)
  app.post('/api/tts', async (req, res) => {
    const { text, voiceName } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text required for TTS' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'TTS unavailable: Missing API key', fallbackToLocal: true });
    }

    // Clean markdown, links, and code blocks before sending to TTS model
    const cleanText = text
      .replace(/```[a-z]*\s*[\s\S]*?```/gi, 'Here is the code.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+(.*)$/gm, '$1.')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s]+/gi, 'link')
      .replace(/[*_~]/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}▼▲→←★•✓✕⋮]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return res.status(400).json({ error: 'Empty text after cleaning' });
    }

    // Use deep, mature, authoritative male voice Charon (or Fenrir)
    const selectedVoice = voiceName === 'Fenrir' ? 'Fenrir' : 'Charon';
    const cacheKey = `${selectedVoice}:${cleanText}`;

    // Return cached audio if already generated (avoids consuming free tier quota)
    const cached = ttsServerCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // If currently under rate limit cooldown, inform client to use local synthesizer
    if (Date.now() < ttsCooldownUntil) {
      return res.status(429).json({
        error: 'TTS rate limit active. Falling back to local synthesizer.',
        code: 'RATE_LIMIT_EXCEEDED',
        fallbackToLocal: true,
        retryAfter: Math.max(1, Math.ceil((ttsCooldownUntil - Date.now()) / 1000)),
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: cleanText.slice(0, 1500),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice,
              },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.[0];
      if (audioPart?.inlineData?.data) {
        const payload = {
          audioBase64: audioPart.inlineData.data,
          mimeType: audioPart.inlineData.mimeType || 'audio/wav',
          voice: selectedVoice,
        };
        // Store in cache
        if (ttsServerCache.size > 100) {
          const firstKey = ttsServerCache.keys().next().value;
          if (firstKey) ttsServerCache.delete(firstKey);
        }
        ttsServerCache.set(cacheKey, payload);
        return res.json(payload);
      }

      return res.status(500).json({ error: 'No audio returned', fallbackToLocal: true });
    } catch (err: any) {
      const errMsg = err?.message || '';
      const isRateLimit =
        err?.status === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded');

      if (isRateLimit) {
        // Enforce cooldown so client falls back smoothly without error loops
        ttsCooldownUntil = Date.now() + 30000;
        return res.status(429).json({
          error: 'TTS quota exceeded. Using local male speech synthesizer.',
          code: 'RATE_LIMIT_EXCEEDED',
          fallbackToLocal: true,
          retryAfter: 30,
        });
      }

      return res.status(500).json({ error: 'TTS generation failed', fallbackToLocal: true });
    }
  });

  // Main Chat & Command Endpoint
  app.post('/api/chat', async (req, res) => {
    const { prompt, history, command, attachment } = req.body;

    if ((!prompt || typeof prompt !== 'string' || !prompt.trim()) && !attachment) {
      return res.status(400).json({
        error: 'Please provide a message or file for LUXION to evaluate.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'AI connection failed. Try again.',
        code: 'MISSING_API_KEY',
      });
    }

    try {
      const activeInstruction = getSpecializedInstruction(command);
      const contents = formatContentsForGemini(history || [], prompt.trim(), attachment);

      const candidateModels = Array.from(new Set([
        ACTIVE_MODEL,
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
      ]));

      let response;
      let usedModel = ACTIVE_MODEL;
      let lastError: any = null;

      for (const modelToTry of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelToTry,
            contents,
            config: {
              systemInstruction: activeInstruction,
              temperature: AI_CONFIG.temperature,
              maxOutputTokens: AI_CONFIG.maxOutputTokens,
            },
          });
          usedModel = modelToTry;
          break;
        } catch (attemptErr: any) {
          lastError = attemptErr;
          const errMsg = String(attemptErr?.message || '');
          console.warn(`Model ${modelToTry} attempt notice: ${errMsg.slice(0, 100)}`);
          // Continue to next candidate on high demand or rate limits
          continue;
        }
      }

      if (!response) {
        throw lastError || new Error('No response received from AI models');
      }

      const replyText = response.text;
      if (!replyText || !replyText.trim()) {
        return res.status(502).json({
          error: 'AI connection failed. Try again.',
          code: 'EMPTY_RESPONSE',
        });
      }

      return res.json({
        reply: replyText.trim(),
        model: usedModel,
        provider: AI_CONFIG.provider,
      });
    } catch (err: any) {
      console.error('LUXION AI Server Error:', err?.message || err);
      const errMsg = String(err?.message || '');

      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key not valid') || errMsg.includes('unregistered project')) {
        return res.status(401).json({
          error: 'AI connection failed. Try again.',
          code: 'INVALID_API_KEY',
        });
      }

      if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429') || errMsg.includes('Quota')) {
        return res.status(429).json({
          error: 'AI connection failed. Try again.',
          code: 'RATE_LIMIT',
        });
      }

      if (errMsg.includes('model not found') || errMsg.includes('not supported for this model')) {
        return res.status(400).json({
          error: 'AI connection failed. Try again.',
          code: 'MODEL_ERROR',
        });
      }

      return res.status(500).json({
        error: 'AI connection failed. Try again.',
        code: 'AI_SERVICE_ERROR',
      });
    }
  });

  // Vite Integration (Dev) vs Static Files (Prod)
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`LUXION server running on http://0.0.0.0:${port} [Model: ${ACTIVE_MODEL}]`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting LUXION server:', err);
  process.exit(1);
});

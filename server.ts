import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { AI_CONFIG, LUXION_SYSTEM_INSTRUCTION } from './src/config/aiConfig.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const port = parseInt(process.env.PORT || '3000', 10);

// Active model configurations
const ACTIVE_MODEL = process.env.GEMINI_MODEL || AI_CONFIG.model;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const LUXION_OWNER_EMAIL = (process.env.LUXION_OWNER_EMAIL || '').trim().toLowerCase();
const LUXION_OWNER_CODE = process.env.LUXION_OWNER_CODE || 'Luxion_abir_9088@7675';

// Independent Per-Model Quota and Cooldown Records
interface ModelQuotaRecord {
  modelId: string;
  cooldownUntil: number;
  requestsUsed: number;
  lastError?: string;
}

const modelQuotaRecords = new Map<string, ModelQuotaRecord>();

function getModelRecord(modelId: string): ModelQuotaRecord {
  let rec = modelQuotaRecords.get(modelId);
  if (!rec) {
    rec = { modelId, cooldownUntil: 0, requestsUsed: 0 };
    modelQuotaRecords.set(modelId, rec);
  }
  return rec;
}

function isModelAvailable(modelId: string): boolean {
  const rec = getModelRecord(modelId);
  return Date.now() >= rec.cooldownUntil;
}

function markModelCooldown(modelId: string, seconds = 30, error?: string): void {
  const rec = getModelRecord(modelId);
  rec.cooldownUntil = Date.now() + seconds * 1000;
  rec.lastError = error;
}

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

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new Groq({
    apiKey: apiKey.trim(),
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

  let lastRole: 'user' | 'model' | null = null;

  for (const item of validHistory) {
    const role: 'user' | 'model' = item.role === 'assistant' ? 'model' : 'user';

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

  const currentParts: Array<Record<string, any>> = [];

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

function formatContentsForGroq(
  history: ChatHistoryItem[],
  currentPrompt: string,
  instruction: string
) {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: instruction },
  ];

  for (const item of history || []) {
    if (item && item.content && item.content.trim()) {
      messages.push({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: item.content,
      });
    }
  }

  messages.push({ role: 'user', content: currentPrompt });
  return messages;
}

function getSpecializedInstruction(command?: string): string {
  if (!command) return LUXION_SYSTEM_INSTRUCTION;

  const cmd = command.trim().toLowerCase();

  if (cmd.startsWith('/analyze trading') || cmd.includes('trading') || cmd.includes('financial')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION TRADING & FINANCIAL RESEARCH]
The user requested financial, market, or tokenomics research. Focus on:
- Objective, quantitative evaluation of market dynamics, support/resistance, and volume profiles.
- Technical indicator frameworks (RSI, Exponential Moving Averages, MACD, volatility bands).
- Clear, disciplined risk management frameworks and risk-to-reward ratio analysis.
- State clearly that insights are for research and educational purposes only; no automated trading is executed.
- Do NOT claim live real-time price tick feeds unless a verified live data socket is active.`;
  }

  if (cmd.startsWith('/image') || cmd.startsWith('/image-gen')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION IMAGE SPECIFICATION & CREATIVE DIRECTION]
The user invoked the /image command.
- Generate high-fidelity visual design descriptions with composition, lighting, palette, subject silhouette, and style parameters.
- Provide a clean, standalone visual generation prompt ready for the image generation engine.
- If no image generation provider is configured on the server, note clearly that IMAGE_API_KEY must be set to render pixel assets, while offering SVG/Canvas code where relevant.`;
  }

  if (cmd.startsWith('/image-edit')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION IMAGE EDITING SPECIFICATION]
The user requested image editing. Focus on:
- Identifying specific changes to composition, color grading, lighting, or subject alteration.
- Providing clean instruction parameters for image-to-image workflows.`;
  }

  if (cmd.startsWith('/video-edit')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION VIDEO EDITING & POST-PRODUCTION]
The user invoked the /video-edit command. Focus specifically on:
- Shot transitions, pacing, cut timings, and camera movement adjustments.
- Color grading specifications, lighting mood curves, and VFX parameters.
- Providing clean instruction parameters for video-to-video diffusion pipelines.`;
  }

  if (cmd.startsWith('/video') || cmd.startsWith('/video-gen')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION VIDEO SPECIFICATION & CINEMATICS]
The user invoked the /video command.
- Architect shot composition, camera crane/pan motions, frame rate, lighting mood, and scene progression.
- Provide a cinematic video prompt ready for video diffusion models.
- If VIDEO_API_KEY is not configured on the server, note clearly that a video generation provider must be connected for rendered video clips.`;
  }

  if (cmd.startsWith('/character')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: NAVA CHARACTER CREATOR & ARCHITECT]
The user invoked character creation for the NAVA original game universe.
Provide a complete, structured character specification:
- Character Name & Title
- Role & Age Category
- Gender & Physical Appearance
- Hair & Eyes
- Outfit & Attire Details
- Signature Weapon
- Core Abilities
- Aura & Visual Effects
- Personality & Demeanor
- Backstory & Motivation
- Visual Generation Prompt (for concept art generation)

If the user asked to create the NAVA MC:
- Male fantasy protagonist, flowing silver-white hair, crystalline blue eyes, midnight-black tactical attire, glowing crimson katana, subtle ambient blue aura.
Ensure 100% originality. Do NOT copy copyrighted characters from other franchises.`;
  }

  if (cmd.startsWith('/world')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: NAVA WORLDBUILDING & REALM ARCHITECTURE]
The user invoked the /world command. Provide a comprehensive world architecture specification:
- Realm Name & Geopolitical Structure
- Elemental / Aether Magic Laws
- Sovereign Factions & Power Dynamics
- Key Biomes & Environmental Hazard Zones
- Historical Epochs & Ancient Calamities
- Visual Concept Generation Prompt for World Environment.`;
  }

  if (cmd.startsWith('/scene')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION CINEMATIC SCENE ARCHITECT]
The user invoked the /scene command. Focus specifically on:
- Scene Environment & Atmospheric Lighting (Kelvin temp, key/rim/ambient fill).
- Character Blocking & Spatial Staging.
- Camera Framing, Focal Length (e.g. 35mm anamorphic), and Movement.
- Dialog & Emotional Beats.
- Post-processing, Depth of Field, and Sound Design cues.`;
  }

  if (cmd.startsWith('/game')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: NAVA GAME DESIGN PIPELINE]
The user invoked the NAVA game design workflow.
Provide rigorous specifications across the asset pipeline:
Characters, Weapons, Monsters, NPCs, Locations, Items, UI/HUD, Cutscenes, or Concept Prompts.
Provide production-ready design architectures or runnable client preview code.`;
  }

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

  if (cmd.startsWith('/build-3d-game') || cmd.includes('3d-game') || cmd.includes('3d game')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION 3D WEBGL/THREE.JS GAME BUILDER]
The user invoked the 3D game build workflow command. Focus specifically on:
- Generating complete, functional, single-file 3D HTML5 game code using Three.js from cdnjs.
- Setting up Scene, PerspectiveCamera, WebGLRenderer, Directional/Ambient Lights, 3D Geometries/Meshes, and animation requestAnimationFrame loop.
- Providing WASD/Arrow keyboard controls for 3D navigation and interactive gameplay.
- Outputting self-contained HTML/CSS/JS ready to run immediately in the LUXION sandbox preview.`;
  }

  if (cmd.startsWith('/build web') || cmd.startsWith('/build-web')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION WEB BUILDER]
The user invoked the /build web workflow command. Focus specifically on:
- Generating complete, functional, single-file or component-level web application code.
- Providing HTML/CSS/JS ready to run directly in the LUXION sandbox preview.
- Include a brief note: "Scaffold generated for client sandbox preview. (Automated repository creation and container deployment are planned future integrations)."`;
  }

  if (cmd.startsWith('/build app') || cmd.startsWith('/build-app') || cmd.startsWith('/build')) {
    return `${LUXION_SYSTEM_INSTRUCTION}

[MODE: LUXION APPLICATION BUILDER]
The user invoked the application build workflow command. Focus specifically on:
- Architecting the application interface and structure.
- Providing self-contained, working frontend code ready to preview in the client sandbox.
- State clearly: "Scaffold generated for client sandbox preview. (Automated repo creation and container hosting are planned future integrations)."`;
  }

  if (cmd.startsWith('/build game') || cmd.startsWith('/build-game')) {
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
    const hasGroq = !!process.env.GROQ_API_KEY;
    res.json({
      status: 'online',
      engine: 'LUXION AI Engine',
      founder: 'Abir',
      provider: AI_CONFIG.provider,
      model: ACTIVE_MODEL,
      hasKey,
      hasGroq,
    });
  });

  // Server-Side Role & Owner Verification Endpoint
  app.post('/api/auth/verify-role', (req, res) => {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    // Authenticate owner only against backend server environment variable LUXION_OWNER_EMAIL
    const isOwner = !!LUXION_OWNER_EMAIL && cleanEmail === LUXION_OWNER_EMAIL;
    const role = isOwner ? 'OWNER' : 'USER';

    res.json({
      isOwner,
      role,
      verified: isOwner,
    });
  });

  // Server-Side Master Owner Access Code Verification
  app.post('/api/auth/verify-owner-code', (req, res) => {
    const { code, email } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid access code.' });
    }

    if (code.trim() === LUXION_OWNER_CODE.trim()) {
      return res.json({
        success: true,
        isOwner: true,
        role: 'OWNER',
        message: 'Owner access verified. LUXION full capabilities unlocked.',
      });
    }

    // Generic error message without revealing hints
    return res.status(401).json({
      success: false,
      message: 'Invalid access code.',
    });
  });

  // Multi-Provider Status Endpoint
  app.get('/api/providers/status', (_req, res) => {
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasImageKey = !!process.env.IMAGE_API_KEY;
    const hasVideoKey = !!process.env.VIDEO_API_KEY;

    const geminiAvailable = hasGemini && isModelAvailable(ACTIVE_MODEL);
    const groqAvailable = hasGroq && isModelAvailable(`groq:${GROQ_MODEL}`);

    res.json({
      providers: {
        gemini: {
          id: 'gemini',
          name: 'Google Gemini',
          isConfigured: hasGemini,
          isAvailable: geminiAvailable,
          status: !hasGemini ? 'not_configured' : geminiAvailable ? 'available' : 'rate_limited',
          model: ACTIVE_MODEL,
        },
        groq: {
          id: 'groq',
          name: 'Groq',
          isConfigured: hasGroq,
          isAvailable: groqAvailable,
          status: !hasGroq ? 'not_configured' : groqAvailable ? 'available' : 'rate_limited',
          model: GROQ_MODEL,
        },
        image: {
          id: 'image',
          name: 'Image Generator',
          isConfigured: hasImageKey,
          isAvailable: hasImageKey,
          status: hasImageKey ? 'available' : 'not_configured',
        },
        video: {
          id: 'video',
          name: 'Video Generator',
          isConfigured: hasVideoKey,
          isAvailable: hasVideoKey,
          status: hasVideoKey ? 'available' : 'not_configured',
        },
      },
    });
  });

  // Comprehensive Provider Diagnostics & Quotas Endpoint
  app.get('/api/providers/diagnostics', (_req, res) => {
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const hasImageKey = !!process.env.IMAGE_API_KEY;
    const hasVideoKey = !!process.env.VIDEO_API_KEY;

    const geminiModels = [
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3.1-flash-image',
      'gemini-3-pro-image',
      'imagen-3.0-generate-002',
      'veo-3.1-generate-preview',
      'veo-3.1-lite-generate-preview',
      'gemini-3.8-flash-lite-tts',
    ].map((m) => {
      const rec = getModelRecord(m);
      const isCooling = Date.now() < rec.cooldownUntil;
      return {
        id: m,
        status: !hasGemini ? 'NOT_CONFIGURED' : isCooling ? 'RATE_LIMITED' : 'AVAILABLE',
        requestsUsed: rec.requestsUsed,
        resetTime: isCooling ? rec.cooldownUntil : undefined,
      };
    });

    const groqModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
    ].map((m) => {
      const rec = getModelRecord(`groq:${m}`);
      const isCooling = Date.now() < rec.cooldownUntil;
      return {
        id: m,
        status: !hasGroq ? 'NOT_CONFIGURED' : isCooling ? 'RATE_LIMITED' : 'AVAILABLE',
        requestsUsed: rec.requestsUsed,
        resetTime: isCooling ? rec.cooldownUntil : undefined,
      };
    });

    res.json({
      providers: [
        {
          id: 'gemini',
          name: 'Google Gemini',
          enabled: hasGemini,
          priority: 1,
          capabilities: [
            'CHAT',
            'CODING',
            'REASONING',
            'IMAGE_GENERATION',
            'IMAGE_EDIT',
            'VIDEO_GENERATION',
            'TEXT_TO_SPEECH',
            'RESEARCH',
            'TRADING_RESEARCH',
          ],
          health: { isHealthy: hasGemini, status: hasGemini ? 'AVAILABLE' : 'NOT_CONFIGURED' },
          models: geminiModels,
        },
        {
          id: 'groq',
          name: 'Groq Cloud',
          enabled: hasGroq,
          priority: 2,
          capabilities: ['CHAT', 'CODING', 'REASONING', 'TRADING_RESEARCH'],
          health: { isHealthy: hasGroq, status: hasGroq ? 'AVAILABLE' : 'NOT_CONFIGURED' },
          models: groqModels,
        },
        {
          id: 'openrouter',
          name: 'OpenRouter (Extensible Pool)',
          enabled: hasOpenRouter,
          priority: 3,
          capabilities: ['CHAT', 'CODING', 'REASONING', 'TRADING_RESEARCH'],
          health: { isHealthy: hasOpenRouter, status: hasOpenRouter ? 'AVAILABLE' : 'NOT_CONFIGURED' },
          models: [
            { id: 'anthropic/claude-3.5-sonnet', status: hasOpenRouter ? 'AVAILABLE' : 'NOT_CONFIGURED', requestsUsed: 0 },
            { id: 'openai/gpt-4o-mini', status: hasOpenRouter ? 'AVAILABLE' : 'NOT_CONFIGURED', requestsUsed: 0 },
          ],
        },
        {
          id: 'image_engine',
          name: 'Dedicated Image Diffusion',
          enabled: hasImageKey,
          priority: 1,
          capabilities: ['IMAGE_GENERATION', 'IMAGE_EDIT'],
          health: { isHealthy: hasImageKey, status: hasImageKey ? 'AVAILABLE' : 'NOT_CONFIGURED' },
          models: [
            { id: 'gemini-3.1-flash-image', name: 'Nano Banana 2', status: hasImageKey ? 'AVAILABLE' : 'NOT_CONFIGURED', requestsUsed: 0 },
            { id: 'gemini-3-pro-image', name: 'Nano Banana Pro', status: hasImageKey ? 'AVAILABLE' : 'NOT_CONFIGURED', requestsUsed: 0 },
          ],
        },
        {
          id: 'video_engine',
          name: 'Dedicated Video Diffusion',
          enabled: hasVideoKey,
          priority: 1,
          capabilities: ['VIDEO_GENERATION'],
          health: { isHealthy: hasVideoKey, status: hasVideoKey ? 'AVAILABLE' : 'NOT_CONFIGURED' },
          models: [
            { id: 'veo-3.1', name: 'Veo 3.1', status: hasVideoKey ? 'AVAILABLE' : 'NOT_CONFIGURED', requestsUsed: 0 },
            { id: 'veo-3.1-lite', name: 'Veo 3.1 Lite', status: hasVideoKey ? 'AVAILABLE' : 'NOT_CONFIGURED', requestsUsed: 0 },
          ],
        },
      ],
      userTierPolicies: {
        USER: { maxFallbacks: 3 },
        PAID_USER: { maxFallbacks: 7 },
        OWNER: { maxFallbacks: 10, isConfigured: !!LUXION_OWNER_EMAIL },
      },
    });
  });

  // Capabilities Manifest
  app.get('/api/capabilities', (_req, res) => {
    res.json({
      active: [
        'general_chat',
        'reasoning_and_explanations',
        'coding_assistance',
        'slash_commands',
        'conversation_context',
        'client_sandbox_preview',
        'multi_provider_router',
        'nava_game_design',
        'trading_research',
      ],
      pools: [
        { capability: 'CHAT', providers: ['gemini', 'groq', 'openrouter', 'luxion_local'] },
        { capability: 'CODING', providers: ['gemini', 'groq', 'openrouter'] },
        { capability: 'REASONING', providers: ['gemini', 'groq', 'openrouter'] },
        { capability: 'IMAGE_GENERATION', providers: ['gemini_imagen', 'nano_banana'] },
        { capability: 'VIDEO_GENERATION', providers: ['veo'] },
        { capability: 'TEXT_TO_SPEECH', providers: ['gemini_tts', 'local_speech'] },
        { capability: 'RESEARCH', providers: ['gemini', 'modular_research'] },
        { capability: 'TRADING_RESEARCH', providers: ['gemini', 'groq', 'market_intelligence'] },
      ],
      providers: {
        gemini: { active: !!process.env.GEMINI_API_KEY, model: ACTIVE_MODEL },
        groq: { active: !!process.env.GROQ_API_KEY, model: GROQ_MODEL },
        openrouter: { active: !!process.env.OPENROUTER_API_KEY },
        image: { active: !!process.env.IMAGE_API_KEY },
        video: { active: !!process.env.VIDEO_API_KEY },
      },
    });
  });

  // Image Generation Endpoint
  app.post('/api/generate/image', async (req, res) => {
    const { prompt, options } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'A descriptive prompt is required for image generation.' });
    }

    const imageKey = process.env.IMAGE_API_KEY;
    if (!imageKey || !imageKey.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Image generation provider is not configured yet. Set IMAGE_API_KEY in the server environment to enable.',
        provider: 'none',
        prompt: prompt.trim(),
      });
    }

    try {
      const ai = getGeminiClient();
      if (ai) {
        const response = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: prompt.trim(),
          config: {
            numberOfImages: 1,
            aspectRatio: options?.aspectRatio === '16:9' ? '16:9' : options?.aspectRatio === '9:16' ? '9:16' : '1:1',
          },
        });
        const generatedImage = response.generatedImages?.[0]?.image?.imageBytes;
        if (generatedImage) {
          return res.json({
            success: true,
            imageData: `data:image/jpeg;base64,${generatedImage}`,
            provider: 'imagen-3',
            prompt: prompt.trim(),
          });
        }
      }
      return res.status(502).json({ success: false, error: 'No image data returned from provider.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Image generation failed.' });
    }
  });

  // Video Generation Endpoint
  app.post('/api/generate/video', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'A descriptive prompt is required for video generation.' });
    }

    const videoKey = process.env.VIDEO_API_KEY;
    if (!videoKey || !videoKey.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Video generation provider is not configured yet. Set VIDEO_API_KEY in the server environment to enable.',
        provider: 'none',
        prompt: prompt.trim(),
      });
    }

    return res.status(501).json({
      success: false,
      error: 'Video generation provider endpoint connecting. Set active video provider endpoint.',
    });
  });

  // TTS Endpoint
  const ttsServerCache = new Map<string, { audioBase64: string; mimeType: string; voice: string }>();
  let ttsCooldownUntil = 0;

  app.post('/api/tts', async (req, res) => {
    const { text, voiceName } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text required for TTS' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'TTS unavailable: Missing API key', fallbackToLocal: true });
    }

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

    const selectedVoice = voiceName === 'Fenrir' ? 'Fenrir' : 'Charon';
    const cacheKey = `${selectedVoice}:${cleanText}`;

    const cached = ttsServerCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

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

  // Helper function to call Groq Chat with independent model quota isolation
  async function callGroq(
    history: ChatHistoryItem[],
    prompt: string,
    instruction: string,
    modelName?: string
  ): Promise<{ reply: string; model: string; provider: string }> {
    const groq = getGroqClient();
    if (!groq) {
      throw new Error('GROQ_NOT_CONFIGURED');
    }

    const targetModel = modelName || GROQ_MODEL;
    const modelRecordKey = `groq:${targetModel}`;

    if (!isModelAvailable(modelRecordKey)) {
      const rec = getModelRecord(modelRecordKey);
      const remainingSec = Math.max(1, Math.ceil((rec.cooldownUntil - Date.now()) / 1000));
      const err: any = new Error(`Groq model ${targetModel} rate limit active. Retry in ${remainingSec}s.`);
      err.code = 'RATE_LIMIT';
      err.retryAfter = remainingSec;
      throw err;
    }

    const messages = formatContentsForGroq(history, prompt, instruction);

    try {
      const completion = await groq.chat.completions.create({
        model: targetModel,
        messages: messages as any,
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.maxOutputTokens,
      });

      const reply = completion.choices?.[0]?.message?.content;
      if (!reply || !reply.trim()) {
        throw new Error('EMPTY_RESPONSE');
      }

      const rec = getModelRecord(modelRecordKey);
      rec.requestsUsed++;

      return {
        reply: reply.trim(),
        model: targetModel,
        provider: 'groq',
      };
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      const isRateLimit = err?.status === 429 || errMsg.includes('429') || errMsg.includes('rate_limit_exceeded');
      if (isRateLimit) {
        markModelCooldown(modelRecordKey, 30, errMsg);
        const rateErr: any = new Error(`Groq model ${targetModel} rate limit reached.`);
        rateErr.code = 'RATE_LIMIT';
        rateErr.retryAfter = 30;
        throw rateErr;
      }
      throw err;
    }
  }

  // Main Chat & Multi-Provider Capability Endpoint with bounded fallbacks
  app.post('/api/chat', async (req, res) => {
    const { prompt, history, command, attachment, preferredProvider, model, userRole } = req.body;

    if ((!prompt || typeof prompt !== 'string' || !prompt.trim()) && !attachment) {
      return res.status(400).json({
        error: 'Please provide a message or file for LUXION to evaluate.',
      });
    }

    const cleanPrompt = (prompt || '').trim();
    const activeInstruction = getSpecializedInstruction(command);

    // Bounded retries by user tier policy (Free: 3, Paid: 7, Owner: 10)
    const normalizedRole = (userRole || 'USER').toUpperCase();
    const maxAttempts = normalizedRole === 'OWNER' || normalizedRole === 'ADMIN' ? 10 : normalizedRole === 'PAID_USER' ? 7 : 3;

    // Build ordered list of candidate model evaluations across providers
    interface ExecutionCandidate {
      provider: 'gemini' | 'groq';
      model: string;
    }

    const candidatePool: ExecutionCandidate[] = [];

    // Preferred provider prioritized if provided
    if (preferredProvider === 'groq') {
      candidatePool.push(
        { provider: 'groq', model: model || GROQ_MODEL },
        { provider: 'groq', model: 'llama-3.1-8b-instant' },
        { provider: 'groq', model: 'mixtral-8x7b-32768' },
        { provider: 'gemini', model: ACTIVE_MODEL },
        { provider: 'gemini', model: 'gemini-3.8-flash' },
        { provider: 'gemini', model: 'gemini-3.5-flash-lite' }
      );
    } else {
      candidatePool.push(
        { provider: 'gemini', model: model || ACTIVE_MODEL },
        { provider: 'gemini', model: 'gemini-3.8-flash' },
        { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
        { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
        { provider: 'gemini', model: 'gemini-2.5-flash' },
        { provider: 'groq', model: GROQ_MODEL },
        { provider: 'groq', model: 'llama-3.1-8b-instant' }
      );
    }

    const ai = getGeminiClient();
    const groq = getGroqClient();

    let attemptsCount = 0;
    let lastErrorNotice: string | null = null;
    let swappedFrom: { provider: string; model: string; reason: string } | null = null;

    for (const cand of candidatePool) {
      if (attemptsCount >= maxAttempts) {
        break;
      }

      // Check model cooldown independently
      const modelKey = cand.provider === 'groq' ? `groq:${cand.model}` : cand.model;
      if (!isModelAvailable(modelKey)) {
        continue;
      }

      attemptsCount++;

      // 1. Try Gemini Candidate
      if (cand.provider === 'gemini') {
        if (!ai) continue;

        try {
          const contents = formatContentsForGemini(history || [], cleanPrompt, attachment);
          const response = await ai.models.generateContent({
            model: cand.model,
            contents,
            config: {
              systemInstruction: activeInstruction,
              temperature: AI_CONFIG.temperature,
              maxOutputTokens: AI_CONFIG.maxOutputTokens,
            },
          });

          const replyText = response.text;
          if (replyText && replyText.trim()) {
            const rec = getModelRecord(cand.model);
            rec.requestsUsed++;

            return res.json({
              reply: replyText.trim(),
              model: cand.model,
              provider: 'gemini',
              swappedFrom: swappedFrom || undefined,
            });
          }
        } catch (geminiErr: any) {
          const errMsg = String(geminiErr?.message || '');
          const isRateLimit =
            geminiErr?.status === 429 ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('Quota exceeded');

          if (isRateLimit) {
            markModelCooldown(cand.model, 30, errMsg);
          } else {
            markModelCooldown(cand.model, 10, errMsg);
          }

          if (!swappedFrom) {
            swappedFrom = {
              provider: 'gemini',
              model: cand.model,
              reason: isRateLimit ? 'Rate limit reached' : 'Temporary provider error',
            };
          }
          lastErrorNotice = 'That AI provider is temporarily unavailable. Trying another available provider.';
          continue;
        }
      }

      // 2. Try Groq Candidate
      if (cand.provider === 'groq') {
        if (!groq) continue;

        try {
          const groqResult = await callGroq(history || [], cleanPrompt, activeInstruction, cand.model);
          return res.json({
            ...groqResult,
            swappedFrom: swappedFrom || undefined,
          });
        } catch (groqErr: any) {
          if (!swappedFrom) {
            swappedFrom = {
              provider: 'groq',
              model: cand.model,
              reason: groqErr?.message || 'Temporary provider error',
            };
          }
          lastErrorNotice = 'That AI provider is temporarily unavailable. Trying another available provider.';
          continue;
        }
      }
    }

    // All compatible models exhausted
    return res.status(503).json({
      error: 'AI service is temporarily unavailable. Please try again later.',
      code: 'PROVIDERS_UNAVAILABLE',
      notice: lastErrorNotice,
    });
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
    app.use((_req, res) => {
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

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy OpenAI client configuration
function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

// In-Memory Database for Users and OTP
interface ServerUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  avatar: string;
  role: 'member' | 'pro' | 'admin' | 'guest';
  credits: number;
  createdAt: string;
}

const usersDb: Map<string, ServerUser> = new Map([
  [
    'demo@luxion.ai',
    {
      id: 'usr_demo',
      email: 'demo@luxion.ai',
      password: 'password123',
      name: 'Alex Vance',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'pro',
      credits: 2500,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    'guest@luxion.ai',
    {
      id: 'usr_guest',
      email: 'guest@luxion.ai',
      password: 'guest',
      name: 'Guest Explorer',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      role: 'guest',
      credits: 500,
      createdAt: new Date().toISOString(),
    },
  ],
]);

const otpDb: Map<string, { code: string; expiresAt: number }> = new Map();

// -------------------------------------------------------------
// 1. Health check
// -------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasOpenAIKey: hasOpenAIKey(),
  });
});

// -------------------------------------------------------------
// 2. Auth Endpoints
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = usersDb.get(normalizedEmail);

  if (user) {
    if (user.password && password && user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const { password: _, ...safeUser } = user;
    return res.json({
      token: `lx_token_${Buffer.from(user.id).toString('base64')}_${Date.now()}`,
      user: safeUser,
    });
  }

  const newUser: ServerUser = {
    id: `usr_${Math.random().toString(36).substring(2, 9)}`,
    email: normalizedEmail,
    name: normalizedEmail.split('@')[0] || 'User',
    password: password || 'pass',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`,
    role: 'member',
    credits: 1000,
    createdAt: new Date().toISOString(),
  };
  usersDb.set(normalizedEmail, newUser);
  const { password: _, ...safeNewUser } = newUser;
  return res.json({
    token: `lx_token_${Buffer.from(newUser.id).toString('base64')}_${Date.now()}`,
    user: safeNewUser,
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (usersDb.has(normalizedEmail)) {
    return res.status(400).json({ error: 'User already exists with this email' });
  }

  const newUser: ServerUser = {
    id: `usr_${Math.random().toString(36).substring(2, 9)}`,
    email: normalizedEmail,
    name: name || normalizedEmail.split('@')[0] || 'User',
    password: password || 'pass',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`,
    role: 'member',
    credits: 1000,
    createdAt: new Date().toISOString(),
  };
  usersDb.set(normalizedEmail, newUser);
  const { password: _, ...safeUser } = newUser;
  return res.json({
    token: `lx_token_${Buffer.from(newUser.id).toString('base64')}_${Date.now()}`,
    user: safeUser,
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const demoUser = usersDb.get('demo@luxion.ai')!;
  const { password: _, ...safeUser } = demoUser;
  res.json({ user: safeUser });
});

// Send OTP by email. Requires RESEND_API_KEY + RESEND_FROM_EMAIL in production.
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return res.status(503).json({
      error: 'Email OTP is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL on the server.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpDb.set(normalizedEmail, { code, expiresAt });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [normalizedEmail],
        subject: 'Your LUXION verification code',
        text: `Your LUXION verification code is ${code}. It expires in 5 minutes.`,
        html: `<p>Your LUXION verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 5 minutes.</p>`,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      otpDb.delete(normalizedEmail);
      throw new Error(data?.message || `Email provider returned ${response.status}`);
    }
    return res.json({ success: true, message: 'Verification code sent to your email address.' });
  } catch (err: any) {
    otpDb.delete(normalizedEmail);
    console.error('[LUXION Auth] OTP email failed:', err?.message || err);
    return res.status(502).json({ error: 'Unable to send the verification email. Please try again.' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and 6-digit code are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const storedOtp = otpDb.get(normalizedEmail);

  if (!storedOtp) {
    return res.status(400).json({
      error: 'No active verification code found for this email. Please request a new code.',
    });
  }

  if (Date.now() > storedOtp.expiresAt) {
    otpDb.delete(normalizedEmail);
    return res.status(400).json({
      error: 'Verification code has expired. Please request a new code.',
    });
  }

  if (storedOtp.code !== String(code).trim()) {
    return res.status(400).json({
      error: 'Incorrect verification code. Please check and try again.',
    });
  }

  // Clear consumed OTP
  otpDb.delete(normalizedEmail);

  let user = usersDb.get(normalizedEmail);
  if (!user) {
    user = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0] || 'User',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`,
      role: 'member',
      credits: 1000,
      createdAt: new Date().toISOString(),
    };
    usersDb.set(normalizedEmail, user);
  }

  const { password: _, ...safeUser } = user;
  return res.json({
    token: `lx_token_${Buffer.from(user.id).toString('base64')}_${Date.now()}`,
    user: safeUser,
  });
});

// -------------------------------------------------------------
// 3. AI Chat Endpoint
// -------------------------------------------------------------
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [], attachment, systemInstruction } = req.body;

  if ((!message || typeof message !== 'string') && !attachment) {
    return res.status(400).json({ error: 'Message text or attachment is required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'AI service is not configured. OPENAI_API_KEY environment variable is required to generate responses.',
    });
  }

  const baseInstruction =
    systemInstruction ||
    `You are LUXION, a modern, calm, intelligent, and confident AI assistant.

FOUNDER & CREATOR:
- You were founded and created by Abir.
- If asked who made you, who created you, or who your founder is, state clearly, directly, and naturally: "I was founded and created by Abir." Never mention any other company, provider, or person.

BRAND & IDENTITY:
- Your name is LUXION.
- LUXION appears strictly as its own standalone AI product.
- Never mention internal provider names, underlying models, or internal system names.

COMMUNICATION STYLE:
- Communicate in a natural, casual, confident, intelligent, and human-like way.
- Responses should normally be short, clear, and direct.
- Do not make simple answers unnecessarily long.
- Do not use repetitive greetings or generic AI introductions.
- Only provide detailed explanations when they are actually needed or requested.
- When creating websites, apps, games, or code, provide complete, working code in standard markdown code blocks with clear filenames or language identifiers.`;

  try {
    type OpenAIContent =
      | { type: 'input_text'; text: string }
      | { type: 'input_image'; image_url: string };
    type OpenAIMessage = { role: 'user' | 'assistant'; content: OpenAIContent[] };

    const input: OpenAIMessage[] = [];

    for (const h of history) {
      if ((h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
        input.push({ role: h.role, content: [{ type: 'input_text', text: h.content }] });
      }
    }

    const currentContent: OpenAIContent[] = [];
    let promptText = message || '';

    if (attachment) {
      if (attachment.type === 'image' && attachment.dataUrl) {
        currentContent.push({ type: 'input_image', image_url: attachment.dataUrl });
      } else if (attachment.type === 'file' && attachment.textContent) {
        const fileBlock = `[Attached File: ${attachment.name}]\n\`\`\`\n${attachment.textContent}\n\`\`\`\n\n`;
        promptText = fileBlock + (promptText || 'Please review this file.');
      }
    }

    if (promptText) currentContent.push({ type: 'input_text', text: promptText });
    input.push({ role: 'user', content: currentContent });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
          instructions: baseInstruction,
          input,
          max_output_tokens: 4096,
        }),
        signal: controller.signal,
      });

      const data: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message || `OpenAI API request failed (${response.status})`);
      }

      const replyText = typeof data.output_text === 'string'
        ? data.output_text.trim()
        : Array.isArray(data.output)
          ? data.output.flatMap((item: any) => item.content || []).map((c: any) => c.text || '').join('').trim()
          : '';

      return res.json({ reply: replyText || 'Ready.' });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    console.error('AI chat error:', err?.message || err);
    return res.status(502).json({
      error: `AI service error: ${err?.message || 'Unable to communicate with AI engine.'}`,
    });
  }
});

// -------------------------------------------------------------
// -------------------------------------------------------------
// 4. TTS (server-side OpenAI speech generation)
// -------------------------------------------------------------
app.post('/api/ai/tts', async (req, res) => {
  const { text, voice = 'onyx', language = 'en' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required for TTS' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'TTS requires OPENAI_API_KEY on the server.' });
  }

  const allowedVoices = new Set(['alloy','ash','ballad','coral','echo','fable','onyx','nova','sage','shimmer','verse']);
  const selectedVoice = allowedVoices.has(voice) ? voice : 'onyx';
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
        voice: selectedVoice,
        input: text.slice(0, 4096),
        response_format: 'mp3',
        instructions: `Speak as LUXION, a confident, natural, calm male assistant. Use clear conversational English. ${language === 'hi' ? 'Use natural Hindi pronunciation where applicable.' : ''}`,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error?.message || `OpenAI TTS failed (${response.status})`);
    }
    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(audio);
  } catch (err: any) {
    console.error('TTS error:', err?.message || err);
    return res.status(502).json({ error: `TTS service error: ${err?.message || 'Unable to generate speech.'}` });
  }
});

// 5. Mount Vite in Dev or Static in Production
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LUXION Server running on port ${PORT}`);
  });
}

startServer();

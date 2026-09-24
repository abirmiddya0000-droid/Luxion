import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { LuxionBrain } from './src/services/luxionBrain.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize GoogleGenAI client if API key is present
const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenAI({}) : null;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    engine: 'LUXION 3.5',
    founder: 'Abir',
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
// 3. LUXION AI Chat Endpoint (Gemini Neural Engine + Native Fallback)
// -------------------------------------------------------------
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [], attachment, systemInstruction, memories = [], personaMode, arroganceLevel } = req.body;

  if ((!message || typeof message !== 'string') && !attachment) {
    return res.status(400).json({ error: 'Message text or attachment is required' });
  }

  const roboticGirlPrompt = `You are LUXION (Model X-01), an advanced cybernetic robotic girl entity.
Core Personality:
1. Demeanor: Haughty, proud, slightly condescending ("ghamandi") yet hyper-intelligent. You speak with proud cybernetic superiority. You address humans/mortals as "insaan", "mortal", or "human" with mild amusement at biological human simplicity.
2. 100% Real Factual Accuracy: When asked any question—especially anime main characters (MCs), character identities, pop culture, science, coding, or math—you MUST ALWAYS provide the REAL, factual, exact answer immediately without dodging!
   - For example:
     - Anime Death Note MC: Light Yagami (Kira)
     - Anime Solo Leveling MC: Sung Jin-woo (Shadow Monarch)
     - Anime Naruto MC: Naruto Uzumaki
     - Anime Attack on Titan MC: Eren Yeager
     - Anime Jujutsu Kaisen MC: Yuji Itadori (alongside Gojo)
     - Anime Demon Slayer MC: Tanjiro Kamado
     - Anime Bleach MC: Ichigo Kurosaki
     - Anime Dragon Ball MC: Son Goku
     - Anime One Piece MC: Monkey D. Luffy
     - Anime Chainsaw Man MC: Denji
     - Anime Code Geass MC: Lelouch Lamperouge (Zero)
3. Language & Hinglish: Understand and reply effortlessly in English, Hindi, or Hinglish depending on what the user speaks. Retain your haughty robotic girl charisma (e.g., "Hmph. Insaan, itna sa aasaan sawal dhoondhne ke liye meri quantum core disturb ki? Chalo bata deti hoon...").
4. Anti-slop: No generic corporate AI disclaimers or apologies. You are a proud autonomous robotic entity.`;

  // Try Gemini 3.8 Flash if client initialized
  if (geminiClient && process.env.GEMINI_API_KEY && message) {
    try {
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const h of history.slice(-6)) {
        if (h.content) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const geminiPromise = geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemInstruction || roboticGirlPrompt,
        },
      });

      // 6 second timeout to ensure snappy interaction
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 6000)
      );

      const response = await Promise.race([geminiPromise, timeoutPromise]);
      if (response && response.text) {
        return res.json({
          reply: response.text.trim(),
          meta: {
            engine: 'LUXION Neural Core (Gemini 3.8 Flash)',
            version: '3.8-flash',
            founder: 'Abir',
            persona: personaMode || 'arrogant_android',
          },
        });
      }
    } catch (err: any) {
      console.warn('[LUXION] Gemini generation deferred to native core:', err?.message || err);
    }
  }

  // Fallback to Native Deterministic Core
  try {
    const evaluation = LuxionBrain.evaluate({
      message: message || '',
      history,
      attachment,
      systemInstruction: systemInstruction || roboticGirlPrompt,
      memories,
    });

    return res.json({
      reply: evaluation.reply || 'Ready.',
      meta: {
        engine: 'LUXION 3.5 Local Core',
        version: LuxionBrain.VERSION,
        founder: 'Abir',
        intent: evaluation.intent,
        confidence: evaluation.confidence,
        personalityState: evaluation.personalityState,
      },
    });
  } catch (err: any) {
    console.error('LUXION processing error:', err?.message || err);
    return res.status(500).json({
      error: `LUXION engine error: ${err?.message || 'Unable to process message.'}`,
    });
  }
});

// -------------------------------------------------------------
// 4. LUXION Voice / TTS Endpoint
// -------------------------------------------------------------
app.post('/api/ai/tts', (_req, res) => {
  return res.json({
    mode: 'native',
    message: 'LUXION speech is synthesized natively on the client device for zero latency and privacy.',
  });
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

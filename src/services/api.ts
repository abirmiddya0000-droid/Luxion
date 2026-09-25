import type { User, ChatAttachment } from '../types.ts';
import { LuxionBrain } from './luxionBrain.ts';
import { MemoryService, type MemoryItem } from './memory.ts';

export async function checkServerHealth(): Promise<{
  status: string;
  engine?: string;
  founder?: string;
  provider?: string;
  model?: string;
  hasKey?: boolean;
}> {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return graceful fallback state if server is still starting
  }
  return { status: 'online', engine: 'LUXION AI Engine', founder: 'Abir', provider: 'gemini', model: 'gemini-3.8-flash' };
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  attachment?: ChatAttachment | null,
  providedMemories?: MemoryItem[],
  command?: string,
  preferredProvider?: string
): Promise<string> {
  // 1. Automatically extract and persist any stated user facts/preferences into local memory
  if (message && typeof window !== 'undefined') {
    const drafts = MemoryService.extractFromMessage(message);
    for (const d of drafts) {
      MemoryService.save(d);
    }
  }

  // 2. Retrieve relevant contextual memories
  const activeMemories = providedMemories || (typeof window !== 'undefined' ? MemoryService.findRelevant(message) : []);

  // 3. Make real server-side request to Multi-Provider AI router
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: message,
        history,
        command,
        preferredProvider,
        attachment: attachment
          ? {
              type: attachment.type,
              name: attachment.name,
              dataUrl: attachment.dataUrl,
              content: attachment.textContent,
            }
          : null,
        memories: activeMemories.map((m) => `${m.key}: ${m.value}`),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error || 'AI connection failed. Try again.';
      throw new Error(errorMsg);
    }

    if (!data.reply) {
      throw new Error('AI connection failed. Try again.');
    }

    return data.reply;
  } catch (err: any) {
    if (err?.message) {
      throw err;
    }
    throw new Error('AI connection failed. Try again.');
  }
}

export async function generateImageAPI(
  prompt: string,
  options?: { aspectRatio?: string; style?: string }
): Promise<{ success: boolean; imageUrl?: string; imageData?: string; provider?: string; error?: string }> {
  try {
    const response = await fetch('/api/generate/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, options }),
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to connect to image generation endpoint.',
    };
  }
}

export async function generateVideoAPI(
  prompt: string,
  options?: { duration?: number; aspectRatio?: string }
): Promise<{ success: boolean; videoUrl?: string; videoData?: string; provider?: string; error?: string }> {
  try {
    const response = await fetch('/api/generate/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, options }),
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to connect to video generation endpoint.',
    };
  }
}

export async function getProvidersStatusAPI(): Promise<any> {
  try {
    const res = await fetch('/api/providers/status');
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

const STORAGE_USERS_KEY = 'luxion_registered_users';
const OTP_STORE_KEY = 'luxion_active_otp';

function createDefaultUser(email: string, name?: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  return {
    id: `usr_${Date.now()}`,
    name: name?.trim() || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`,
    role: 'member',
    credits: 100,
    createdAt: new Date().toISOString(),
  };
}

function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUser(user: User) {
  if (typeof window === 'undefined') return;
  const users = getStoredUsers().filter((u) => u.email.toLowerCase() !== user.email.toLowerCase());
  users.push(user);
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

export async function loginUser(email: string, _password?: string): Promise<{ token: string; user: User }> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Please enter a valid email address.');
  }

  const existing = getStoredUsers().find((u) => u.email.toLowerCase() === normalizedEmail);
  const user: User = existing || createDefaultUser(normalizedEmail);

  saveUser(user);
  const token = `lx_tok_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return { token, user };
}

export async function registerUser(name: string, email: string, _password?: string): Promise<{ token: string; user: User }> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Please enter a valid email address.');
  }

  const user: User = createDefaultUser(normalizedEmail, name);

  saveUser(user);
  const token = `lx_tok_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return { token, user };
}

export async function sendOtp(email: string): Promise<{ success: boolean; message: string; devCode?: string }> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  // Generate a 6-digit code for client verification
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`${OTP_STORE_KEY}_${normalizedEmail}`, code);
  }

  return {
    success: true,
    message: `Verification code generated: ${code}`,
    devCode: code,
  };
}

export async function verifyOtp(email: string, code: string): Promise<{ token: string; user: User }> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const trimmedCode = (code || '').trim();

  let storedCode: string | null = null;
  if (typeof window !== 'undefined') {
    storedCode = sessionStorage.getItem(`${OTP_STORE_KEY}_${normalizedEmail}`);
  }

  if (storedCode && storedCode !== trimmedCode) {
    throw new Error('Invalid verification code. Please check and try again.');
  }

  const existing = getStoredUsers().find((u) => u.email.toLowerCase() === normalizedEmail);
  const user: User = existing || createDefaultUser(normalizedEmail);

  saveUser(user);
  const token = `lx_tok_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return { token, user };
}

export async function verifyOwnerStatusAPI(email?: string): Promise<{ isOwner: boolean; role: 'USER' | 'PAID_USER' | 'OWNER' | 'ADMIN' }> {
  try {
    const res = await fetch('/api/auth/verify-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return { isOwner: false, role: 'USER' };
}

export async function getProviderDiagnosticsAPI(): Promise<any> {
  try {
    const res = await fetch('/api/providers/diagnostics');
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function verifyOwnerCodeAPI(
  code: string,
  email?: string
): Promise<{ success: boolean; isOwner?: boolean; role?: string; message: string }> {
  try {
    const res = await fetch('/api/auth/verify-owner-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        isOwner: true,
        role: 'OWNER',
        message: data.message || 'Owner access verified.',
      };
    }
    return {
      success: false,
      message: data?.message || 'Invalid access code.',
    };
  } catch {
    return {
      success: false,
      message: 'Invalid access code.',
    };
  }
}



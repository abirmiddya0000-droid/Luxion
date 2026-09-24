import { User, ChatAttachment } from '../types';
import { LuxionBrain } from './luxionBrain';
import { MemoryService, MemoryItem } from './memory';

const API_BASE = '';

export async function checkServerHealth(): Promise<{ status: string; engine?: string; founder?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'offline', engine: 'LUXION Native Core (Client Mode)', founder: 'Abir' };
  }
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  attachment?: ChatAttachment | null,
  providedMemories?: MemoryItem[],
  personaOptions?: { personaMode?: string; arroganceLevel?: number }
): Promise<string> {
  // 1. Automatically extract and persist any stated user facts/preferences
  if (message && typeof window !== 'undefined') {
    const drafts = MemoryService.extractFromMessage(message);
    for (const d of drafts) {
      MemoryService.save(d);
    }
  }

  // 2. Retrieve relevant contextual memories
  const activeMemories = providedMemories || (typeof window !== 'undefined' ? MemoryService.findRelevant(message) : []);

  // 3. Dispatch to backend or run native local engine
  try {
    const res = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        attachment,
        memories: activeMemories,
        personaMode: personaOptions?.personaMode,
        arroganceLevel: personaOptions?.arroganceLevel,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.reply;
    }
  } catch (err) {
    // If backend is unreachable, run LUXION Brain directly on client
    console.warn('[LUXION] Network unavailable, activating client-side LUXION brain:', err);
  }

  // Standalone native execution fallback with memory
  const evaluation = LuxionBrain.evaluate({
    message,
    history,
    attachment,
    memories: activeMemories,
  });

  return evaluation.reply;
}

export async function loginUser(email: string, password?: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
  return await res.json();
}

export async function registerUser(name: string, email: string, password?: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error || 'Registration failed');
  }
  return await res.json();
}

export async function sendOtp(email: string): Promise<{ success: boolean; message: string; devCode?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to send verification code' }));
    throw new Error(err.error || 'Failed to send verification code');
  }
  return await res.json();
}

export async function verifyOtp(email: string, code: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(err.error || 'Verification failed');
  }
  return await res.json();
}


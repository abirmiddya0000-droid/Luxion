import { User, ChatAttachment } from '../types';

const API_BASE = '';

export async function checkServerHealth(): Promise<{ status: string; hasOpenAIKey: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'offline', hasOpenAIKey: false };
  }
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  attachment?: ChatAttachment | null
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, attachment }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Chat request failed');
  }
  const data = await res.json();
  return data.reply;
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


export async function synthesizeSpeech(text: string, voice = 'onyx'): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/ai/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, language: 'en' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'TTS request failed' }));
    throw new Error(err.error || 'TTS request failed');
  }
  return await res.blob();
  }

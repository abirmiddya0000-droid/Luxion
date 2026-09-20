import { HistorySession, ChatMessage } from '../types';

const SESSIONS_KEY = 'luxion_chat_sessions';
const ACTIVE_SESSION_KEY = 'luxion_active_session_id';

export function getSavedSessions(): HistorySession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load sessions:', err);
    return [];
  }
}

export function saveSession(session: HistorySession): void {
  try {
    const sessions = getSavedSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    let updated: HistorySession[];
    if (existingIndex >= 0) {
      updated = [...sessions];
      updated[existingIndex] = session;
    } else {
      updated = [session, ...sessions];
    }
    // Limit to 50 sessions
    const trimmed = updated.slice(0, 50);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent('luxion_sessions_updated', { detail: trimmed }));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

export function deleteSession(id: string): HistorySession[] {
  try {
    const sessions = getSavedSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('luxion_sessions_updated', { detail: filtered }));
    return filtered;
  } catch (err) {
    console.error('Failed to delete session:', err);
    return [];
  }
}

export function clearAllSessions(): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('luxion_sessions_updated', { detail: [] }));
  } catch (err) {
    console.error('Failed to clear sessions:', err);
  }
}

export function generateSessionTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New Chat';
  const text = firstUser.content.replace(/\n+/g, ' ').trim();
  return text.length > 40 ? text.slice(0, 40) + '...' : text;
}

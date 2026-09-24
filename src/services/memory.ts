/**
 * LUXION LOCAL MEMORY SERVICE
 * Browser-local contextual memory tracking across chat sessions.
 * 
 * - Privacy-first: all data stays local to the client browser (localStorage).
 * - Automatic deduplication, sensitive content filtering, and categorical classification.
 * - Modular storage interface allowing easy database replacement in the future.
 */

export type MemoryCategory = 'user_profile' | 'preference' | 'context' | 'fact';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryItemDraft {
  category: MemoryCategory;
  key: string;
  value: string;
  confidence?: number;
}

export interface MemoryStore {
  getAll(): MemoryItem[];
  get(key: string): MemoryItem | undefined;
  set(item: MemoryItem): void;
  remove(id: string): boolean;
  clear(): void;
}

const STORAGE_KEY = 'luxion_local_memory_v1';

// Patterns that identify sensitive values that must NEVER be persisted
const SENSITIVE_PATTERNS = [
  /\b(?:password|passwd|secret|api[_-]?key|bearer\s+[a-z0-9_\-\.]+)\b/i,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b.*?(?:password|token)/i,
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/, // Credit cards
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,})\b/, // API tokens
];

/**
 * In-memory fallback if localStorage is unavailable (e.g., SSR or incognito restrictions).
 */
class BrowserMemoryStore implements MemoryStore {
  private inMemoryCache: MemoryItem[] | null = null;

  private isStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  getAll(): MemoryItem[] {
    if (!this.isStorageAvailable()) {
      return this.inMemoryCache || [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return this.inMemoryCache || [];
    }
  }

  get(key: string): MemoryItem | undefined {
    const norm = key.trim().toLowerCase();
    return this.getAll().find((m) => m.key.toLowerCase() === norm);
  }

  set(item: MemoryItem): void {
    const list = this.getAll();
    const existingIndex = list.findIndex(
      (m) => m.key.toLowerCase() === item.key.toLowerCase() || m.id === item.id
    );

    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        ...item,
        updatedAt: Date.now(),
      };
    } else {
      list.push(item);
    }

    // Keep memory lean: max 80 high-confidence items
    const trimmed = list
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 80);

    if (this.isStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        window.dispatchEvent(new CustomEvent('luxion_memory_updated', { detail: trimmed }));
      } catch (err) {
        console.warn('[LUXION Memory] Failed to write to localStorage:', err);
      }
    }
    this.inMemoryCache = trimmed;
  }

  remove(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((m) => m.id !== id && m.key !== id);
    if (filtered.length === list.length) return false;

    if (this.isStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('luxion_memory_updated', { detail: filtered }));
      } catch {}
    }
    this.inMemoryCache = filtered;
    return true;
  }

  clear(): void {
    if (this.isStorageAvailable()) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('luxion_memory_updated', { detail: [] }));
      } catch {}
    }
    this.inMemoryCache = [];
  }
}

let activeStore: MemoryStore = new BrowserMemoryStore();

export class MemoryService {
  /**
   * Replace active store implementation (e.g. for database or testing)
   */
  public static setStore(store: MemoryStore): void {
    activeStore = store;
  }

  public static isSensitive(text: string): boolean {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
  }

  public static getAll(): MemoryItem[] {
    return activeStore.getAll();
  }

  public static get(key: string): MemoryItem | undefined {
    return activeStore.get(key);
  }

  public static save(draft: MemoryItemDraft): MemoryItem | null {
    if (!draft.key || !draft.value) return null;
    if (this.isSensitive(draft.value) || this.isSensitive(draft.key)) {
      return null;
    }

    const normKey = draft.key.trim().toLowerCase();
    const existing = activeStore.get(normKey);

    const now = Date.now();
    const item: MemoryItem = {
      id: existing ? existing.id : `mem_${now}_${Math.random().toString(36).slice(2, 7)}`,
      category: draft.category,
      key: normKey,
      value: draft.value.trim(),
      confidence: draft.confidence ?? 0.9,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    activeStore.set(item);
    return item;
  }

  public static update(id: string, updates: Partial<MemoryItem>): boolean {
    const list = activeStore.getAll();
    const target = list.find((m) => m.id === id || m.key.toLowerCase() === id.toLowerCase());
    if (!target) return false;

    if (updates.value && this.isSensitive(updates.value)) return false;

    activeStore.set({
      ...target,
      ...updates,
      updatedAt: Date.now(),
    });
    return true;
  }

  public static remove(idOrKey: string): boolean {
    return activeStore.remove(idOrKey);
  }

  public static clear(): void {
    activeStore.clear();
  }

  /**
   * Search for memories relevant to a user query or topic.
   */
  public static findRelevant(query: string, limit = 5): MemoryItem[] {
    const list = activeStore.getAll();
    if (list.length === 0 || !query) return [];

    const cleanQuery = query.toLowerCase();

    // If asking about general memory status, return recent memories
    if (
      cleanQuery.includes('what do you remember') ||
      cleanQuery.includes('do you remember') ||
      cleanQuery.includes('show memory') ||
      cleanQuery.includes('all memories') ||
      cleanQuery.includes('what is in memory') ||
      cleanQuery.includes('what is stored')
    ) {
      return list.slice(0, limit);
    }

    const words = cleanQuery.split(/\s+/).filter((w) => w.length > 2);

    const scored = list.map((item) => {
      let score = 0;
      const itemKey = item.key.toLowerCase();
      const itemVal = item.value.toLowerCase();

      // Direct exact match
      if (cleanQuery.includes(itemKey) || cleanQuery.includes(itemVal)) {
        score += 8;
      }

      // Word matches
      for (const w of words) {
        if (itemKey.includes(w)) score += 3;
        if (itemVal.includes(w)) score += 2;
      }

      // Category weight
      if (item.category === 'user_profile') score += 1.5;
      if (item.category === 'preference') score += 1.2;

      return { item, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.item);
  }

  /**
   * Automatic conversational insight extractor.
   * Identifies user preferences, names, tech stacks, and active projects.
   */
  public static extractFromMessage(message: string): MemoryItemDraft[] {
    if (!message || this.isSensitive(message)) return [];
    const text = message.trim();
    const drafts: MemoryItemDraft[] = [];

    // 1. User Name: "My name is Abir", "Call me Alex", "Remember that my name is Abir"
    const nameMatch = text.match(/(?:my name is|call me|i'm called|i am called)\s+([a-zA-Z0-9_\-\.]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim().replace(/[\.\,\!]+$/, '');
      if (!['luxion', 'user', 'developer', 'human'].includes(name.toLowerCase())) {
        drafts.push({
          category: 'user_profile',
          key: 'user_name',
          value: name.charAt(0).toUpperCase() + name.slice(1),
          confidence: 0.98,
        });
      }
    }

    // 2. Tech / Programming Preferences: "I prefer TypeScript", "I love React", "I use Tailwind"
    const prefMatch = text.match(/(?:i prefer|i like|i love|i always use|my preferred language is|my favorite language is)\s+([a-zA-Z0-9#\+\.\s]{2,25})(?:over|\.|$|,)/i);
    if (prefMatch && prefMatch[1]) {
      const pref = prefMatch[1].trim();
      if (pref.length > 1 && !pref.toLowerCase().includes('to ') && !pref.toLowerCase().includes('that ')) {
        drafts.push({
          category: 'preference',
          key: `preferred_${pref.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          value: `Prefers ${pref}`,
          confidence: 0.85,
        });
      }
    }

    // 3. Current Project: "I'm working on a snake game", "I am building a portfolio website"
    const projectMatch = text.match(/(?:i am working on|i'm working on|i am building|i'm building|my project is)\s+(?:a|an)?\s*([a-zA-Z0-9\s\-]{3,40})(?:\.|$|,)/i);
    if (projectMatch && projectMatch[1]) {
      const proj = projectMatch[1].trim();
      drafts.push({
        category: 'context',
        key: 'current_project',
        value: proj,
        confidence: 0.85,
      });
    }

    // 4. Explicit Memory Command: "Remember that I like dark mode", "Remember that I am a full stack engineer"
    const explicitMatch = text.match(/^remember(?:\s+that)?\s+(.+)$/i);
    if (explicitMatch && explicitMatch[1]) {
      const fact = explicitMatch[1].trim();
      drafts.push({
        category: 'fact',
        key: `fact_${Date.now()}`,
        value: fact,
        confidence: 0.99,
      });
    }

    return drafts;
  }

  /**
   * Helper to format memories into a clean prompt context block.
   */
  public static formatForContext(memories: MemoryItem[]): string {
    if (!memories || memories.length === 0) return '';
    const lines = memories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`);
    return `[Known User Context & Memory]\n${lines.join('\n')}`;
  }
}

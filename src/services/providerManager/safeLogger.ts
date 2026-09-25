/**
 * LUXION SAFE PROVIDER LOGGER
 * 
 * Strict sanitization policy:
 * - Records latency, capability, provider ID, model ID, success/failure, and quota state.
 * - NEVER logs API keys, bearer tokens, passwords, authorization headers, or sensitive user secrets.
 */

import { SafeLogEntry, Capability, ProviderStatus } from './types.ts';

class SafeLogger {
  private static instance: SafeLogger;
  private logs: SafeLogEntry[] = [];
  private readonly MAX_LOGS = 100;

  private constructor() {}

  public static getInstance(): SafeLogger {
    if (!SafeLogger.instance) {
      SafeLogger.instance = new SafeLogger();
    }
    return SafeLogger.instance;
  }

  public logEvent(entry: {
    providerId: string;
    modelId: string;
    capability: Capability;
    success: boolean;
    latencyMs: number;
    errorCategory?: string;
    quotaState?: ProviderStatus;
  }): void {
    const cleanEntry: SafeLogEntry = {
      timestamp: Date.now(),
      providerId: entry.providerId,
      modelId: entry.modelId,
      capability: entry.capability,
      success: entry.success,
      latencyMs: Math.max(0, Math.round(entry.latencyMs)),
      errorCategory: entry.errorCategory ? this.sanitizeError(entry.errorCategory) : undefined,
      quotaState: entry.quotaState,
    };

    this.logs.unshift(cleanEntry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }
  }

  private sanitizeError(err: string): string {
    return err
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]')
      .replace(/gsk_[a-zA-Z0-9]{40,}/g, '[REDACTED_GROQ_KEY]')
      .replace(/sk-[a-zA-Z0-9-_]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
      .slice(0, 150);
  }

  public getRecentLogs(): SafeLogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }
}

export const safeLogger = SafeLogger.getInstance();

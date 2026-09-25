/**
 * GROQ CHAT PROVIDER
 * 
 * Implements the ChatProvider interface using the official Groq SDK / Groq API.
 * Follows strict security directives:
 * - Credentials (GROQ_API_KEY) are resolved strictly server-side.
 * - API keys are NEVER exposed to client-side code or bundled assets.
 * - Communicates with the server-side Groq endpoint or direct server runtime.
 * - Accurately reports provider lifecycle states:
 *   'configured' | 'not_configured' | 'available' | 'unavailable' | 'rate_limited' | 'quota_exhausted' | 'temporary_error' | 'ready'
 */

export type ProviderStatusCode =
  | 'configured'
  | 'not_configured'
  | 'available'
  | 'unavailable'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'temporary_error'
  | 'ready';

export interface ProviderStatusReport {
  id: string;
  name: string;
  status: ProviderStatusCode;
  isConfigured: boolean;
  isAvailable: boolean;
  model: string;
  message?: string;
  retryAfter?: number;
}

export interface ChatProviderOptions {
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  command?: string;
}

export interface ChatProviderResponse {
  reply: string;
  model: string;
  provider: string;
  raw?: any;
}

/**
 * Standard ChatProvider interface for LUXION's multi-provider architecture.
 */
export interface ChatProvider {
  readonly id: string;
  readonly name: string;
  getStatus(): Promise<ProviderStatusReport>;
  sendMessage(prompt: string, options?: ChatProviderOptions): Promise<ChatProviderResponse>;
}

export class GroqProvider implements ChatProvider {
  public readonly id = 'groq';
  public readonly name = 'Groq';
  private cachedStatus: ProviderStatusReport | null = null;
  private lastStatusFetch = 0;
  private cooldownUntil = 0;

  /**
   * Queries provider status from the backend to ensure GROQ_API_KEY remains secret on the server.
   */
  public async getStatus(): Promise<ProviderStatusReport> {
    // Return rate-limited state if currently cooling down
    if (Date.now() < this.cooldownUntil) {
      const remainingSeconds = Math.ceil((this.cooldownUntil - Date.now()) / 1000);
      return {
        id: this.id,
        name: this.name,
        status: 'rate_limited',
        isConfigured: true,
        isAvailable: false,
        model: this.cachedStatus?.model || 'llama-3.3-70b-versatile',
        message: `Groq is currently rate-limited. Retry in ${remainingSeconds}s.`,
        retryAfter: remainingSeconds,
      };
    }

    // Cache status for 15 seconds to prevent polling churn
    if (this.cachedStatus && Date.now() - this.lastStatusFetch < 15000) {
      return this.cachedStatus;
    }

    try {
      const response = await fetch('/api/providers/status');
      if (response.ok) {
        const data = await response.json();
        const groqData = data?.providers?.groq;
        if (groqData) {
          this.cachedStatus = {
            id: this.id,
            name: this.name,
            status: groqData.status as ProviderStatusCode,
            isConfigured: Boolean(groqData.isConfigured),
            isAvailable: Boolean(groqData.isAvailable),
            model: groqData.model || 'llama-3.3-70b-versatile',
            message: groqData.message,
            retryAfter: groqData.retryAfter,
          };
          this.lastStatusFetch = Date.now();
          return this.cachedStatus;
        }
      }
    } catch {
      // Backend may be starting or offline
    }

    return {
      id: this.id,
      name: this.name,
      status: 'not_configured',
      isConfigured: false,
      isAvailable: false,
      model: 'llama-3.3-70b-versatile',
      message: 'Groq provider is not configured. Set GROQ_API_KEY on the server to enable.',
    };
  }

  /**
   * Executes a text request through the server-side Groq router.
   */
  public async sendMessage(
    prompt: string,
    options?: ChatProviderOptions
  ): Promise<ChatProviderResponse> {
    if (Date.now() < this.cooldownUntil) {
      const waitSec = Math.ceil((this.cooldownUntil - Date.now()) / 1000);
      throw new Error(`Groq rate limit active. Please wait ${waitSec} seconds before retrying.`);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          history: options?.history || [],
          command: options?.command,
          preferredProvider: 'groq',
          model: options?.model,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const status = response.status;
        const errMsg = data?.error || 'Groq request failed';

        if (status === 429) {
          const cooldownSec = data?.retryAfter || 30;
          this.cooldownUntil = Date.now() + cooldownSec * 1000;
          const err = new Error(errMsg);
          (err as any).statusCode = 'rate_limited';
          (err as any).retryAfter = cooldownSec;
          throw err;
        }

        if (status === 503 && data?.code === 'NOT_CONFIGURED') {
          const err = new Error('Groq provider is not configured on the server.');
          (err as any).statusCode = 'not_configured';
          throw err;
        }

        throw new Error(errMsg);
      }

      if (!data.reply) {
        throw new Error('Empty response received from Groq.');
      }

      return {
        reply: data.reply,
        model: data.model || 'llama-3.3-70b-versatile',
        provider: 'groq',
        raw: data,
      };
    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      throw new Error(err.message || 'Groq service error.');
    }
  }

  /**
   * Utility to mark cooldown when rate limit is signaled from any source.
   */
  public markRateLimited(seconds = 30): void {
    this.cooldownUntil = Date.now() + seconds * 1000;
  }
}

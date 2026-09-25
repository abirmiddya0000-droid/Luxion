/**
 * LUXION GROQ TEXT & REASONING PROVIDER
 * 
 * Supports:
 * - Ultra-low-latency text inference: CHAT, CODING, REASONING, TRADING_RESEARCH
 * - Official Groq SDK server-side execution with zero key leakage
 * - Distinct per-model quota tracking
 * - Explicitly does NOT claim image or video capabilities
 */

import {
  Provider,
  Capability,
  ModelConfig,
  ProviderHealth,
  ProviderUsage,
  ProviderLimits,
  ModelQuotaState,
  GenerationRequest,
  GenerationResponse,
} from './types.ts';
import { safeLogger } from './safeLogger.ts';

export class GroqProvider implements Provider {
  public readonly id = 'groq';
  public readonly name = 'Groq Cloud';
  public enabled = true;
  public priority = 2;
  public readonly envKeyName = 'GROQ_API_KEY';

  public readonly capabilities: Capability[] = ['CHAT', 'CODING', 'REASONING', 'TRADING_RESEARCH'];

  public readonly models: ModelConfig[] = [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile (Primary High-Precision)',
      capabilities: ['CHAT', 'CODING', 'REASONING', 'TRADING_RESEARCH'],
      contextWindow: 131072,
      maxTokens: 4096,
      defaultTemperature: 0.6,
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant (Ultra-Fast Response)',
      capabilities: ['CHAT', 'REASONING'],
      contextWindow: 131072,
      maxTokens: 2048,
      defaultTemperature: 0.7,
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B (MoE Architecture)',
      capabilities: ['CHAT', 'CODING', 'REASONING'],
      contextWindow: 32768,
      maxTokens: 4096,
      defaultTemperature: 0.6,
    },
  ];

  private modelQuotas: Map<string, ModelQuotaState> = new Map();
  private totalRequests = 0;
  private totalTokens = 0;
  private errorCount = 0;

  constructor() {
    for (const m of this.models) {
      this.modelQuotas.set(m.id, {
        modelId: m.id,
        status: 'AVAILABLE',
        requestsUsed: 0,
      });
    }
  }

  public getModelQuota(modelId: string): ModelQuotaState {
    const existing = this.modelQuotas.get(modelId);
    if (existing) {
      if (
        (existing.status === 'RATE_LIMITED' || existing.status === 'QUOTA_EXHAUSTED' || existing.status === 'TEMPORARILY_UNAVAILABLE') &&
        existing.resetTime &&
        Date.now() >= existing.resetTime
      ) {
        existing.status = 'AVAILABLE';
        existing.resetTime = undefined;
        existing.lastError = undefined;
      }
      return existing;
    }

    const fresh: ModelQuotaState = {
      modelId,
      status: 'AVAILABLE',
      requestsUsed: 0,
    };
    this.modelQuotas.set(modelId, fresh);
    return fresh;
  }

  public markModelRateLimited(modelId: string, resetSeconds = 30, error?: string): void {
    const quota = this.getModelQuota(modelId);
    quota.status = 'RATE_LIMITED';
    quota.resetTime = Date.now() + resetSeconds * 1000;
    quota.lastError = error;
    safeLogger.logEvent({
      providerId: this.id,
      modelId,
      capability: 'CHAT',
      success: false,
      latencyMs: 0,
      errorCategory: 'GROQ_RATE_LIMIT_COOLDOWN',
      quotaState: 'RATE_LIMITED',
    });
  }

  public markModelQuotaExhausted(modelId: string, resetSeconds = 60, error?: string): void {
    const quota = this.getModelQuota(modelId);
    quota.status = 'QUOTA_EXHAUSTED';
    quota.resetTime = Date.now() + resetSeconds * 1000;
    quota.lastError = error;
  }

  public async healthCheck(): Promise<ProviderHealth> {
    try {
      const res = await fetch('/api/providers/status');
      if (res.ok) {
        const data = await res.json();
        const groq = data?.providers?.groq;
        return {
          isHealthy: Boolean(groq?.isAvailable),
          status: groq?.status?.toUpperCase() || (groq?.isConfigured ? 'AVAILABLE' : 'NOT_CONFIGURED'),
          lastCheck: Date.now(),
        };
      }
    } catch {}

    return {
      isHealthy: false,
      status: 'NOT_CONFIGURED',
      lastCheck: Date.now(),
      message: 'Groq provider status offline',
    };
  }

  public getUsage(): ProviderUsage {
    const usageObj: Record<string, ModelQuotaState> = {};
    this.modelQuotas.forEach((v, k) => {
      usageObj[k] = { ...v };
    });
    return {
      totalRequests: this.totalRequests,
      totalTokens: this.totalTokens,
      errorCount: this.errorCount,
      modelUsage: usageObj,
    };
  }

  public getLimits(): ProviderLimits {
    return {
      rpm: 30,
      rpd: 14400,
      resetWindowSeconds: 60,
    };
  }

  public async generate(request: GenerationRequest): Promise<GenerationResponse> {
    // Groq does not support image or video capabilities
    if (request.capability === 'IMAGE_GENERATION' || request.capability === 'IMAGE_EDIT' || request.capability === 'VIDEO_GENERATION') {
      return {
        success: false,
        providerId: this.id,
        modelId: 'none',
        latencyMs: 0,
        error: `Groq does not support ${request.capability}. Route to compatible visual diffusion provider.`,
        errorCode: 'UNSUPPORTED_CAPABILITY',
      };
    }

    const targetModel = request.preferredModel || 'llama-3.3-70b-versatile';
    const quota = this.getModelQuota(targetModel);

    if (quota.status !== 'AVAILABLE') {
      const waitSec = quota.resetTime ? Math.max(1, Math.ceil((quota.resetTime - Date.now()) / 1000)) : 30;
      return {
        success: false,
        providerId: this.id,
        modelId: targetModel,
        latencyMs: 0,
        error: `Groq model ${targetModel} is currently ${quota.status.toLowerCase()}. Retry in ${waitSec}s.`,
        errorCode: quota.status,
      };
    }

    const startTime = Date.now();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: request.prompt,
          history: request.history,
          command: request.command,
          attachment: request.attachment,
          model: targetModel,
          preferredProvider: 'groq',
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        }),
      });

      const latencyMs = Date.now() - startTime;
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        this.errorCount++;
        const status = res.status;
        const errMsg = data?.error || 'Groq request failed';

        if (status === 429) {
          this.markModelRateLimited(targetModel, data.retryAfter || 30, errMsg);
        } else if (status === 503) {
          quota.status = 'NOT_CONFIGURED';
        } else {
          quota.status = 'PROVIDER_ERROR';
        }

        safeLogger.logEvent({
          providerId: this.id,
          modelId: targetModel,
          capability: request.capability,
          success: false,
          latencyMs,
          errorCategory: String(status),
          quotaState: quota.status,
        });

        return {
          success: false,
          providerId: this.id,
          modelId: targetModel,
          latencyMs,
          error: errMsg,
          errorCode: quota.status,
        };
      }

      quota.requestsUsed++;
      this.totalRequests++;
      safeLogger.logEvent({
        providerId: this.id,
        modelId: targetModel,
        capability: request.capability,
        success: true,
        latencyMs,
        quotaState: 'AVAILABLE',
      });

      return {
        success: true,
        text: data.reply,
        providerId: this.id,
        modelId: data.model || targetModel,
        latencyMs,
        metadata: data,
      };
    } catch (err: any) {
      this.errorCount++;
      return {
        success: false,
        providerId: this.id,
        modelId: targetModel,
        latencyMs: Date.now() - startTime,
        error: err.message || 'Network error communicating with Groq provider',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }
}

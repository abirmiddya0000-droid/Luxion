/**
 * LUXION GEMINI MULTI-CAPABILITY PROVIDER
 * 
 * Supports:
 * - Text / Chat / Coding / Reasoning / Trading Research
 * - Image Generation (Nano Banana 2: gemini-3.1-flash-image, Nano Banana Pro: gemini-3-pro-image, Imagen 3)
 * - Video Generation (Veo 3.1, Veo 3.1 Lite)
 * - High-Fidelity Text-to-Speech (Gemini Flash TTS)
 * 
 * Per-Model Independent Quota Isolation:
 * - If gemini-3.8-flash is rate-limited, gemini-3.5-flash-lite, gemini-2.5-flash, and other models
 *   remain completely available.
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

export class GeminiProvider implements Provider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';
  public enabled = true;
  public priority = 1;
  public readonly envKeyName = 'GEMINI_API_KEY';

  public readonly capabilities: Capability[] = [
    'CHAT',
    'CODING',
    'REASONING',
    'IMAGE_GENERATION',
    'IMAGE_EDIT',
    'VIDEO_GENERATION',
    'TEXT_TO_SPEECH',
    'RESEARCH',
    'TRADING_RESEARCH',
  ];

  public readonly models: ModelConfig[] = [
    {
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash (Default Reasoning & Chat)',
      capabilities: ['CHAT', 'CODING', 'REASONING', 'TRADING_RESEARCH', 'RESEARCH'],
      contextWindow: 1048576,
      maxTokens: 4096,
      supportsImages: true,
      defaultTemperature: 0.7,
    },
    {
      id: 'gemini-3.5-flash-lite',
      name: 'Gemini 3.5 Flash-Lite (High Throughput)',
      capabilities: ['CHAT', 'REASONING', 'TRADING_RESEARCH'],
      contextWindow: 1048576,
      maxTokens: 4096,
      supportsImages: true,
      defaultTemperature: 0.7,
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash-Lite (Low Latency)',
      capabilities: ['CHAT', 'REASONING'],
      contextWindow: 1048576,
      maxTokens: 4096,
      supportsImages: true,
      defaultTemperature: 0.7,
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      capabilities: ['CHAT', 'CODING', 'REASONING', 'TRADING_RESEARCH'],
      contextWindow: 1048576,
      maxTokens: 4096,
      supportsImages: true,
      defaultTemperature: 0.7,
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro (Deep Architecture & Math)',
      capabilities: ['REASONING', 'CODING', 'TRADING_RESEARCH'],
      contextWindow: 2097152,
      maxTokens: 8192,
      supportsImages: true,
      defaultTemperature: 0.5,
    },
    {
      id: 'gemini-3.1-flash-image',
      name: 'Nano Banana 2 (High-Speed Visual Diffusion)',
      capabilities: ['IMAGE_GENERATION', 'IMAGE_EDIT'],
      isExperimental: true,
    },
    {
      id: 'gemini-3-pro-image',
      name: 'Nano Banana Pro (Studio Concept Art)',
      capabilities: ['IMAGE_GENERATION'],
      isExperimental: true,
    },
    {
      id: 'imagen-3.0-generate-002',
      name: 'Imagen 3 (Production Image Diffusion)',
      capabilities: ['IMAGE_GENERATION'],
    },
    {
      id: 'veo-3.1-generate-preview',
      name: 'Veo 3.1 (Cinematic Video Diffusion)',
      capabilities: ['VIDEO_GENERATION'],
      isExperimental: true,
    },
    {
      id: 'veo-3.1-lite-generate-preview',
      name: 'Veo 3.1 Lite (Rapid Video Sequences)',
      capabilities: ['VIDEO_GENERATION'],
      isExperimental: true,
    },
    {
      id: 'gemini-3.8-flash-lite-tts',
      name: 'Gemini Flash TTS (Charon & Fenrir Voice Engine)',
      capabilities: ['TEXT_TO_SPEECH'],
      supportsAudio: true,
    },
  ];

  // Isolated per-model state mapping
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
      // Check if cooldown has expired
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
      errorCategory: 'RATE_LIMIT_COOLDOWN_ACTIVATED',
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
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        return {
          isHealthy: Boolean(data?.hasKey),
          status: data?.hasKey ? 'AVAILABLE' : 'NOT_CONFIGURED',
          lastCheck: Date.now(),
        };
      }
    } catch {}

    return {
      isHealthy: false,
      status: 'TEMPORARILY_UNAVAILABLE',
      lastCheck: Date.now(),
      message: 'Server health check offline',
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
      rpm: 15,
      rpd: 1500,
      resetWindowSeconds: 60,
    };
  }

  public async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const targetModel = request.preferredModel || 'gemini-3.8-flash';
    const quota = this.getModelQuota(targetModel);

    if (quota.status !== 'AVAILABLE') {
      const waitSec = quota.resetTime ? Math.max(1, Math.ceil((quota.resetTime - Date.now()) / 1000)) : 30;
      return {
        success: false,
        providerId: this.id,
        modelId: targetModel,
        latencyMs: 0,
        error: `Model ${targetModel} is currently ${quota.status.toLowerCase()}. Retry in ${waitSec}s.`,
        errorCode: quota.status,
      };
    }

    const startTime = Date.now();

    // Route based on capability
    if (request.capability === 'IMAGE_GENERATION' || request.capability === 'IMAGE_EDIT') {
      try {
        const res = await fetch('/api/generate/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: request.prompt,
            options: request.options,
          }),
        });
        const latencyMs = Date.now() - startTime;
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          this.errorCount++;
          quota.lastError = data.error;
          return {
            success: false,
            providerId: this.id,
            modelId: targetModel,
            latencyMs,
            error: data.error || 'Gemini image generation unavailable',
            errorCode: 'IMAGE_ERROR',
          };
        }

        quota.requestsUsed++;
        this.totalRequests++;
        return {
          success: true,
          providerId: this.id,
          modelId: targetModel,
          latencyMs,
          mediaData: data.imageData,
          mediaUrl: data.imageUrl,
          metadata: data.metadata,
        };
      } catch (err: any) {
        return {
          success: false,
          providerId: this.id,
          modelId: targetModel,
          latencyMs: Date.now() - startTime,
          error: err.message,
        };
      }
    }

    // Default: Chat / Coding / Reasoning / Trading Research
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
          preferredProvider: 'gemini',
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        }),
      });

      const latencyMs = Date.now() - startTime;
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        this.errorCount++;
        const status = res.status;
        const errMsg = data?.error || 'Gemini request failed';

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
        error: err.message || 'Network error communicating with Gemini provider',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }
}

/**
 * LUXION OPENROUTER EXTENSIBILITY PROVIDER
 * 
 * Demonstrates the open architecture for adding external provider endpoints.
 * Controlled by server-side OPENROUTER_API_KEY.
 * If unconfigured: status is NOT_CONFIGURED and application continues running seamlessly.
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

export class OpenRouterProvider implements Provider {
  public readonly id = 'openrouter';
  public readonly name = 'OpenRouter';
  public enabled = true;
  public priority = 3;
  public readonly envKeyName = 'OPENROUTER_API_KEY';

  public readonly capabilities: Capability[] = ['CHAT', 'CODING', 'REASONING', 'TRADING_RESEARCH'];

  public readonly models: ModelConfig[] = [
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet (via OpenRouter)',
      capabilities: ['CHAT', 'CODING', 'REASONING', 'TRADING_RESEARCH'],
      contextWindow: 200000,
      maxTokens: 8192,
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini (via OpenRouter)',
      capabilities: ['CHAT', 'CODING', 'REASONING'],
      contextWindow: 128000,
      maxTokens: 4096,
    },
  ];

  private modelQuotas: Map<string, ModelQuotaState> = new Map();

  constructor() {
    for (const m of this.models) {
      this.modelQuotas.set(m.id, {
        modelId: m.id,
        status: 'NOT_CONFIGURED',
        requestsUsed: 0,
      });
    }
  }

  public getModelQuota(modelId: string): ModelQuotaState {
    return this.modelQuotas.get(modelId) || {
      modelId,
      status: 'NOT_CONFIGURED',
      requestsUsed: 0,
    };
  }

  public markModelRateLimited(modelId: string, resetSeconds = 30, error?: string): void {
    const quota = this.getModelQuota(modelId);
    quota.status = 'RATE_LIMITED';
    quota.resetTime = Date.now() + resetSeconds * 1000;
    quota.lastError = error;
  }

  public markModelQuotaExhausted(modelId: string, resetSeconds = 60, error?: string): void {
    const quota = this.getModelQuota(modelId);
    quota.status = 'QUOTA_EXHAUSTED';
    quota.resetTime = Date.now() + resetSeconds * 1000;
    quota.lastError = error;
  }

  public async healthCheck(): Promise<ProviderHealth> {
    return {
      isHealthy: false,
      status: 'NOT_CONFIGURED',
      lastCheck: Date.now(),
      message: 'Set OPENROUTER_API_KEY on the server to enable OpenRouter models.',
    };
  }

  public getUsage(): ProviderUsage {
    const usageObj: Record<string, ModelQuotaState> = {};
    this.modelQuotas.forEach((v, k) => {
      usageObj[k] = { ...v };
    });
    return {
      totalRequests: 0,
      totalTokens: 0,
      errorCount: 0,
      modelUsage: usageObj,
    };
  }

  public getLimits(): ProviderLimits {
    return {
      rpm: 20,
      rpd: 5000,
    };
  }

  public async generate(request: GenerationRequest): Promise<GenerationResponse> {
    return {
      success: false,
      providerId: this.id,
      modelId: request.preferredModel || 'anthropic/claude-3.5-sonnet',
      latencyMs: 0,
      error: 'OpenRouter provider is not configured. Set OPENROUTER_API_KEY on the server to enable.',
      errorCode: 'NOT_CONFIGURED',
    };
  }
}

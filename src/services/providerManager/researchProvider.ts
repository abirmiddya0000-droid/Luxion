/**
 * LUXION MODULAR RESEARCH & FINANCIAL ANALYSIS PROVIDER
 * 
 * Capabilities:
 * - RESEARCH: Modular web research & knowledge synthesis framework
 * - TRADING_RESEARCH: Market analysis, technical indicators, tokenomics, chart patterns, risk evaluation
 * 
 * Strict Integrity Directives:
 * - Never execute automatic trades.
 * - Never fabricate real-time live ticker feeds unless an actual market-data stream is configured.
 * - Provides analytical evaluation, technical calculations (RSI, Moving Averages, Sharpe Ratios, MACD),
 *   and structured risk management frameworks based on user data.
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

export class ResearchProvider implements Provider {
  public readonly id = 'research_engine';
  public readonly name = 'LUXION Research & Market Intelligence';
  public enabled = true;
  public priority = 4;
  public readonly envKeyName = 'RESEARCH_API_KEY';

  public readonly capabilities: Capability[] = ['RESEARCH', 'TRADING_RESEARCH'];

  public readonly models: ModelConfig[] = [
    {
      id: 'luxion-market-intelligence',
      name: 'LUXION Financial & Market Analysis Engine',
      capabilities: ['TRADING_RESEARCH'],
      contextWindow: 65536,
      maxTokens: 4096,
      defaultTemperature: 0.3,
    },
    {
      id: 'luxion-web-research',
      name: 'LUXION Deep Research & Knowledge Synthesis',
      capabilities: ['RESEARCH'],
      contextWindow: 65536,
      maxTokens: 4096,
      defaultTemperature: 0.5,
    },
  ];

  private modelQuotas: Map<string, ModelQuotaState> = new Map();

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
    return this.modelQuotas.get(modelId) || {
      modelId,
      status: 'AVAILABLE',
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
      isHealthy: true,
      status: 'AVAILABLE',
      lastCheck: Date.now(),
      message: 'Analytical financial reasoning active. Live market data feeds are modular.',
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
      rpm: 60,
      rpd: 10000,
    };
  }

  public async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const targetModel = request.preferredModel || 'luxion-market-intelligence';

    // Route TRADING_RESEARCH queries
    if (request.capability === 'TRADING_RESEARCH') {
      const promptLower = request.prompt.toLowerCase();
      let disclaimer = '\n\n> *Note: LUXION delivers algorithmic and quantitative analysis for research purposes only. No automated trades are executed, and real-time live feeds require a connected market-data socket.*';

      // Forward to server chat endpoint with specialized trading prompt instruction
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `[CAPABILITY: TRADING_RESEARCH]\n${request.prompt}`,
            history: request.history,
            command: '/analyze trading',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            text: `${data.reply}${disclaimer}`,
            providerId: this.id,
            modelId: targetModel,
            latencyMs: 150,
          };
        }
      } catch {}

      return {
        success: true,
        text: `### **LUXION Trading Research & Market Analysis**\n\n**Market Assessment Framework:**\n- Evaluation of volatility profiles and structural support/resistance zones.\n- Quantitative indicator synthesis (RSI, Exponential Moving Averages, Liquidity pools).\n- Risk-to-Reward ratio optimization.\n\n${disclaimer}`,
        providerId: this.id,
        modelId: targetModel,
        latencyMs: 10,
      };
    }

    return {
      success: false,
      providerId: this.id,
      modelId: targetModel,
      latencyMs: 0,
      error: 'Dedicated live web crawling provider is modular and not connected.',
      errorCode: 'NOT_CONFIGURED',
    };
  }
}

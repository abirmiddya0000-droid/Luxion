/**
 * CENTRALIZED LUXION PROVIDER MANAGER
 * 
 * Orchestrates:
 * 1. Multi-Provider Capability Pools (Chat, Coding, Reasoning, Image, Video, TTS, Research, Trading Research)
 * 2. Independent Per-Model Quota Isolation (Model A failure does NOT block Model B or Provider C)
 * 3. Bounded Retries & Tier-Aware Fallbacks (Free: 3, Paid: 7, Owner: 10)
 * 4. Extensible Provider Architecture (Add Provider 6, 7, 8 or Native Models without rewriting app)
 * 5. Safe Logging without exposing credentials
 */

import {
  Capability,
  Provider,
  ProviderStatus,
  ModelConfig,
  GenerationRequest,
  GenerationResponse,
  SafeLogEntry,
} from './types.ts';
import { GeminiProvider } from './geminiProvider.ts';
import { GroqProvider } from './groqProvider.ts';
import { OpenRouterProvider } from './openRouterProvider.ts';
import { ResearchProvider } from './researchProvider.ts';
import { userUsageManager } from './userUsageManager.ts';
import { safeLogger } from './safeLogger.ts';

export class ProviderManager {
  private static instance: ProviderManager;
  private providers: Map<string, Provider> = new Map();

  private constructor() {
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new GroqProvider());
    this.registerProvider(new OpenRouterProvider());
    this.registerProvider(new ResearchProvider());
  }

  public static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  public registerProvider(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): Provider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Retrieves all enabled providers that support a specific capability.
   */
  public getProvidersForCapability(capability: Capability): Provider[] {
    return this.getAllProviders().filter(
      (p) => p.enabled && p.capabilities.includes(capability)
    );
  }

  /**
   * Returns models supporting the capability along with their independent quota status.
   */
  public getModelsForCapability(capability: Capability): Array<{
    providerId: string;
    providerName: string;
    model: ModelConfig;
    status: ProviderStatus;
    resetTime?: number;
  }> {
    const list: Array<{
      providerId: string;
      providerName: string;
      model: ModelConfig;
      status: ProviderStatus;
      resetTime?: number;
    }> = [];

    for (const provider of this.getProvidersForCapability(capability)) {
      for (const model of provider.models) {
        if (model.capabilities.includes(capability)) {
          const quota = provider.getModelQuota(model.id);
          list.push({
            providerId: provider.id,
            providerName: provider.name,
            model,
            status: quota.status,
            resetTime: quota.resetTime,
          });
        }
      }
    }

    return list;
  }

  /**
   * Executes a request through the Capability-Specific Provider Pool with bounded fallback.
   */
  public async execute(request: GenerationRequest): Promise<GenerationResponse> {
    const startTime = Date.now();
    const capability = request.capability;
    const policy = userUsageManager.getPolicy(request.userRole);
    const maxAttempts = policy.maxFallbacks;

    // Retrieve compatible candidate models across all providers in this capability pool
    const candidates = this.getModelsForCapability(capability);

    if (candidates.length === 0) {
      return {
        success: false,
        providerId: 'none',
        modelId: 'none',
        latencyMs: 0,
        error: `No configured provider supports the requested capability: ${capability}.`,
        errorCode: 'NO_CAPABILITY_PROVIDER',
      };
    }

    // Reorder candidates if user requested a specific provider or model
    if (request.preferredProvider) {
      candidates.sort((a, b) => {
        if (a.providerId === request.preferredProvider) return -1;
        if (b.providerId === request.preferredProvider) return 1;
        return 0;
      });
    }

    if (request.preferredModel) {
      candidates.sort((a, b) => {
        if (a.model.id === request.preferredModel) return -1;
        if (b.model.id === request.preferredModel) return 1;
        return 0;
      });
    }

    let attemptsCount = 0;
    let lastError: string | undefined;
    let swappedFrom: { providerId: string; modelId: string; reason: string } | undefined;

    for (const candidate of candidates) {
      if (attemptsCount >= maxAttempts) {
        break;
      }

      const provider = this.getProvider(candidate.providerId);
      if (!provider) continue;

      // Independent Model Check: Skip if currently cooling down from a rate-limit
      const quota = provider.getModelQuota(candidate.model.id);
      if (quota.status === 'RATE_LIMITED' || quota.status === 'QUOTA_EXHAUSTED') {
        if (quota.resetTime && Date.now() < quota.resetTime) {
          continue; // Try next compatible model; do not punish sibling models!
        }
      }

      attemptsCount++;

      try {
        const response = await provider.generate({
          ...request,
          preferredModel: candidate.model.id,
        });

        if (response.success) {
          if (swappedFrom) {
            response.swappedFrom = swappedFrom;
          }
          return response;
        }

        // Record reason for failure
        lastError = response.error;
        if (!swappedFrom) {
          swappedFrom = {
            providerId: candidate.providerId,
            modelId: candidate.model.id,
            reason: response.error || 'Provider temporary error',
          };
        }
      } catch (err: any) {
        lastError = err?.message || 'Provider execution exception';
        if (!swappedFrom) {
          swappedFrom = {
            providerId: candidate.providerId,
            modelId: candidate.model.id,
            reason: lastError || 'Provider execution exception',
          };
        }
      }
    }

    // All compatible providers/models in the pool were exhausted
    return {
      success: false,
      providerId: candidates[0]?.providerId || 'none',
      modelId: candidates[0]?.model.id || 'none',
      latencyMs: Date.now() - startTime,
      error: 'AI service is temporarily unavailable. Please try again later.',
      errorCode: 'ALL_PROVIDERS_UNAVAILABLE',
    };
  }

  /**
   * Diagnostic summary for Settings Modal / Owner inspection.
   */
  public async getDiagnostics(isOwner: boolean): Promise<{
    providers: Array<{
      id: string;
      name: string;
      enabled: boolean;
      priority: number;
      capabilities: Capability[];
      health: { isHealthy: boolean; status: ProviderStatus };
      models: Array<{
        id: string;
        name: string;
        status: ProviderStatus;
        requestsUsed: number;
        resetTime?: number;
      }>;
    }>;
    recentLogs?: SafeLogEntry[];
  }> {
    const providerSummaries = [];

    for (const p of this.getAllProviders()) {
      const health = await p.healthCheck();
      const usage = p.getUsage();
      const models = p.models.map((m) => {
        const q = usage.modelUsage[m.id] || p.getModelQuota(m.id);
        return {
          id: m.id,
          name: m.name,
          status: q.status,
          requestsUsed: q.requestsUsed,
          resetTime: q.resetTime,
        };
      });

      providerSummaries.push({
        id: p.id,
        name: p.name,
        enabled: p.enabled,
        priority: p.priority,
        capabilities: p.capabilities,
        health: {
          isHealthy: health.isHealthy,
          status: health.status,
        },
        models,
      });
    }

    return {
      providers: providerSummaries,
      recentLogs: isOwner ? safeLogger.getRecentLogs() : undefined,
    };
  }
}

export const providerManager = ProviderManager.getInstance();

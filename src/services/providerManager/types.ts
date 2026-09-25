/**
 * LUXION CENTRALIZED PROVIDER MANAGER TYPES & CONTRACTS
 * 
 * Provides production-ready, extensible architectural contracts for:
 * - Multi-provider capability pools (Chat, Coding, Reasoning, Image, Video, TTS, Research, Trading Research)
 * - Independent per-model quota tracking (failure of Model A does NOT affect Model B or Provider C)
 * - Bounded retries and fallback hierarchies
 * - Product-level user tier limits (Free: 3 fallbacks, Paid: 7 fallbacks, Owner: full diagnostics)
 * - Secure role system (USER, PAID_USER, OWNER, ADMIN)
 * - Safe logging without secrets
 */

export type Capability =
  | 'CHAT'
  | 'CODING'
  | 'REASONING'
  | 'IMAGE_GENERATION'
  | 'IMAGE_EDIT'
  | 'VIDEO_GENERATION'
  | 'TEXT_TO_SPEECH'
  | 'RESEARCH'
  | 'TRADING_RESEARCH';

export type ProviderStatus =
  | 'AVAILABLE'
  | 'NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'PROVIDER_ERROR'
  | 'DISABLED';

export type UserRole = 'USER' | 'PAID_USER' | 'OWNER' | 'ADMIN';

export interface ModelQuotaState {
  modelId: string;
  status: ProviderStatus;
  requestsUsed: number;
  requestsRemaining?: number;
  tokensUsed?: number;
  tokensRemaining?: number;
  dailyQuota?: number;
  minuteQuota?: number;
  resetTime?: number; // epoch ms when the model is eligible again
  lastError?: string;
  lastUsed?: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  capabilities: Capability[];
  contextWindow?: number;
  maxTokens?: number;
  supportsImages?: boolean;
  supportsAudio?: boolean;
  isExperimental?: boolean;
  defaultTemperature?: number;
}

export interface ProviderHealth {
  isHealthy: boolean;
  status: ProviderStatus;
  lastCheck: number;
  latencyMs?: number;
  message?: string;
}

export interface ProviderUsage {
  totalRequests: number;
  totalTokens: number;
  errorCount: number;
  modelUsage: Record<string, ModelQuotaState>;
}

export interface ProviderLimits {
  rpm?: number;
  tpm?: number;
  rpd?: number;
  resetWindowSeconds?: number;
}

export interface GenerationRequest {
  capability: Capability;
  prompt: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  command?: string;
  attachment?: {
    type: 'image' | 'file';
    name?: string;
    dataUrl?: string;
    content?: string;
  } | null;
  preferredModel?: string;
  preferredProvider?: string;
  temperature?: number;
  maxTokens?: number;
  options?: Record<string, any>;
  userRole?: UserRole;
  userAuthToken?: string;
}

export interface GenerationResponse {
  success: boolean;
  text?: string;
  mediaUrl?: string;
  mediaData?: string;
  providerId: string;
  modelId: string;
  latencyMs: number;
  error?: string;
  errorCode?: string;
  swappedFrom?: {
    providerId: string;
    modelId: string;
    reason: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Common Provider Interface
 */
export interface Provider {
  readonly id: string;
  readonly name: string;
  enabled: boolean;
  priority: number;
  envKeyName: string;
  capabilities: Capability[];
  models: ModelConfig[];

  healthCheck(): Promise<ProviderHealth>;
  getUsage(): ProviderUsage;
  getLimits(): ProviderLimits;
  getModelQuota(modelId: string): ModelQuotaState;
  markModelRateLimited(modelId: string, resetSeconds?: number, error?: string): void;
  markModelQuotaExhausted(modelId: string, resetSeconds?: number, error?: string): void;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}

export interface SafeLogEntry {
  timestamp: number;
  providerId: string;
  modelId: string;
  capability: Capability;
  success: boolean;
  latencyMs: number;
  errorCategory?: string;
  quotaState?: ProviderStatus;
}

/**
 * LUXION VIDEO GENERATION SERVICE
 * 
 * Manages video generation workflows, cinematic prompt routing, and status.
 * Follows strict integrity rules:
 * - NEVER fakes video generation.
 * - Credentials (e.g. VIDEO_API_KEY) are kept strictly server-side.
 * - If provider is not configured on the server, clearly reports:
 *   "Video generation provider is not configured yet."
 */

export interface VideoGenerationOptions {
  referenceImage?: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  fps?: number;
}

export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  videoData?: string;
  provider: string;
  error?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  prompt?: string;
}

export interface VideoGenerationProvider {
  readonly name: string;
  generateVideo(prompt: string, options?: VideoGenerationOptions): Promise<VideoGenerationResult>;
  isConfigured(): Promise<boolean>;
}

export class ServerVideoGenerationProvider implements VideoGenerationProvider {
  public readonly name = 'Server Video Engine';

  public async isConfigured(): Promise<boolean> {
    try {
      const res = await fetch('/api/providers/status');
      if (res.ok) {
        const data = await res.json();
        return Boolean(data?.providers?.video?.isConfigured);
      }
    } catch {
      // offline
    }
    return false;
  }

  public async generateVideo(prompt: string, options?: VideoGenerationOptions): Promise<VideoGenerationResult> {
    const cleanPrompt = (prompt || '').trim();
    if (!cleanPrompt) {
      return {
        success: false,
        provider: this.name,
        error: 'Please provide a descriptive prompt for video generation.',
      };
    }

    try {
      const res = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          options,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return {
          success: false,
          provider: data.provider || this.name,
          error: data.error || 'Video generation provider is not configured yet. Set VIDEO_API_KEY on the server to enable.',
          prompt: cleanPrompt,
          status: 'failed',
        };
      }

      return {
        success: true,
        videoUrl: data.videoUrl,
        videoData: data.videoData,
        provider: data.provider || this.name,
        metadata: data.metadata,
        prompt: cleanPrompt,
        status: data.status || 'completed',
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err.message || 'Video generation network error.',
        prompt: cleanPrompt,
        status: 'failed',
      };
    }
  }
}

export const videoGenerationService = new ServerVideoGenerationProvider();

/**
 * LUXION IMAGE GENERATION SERVICE
 * 
 * Manages image generation, editing, and prompt synthesis.
 * Follows strict integrity rules:
 * - NEVER fakes image generation.
 * - Real API keys (e.g. IMAGE_API_KEY) are kept strictly server-side.
 * - When no image generation provider is configured on the server, clearly reports:
 *   "Image generation provider is not configured yet."
 */

export interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  style?: string;
  referenceImage?: string;
  negativePrompt?: string;
  mode?: 'generate' | 'edit';
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageData?: string;
  provider: string;
  error?: string;
  metadata?: Record<string, any>;
  prompt?: string;
}

export interface ImageGenerationProvider {
  readonly name: string;
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
  isConfigured(): Promise<boolean>;
}

export class ServerImageGenerationProvider implements ImageGenerationProvider {
  public readonly name = 'Server Image Engine';

  public async isConfigured(): Promise<boolean> {
    try {
      const res = await fetch('/api/providers/status');
      if (res.ok) {
        const data = await res.json();
        return Boolean(data?.providers?.image?.isConfigured);
      }
    } catch {
      // offline
    }
    return false;
  }

  public async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const cleanPrompt = (prompt || '').trim();
    if (!cleanPrompt) {
      return {
        success: false,
        provider: this.name,
        error: 'Please provide a descriptive prompt for image generation.',
      };
    }

    try {
      const res = await fetch('/api/generate/image', {
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
          error: data.error || 'Image generation provider is not configured yet. Set IMAGE_API_KEY on the server to enable.',
          prompt: cleanPrompt,
        };
      }

      return {
        success: true,
        imageUrl: data.imageUrl,
        imageData: data.imageData,
        provider: data.provider || this.name,
        metadata: data.metadata,
        prompt: cleanPrompt,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err.message || 'Image generation network error.',
        prompt: cleanPrompt,
      };
    }
  }
}

export const imageGenerationService = new ServerImageGenerationProvider();

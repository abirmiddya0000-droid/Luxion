/**
 * Cybernetic Audio Engine using Web Audio API
 * Generates real-time synthetic typing sounds, cyber blips, and UI feedback
 * without any external audio asset dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.2;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Plays a crisp, subtle mechanical cyber-tick during typewriter streaming
   */
  public playTypewriterTick(variation: number = 0) {
    if (this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Cyber click frequencies: short burst around 1400Hz - 2200Hz
      const baseFreq = 1600 + (variation % 5) * 80 + Math.random() * 60;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, ctx.currentTime + 0.022);

      const targetGain = this.volume * 0.12;
      gain.gain.setValueAtTime(targetGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.022);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.025);
    } catch {
      // AudioContext might be blocked until user interaction
    }
  }

  /**
   * Cyber beep when generation completes or message is sent
   */
  public playCyberBlip(type: 'send' | 'receive' | 'reaction' = 'receive') {
    if (this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      if (type === 'send') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      } else if (type === 'reaction') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.09);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(840, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.07);
      }

      const targetGain = this.volume * 0.18;
      gain.gain.setValueAtTime(targetGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(now + 0.09);
    } catch {
      // Fallback
    }
  }
}

export const CyberSound = new SoundEngine();

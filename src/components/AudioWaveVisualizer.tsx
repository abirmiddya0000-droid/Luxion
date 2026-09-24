import React, { useEffect, useRef } from 'react';
import { Square, Volume2 } from 'lucide-react';

interface AudioWaveVisualizerProps {
  isSpeaking: boolean;
  onStop: () => void;
  voiceName?: string;
}

export const AudioWaveVisualizer: React.FC<AudioWaveVisualizerProps> = ({
  isSpeaking,
  onStop,
  voiceName = 'Speech Synthesizer',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSpeaking) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const barCount = 28;

    const render = () => {
      phase += 0.08;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barWidth = Math.floor(width / barCount) - 2;
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        // Multi-frequency synthetic wave simulation for dynamic audio voice visualization
        const norm = i / barCount;
        const s1 = Math.sin(norm * Math.PI * 4 + phase);
        const s2 = Math.cos(norm * Math.PI * 2 - phase * 1.3);
        const s3 = Math.sin(norm * 12 + phase * 2);
        
        // Bell-shaped envelope for natural voice spectrum centering
        const envelope = Math.sin(norm * Math.PI);
        const magnitude = Math.abs(s1 * 0.45 + s2 * 0.35 + s3 * 0.2) * envelope;
        
        const barHeight = Math.max(3, magnitude * (height * 0.85));
        const x = i * (barWidth + 2) + 2;
        const y = centerY - barHeight / 2;

        // Strict Black & White: White bars with subtle intensity variation
        const alpha = 0.55 + magnitude * 0.45;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpeaking]);

  if (!isSpeaking) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full bg-black border border-neutral-800 text-white shadow-2xl backdrop-blur-md select-none animate-fade-in"
    >
      <div className="flex items-center gap-2">
        <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
        <span className="text-[11px] font-mono tracking-wider uppercase text-neutral-300">
          Audio Wave Active
        </span>
      </div>

      {/* Monochrome Audio Wave Canvas */}
      <div className="w-28 h-6 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={112}
          height={24}
          className="w-full h-full block"
        />
      </div>

      <button
        type="button"
        onClick={onStop}
        className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] font-mono uppercase tracking-wider text-neutral-200 hover:text-white transition-colors"
        title="Stop speaking"
      >
        <Square className="w-2.5 h-2.5 fill-current" />
        <span>Stop</span>
      </button>
    </div>
  );
};

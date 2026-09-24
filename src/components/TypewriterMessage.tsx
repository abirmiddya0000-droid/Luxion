import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FastForward, Sparkles } from 'lucide-react';
import { CyberSound } from '../services/sound';

interface TypewriterMessageProps {
  content: string;
  isNew: boolean;
  shouldReduceMotion?: boolean;
  renderContent: (text: string) => React.ReactNode;
  onCharacterTyped?: () => void;
  onComplete?: () => void;
  forceComplete?: boolean;
  speed?: 'fast' | 'normal' | 'cinematic';
  soundEnabled?: boolean;
}

/**
 * Balances unclosed code fences so ReactMarkdown doesn't break
 * while typing in the middle of a code block.
 */
function balanceMarkdown(text: string): string {
  const codeBlocks = (text.match(/```/g) || []).length;
  if (codeBlocks % 2 !== 0) {
    return text + '\n```';
  }
  return text;
}

/**
 * Looks ahead to the next word boundary so typing feels like natural
 * organic token streaming rather than broken mid-word letters.
 */
function getNextChunkLength(text: string, currentIndex: number, targetStepSize: number): number {
  const remaining = text.length - currentIndex;
  if (remaining <= targetStepSize) return remaining;

  const slice = text.slice(currentIndex, currentIndex + targetStepSize + 8);
  const spaceIndex = slice.lastIndexOf(' ');
  const newlineIndex = slice.lastIndexOf('\n');
  const boundary = Math.max(spaceIndex, newlineIndex);

  if (boundary >= Math.floor(targetStepSize * 0.75)) {
    return boundary + 1;
  }
  return Math.min(targetStepSize, remaining);
}

export const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  content,
  isNew,
  shouldReduceMotion = false,
  renderContent,
  onCharacterTyped,
  onComplete,
  forceComplete = false,
  speed = 'normal',
  soundEnabled = true,
}) => {
  // If not new or reduced motion is preferred, render completely from start
  const shouldAnimate = isNew && !shouldReduceMotion && content.length > 20;

  const [displayedLength, setDisplayedLength] = useState<number>(() =>
    shouldAnimate ? 0 : content.length
  );
  const [isTyping, setIsTyping] = useState<boolean>(() => shouldAnimate);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef<boolean>(!shouldAnimate);

  const handleFinishImmediately = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setDisplayedLength(content.length);
    setIsTyping(false);
    if (!completedRef.current) {
      completedRef.current = true;
      if (soundEnabled) {
        CyberSound.playCyberBlip('receive');
      }
      onComplete?.();
    }
  }, [content.length, onComplete, soundEnabled]);

  // If forceComplete changes to true, immediately finish
  useEffect(() => {
    if (forceComplete && isTyping) {
      handleFinishImmediately();
    }
  }, [forceComplete, isTyping, handleFinishImmediately]);

  useEffect(() => {
    if (!shouldAnimate || completedRef.current) {
      setDisplayedLength(content.length);
      setIsTyping(false);
      return;
    }

    const totalLen = content.length;
    
    // Speed profile multipliers
    let speedFactor = 1.0;
    if (speed === 'fast') speedFactor = 0.55;
    if (speed === 'cinematic') speedFactor = 1.6;

    const targetDurationMs = Math.min(2400 * speedFactor, Math.max(700 * speedFactor, totalLen * 1.3 * speedFactor));
    const baseIntervalMs = speed === 'fast' ? 16 : 22;
    const totalSteps = Math.max(12, Math.floor(targetDurationMs / baseIntervalMs));
    const targetStepSize = Math.max(2, Math.ceil(totalLen / totalSteps));

    let currentIdx = 0;
    let tickCount = 0;

    const tick = () => {
      if (currentIdx >= totalLen) {
        setDisplayedLength(totalLen);
        setIsTyping(false);
        completedRef.current = true;
        if (soundEnabled) {
          CyberSound.playCyberBlip('receive');
        }
        onComplete?.();
        return;
      }

      const chunkLen = getNextChunkLength(content, currentIdx, targetStepSize);
      currentIdx = Math.min(totalLen, currentIdx + chunkLen);
      setDisplayedLength(currentIdx);
      tickCount++;

      // Play soft mechanical sound every 1-2 chunks
      if (soundEnabled && tickCount % 2 === 0) {
        CyberSound.playTypewriterTick(tickCount);
      }

      onCharacterTyped?.();

      if (currentIdx >= totalLen) {
        setIsTyping(false);
        completedRef.current = true;
        if (soundEnabled) {
          CyberSound.playCyberBlip('receive');
        }
        onComplete?.();
        return;
      }

      // Check if ending character is punctuation for human/cyber cadence
      const lastChar = content[currentIdx - 1];
      let delay = baseIntervalMs;
      if (lastChar === '.' || lastChar === '!' || lastChar === '?' || lastChar === '\n') {
        delay += speed === 'fast' ? 20 : 35;
      }

      timeoutRef.current = setTimeout(tick, delay);
    };

    // Begin first tick
    timeoutRef.current = setTimeout(tick, 30);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, shouldAnimate, onCharacterTyped, onComplete, speed, soundEnabled]);

  // When not animating, render content directly
  if (!isTyping && displayedLength >= content.length) {
    return <div className="space-y-2">{renderContent(content)}</div>;
  }

  const rawSlice = content.slice(0, displayedLength);
  const balancedSlice = balanceMarkdown(rawSlice);

  return (
    <div className="space-y-2 relative">
      <div>{renderContent(balancedSlice)}</div>

      {isTyping && (
        <div className="pt-2 flex items-center justify-between text-xs text-neutral-400 select-none animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="text-[11px] font-mono text-cyan-300/80">
              Generating response...
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinishImmediately}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition-colors shadow-sm"
            title="Skip typing animation"
          >
            <span>Skip</span>
            <FastForward className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

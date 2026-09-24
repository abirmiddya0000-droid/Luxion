import React, { useEffect, useRef } from 'react';
import {
  X,
  Plus,
  History,
  Volume2,
  VolumeX,
  Sliders,
  Palette,
  Trash2,
  Info,
  Check,
  Headphones,
} from 'lucide-react';

interface OptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onToggleReadAloud: () => void;
  isSpeaking: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onOpenVoiceSettings: () => void;
  onOpenAppearance: () => void;
  onClearCurrentChat: () => void;
  onOpenAbout: () => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  isOpen,
  onClose,
  onNewChat,
  onOpenHistory,
  onToggleReadAloud,
  isSpeaking,
  autoSpeak,
  onToggleAutoSpeak,
  onOpenVoiceSettings,
  onOpenAppearance,
  onClearCurrentChat,
  onOpenAbout,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Use mousedown with timeout to avoid catching the opening click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="options-menu-overlay"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-start sm:items-start p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in sm:pt-16 sm:pl-12"
      aria-modal="true"
      role="dialog"
      aria-label="LUXION Options Menu"
    >
      <div
        ref={panelRef}
        id="options-menu-sheet"
        className="w-full sm:w-80 rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4 shadow-2xl text-left overflow-hidden max-h-[85vh] sm:max-h-[90vh] flex flex-col animate-slide-up sm:animate-fade-in"
      >
        {/* Mobile Drag Indicator & Header */}
        <div className="flex sm:hidden items-center justify-center pt-1 pb-2">
          <div className="h-1 w-10 rounded-full bg-neutral-700" />
        </div>

        <div className="flex items-center justify-between px-2 pb-2.5 border-b border-neutral-800/80 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-mono">
              LUXION Options
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            title="Close menu"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto space-y-1 py-1 text-xs">
          {/* 1. New Chat */}
          <button
            type="button"
            id="opt-new-chat"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-neutral-200 hover:bg-neutral-900 hover:text-white transition-all text-left group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-cyan-400 group-hover:border-cyan-500/50">
              <Plus className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-neutral-100">New Chat</span>
              <span className="text-[10px] text-neutral-500">Start a fresh conversation</span>
            </div>
          </button>

          {/* 2. Chat History */}
          <button
            type="button"
            id="opt-chat-history"
            onClick={() => {
              onOpenHistory();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-neutral-200 hover:bg-neutral-900 hover:text-white transition-all text-left group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 group-hover:border-neutral-700">
              <History className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-neutral-100">Chat History</span>
              <span className="text-[10px] text-neutral-500">Browse saved sessions</span>
            </div>
          </button>

          <div className="my-1.5 border-t border-neutral-800/60" />

          {/* 3. Read Aloud */}
          <button
            type="button"
            id="opt-read-aloud"
            onClick={() => {
              onToggleReadAloud();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-neutral-200 hover:bg-neutral-900 hover:text-white transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg border text-neutral-300 ${
                isSpeaking
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 animate-pulse'
                  : 'bg-neutral-900 border-neutral-800'
              }`}>
                <Headphones className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-neutral-100">
                  {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {isSpeaking ? 'Currently speaking...' : 'Speak last response'}
                </span>
              </div>
            </div>
            {isSpeaking && (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Playing
              </span>
            )}
          </button>

          {/* 4. Auto Speak */}
          <button
            type="button"
            id="opt-auto-speak"
            onClick={onToggleAutoSpeak}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-neutral-200 hover:bg-neutral-900 hover:text-white transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg border text-neutral-300 ${
                autoSpeak
                  ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300'
                  : 'bg-neutral-900 border-neutral-800'
              }`}>
                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-neutral-100">Auto Speak</span>
                <span className="text-[10px] text-neutral-500">Read responses automatically</span>
              </div>
            </div>
            <div
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                autoSpeak ? 'bg-cyan-500' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  autoSpeak ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          {/* 5. Voice Settings */}
          <button
            type="button"
            id="opt-voice-settings"
            onClick={() => {
              onOpenVoiceSettings();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-neutral-200 hover:bg-neutral-900 hover:text-white transition-all text-left group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 group-hover:border-neutral-700">
              <Sliders className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-neutral-100">Voice Settings</span>
              <span className="text-[10px] text-neutral-500">Pitch, rate &amp; voice model</span>
            </div>
          </button>

          {/* 6. Appearance */}
          <button
            type="button"
            id="opt-appearance"
            onClick={() => {
              onOpenAppearance();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-neutral-200 hover:bg-neutral-900 hover:text-white transition-all text-left group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 group-hover:border-neutral-700">
              <Palette className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-neutral-100">Appearance</span>
              <span className="text-[10px] text-neutral-500">Dark themes &amp; visual accents</span>
            </div>
          </button>

          <div className="my-1.5 border-t border-neutral-800/60" />

          {/* 7. Clear Current Chat */}
          <button
            type="button"
            id="opt-clear-current-chat"
            onClick={() => {
              onClearCurrentChat();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-rose-300 hover:bg-rose-950/30 hover:text-rose-200 transition-all text-left group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-950/50 border border-rose-900/60 text-rose-400 group-hover:border-rose-700">
              <Trash2 className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-rose-300">Clear Current Chat</span>
              <span className="text-[10px] text-rose-400/70">Wipe messages on screen</span>
            </div>
          </button>

          {/* 8. About LUXION */}
          <button
            type="button"
            id="opt-about-luxion"
            onClick={() => {
              onOpenAbout();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-neutral-300 hover:bg-neutral-900 hover:text-white transition-all text-left group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 group-hover:border-neutral-700">
              <Info className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-neutral-200">About LUXION</span>
              <span className="text-[10px] text-neutral-500">Version, provider &amp; creator</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

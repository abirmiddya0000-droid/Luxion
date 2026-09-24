import React, { useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Layers,
  Sliders,
  HelpCircle,
  Info,
  History,
  Volume2,
  Trash2,
} from 'lucide-react';

interface OptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenProjects: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
  onOpenHistory: () => void;
  onToggleReadAloud: () => void;
  isSpeaking: boolean;
  onClearCurrentChat: () => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  isOpen,
  onClose,
  onNewChat,
  onOpenProjects,
  onOpenSettings,
  onOpenHelp,
  onOpenAbout,
  onOpenHistory,
  onToggleReadAloud,
  isSpeaking,
  onClearCurrentChat,
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
      className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-4 bg-black/60 backdrop-blur-sm font-mono animate-fade-in"
      aria-modal="true"
      role="dialog"
      aria-label="LUXION menu"
    >
      <div
        ref={panelRef}
        id="options-menu-sheet"
        className="w-full max-w-xs sm:w-72 rounded-xl border border-neutral-800 bg-black p-3 text-white shadow-2xl overflow-hidden select-none animate-fade-in mt-12 sm:mt-14 mr-1 sm:mr-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-neutral-800 px-1">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400">
            LUXION MENU
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            title="Close menu"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="space-y-1 text-xs">
          {/* 1. New Chat */}
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors text-left"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-white">New Chat</span>
              <span className="text-[10px] text-neutral-500">Reset to clean terminal</span>
            </div>
          </button>

          {/* 2. Projects (Build Workspaces) */}
          <button
            type="button"
            onClick={() => {
              onOpenProjects();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors text-left"
          >
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-white">Projects</span>
              <span className="text-[10px] text-neutral-500">Web, game &amp; app workspaces</span>
            </div>
          </button>

          {/* 3. Settings */}
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors text-left"
          >
            <Sliders className="w-3.5 h-3.5 text-neutral-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-white">Settings</span>
              <span className="text-[10px] text-neutral-500">Voice, typing &amp; preferences</span>
            </div>
          </button>

          {/* 4. Help */}
          <button
            type="button"
            onClick={() => {
              onOpenHelp();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors text-left"
          >
            <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-white">Help</span>
              <span className="text-[10px] text-neutral-500">Slash commands &amp; shortcuts</span>
            </div>
          </button>

          {/* 5. About LUXION */}
          <button
            type="button"
            onClick={() => {
              onOpenAbout();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors text-left"
          >
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-white">About LUXION</span>
              <span className="text-[10px] text-neutral-500">Architecture &amp; origin</span>
            </div>
          </button>

          <div className="my-1.5 border-t border-neutral-800" />

          {/* Chat History */}
          <button
            type="button"
            onClick={() => {
              onOpenHistory();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors text-left"
          >
            <History className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-300">Saved History</span>
          </button>

          {/* Read Aloud / Voice */}
          <button
            type="button"
            onClick={() => {
              onToggleReadAloud();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-white animate-pulse' : 'text-neutral-400'}`} />
              <span>{isSpeaking ? 'Stop Audio' : 'Read Aloud'}</span>
            </div>
            {isSpeaking && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-white font-mono">
                Active
              </span>
            )}
          </button>

          {/* Clear Current Chat */}
          <button
            type="button"
            onClick={() => {
              onClearCurrentChat();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};

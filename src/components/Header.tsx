import React, { useState } from 'react';
import {
  MoreVertical,
  Plus,
  BookOpen,
  Sliders,
} from 'lucide-react';
import { User } from '../types';
import { OptionsMenu } from './OptionsMenu';

interface HeaderProps {
  user: User | null;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenStories: () => void;
  onOpenSettings: (tab?: 'appearance' | 'voice' | 'chat' | 'memory' | 'about') => void;
  onOpenAbout: () => void;
  onOpenAuth: () => void;
  onExportChat: () => void;
  onLogout: () => void;
  // Options menu controls
  isSpeaking?: boolean;
  onToggleReadAloud?: () => void;
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
  onClearCurrentChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onNewChat,
  onOpenHistory,
  onOpenStories,
  onOpenSettings,
  onOpenAbout,
  onOpenAuth,
  onExportChat,
  onLogout,
  isSpeaking = false,
  onToggleReadAloud = () => {},
  autoSpeak = false,
  onToggleAutoSpeak = () => {},
  onClearCurrentChat = () => {},
}) => {
  const [optionsOpen, setOptionsOpen] = useState(false);

  return (
    <>
      <header
        id="luxion-header"
        className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md safe-top"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-6">
          {/* Left: Brand Identity + Options Button */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              onClick={onNewChat}
              title="LUXION AI"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 via-indigo-600 to-neutral-900 border border-cyan-500/40 text-neutral-100 shadow-md shadow-cyan-500/10 group-hover:border-cyan-400/70 transition-all">
                <svg
                  className="h-4 w-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-[0.16em] text-neutral-100 font-sans leading-none">
                  LUXION
                </span>
                <span className="text-[9px] font-mono text-cyan-400/90 leading-tight">
                  X-01 CORE
                </span>
              </div>
            </div>

            {/* The ... Options Button */}
            <button
              id="btn-three-dot-menu"
              type="button"
              onClick={() => setOptionsOpen((prev) => !prev)}
              aria-label="LUXION options menu"
              aria-expanded={optionsOpen}
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all ${
                optionsOpen ? 'bg-neutral-900 text-white border-neutral-700' : ''
              }`}
              title="Options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Stories Button */}
            <button
              type="button"
              id="btn-header-stories"
              onClick={onOpenStories}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-cyan-300 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 transition-all"
              title="Open Chat Stories"
            >
              <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Stories</span>
            </button>

            {/* Settings Button */}
            <button
              type="button"
              id="btn-header-settings"
              onClick={() => onOpenSettings()}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 transition-all"
              title="Settings"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* New Chat Button */}
            <button
              id="btn-header-new-chat"
              type="button"
              onClick={onNewChat}
              className="flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-neutral-100 hover:text-white bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/60 transition-all shadow-sm shadow-cyan-950/20"
              title="Start fresh conversation"
            >
              <Plus className="h-3.5 w-3.5 text-cyan-400" />
              <span>New Chat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Options Menu Bottom Sheet & Modal */}
      <OptionsMenu
        isOpen={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        onNewChat={onNewChat}
        onOpenHistory={onOpenHistory}
        onToggleReadAloud={onToggleReadAloud}
        isSpeaking={isSpeaking}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={onToggleAutoSpeak}
        onOpenVoiceSettings={() => onOpenSettings('voice')}
        onOpenAppearance={() => onOpenSettings('appearance')}
        onClearCurrentChat={onClearCurrentChat}
        onOpenAbout={onOpenAbout}
      />
    </>
  );
};

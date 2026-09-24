import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { OptionsMenu } from './OptionsMenu';

interface HeaderProps {
  hasMessages: boolean;
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

export const Header: React.FC<HeaderProps> = ({
  hasMessages,
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        id="luxion-header"
        className="w-full h-12 flex items-center justify-between px-4 sm:px-6 bg-black border-b border-neutral-900 z-40 select-none"
      >
        {/* Left: When messages exist, show subtle minimal breadcrumb. When home (empty), keep it clean */}
        <div className="flex items-center">
          {hasMessages ? (
            <button
              type="button"
              onClick={onNewChat}
              className="text-xs font-mono font-bold tracking-widest text-neutral-300 hover:text-white transition-colors"
              title="Return to clean home"
            >
              LUXION
            </button>
          ) : (
            <span className="text-xs font-mono font-bold tracking-widest text-neutral-600">
              {/* Clean minimal indicator */}
            </span>
          )}
        </div>

        {/* Right: The SINGLE simple ⋮ three-dot menu */}
        <div className="flex items-center">
          <button
            id="btn-three-dot-menu"
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className={`flex h-8 w-8 items-center justify-center rounded border border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors ${
              menuOpen ? 'bg-neutral-900 text-white border-neutral-800' : ''
            }`}
            title="Menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Options Menu triggered by the three-dot button */}
      <OptionsMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNewChat={onNewChat}
        onOpenProjects={onOpenProjects}
        onOpenSettings={onOpenSettings}
        onOpenHelp={onOpenHelp}
        onOpenAbout={onOpenAbout}
        onOpenHistory={onOpenHistory}
        onToggleReadAloud={onToggleReadAloud}
        isSpeaking={isSpeaking}
        onClearCurrentChat={onClearCurrentChat}
      />
    </>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Plus,
  History,
  Sliders,
  Info,
  User as UserIcon,
  LogOut,
  Download,
} from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User | null;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenAuth: () => void;
  onExportChat: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onNewChat,
  onOpenHistory,
  onOpenSettings,
  onOpenAbout,
  onOpenAuth,
  onExportChat,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header
      id="luxion-header"
      className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 relative" ref={menuRef}>
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={onNewChat}
            title="LUXION"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-700/60 text-neutral-100 shadow-sm">
              <svg
                className="h-4 w-4 text-neutral-100"
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
            <span className="font-semibold text-base tracking-[0.18em] text-neutral-100 font-sans">
              LUXION
            </span>
          </div>

          <button
            id="btn-three-dot-menu"
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="LUXION menu"
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors ${
              menuOpen ? 'bg-neutral-900 text-white' : ''
            }`}
            title="Menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              id="header-dropdown-menu"
              className="absolute left-0 top-full mt-2 w-52 rounded-xl border border-neutral-800 bg-neutral-900/98 p-1.5 shadow-2xl backdrop-blur-xl z-50 text-xs animate-fade-in"
            >
              <button
                type="button"
                id="menu-item-new-chat"
                onClick={() => {
                  setMenuOpen(false);
                  onNewChat();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors text-left"
              >
                <Plus className="h-4 w-4 text-neutral-400" />
                <span>New Chat</span>
              </button>

              <button
                type="button"
                id="menu-item-history"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenHistory();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors text-left"
              >
                <History className="h-4 w-4 text-neutral-400" />
                <span>Chat History</span>
              </button>

              <button
                type="button"
                id="menu-item-settings"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors text-left"
              >
                <Sliders className="h-4 w-4 text-neutral-400" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                id="menu-item-about"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAbout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors text-left"
              >
                <Info className="h-4 w-4 text-neutral-400" />
                <span>About</span>
              </button>

              <button
                type="button"
                id="menu-item-export-chat"
                onClick={() => {
                  setMenuOpen(false);
                  onExportChat();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors text-left"
              >
                <Download className="h-4 w-4 text-neutral-400" />
                <span>Export Conversation</span>
              </button>

              <div className="my-1 border-t border-neutral-800/80" />

              {user ? (
                <button
                  type="button"
                  id="menu-item-logout"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-400 hover:bg-neutral-800 hover:text-rose-400 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out ({user.name})</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="menu-item-login"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors text-left"
                >
                  <UserIcon className="h-4 w-4 text-neutral-400" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-header-new-chat"
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 transition-colors"
            title="Start a new chat"
          >
            <Plus className="h-3.5 w-3.5 text-neutral-400" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>
    </header>
  );
};

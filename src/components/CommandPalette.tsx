import React, { useEffect } from 'react';
import { Terminal } from 'lucide-react';

export interface CommandItem {
  command: string;
  label: string;
  description: string;
  category: 'build' | 'tools' | 'session';
}

export const AVAILABLE_COMMANDS: CommandItem[] = [
  {
    command: '/build web',
    label: 'Build Web Application',
    description: 'Start web project workflow and sandbox',
    category: 'build',
  },
  {
    command: '/build game',
    label: 'Build 2D Game',
    description: 'Start interactive 2D canvas game workflow',
    category: 'build',
  },
  {
    command: '/build app',
    label: 'Build Application',
    description: 'Start responsive app prototype workflow',
    category: 'build',
  },
  {
    command: '/build website',
    label: 'Build Website',
    description: 'Start website scaffold workflow',
    category: 'build',
  },
  {
    command: '/build',
    label: 'Build Workspace',
    description: 'Open the LUXION build target selector',
    category: 'build',
  },
  {
    command: '/code',
    label: 'Code Workspace',
    description: 'Open clean code editing workspace',
    category: 'tools',
  },
  {
    command: '/analyze',
    label: 'Analyze',
    description: 'Run structural code and architecture analysis',
    category: 'tools',
  },
  {
    command: '/design',
    label: 'Design System',
    description: 'Generate UI and UX design specifications',
    category: 'tools',
  },
  {
    command: '/clear',
    label: 'Clear Screen',
    description: 'Reset current session to clean state',
    category: 'session',
  },
  {
    command: '/help',
    label: 'Help & Shortcuts',
    description: 'Display command guide and keybindings',
    category: 'session',
  },
];

interface CommandPaletteProps {
  query: string;
  isOpen: boolean;
  selectedIndex: number;
  onSelect: (command: string) => void;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  query,
  isOpen,
  selectedIndex,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  // Filter commands by query (case-insensitive)
  const normalized = query.trim().toLowerCase();
  const filtered = AVAILABLE_COMMANDS.filter((item) => {
    if (!normalized || normalized === '/') return true;
    const searchTarget = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return (
      item.command.toLowerCase().includes(searchTarget) ||
      item.label.toLowerCase().includes(normalized.replace(/^\//, ''))
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="absolute bottom-full left-0 mb-2 w-full max-w-lg rounded-lg border border-neutral-800 bg-black p-3 text-xs text-neutral-500 font-mono shadow-2xl z-30 select-none">
        No command matches "{query}". Type <span className="text-white">/help</span> for list.
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Slash commands"
      className="absolute bottom-full left-0 mb-2 w-full max-w-lg rounded-lg border border-neutral-800 bg-black text-white font-mono shadow-2xl z-30 overflow-hidden select-none"
    >
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-1.5 text-[10px] text-neutral-500 uppercase tracking-widest bg-neutral-950">
        <span className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3" />
          <span>Commands ({filtered.length})</span>
        </span>
        <span>↑↓ Navigate • Enter Select • Esc Close</span>
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-neutral-900">
        {filtered.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={item.command}
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => {
                e.preventDefault(); // Don't steal textarea focus
                onSelect(item.command);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                isSelected
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="font-bold text-white tracking-wide shrink-0">
                  {item.command}
                </span>
                <span className="text-[11px] text-neutral-400 truncate">
                  — {item.label}
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 shrink-0 hidden sm:inline">
                {item.category}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

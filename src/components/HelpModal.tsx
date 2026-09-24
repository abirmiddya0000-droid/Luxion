import React from 'react';
import { X, Terminal } from 'lucide-react';
import { AVAILABLE_COMMANDS } from './CommandPalette';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (cmd: string) => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onSelectCommand }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none font-mono"
    >
      <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-black text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3 bg-neutral-950">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-white" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">
              LUXION Command System
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Commands List */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-2">
              Available Slash Commands
            </span>
            <div className="divide-y divide-neutral-900 border border-neutral-800 rounded bg-neutral-950">
              {AVAILABLE_COMMANDS.map((item) => (
                <button
                  key={item.command}
                  type="button"
                  onClick={() => {
                    onSelectCommand(item.command);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 text-left hover:bg-neutral-900 transition-colors group"
                >
                  <div>
                    <span className="text-xs font-bold text-white group-hover:underline">
                      {item.command}
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{item.description}</p>
                  </div>
                  <span className="text-[10px] text-neutral-600 uppercase">Execute →</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-2">
              Keyboard Shortcuts
            </span>
            <div className="border border-neutral-800 rounded bg-neutral-950 divide-y divide-neutral-900 text-xs">
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-neutral-400">Open Command Menu</span>
                <kbd className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-[11px] text-white">
                  /
                </kbd>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-neutral-400">Send Message / Execute</span>
                <kbd className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-[11px] text-white">
                  Enter
                </kbd>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-neutral-400">Multiline Break</span>
                <kbd className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-[11px] text-white">
                  Shift + Enter
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

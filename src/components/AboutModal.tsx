import React from 'react';
import { X, Cpu, HardDrive, Volume2, ShieldCheck, UserCheck } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-about-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in font-mono"
      onClick={onClose}
    >
      <div
        id="modal-about-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-xl border border-neutral-800 bg-black p-6 shadow-2xl text-left overflow-hidden text-white"
      >
        {/* Close Button */}
        <button
          id="btn-close-about-modal"
          onClick={onClose}
          className="absolute top-4 right-4 rounded p-1 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
          title="Close dialog"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-[0.2em] text-white">
                LUXION
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-300">
                PROTOTYPE
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Clean, command-based developer interface.</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-neutral-300 leading-relaxed mb-4">
          LUXION is a minimal, monochrome interface designed for fast workflow execution, command-driven project scaffolds, and interactive sandboxes.
        </p>

        {/* Founder & Creator */}
        <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-950 p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-neutral-800 bg-neutral-900 text-white">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
                FOUNDER &amp; ARCHITECT
              </p>
              <p className="text-xs font-semibold text-white">Abir Middya</p>
            </div>
          </div>
          <span className="text-[10px] text-neutral-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
            LUXION Original
          </span>
        </div>

        {/* Architecture Status */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-neutral-400">
              <Cpu className="h-3.5 w-3.5 text-white" />
              Build Engine
            </span>
            <span className="text-neutral-200 text-[11px]">Command Scaffold Engine</span>
          </div>

          <div className="border-t border-neutral-900 pt-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-neutral-400">
              <HardDrive className="h-3.5 w-3.5 text-white" />
              Memory State
            </span>
            <span className="text-neutral-200 text-[11px] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Local Client Persistence
            </span>
          </div>

          <div className="border-t border-neutral-900 pt-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-neutral-400">
              <Volume2 className="h-3.5 w-3.5 text-white" />
              Voice Synthesis
            </span>
            <span className="text-neutral-200 text-[11px]">Web Speech API</span>
          </div>

          <div className="border-t border-neutral-900 pt-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-neutral-400">
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
              Privacy &amp; Telemetry
            </span>
            <span className="text-neutral-200 text-[11px]">Zero Tracking • Client Only</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-[10px] text-neutral-500 pt-2 border-t border-neutral-900">
          <span>LUXION CORE 2026</span>
          <span>Engineered by Abir</span>
        </div>
      </div>
    </div>
  );
};

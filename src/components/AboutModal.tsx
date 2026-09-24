import React from 'react';
import { X, Sparkles, Cpu, HardDrive, Volume2, ShieldCheck, UserCheck } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-about-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="modal-about-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-7 shadow-2xl text-left overflow-hidden"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="btn-close-about-modal"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800/80 hover:text-white transition-colors"
          title="Close dialog"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 via-indigo-600 to-neutral-900 border border-cyan-500/40 text-white shadow-lg shadow-cyan-500/15">
            <svg
              className="h-6 w-6 text-white"
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
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-[0.16em] text-neutral-100 font-sans">
                LUXION
              </h2>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                v3.5.2 Pro
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium">Clean, intelligent AI.</p>
          </div>
        </div>

        {/* Original Description */}
        <p className="text-xs text-neutral-300 leading-relaxed mb-5">
          LUXION is an independent, high-performance AI assistant designed for clarity, deep factual precision, interactive live code generation, and direct conversational intelligence without corporate fluff or external trackers.
        </p>

        {/* Founder & Creator Showcase */}
        <div className="mb-4 rounded-xl border border-neutral-800/90 bg-neutral-900/60 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-800 border border-neutral-700/60 text-cyan-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold">
                Founder &amp; Creator
              </p>
              <p className="text-sm font-semibold text-neutral-100">Abir</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            Original Architect
          </span>
        </div>

        {/* Core Architecture Status Badges */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-neutral-400 font-medium">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              Response Engine
            </span>
            <span className="text-neutral-200 font-mono text-[11px]">LUXION 3.5 Cognitive Core</span>
          </div>

          <div className="border-t border-neutral-800/60 pt-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-neutral-400 font-medium">
              <HardDrive className="h-3.5 w-3.5 text-indigo-400" />
              Memory State
            </span>
            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Context Store
            </span>
          </div>

          <div className="border-t border-neutral-800/60 pt-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-neutral-400 font-medium">
              <Volume2 className="h-3.5 w-3.5 text-purple-400" />
              Voice / TTS System
            </span>
            <span className="text-neutral-200 font-mono text-[11px]">Hardware Web Speech</span>
          </div>

          <div className="border-t border-neutral-800/60 pt-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-neutral-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Privacy &amp; Security
            </span>
            <span className="text-neutral-300 font-mono text-[11px]">Client Encrypted • Zero Telemetry</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-800/80">
          <span>Build 2026.09-REL</span>
          <span>Engineered by Abir</span>
        </div>
      </div>
    </div>
  );
};

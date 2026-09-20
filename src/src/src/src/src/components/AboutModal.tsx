import React from 'react';
import { X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-about-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="modal-about-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-center"
      >
        {/* Close Button */}
        <button
          id="btn-close-about-modal"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Minimal LUXION Emblem */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-100 shadow-md">
          <svg
            className="h-6 w-6 text-neutral-100"
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

        {/* Wordmark */}
        <h2 className="text-xl font-semibold tracking-[0.2em] text-white">LUXION</h2>
        <p className="text-xs text-neutral-400 mt-1">Clean, intelligent AI chat.</p>

        <div className="my-5 border-t border-neutral-800/80" />

        {/* Founder & Creator strictly as requested */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 py-3.5 px-4">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
            Founder &amp; Creator
          </p>
          <p className="text-sm font-semibold text-neutral-100 mt-1">Abir</p>
        </div>
      </div>
    </div>
  );
};

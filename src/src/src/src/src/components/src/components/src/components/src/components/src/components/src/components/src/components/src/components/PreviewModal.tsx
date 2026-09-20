import React, { useState } from 'react';
import { X, RotateCw, Download, ExternalLink, Code } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  title?: string;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  code,
  title = 'Live Preview',
}) => {
  const [iframeKey, setIframeKey] = useState(1);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'luxion-project'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="modal-preview-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="modal-preview-container"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-5xl h-[90vh] rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300">
              <Code className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold tracking-wide text-neutral-200">
              {title}
            </span>
            <span className="rounded bg-neutral-800/80 px-1.5 py-0.5 text-[10px] text-neutral-400 font-mono">
              Sandbox Preview
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Reload preview"
            >
              <RotateCw className="h-3.5 w-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Download HTML file"
            >
              <Download className="h-3.5 w-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Export HTML</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors ml-1"
              title="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sandboxed iframe */}
        <div className="flex-1 w-full h-full bg-white relative">
          <iframe
            key={iframeKey}
            id="live-preview-iframe"
            title="LUXION App Preview"
            srcDoc={code}
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};

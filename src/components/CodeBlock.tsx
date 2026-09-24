import React, { useState } from 'react';
import { Copy, Check, Download, Play } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
  onPreview?: (code: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, onPreview }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = getExtension(language);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luxion-export.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isPreviewable =
    (language === 'html' ||
      language === 'svg' ||
      code.includes('<!DOCTYPE') ||
      code.includes('<html') ||
      code.includes('<body') ||
      code.includes('<canvas') ||
      code.includes('<svg')) &&
    typeof onPreview === 'function';

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 font-mono text-xs shadow-md">
      <div className="flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/90 px-3 py-1.5 text-neutral-400">
        <span className="text-[11px] font-medium tracking-wide lowercase text-neutral-400">
          {language || 'code'}
        </span>

        <div className="flex items-center gap-1">
          {isPreviewable && (
            <button
              type="button"
              onClick={() => onPreview && onPreview(code)}
              className="flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-700 transition-colors"
              title="Preview and interact with this app or game"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Preview</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Download file"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre className="overflow-x-auto p-3.5 text-[12px] leading-relaxed text-neutral-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};

function getExtension(lang: string): string {
  switch (lang.toLowerCase()) {
    case 'html':
      return 'html';
    case 'javascript':
    case 'js':
      return 'js';
    case 'typescript':
    case 'ts':
      return 'ts';
    case 'tsx':
      return 'tsx';
    case 'jsx':
      return 'jsx';
    case 'python':
    case 'py':
      return 'py';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'svg':
      return 'svg';
    case 'sql':
      return 'sql';
    default:
      return 'txt';
  }
}

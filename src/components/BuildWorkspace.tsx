import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Code2,
  Terminal,
  FileCode,
  Layers,
  Copy,
  Check,
  Play,
  RotateCcw,
  Download,
  ArrowRight,
} from 'lucide-react';

export type BuildTarget = 'web' | 'game' | 'app' | 'website' | 'code' | 'analyze' | 'design';

interface BuildWorkspaceProps {
  isOpen: boolean;
  target: BuildTarget;
  onClose: () => void;
  onSwitchTarget: (target: BuildTarget) => void;
}

interface ProjectFile {
  name: string;
  path: string;
  language: string;
  content: string;
}

export const BuildWorkspace: React.FC<BuildWorkspaceProps> = ({
  isOpen,
  target,
  onClose,
  onSwitchTarget,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'files' | 'logs' | 'spec'>('preview');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  // Canvas Game State for '/build game'
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameScore, setGameScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Initialize simulated project structure based on target
  const getProjectFiles = (): ProjectFile[] => {
    if (target === 'game') {
      return [
        {
          name: 'game.ts',
          path: 'src/game.ts',
          language: 'typescript',
          content: `// LUXION // GAME ENGINE SIMULATION
// Target: HTML5 Canvas 2D Core (Zero external runtime dependencies)

export class LuxionGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score: number = 0;
  private isRunning: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.init();
  }

  private init(): void {
    console.log('[LUXION-GAME] Canvas engine initialized');
  }

  public render(timestamp: number): void {
    if (!this.isRunning) return;
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw monochrome vector player
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(20, this.canvas.height / 2 - 25, 6, 50);
  }
}`,
        },
        {
          name: 'index.html',
          path: 'index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LUXION 2D Game Project</title>
  <style>
    body { margin: 0; background: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
    canvas { border: 1px solid #333; }
  </style>
</head>
<body>
  <canvas id="game-viewport" width="640" height="400"></canvas>
  <script type="module" src="./src/game.ts"></script>
</body>
</html>`,
        },
        {
          name: 'package.json',
          path: 'package.json',
          language: 'json',
          content: `{\n  "name": "luxion-game-prototype",\n  "version": "0.1.0",\n  "private": true,\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build"\n  },\n  "devDependencies": {\n    "typescript": "^5.0.0",\n    "vite": "^5.0.0"\n  }\n}`,
        },
      ];
    }

    if (target === 'app') {
      return [
        {
          name: 'App.tsx',
          path: 'src/App.tsx',
          language: 'typescript',
          content: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-black text-white p-8 flex flex-col font-mono">
      <header className="border-b border-neutral-800 pb-4 mb-6">
        <h1 className="text-sm uppercase tracking-widest text-neutral-400">LUXION APP SCAFFOLD</h1>
      </header>
      <main className="space-y-4 max-w-md">
        <p className="text-xs text-neutral-400">Desktop / Mobile Application Viewport</p>
        <button 
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs"
        >
          Increment: {count}
        </button>
      </main>
    </div>
  );
}`,
        },
        {
          name: 'package.json',
          path: 'package.json',
          language: 'json',
          content: `{\n  "name": "luxion-app-prototype",\n  "version": "0.1.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  }\n}`,
        },
      ];
    }

    // Default 'web' or 'website'
    return [
      {
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LUXION Web Project</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white font-mono min-h-screen">
  <div id="root"></div>
</body>
</html>`,
      },
      {
        name: 'App.tsx',
        path: 'src/App.tsx',
        language: 'typescript',
        content: `import React from 'react';

export function WebPrototype() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="border border-neutral-800 p-6 rounded bg-neutral-950">
        <h2 className="text-base font-bold tracking-wider mb-2">LUXION WEB WORKSPACE</h2>
        <p className="text-xs text-neutral-400">
          Clean frontend simulation scaffold. Ready for direct API engine integration.
        </p>
      </div>
    </div>
  );
}`,
      },
      {
        name: 'package.json',
        path: 'package.json',
        language: 'json',
        content: `{\n  "name": "luxion-web-workspace",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "react": "^18.3.1",\n    "react-dom": "^18.3.1"\n  }\n}`,
      },
    ];
  };

  const files = getProjectFiles();

  // Run mock build pipeline when opened
  useEffect(() => {
    if (!isOpen) return;

    setIsBuilding(true);
    setBuildLogs([
      `[luxion-cli] Initializing workspace for: /build ${target}`,
      `[luxion-cli] Resolving architecture blueprint...`,
      `[luxion-cli] Target environment: standalone client-side sandbox`,
      `[luxion-cli] Writing project scaffold [${target}]...`,
    ]);

    const timer1 = setTimeout(() => {
      setBuildLogs((prev) => [...prev, `[luxion-cli] File tree generated (3 core files)`]);
    }, 400);

    const timer2 = setTimeout(() => {
      setBuildLogs((prev) => [
        ...prev,
        `[luxion-cli] Build compilation: OK`,
        `[luxion-cli] Workspace ready. Ready for future backend engine hook.`,
      ]);
      setIsBuilding(false);
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, target]);

  // Handle Playable 2D Game on Canvas for '/build game'
  useEffect(() => {
    if (!isOpen || target !== 'game' || activeTab !== 'preview') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballSpeedX = 3;
    let ballSpeedY = 2;
    const ballSize = 6;

    let paddleY = canvas.height / 2 - 25;
    const paddleHeight = 50;
    const paddleWidth = 6;
    let currentScore = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      paddleY = Math.max(0, Math.min(canvas.height - paddleHeight, mouseY - paddleHeight / 2));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touchY = e.touches[0].clientY - rect.top;
        paddleY = Math.max(0, Math.min(canvas.height - paddleHeight, touchY - paddleHeight / 2));
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove);

    const loop = () => {
      // Clear viewport (Strict Black)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center divider line (Subtle gray)
      ctx.strokeStyle = '#27272a';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Move ball
      ballX += ballSpeedX;
      ballY += ballSpeedY;

      // Bounce top / bottom
      if (ballY <= ballSize || ballY >= canvas.height - ballSize) {
        ballSpeedY = -ballSpeedY;
      }

      // Bounce right wall
      if (ballX >= canvas.width - ballSize) {
        ballSpeedX = -Math.abs(ballSpeedX);
      }

      // Check paddle collision
      const paddleX = 20;
      if (
        ballX - ballSize <= paddleX + paddleWidth &&
        ballX + ballSize >= paddleX &&
        ballY >= paddleY &&
        ballY <= paddleY + paddleHeight
      ) {
        ballSpeedX = Math.abs(ballSpeedX) * 1.05;
        currentScore += 1;
        setGameScore(currentScore);
      } else if (ballX < 0) {
        // Missed - reset
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = 3;
        ballSpeedY = 2;
        setGameOver(true);
        currentScore = 0;
        setGameScore(0);
      }

      // Draw player paddle (White)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(paddleX, paddleY, paddleWidth, paddleHeight);

      // Draw ball (White)
      ctx.fillRect(ballX - ballSize / 2, ballY - ballSize / 2, ballSize, ballSize);

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen, target, activeTab]);

  const handleCopyCode = () => {
    const activeFile = files[selectedFileIndex] || files[0];
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const activeFile = files[selectedFileIndex] || files[0];
    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white font-mono select-none"
    >
      {/* Top HUD Bar */}
      <header className="flex h-12 items-center justify-between border-b border-neutral-800 px-4 bg-black">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-widest text-white">
            LUXION // BUILD WORKSPACE
          </span>
          <span className="text-[10px] px-2 py-0.5 border border-neutral-700 bg-neutral-900 text-neutral-300 rounded">
            TARGET: {target.toUpperCase()}
          </span>
          <span className="hidden sm:inline-block text-[10px] text-neutral-500">
            [PROTOTYPE WORKSPACE • READY FOR API INTEGRATION]
          </span>
        </div>

        {/* Target Switcher + Close */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center border border-neutral-800 rounded bg-neutral-950 p-0.5 text-[10px]">
            {(['web', 'game', 'app'] as BuildTarget[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSwitchTarget(t)}
                className={`px-2 py-0.5 rounded uppercase ${
                  target === t
                    ? 'bg-neutral-800 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1 text-xs border border-neutral-800 hover:border-neutral-600 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </header>

      {/* Workspace Secondary Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'preview'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>Sandbox Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'files'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3 h-3" />
            <span>Files ({files.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'logs'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>Terminal Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spec')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'spec'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Spec &amp; Blueprint</span>
          </button>
        </div>

        {/* Quick file actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] border border-neutral-800 hover:border-neutral-700 bg-neutral-900 rounded text-neutral-300 hover:text-white"
            title="Copy current file code"
          >
            {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] border border-neutral-800 hover:border-neutral-700 bg-neutral-900 rounded text-neutral-300 hover:text-white"
            title="Download file"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* TAB 1: SANDBOX PREVIEW */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black overflow-y-auto">
            {target === 'game' ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="flex items-center justify-between w-full max-w-xl text-xs text-neutral-400 px-2 font-mono">
                  <span>CONTROL: Move mouse or finger vertically</span>
                  <span>SCORE: <strong className="text-white">{gameScore}</strong></span>
                </div>
                <div className="relative border border-neutral-800 rounded bg-black shadow-2xl">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={340}
                    className="block cursor-ns-resize"
                  />
                </div>
                <div className="text-[11px] text-neutral-500 max-w-md text-center">
                  2D Vector Pong Sandbox Simulation • Demonstrates interactive game prototype loop.
                </div>
              </div>
            ) : (
              <div className="w-full max-w-3xl border border-neutral-800 rounded-lg bg-neutral-950 p-6 space-y-6">
                <div className="border-b border-neutral-800 pb-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-neutral-500 block mb-1">
                      LUXION WORKSPACE PREVIEW
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      {target === 'web'
                        ? 'Single Page Web Application Scaffold'
                        : target === 'app'
                        ? 'Responsive Application Interface Prototype'
                        : 'Custom Project Sandbox'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-neutral-300 rounded">
                    HTTP:200 OK
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-neutral-800 p-4 rounded bg-black">
                    <span className="text-[11px] text-neutral-400 block mb-1">Component State</span>
                    <p className="text-xs text-neutral-200">
                      Clean architectural blueprint generated. All logic decoupled from external cloud lock-in.
                    </p>
                  </div>
                  <div className="border border-neutral-800 p-4 rounded bg-black">
                    <span className="text-[11px] text-neutral-400 block mb-1">API Readiness</span>
                    <p className="text-xs text-neutral-200">
                      Standardized endpoints ready for future compiler or code generation hook.
                    </p>
                  </div>
                </div>

                <div className="p-3 border border-neutral-800 rounded bg-neutral-900/60 text-xs text-neutral-400">
                  <strong className="text-white">Notice:</strong> This is a clean frontend prototype scaffold. When you connect an external code generation engine or local backend, this workspace will compile live output in real time.
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FILES & CODE */}
        {activeTab === 'files' && (
          <div className="flex-1 flex overflow-hidden">
            {/* File Sidebar */}
            <div className="w-56 border-r border-neutral-800 bg-neutral-950 p-3 space-y-1 overflow-y-auto">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 px-2">
                Project Files
              </span>
              {files.map((file, idx) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-xs transition-colors ${
                    selectedFileIndex === idx
                      ? 'bg-neutral-800 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </div>

            {/* Code Viewer */}
            <div className="flex-1 bg-black p-4 overflow-auto">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                <span className="text-xs font-mono text-neutral-400">
                  {files[selectedFileIndex]?.path}
                </span>
                <span className="text-[10px] uppercase text-neutral-500">
                  {files[selectedFileIndex]?.language}
                </span>
              </div>
              <pre className="text-xs text-neutral-200 font-mono leading-relaxed whitespace-pre-wrap">
                {files[selectedFileIndex]?.content}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: TERMINAL LOGS */}
        {activeTab === 'logs' && (
          <div className="flex-1 bg-black p-4 font-mono text-xs overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3 text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>stdout / stderr</span>
              </span>
              <button
                type="button"
                onClick={() => setBuildLogs([`[luxion-cli] Logs cleared.`])}
                className="text-[10px] hover:text-white underline"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1.5">
              {buildLogs.map((log, index) => (
                <div key={index} className="text-neutral-300">
                  <span className="text-neutral-600 mr-2">{String(index + 1).padStart(2, '0')}</span>
                  {log}
                </div>
              ))}
              {isBuilding && (
                <div className="text-neutral-400 animate-pulse">_ executing compiler pipeline...</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SPECIFICATION & BLUEPRINT */}
        {activeTab === 'spec' && (
          <div className="flex-1 bg-black p-6 overflow-y-auto max-w-3xl mx-auto space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-1">
                Architecture Specification: {target.toUpperCase()}
              </h3>
              <p className="text-xs text-neutral-400">
                Blueprint standard for LUXION command workflows.
              </p>
            </div>

            <div className="border border-neutral-800 rounded bg-neutral-950 divide-y divide-neutral-800 text-xs">
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-neutral-400">Target Type</span>
                <span className="text-white font-bold">{target}</span>
              </div>
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-neutral-400">Runtime Standard</span>
                <span className="text-white font-mono">TypeScript / ESNext</span>
              </div>
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-neutral-400">API Contract</span>
                <span className="text-neutral-300 font-mono">Frontend Simulation Mode</span>
              </div>
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-neutral-400">State Persistence</span>
                <span className="text-neutral-300 font-mono">Client LocalStorage / Memory</span>
              </div>
            </div>

            <div className="p-4 border border-neutral-800 rounded bg-neutral-900/40 text-xs space-y-2">
              <div className="text-white font-bold">Commands Recognized:</div>
              <ul className="list-disc list-inside text-neutral-400 space-y-1 font-mono text-[11px]">
                <li><code className="text-white">/build web</code> — Scaffolds React/Vite web application</li>
                <li><code className="text-white">/build game</code> — Scaffolds 2D HTML5 canvas interactive game</li>
                <li><code className="text-white">/build app</code> — Scaffolds full application structure</li>
                <li><code className="text-white">/analyze</code> — Runs structural code analysis</li>
                <li><code className="text-white">/code</code> — Opens code editing sandbox</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

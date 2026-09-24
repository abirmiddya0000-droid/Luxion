import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Volume2,
  VolumeX,
  Palette,
  MessageSquare,
  HardDrive,
  Info,
  Play,
  Square,
  Check,
  RotateCcw,
  Sparkles,
  Cpu,
  Trash2,
  Plus,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { AppSettings, VoiceSettings, PersonaSettings, TypewriterSettings, ChatPreferences } from '../types';
import { TTSEngine } from '../services/speech';
import { CyberSound } from '../services/sound';
import { MemoryService, MemoryItem } from '../services/memory';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  initialTab?: 'appearance' | 'voice' | 'chat' | 'memory' | 'about';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  initialTab = 'voice',
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'voice' | 'chat' | 'memory' | 'about'>(initialTab);
  const [availableVoices, setAvailableVoices] = useState<Array<{ voice: SpeechSynthesisVoice; analysis: any }>>([]);
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const voices = TTSEngine.getPrioritizedVoices();
    setAvailableVoices(voices);

    const handleVoiceChange = () => {
      setAvailableVoices(TTSEngine.getPrioritizedVoices());
    };
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoiceChange);
    }

    setMemories(MemoryService.getAll());

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoiceChange);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const updateVoice = (partial: Partial<VoiceSettings>) => {
    onUpdateSettings({
      ...settings,
      voice: { ...settings.voice, ...partial },
    });
  };

  const updateChat = (partial: Partial<ChatPreferences>) => {
    onUpdateSettings({
      ...settings,
      chat: { ...(settings.chat || { enterToSend: true, renderMarkdown: true, codePreview: true }), ...partial },
    });
  };

  const updateTypewriter = (partial: Partial<TypewriterSettings>) => {
    onUpdateSettings({
      ...settings,
      typewriter: { ...settings.typewriter, ...partial },
    });
    if (partial.soundVolume !== undefined) {
      CyberSound.setVolume(partial.soundVolume);
    }
    if (partial.soundEnabled !== undefined) {
      CyberSound.setMuted(!partial.soundEnabled);
    }
  };

  const updateTheme = (theme: AppSettings['theme']) => {
    onUpdateSettings({
      ...settings,
      theme,
    });
  };

  // Test Voice button implementation: triggers a short arrogant snippet using currently selected voice and pitch
  const handleTestVoice = async () => {
    if (isPlayingTestAudio) {
      TTSEngine.stop();
      setIsPlayingTestAudio(false);
      return;
    }

    setIsPlayingTestAudio(true);
    // Deep, calm, confident male AI voice snippet
    const testSnippet =
      "I am LUXION. Present your query.";

    // Select the chosen voice or fallback to best male voice
    const selectedVoiceItem = availableVoices[settings.voice.voiceIndex];
    const voiceObj = selectedVoiceItem?.voice || TTSEngine.getBestMaleVoice();

    TTSEngine.speak(testSnippet, {
      pitch: settings.voice.calibratedPitch || settings.voice.pitch || 0.90,
      rate: settings.voice.rate || 0.97,
      voice: voiceObj,
      onEnd: () => setIsPlayingTestAudio(false),
      onError: () => setIsPlayingTestAudio(false),
    });
  };

  const handleAddMemory = () => {
    if (!newMemoryKey.trim() || !newMemoryValue.trim()) return;
    MemoryService.save({
      category: 'fact',
      key: newMemoryKey.trim().toLowerCase().replace(/\s+/g, '_'),
      value: newMemoryValue.trim(),
      confidence: 1.0,
    });
    setMemories(MemoryService.getAll());
    setNewMemoryKey('');
    setNewMemoryValue('');
  };

  const handleDeleteMemory = (key: string) => {
    MemoryService.remove(key);
    setMemories(MemoryService.getAll());
  };

  const handleClearAllMemories = () => {
    if (window.confirm('Clear all stored local memories? Future chats will start fresh without previous personal context.')) {
      MemoryService.clear();
      setMemories([]);
    }
  };

  return (
    <div
      id="modal-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="modal-settings-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl h-[88vh] sm:h-[82vh] bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-800 bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-amber-500/30 text-amber-200 shadow-sm">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                LUXION Settings
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-amber-200/90 border border-amber-500/30">
                  Engine Core
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Configure voice synthesis, AI persona, themes, and browser memory.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Close Settings"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800/80 bg-neutral-900/30 px-3 sm:px-6 gap-1 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            id="tab-btn-voice"
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'voice'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice &amp; TTS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Persona &amp; Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'memory'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Memory ({memories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'about'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>About</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ================= SECTION 1: APPEARANCE ================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fade-in max-w-2xl">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Color Palette &amp; Accents</h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Select your preferred dark foundation with subtle accents.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'monochrome_gold',
                      label: 'Obsidian & Gold (Default)',
                      desc: 'Deep near-black foundation with subtle champagne gold accents',
                    },
                    {
                      id: 'obsidian_slate',
                      label: 'Obsidian Slate',
                      desc: 'Deep charcoal-black with platinum silver borders',
                    },
                    {
                      id: 'cyber_cyan',
                      label: 'Deep Cyan',
                      desc: 'Graphite black with restrained cyan-teal highlights',
                    },
                    {
                      id: 'matrix_emerald',
                      label: 'Matrix Emerald',
                      desc: 'Deep terminal black with subtle phosphor green accents',
                    },
                  ].map((theme) => {
                    const isSelected = (settings.theme || 'monochrome_gold') === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => updateTheme(theme.id as any)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-500/70 bg-neutral-900 shadow-md ring-1 ring-amber-500/30'
                            : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-neutral-100">{theme.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-amber-300" />}
                        </div>
                        <p className="text-[11px] text-neutral-400">{theme.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-neutral-800/80 pt-4">
                <h3 className="text-sm font-semibold text-white mb-1">Display Surface</h3>
                <p className="text-xs text-neutral-400 mb-3">
                  LUXION uses an ultra-dark-first design system with elevated subtle surfaces.
                </p>
                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-200">Dark Mode System</div>
                    <div className="text-[11px] text-neutral-500">True black contrast for OLED and mobile screens</div>
                  </div>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    Always Dark
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 2: VOICE & TTS ================= */}
          {activeTab === 'voice' && (
            <div className="space-y-6 animate-fade-in max-w-2xl">
              {/* Test Voice Banner */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                    Speech Preview
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Play a speech sample using your currently configured male voice, cadence, and pitch depth.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-test-voice"
                  onClick={handleTestVoice}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    isPlayingTestAudio
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600'
                      : 'bg-white hover:bg-neutral-200 text-black shadow-sm active:scale-95'
                  }`}
                >
                  {isPlayingTestAudio ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Voice</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Test Voice</span>
                    </>
                  )}
                </button>
              </div>

              {/* Voice Model Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  Device Speech Model
                </label>
                <p className="text-[11px] text-neutral-400 mb-2">
                  Select a male voice synthesizer provided by your browser. Deep, calm, and mature voices are prioritized automatically.
                </p>
                <select
                  id="select-voice-model"
                  value={settings.voice.voiceIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const selected = availableVoices[idx];
                    updateVoice({
                      voiceIndex: idx,
                      voiceName: selected?.voice.name,
                      userSelectedVoice: true,
                      calibratedPitch: selected?.analysis.calibratedPitch ?? settings.voice.pitch,
                      toneBadge: selected?.analysis.badge,
                    });
                  }}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-xs text-neutral-200 focus:border-neutral-500 focus:outline-none font-mono"
                >
                  {availableVoices.length === 0 ? (
                    <option value={0}>Default System Voice</option>
                  ) : (
                    availableVoices.map((item, idx) => (
                      <option key={`${item.voice.name}_${idx}`} value={idx}>
                        {item.voice.name} ({item.voice.lang}) {item.analysis.badge ? `• [${item.analysis.badge}]` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Speech Rate Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-neutral-200">Speech Cadence (Rate)</span>
                  <span className="font-mono text-amber-300 tabular-nums">{settings.voice.rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.35"
                  step="0.05"
                  value={settings.voice.rate}
                  onChange={(e) => updateVoice({ rate: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1 tabular-nums">
                  <span>0.75x (Deliberate)</span>
                  <span>1.00x (Standard)</span>
                  <span>1.35x (Rapid)</span>
                </div>
              </div>

              {/* Pitch Depth Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-neutral-200">Pitch Depth</span>
                  <span className="font-mono text-amber-300 tabular-nums">
                    {(settings.voice.calibratedPitch || settings.voice.pitch || 0.85).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.65"
                  max="1.3"
                  step="0.05"
                  value={settings.voice.calibratedPitch || settings.voice.pitch || 0.85}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    updateVoice({ pitch: p, calibratedPitch: p });
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1 tabular-nums">
                  <span>0.65x (Deep)</span>
                  <span>1.00x (Standard)</span>
                  <span>1.30x (Elevated)</span>
                </div>
              </div>

              {/* Auto Speak Toggle */}
              <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-neutral-200">Auto Speak Responses</div>
                  <div className="text-[11px] text-neutral-500">
                    Automatically speak assistant responses aloud after generation
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-auto-speak"
                  onClick={() => updateVoice({ autoSpeak: !settings.voice.autoSpeak })}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    settings.voice.autoSpeak ? 'bg-amber-400' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full ${
                      settings.voice.autoSpeak ? 'bg-neutral-950' : 'bg-white'
                    } transition-transform ${
                      settings.voice.autoSpeak ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* ================= SECTION 3: CHAT EXPERIENCE & PERSONA ================= */}
          {activeTab === 'chat' && (
            <div className="space-y-6 animate-fade-in max-w-2xl">
              {/* Persona Selection */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Intelligence Persona Mode</h3>
                <p className="text-xs text-neutral-400 mb-3">
                  Tailor LUXION's conversational posture, explanation depth, and tone.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'intelligent',
                      label: 'Intelligent & Balanced',
                      desc: 'Calm, articulate, insightful, and respectful (Default)',
                    },
                    {
                      id: 'analytical',
                      label: 'Analytical & Technical',
                      desc: 'Precise, code-first, and algorithmically structured',
                    },
                    {
                      id: 'creative',
                      label: 'Creative & Expansive',
                      desc: 'Expressive narratives, thoughtful explorations',
                    },
                    {
                      id: 'direct',
                      label: 'Direct & Concise',
                      desc: 'Minimalist answers with zero preamble or filler',
                    },
                  ].map((p) => {
                    const isSelected = (settings.persona?.mode || 'intelligent') === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            persona: {
                              ...(settings.persona || { mode: 'intelligent', languageStyle: 'auto' }),
                              mode: p.id as any,
                            },
                          })
                        }
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-500/70 bg-neutral-900 shadow-sm ring-1 ring-amber-500/30'
                            : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold text-neutral-100">{p.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-amber-300" />}
                        </div>
                        <p className="text-[11px] text-neutral-400">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-neutral-800/80 pt-4">
                <h3 className="text-sm font-semibold text-white mb-1">Keyboard &amp; Input Controls</h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Configure behavior for the chat input box and message sending.
                </p>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">Enter Key to Send</div>
                      <div className="text-[11px] text-neutral-500">
                        Press Enter to send (Shift + Enter for new lines)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateChat({ enterToSend: !settings.chat?.enterToSend })}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        (settings.chat?.enterToSend ?? true) ? 'bg-amber-400' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full ${
                          (settings.chat?.enterToSend ?? true) ? 'bg-neutral-950' : 'bg-white'
                        } transition-transform ${
                          (settings.chat?.enterToSend ?? true) ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">Markdown Code Rendering</div>
                      <div className="text-[11px] text-neutral-500">
                        Render clean formatted Markdown, tables, and highlighted syntax
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateChat({ renderMarkdown: !settings.chat?.renderMarkdown })}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        (settings.chat?.renderMarkdown ?? true) ? 'bg-amber-400' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full ${
                          (settings.chat?.renderMarkdown ?? true) ? 'bg-neutral-950' : 'bg-white'
                        } transition-transform ${
                          (settings.chat?.renderMarkdown ?? true) ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">Interactive Code Preview</div>
                      <div className="text-[11px] text-neutral-500">
                        Show interactive live preview button for HTML/JS and interactive apps
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateChat({ codePreview: !settings.chat?.codePreview })}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        (settings.chat?.codePreview ?? true) ? 'bg-amber-400' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full ${
                          (settings.chat?.codePreview ?? true) ? 'bg-neutral-950' : 'bg-white'
                        } transition-transform ${
                          (settings.chat?.codePreview ?? true) ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Typewriter & Audio Ticks */}
              <div className="border-t border-neutral-800/80 pt-4">
                <h3 className="text-sm font-semibold text-white mb-1">Typewriter Animation &amp; Audio</h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Word streaming speed and Web Audio mechanical click feedback.
                </p>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">Typewriter Animation</div>
                      <div className="text-[11px] text-neutral-500">Stream incoming responses smoothly word-by-word</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateTypewriter({ enabled: !settings.typewriter.enabled })}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        settings.typewriter.enabled ? 'bg-amber-400' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full ${
                          settings.typewriter.enabled ? 'bg-neutral-950' : 'bg-white'
                        } transition-transform ${
                          settings.typewriter.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {settings.typewriter.enabled && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                          Streaming Speed Profile
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'fast', label: 'Fast Pulse', desc: '16ms / token' },
                            { id: 'normal', label: 'Natural Flow', desc: '22ms / token' },
                            { id: 'cinematic', label: 'Deliberate', desc: '35ms / token' },
                          ].map((profile) => {
                            const isSel = settings.typewriter.speed === profile.id;
                            return (
                              <button
                                key={profile.id}
                                type="button"
                                onClick={() => updateTypewriter({ speed: profile.id as any })}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                  isSel
                                    ? 'border-amber-500/70 bg-neutral-900 text-white'
                                    : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-neutral-200'
                                }`}
                              >
                                <div className="text-xs font-semibold">{profile.label}</div>
                                <div className="text-[10px] text-neutral-500">{profile.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-neutral-200">Mechanical Audio Ticks</div>
                          <div className="text-[11px] text-neutral-500">
                            Subtle synthetic typewriter audio feedback during streaming
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateTypewriter({ soundEnabled: !settings.typewriter.soundEnabled })}
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                            settings.typewriter.soundEnabled ? 'bg-amber-400' : 'bg-neutral-800'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full ${
                              settings.typewriter.soundEnabled ? 'bg-neutral-950' : 'bg-white'
                            } transition-transform ${
                              settings.typewriter.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 4: MEMORY ================= */}
          {activeTab === 'memory' && (
            <div className="space-y-6 animate-fade-in max-w-2xl">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-white">Local Knowledge &amp; Context Store</h3>
                  <span className="text-[10px] font-mono text-amber-300 bg-neutral-900 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Local Browser Store
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mb-4">
                  LUXION remembers personal preferences, names, and active project notes locally in your browser. All data remains private on your device.
                </p>

                {/* Add Custom Fact/Memory */}
                <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/50 mb-4 space-y-2.5">
                  <div className="text-xs font-semibold text-neutral-200">Add Custom Context / Fact</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Key (e.g. user_name, tech_stack)"
                      value={newMemoryKey}
                      onChange={(e) => setNewMemoryKey(e.target.value)}
                      className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Abir, React + TypeScript)"
                      value={newMemoryValue}
                      onChange={(e) => setNewMemoryValue(e.target.value)}
                      className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMemory}
                    disabled={!newMemoryKey.trim() || !newMemoryValue.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-950 bg-white hover:bg-neutral-200 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Context</span>
                  </button>
                </div>

                {/* Existing Stored Memories */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 pb-1">
                    <span>Stored Items ({memories.length})</span>
                    {memories.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllMemories}
                        className="text-rose-400 hover:text-rose-300 text-[11px] transition-colors"
                      >
                        Clear All Memories
                      </button>
                    )}
                  </div>

                  {memories.length === 0 ? (
                    <div className="p-6 text-center text-xs text-neutral-500 border border-neutral-800/80 rounded-xl bg-neutral-900/30">
                      No memories stored yet. Mention your name or stack in chat, or add one above.
                    </div>
                  ) : (
                    memories.map((m) => (
                      <div
                        key={m.key}
                        className="flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/40 text-xs"
                      >
                        <div className="min-w-0 pr-3">
                          <span className="font-mono text-amber-300 font-medium">{m.key}: </span>
                          <span className="text-neutral-200">{m.value}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(m.key)}
                          className="p-1 rounded text-neutral-500 hover:text-rose-400 transition-colors shrink-0"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 5: ABOUT ================= */}
          {activeTab === 'about' && (
            <div className="space-y-6 animate-fade-in max-w-2xl">
              <div className="flex items-center gap-3.5 p-4 rounded-xl border border-neutral-800 bg-neutral-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-amber-500/30 text-amber-200 shadow-md">
                  <svg
                    className="h-6 w-6"
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
                    <h2 className="text-lg font-bold tracking-[0.16em] text-neutral-100 font-sans">
                      LUXION
                    </h2>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-900 text-amber-200/90 border border-amber-500/30">
                      Autonomous
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-medium">Clean, independent intelligence engine.</p>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800/90 bg-neutral-900/60 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 border border-neutral-700/60 text-amber-200">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold">
                      Founder &amp; Creator
                    </p>
                    <p className="text-sm font-semibold text-neutral-100">Abir Middya</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-neutral-900 px-2 py-0.5 rounded border border-amber-500/30">
                  Original Architect
                </span>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-neutral-400 font-medium">
                    <Cpu className="h-4 w-4 text-amber-300" />
                    Reasoning Engine
                  </span>
                  <span className="text-neutral-200 font-mono text-[11px]">LUXION 3.5 Cognitive Core</span>
                </div>

                <div className="border-t border-neutral-800/60 pt-2.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-neutral-400 font-medium">
                    <HardDrive className="h-4 w-4 text-neutral-300" />
                    Memory Layer
                  </span>
                  <span className="text-neutral-200 font-mono text-[11px] flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Private Local Browser Store
                  </span>
                </div>

                <div className="border-t border-neutral-800/60 pt-2.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-neutral-400 font-medium">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Telemetry &amp; Privacy
                  </span>
                  <span className="text-neutral-300 font-mono text-[11px]">Zero Third-Party Trackers</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-neutral-500 font-mono">
            Settings auto-saved to localStorage
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-neutral-950 bg-white hover:bg-neutral-200 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

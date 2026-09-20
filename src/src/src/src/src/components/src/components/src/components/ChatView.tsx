import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUp,
  Mic,
  MicOff,
  Volume2,
  Square,
  Copy,
  Check,
  Plus,
  Paperclip,
  Image as ImageIcon,
  X,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage, VoiceSettings, ChatAttachment } from '../types';
import { sendChatMessage, synthesizeSpeech } from '../services/api';
import { TTSEngine, STTEngine } from '../services/speech';
import { CodeBlock } from './CodeBlock';
import { PreviewModal } from './PreviewModal';

interface ChatViewProps {
  messages: ChatMessage[];
  onUpdateMessages: (messages: ChatMessage[]) => void;
  voiceSettings: VoiceSettings;
  availableVoices: SpeechSynthesisVoice[];
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onUpdateMessages,
  voiceSettings,
  availableVoices,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [currentAttachment, setCurrentAttachment] = useState<ChatAttachment | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      TTSEngine.stop();
      STTEngine.stopListening();
    };
  }, []);

  // Handle outside click for plus menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    }
    if (showPlusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlusMenu]);

  // Voice Speech-to-Text
  const toggleListening = () => {
    if (isListening) {
      STTEngine.stopListening();
      setIsListening(false);
    } else {
      const started = STTEngine.startListening({
        onResult: (transcript) => {
          setInput(transcript);
        },
        onError: (err) => {
          console.warn('STT Error:', err);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
      if (started) {
        setIsListening(true);
      }
    }
  };

  // Text-to-Speech playback
  const handleSpeak = (id: string, text: string) => {
    if (speakingId === id) {
      TTSEngine.stop();
      setSpeakingId(null);
      return;
    }

    setSpeakingId(id);
    synthesizeSpeech(text, 'onyx')
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = voiceSettings.rate;
        audio.onended = () => { URL.revokeObjectURL(url); setSpeakingId(null); };
        audio.onerror = () => { URL.revokeObjectURL(url); setSpeakingId(null); };
        return audio.play();
      })
      .catch(() => {
        setSpeakingId(null);
        // Honest fallback only when server TTS is unavailable.
        const voice = availableVoices[voiceSettings.voiceIndex] || TTSEngine.getBestMaleVoice();
        TTSEngine.speak(text, { voice, rate: voiceSettings.rate, pitch: voiceSettings.pitch, onEnd: () => setSpeakingId(null), onError: () => setSpeakingId(null) });
      });
  };

  // Copy message content
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Document file selection
  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCurrentAttachment({
          name: file.name,
          type: 'file',
          size: file.size,
          textContent: text,
        });
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCurrentAttachment({
          name: file.name,
          type: 'image',
          mimeType: file.type,
          size: file.size,
          dataUrl,
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Send message
  const handleSend = async (overridePrompt?: string, overrideAttachment?: ChatAttachment | null) => {
    const text = overridePrompt !== undefined ? overridePrompt.trim() : input.trim();
    const activeAttach = overrideAttachment !== undefined ? overrideAttachment : currentAttachment;

    // Slash commands are handled locally before the normal AI path.
    if (overridePrompt === undefined && text.startsWith('/')) {
      const [command, ...rest] = text.split(/\s+/);
      const arg = rest.join(' ').trim();
      if (command.toLowerCase() === '/build') {
        if (!arg) { setInput(''); return; }
        await handleSend(`Build this project request and return complete runnable code with a concise file plan: ${arg}`);
        return;
      }
      if (command.toLowerCase() === '/clear') {
        onUpdateMessages([]); setInput(''); setCurrentAttachment(null); return;
      }
      if (command.toLowerCase() === '/help') {
        setInput('');
        onUpdateMessages([...messages, { id: `bot_${Date.now()}`, role: 'assistant', content: 'Commands: /build <request>, /clear, /help', timestamp: Date.now() }]);
        return;
      }
    }

    if ((!text && !activeAttach) || isLoading) return;

    if (isListening) {
      STTEngine.stopListening();
      setIsListening(false);
    }

    const attachedSnapshot = activeAttach;
    setCurrentAttachment(null);
    if (overridePrompt === undefined) {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text || (attachedSnapshot ? `[${attachedSnapshot.name}]` : ''),
      fileName: attachedSnapshot?.name,
      attachment: attachedSnapshot || undefined,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    onUpdateMessages(newMessages);
    setIsLoading(true);

    try {
      const history = newMessages
        .slice(-10)
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const reply = await sendChatMessage(text, history, attachedSnapshot);

      const botMessageId = `bot_${Date.now()}`;
      const botMessage: ChatMessage = {
        id: botMessageId,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      const updated = [...newMessages, botMessage];
      onUpdateMessages(updated);

      if (voiceSettings.autoSpeak) {
        setTimeout(() => {
          handleSpeak(botMessageId, reply);
        }, 300);
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: err?.message || 'Unable to connect to AI engine. Please check your connection.',
        isError: true,
        timestamp: Date.now(),
      };
      onUpdateMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryLast = () => {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    // Filter out the last error message
    const cleanList = messages.filter((m) => !m.isError);
    onUpdateMessages(cleanList);
    handleSend(lastUserMsg.content, lastUserMsg.attachment || null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-expand textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  // Render assistant content with formatted code blocks
  const renderMessageContent = (content: string) => {
    // Check for code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        const textBefore = content.substring(lastIndex, matchIndex);
        parts.push(
          <div key={`text-${lastIndex}`} className="whitespace-pre-wrap break-words leading-relaxed">
            {textBefore}
          </div>
        );
      }

      const lang = match[1] || 'code';
      const code = match[2];
      parts.push(
        <CodeBlock
          key={`code-${matchIndex}`}
          language={lang}
          code={code}
          onPreview={(previewableCode) => setPreviewCode(previewableCode)}
        />
      );

      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex);
      parts.push(
        <div key={`text-${lastIndex}`} className="whitespace-pre-wrap break-words leading-relaxed">
          {textAfter}
        </div>
      );
    }

    return parts;
  };

  return (
    <div id="luxion-chat-page" className="flex flex-col h-[calc(100vh-3.5rem)] w-full">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.js,.ts,.tsx,.py,.html,.css,.json,.csv,.sql"
        onChange={handleDocChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleImageChange}
      />

      {/* Main Conversation Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            /* Clean, open initial state — strictly NO random greetings, NO fake messages, NO suggested questions */
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center select-none">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 mb-3">
                <svg
                  className="h-6 w-6 text-neutral-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-neutral-200 tracking-wide">LUXION</h2>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isSpeaking = speakingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.isError
                        ? 'bg-rose-950/30 text-rose-200 border border-rose-900/60 shadow-sm'
                        : isUser
                        ? 'bg-neutral-800 text-neutral-100 border border-neutral-700/60'
                        : 'bg-neutral-900/90 text-neutral-200 border border-neutral-800/80 shadow-sm'
                    }`}
                  >
                    {/* Attached Image Thumbnail */}
                    {msg.attachment?.type === 'image' && msg.attachment.dataUrl && (
                      <div className="mb-2.5 overflow-hidden rounded-xl border border-neutral-700/50 max-w-sm">
                        <img
                          src={msg.attachment.dataUrl}
                          alt={msg.attachment.name}
                          className="max-h-64 w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="bg-neutral-950/80 px-2.5 py-1 text-[11px] font-mono text-neutral-400 truncate">
                          {msg.attachment.name}
                        </div>
                      </div>
                    )}

                    {/* Attached Document Chip */}
                    {msg.attachment?.type === 'file' && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-400 font-mono bg-neutral-950/60 px-2.5 py-1 rounded-md border border-neutral-700/40 w-fit">
                        <Paperclip className="h-3 w-3" />
                        <span>{msg.attachment.name}</span>
                      </div>
                    )}

                    {/* Legacy fileName fallback */}
                    {!msg.attachment && msg.fileName && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-400 font-mono bg-neutral-950/40 px-2 py-1 rounded-md border border-neutral-700/40 w-fit">
                        <Paperclip className="h-3 w-3" />
                        <span>{msg.fileName}</span>
                      </div>
                    )}

                    {/* Error message card */}
                    {msg.isError ? (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="text-xs text-rose-300 whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRetryLast}
                          className="flex items-center gap-1 text-[11px] font-medium text-rose-300 hover:text-white bg-rose-900/40 hover:bg-rose-900/70 border border-rose-700/50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Retry</span>
                        </button>
                      </div>
                    ) : isUser ? (
                      /* User text */
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    ) : (
                      /* Assistant formatted text with code blocks */
                      <div className="space-y-2">{renderMessageContent(msg.content)}</div>
                    )}

                    {/* Unobtrusive assistant controls */}
                    {!isUser && !msg.isError && (
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-800/60 text-xs text-neutral-500">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                              isSpeaking
                                ? 'bg-neutral-800 text-white'
                                : 'hover:bg-neutral-800 hover:text-neutral-300'
                            }`}
                            title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                          >
                            {isSpeaking ? (
                              <>
                                <Square className="h-3 w-3 fill-current" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3.5 w-3.5" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Discreet Generating Indicator */}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/90 px-4 py-3 text-xs text-neutral-400 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse"></span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:0.2s]"></span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Composer Section */}
      <div className="p-4 sm:p-6 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent">
        <div className="mx-auto max-w-3xl">
          {/* Active Dictation Notification */}
          {isListening && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                <span>Listening to microphone...</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[11px] font-medium text-neutral-400 hover:text-white"
              >
                Stop
              </button>
            </div>
          )}

          {/* Attached Attachment Chip / Thumbnail Preview */}
          {currentAttachment && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-1.5 text-xs text-neutral-300 w-fit animate-fade-in">
              {currentAttachment.type === 'image' && currentAttachment.dataUrl ? (
                <img
                  src={currentAttachment.dataUrl}
                  alt={currentAttachment.name}
                  className="h-9 w-9 rounded-lg object-cover border border-neutral-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
                  <Paperclip className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="flex flex-col pr-1">
                <span className="font-mono text-[11px] text-neutral-200 truncate max-w-[200px]">
                  {currentAttachment.name}
                </span>
                <span className="text-[9px] text-neutral-500 uppercase font-mono">
                  {currentAttachment.type === 'image' ? 'Image attachment' : 'Document'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentAttachment(null)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
                title="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Composer Box */}
          <div className="relative flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/95 shadow-xl focus-within:border-neutral-700 transition-colors">
            {/* Input Textarea */}
            <textarea
              ref={textareaRef}
              id="chat-composer-input"
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening...' : 'Message LUXION...'}
              className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none max-h-44"
            />

            {/* Composer Controls Row */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              {/* Left: Clean + Button */}
              <div className="relative" ref={plusMenuRef}>
                <button
                  id="btn-composer-plus"
                  type="button"
                  onClick={() => setShowPlusMenu((prev) => !prev)}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ${
                    showPlusMenu ? 'bg-neutral-800 text-white' : ''
                  }`}
                  title="Attach file or image"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {/* Plus Menu Popup */}
                {showPlusMenu && (
                  <div
                    id="composer-plus-menu"
                    className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-neutral-800 bg-neutral-900 p-1 shadow-2xl z-30 animate-fade-in text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlusMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors text-left"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Attach file / code</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPlusMenu(false);
                        imageInputRef.current?.click();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors text-left"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Upload image</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Controls: Voice Mic & Send Button */}
              <div className="flex items-center gap-2">
                {/* Voice Control Button */}
                <button
                  id="btn-composer-voice"
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                {/* Send Button */}
                <button
                  id="btn-composer-send"
                  type="button"
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && !currentAttachment) || isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-950 hover:bg-white active:scale-95 disabled:opacity-30 disabled:hover:bg-neutral-100 transition-all"
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* App / Game Preview Modal */}
      {previewCode && (
        <PreviewModal
          isOpen={Boolean(previewCode)}
          onClose={() => setPreviewCode(null)}
          code={previewCode}
          title="App & Game Live Preview"
        />
      )}
    </div>
  );
};

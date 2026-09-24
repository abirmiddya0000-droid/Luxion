import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
  SmilePlus,
} from 'lucide-react';
import { ChatMessage, VoiceSettings, ChatAttachment, AppSettings } from '../types';
import { sendChatMessage } from '../services/api';
import { TTSEngine, STTEngine } from '../services/speech';
import { CodeBlock } from './CodeBlock';
import { PreviewModal } from './PreviewModal';
import { TypewriterMessage } from './TypewriterMessage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface ReactionOption {
  emoji: string;
  label: string;
  description: string;
}

export const AVAILABLE_REACTIONS: ReactionOption[] = [
  { emoji: '👍', label: 'Helpful', description: 'Helpful response' },
  { emoji: '❤️', label: 'Love', description: 'Love this answer' },
  { emoji: '💡', label: 'Insightful', description: 'Insightful & clever' },
  { emoji: '🔥', label: 'Fire', description: 'Awesome / Impressive' },
  { emoji: '👏', label: 'Applaud', description: 'Well reasoned' },
  { emoji: '🚀', label: 'Innovative', description: 'High quality output' },
];

interface ChatViewProps {
  messages: ChatMessage[];
  onUpdateMessages: (messages: ChatMessage[]) => void;
  voiceSettings: VoiceSettings;
  availableVoices: SpeechSynthesisVoice[];
  appSettings?: AppSettings;
  onSendMessage?: (
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    attachment?: ChatAttachment | null
  ) => Promise<string>;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onUpdateMessages,
  voiceSettings,
  availableVoices,
  appSettings,
  onSendMessage,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);
  const [isTypingStopped, setIsTypingStopped] = useState(false);
  const [currentAttachment, setCurrentAttachment] = useState<ChatAttachment | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  const shouldReduceMotion = useReducedMotion();
  const initialMessageIdsRef = useRef<Set<string>>(new Set(messages.map((m) => m.id)));
  const prevSessionFirstId = useRef(messages[0]?.id);

  useEffect(() => {
    // When switching sessions, update initial IDs so existing chat history doesn't re-animate
    if (messages.length > 0 && messages[0]?.id !== prevSessionFirstId.current) {
      initialMessageIdsRef.current = new Set(messages.map((m) => m.id));
      prevSessionFirstId.current = messages[0]?.id;
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      TTSEngine.stop();
      STTEngine.stopListening();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setActiveReactionPickerId(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowPlusMenu(false);
        setActiveReactionPickerId(null);
      }
    }

    if (showPlusMenu || activeReactionPickerId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPlusMenu, activeReactionPickerId]);

  const handleToggleReaction = (messageId: string, emoji: string) => {
    const updated = messages.map((m) => {
      if (m.id !== messageId) return m;

      const currentReactions: Record<string, number> = { ...(m.reactions || {}) };
      const currentUserReactions: string[] = [...(m.userReactions || [])];
      const hasReacted = currentUserReactions.includes(emoji);

      if (hasReacted) {
        // Toggle OFF: remove from userReactions and decrement counter
        const nextUserReactions = currentUserReactions.filter((e) => e !== emoji);
        const nextCount = (currentReactions[emoji] || 1) - 1;
        if (nextCount <= 0) {
          delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = nextCount;
        }
        return {
          ...m,
          reactions: currentReactions,
          userReactions: nextUserReactions,
        };
      } else {
        // Toggle ON: add to userReactions and increment counter
        const nextUserReactions = [...currentUserReactions, emoji];
        currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        return {
          ...m,
          reactions: currentReactions,
          userReactions: nextUserReactions,
        };
      }
    });

    onUpdateMessages(updated);
  };

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

  const handleSpeak = (id: string, text: string) => {
    if (speakingId === id) {
      TTSEngine.stop();
      setSpeakingId(null);
      return;
    }

    setSpeakingId(id);
    const voice = (voiceSettings.userSelectedVoice && availableVoices[voiceSettings.voiceIndex])
      ? availableVoices[voiceSettings.voiceIndex]
      : (TTSEngine.getBestMaleVoice() || availableVoices[voiceSettings.voiceIndex]);
    TTSEngine.speak(text, {
      voice,
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      onStart: () => setSpeakingId(id),
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const handleSend = async (overridePrompt?: string, overrideAttachment?: ChatAttachment | null) => {
    const text = overridePrompt !== undefined ? overridePrompt.trim() : input.trim();
    const activeAttach = overrideAttachment !== undefined ? overrideAttachment : currentAttachment;

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
    setIsTypingStopped(false);

    try {
      const history = newMessages
        .slice(-10)
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const reply = onSendMessage
        ? await onSendMessage(text, history, attachedSnapshot)
        : await sendChatMessage(text, history, attachedSnapshot, undefined, {
            personaMode: appSettings?.persona?.mode,
            arroganceLevel: appSettings?.persona?.arroganceLevel,
          });

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
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    const cleanList = messages.filter((m) => !m.isError);
    onUpdateMessages(cleanList);
    handleSend(lastUserMsg.content, lastUserMsg.attachment || null);
  };

  const handleStopGeneration = () => {
    setIsLoading(false);
    setIsTypingStopped(true);
    TTSEngine.stop();
    setSpeakingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const renderMessageContent = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const isMultiLine = codeString.includes('\n');

            if (match || isMultiLine) {
              return (
                <CodeBlock
                  language={match ? match[1] : 'code'}
                  code={codeString}
                  onPreview={(previewableCode) => setPreviewCode(previewableCode)}
                />
              );
            }

            return (
              <code
                className="bg-neutral-800/80 text-neutral-200 px-1.5 py-0.5 rounded text-xs font-mono border border-neutral-700/50"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 leading-relaxed break-words">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-2.5 space-y-1 text-neutral-200">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2.5 space-y-1 text-neutral-200">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed pl-0.5">{children}</li>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-neutral-300">{children}</em>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 underline underline-offset-2 hover:text-white transition-colors"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-neutral-700 pl-3 my-2.5 text-neutral-400 italic">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 border border-neutral-800 rounded-lg">
                <table className="min-w-full divide-y divide-neutral-800 text-xs">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="px-3 py-2 bg-neutral-950 font-medium text-neutral-300 text-left border-b border-neutral-800">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-3 py-2 border-b border-neutral-800/60 text-neutral-300">{children}</td>;
          },
          h1({ children }) {
            return <h1 className="text-base font-semibold text-white mt-3 mb-1.5">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-sm font-semibold text-white mt-3 mb-1">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-sm font-medium text-neutral-200 mt-2 mb-1">{children}</h3>;
          },
          hr() {
            return <hr className="my-3 border-neutral-800" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div id="luxion-chat-page" className="flex flex-col h-[calc(100vh-3.5rem)] w-full">
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

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[55vh] text-center select-none max-w-xl mx-auto px-4">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-950 via-neutral-900 to-indigo-950 border border-cyan-800/60 text-cyan-400 mb-4 shadow-xl shadow-cyan-950/40">
                <svg
                  className="h-7 w-7 text-cyan-300"
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
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <h2 className="text-xl font-bold text-neutral-100 tracking-[0.12em] font-sans">LUXION</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
                  v3.5 Core
                </span>
              </div>

              <p className="text-xs text-neutral-400 max-w-sm mb-6 leading-relaxed">
                Autonomous personal AI with deep vocal presence. Ask anything—from 100% accurate anime MC lookups to full-stack code, math, and creative cyber stories.
              </p>

              {/* Starter Quick Actions */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                <button
                  type="button"
                  onClick={() => {
                    setInput('Hey bro 👋');
                    textareaRef.current?.focus();
                  }}
                  className="p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 transition-all group"
                >
                  <div className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-300">
                    Hey bro 👋
                  </div>
                  <div className="text-[11px] text-neutral-500 line-clamp-1">
                    Direct casual greeting &amp; check-in
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInput('Death Note ka MC kaun hai?');
                    textareaRef.current?.focus();
                  }}
                  className="p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 transition-all group"
                >
                  <div className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-300">
                    Death Note ka MC kaun hai?
                  </div>
                  <div className="text-[11px] text-neutral-500 line-clamp-1">
                    Factual anime protagonist lookup
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInput('Who is Rimuru?');
                    textareaRef.current?.focus();
                  }}
                  className="p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 transition-all group"
                >
                  <div className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-300">
                    Who is Rimuru?
                  </div>
                  <div className="text-[11px] text-neutral-500 line-clamp-1">
                    Tensura Slime lore &amp; abilities
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInput('What can you do?');
                    textareaRef.current?.focus();
                  }}
                  className="p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 transition-all group"
                >
                  <div className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-300">
                    What can you do?
                  </div>
                  <div className="text-[11px] text-neutral-500 line-clamp-1">
                    Discover coding, reasoning &amp; tools
                  </div>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isSpeaking = speakingId === msg.id;
              const isNewlyCreated = !initialMessageIdsRef.current.has(msg.id);

              return (
                <motion.div
                  key={msg.id}
                  initial={
                    isNewlyCreated
                      ? shouldReduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            y: 8,
                            x: isUser ? 6 : -6,
                            scale: 0.985,
                          }
                      : false
                  }
                  animate={
                    isNewlyCreated
                      ? {
                          opacity: 1,
                          y: 0,
                          x: 0,
                          scale: 1,
                        }
                      : undefined
                  }
                  transition={
                    isNewlyCreated
                      ? {
                          duration: shouldReduceMotion ? 0.12 : isUser ? 0.2 : 0.23,
                          ease: [0.16, 1, 0.3, 1],
                        }
                      : undefined
                  }
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
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

                    {msg.attachment?.type === 'file' && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-400 font-mono bg-neutral-950/60 px-2.5 py-1 rounded-md border border-neutral-700/40 w-fit">
                        <Paperclip className="h-3 w-3" />
                        <span>{msg.attachment.name}</span>
                      </div>
                    )}

                    {!msg.attachment && msg.fileName && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-400 font-mono bg-neutral-950/40 px-2 py-1 rounded-md border border-neutral-700/40 w-fit">
                        <Paperclip className="h-3 w-3" />
                        <span>{msg.fileName}</span>
                      </div>
                    )}

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
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    ) : (
                      <TypewriterMessage
                        content={msg.content}
                        isNew={isNewlyCreated}
                        shouldReduceMotion={Boolean(shouldReduceMotion)}
                        renderContent={renderMessageContent}
                        forceComplete={isTypingStopped}
                        speed={appSettings?.typewriter?.speed || 'normal'}
                        soundEnabled={appSettings?.typewriter?.soundEnabled ?? true}
                        onCharacterTyped={() => {
                          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        onComplete={() => {
                          initialMessageIdsRef.current.add(msg.id);
                        }}
                      />
                    )}

                    {/* Emoji Reactions Badges */}
                    {msg.reactions && Object.entries(msg.reactions).some(([_, count]) => count > 0) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-0.5">
                        {Object.entries(msg.reactions).map(([emoji, count]) => {
                          if (count <= 0) return null;
                          const hasUserReacted = msg.userReactions?.includes(emoji);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-all duration-150 border ${
                                hasUserReacted
                                  ? 'bg-neutral-800 border-neutral-600 text-neutral-100 shadow-sm ring-1 ring-neutral-500/40 font-medium scale-[1.02]'
                                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800/50'
                              }`}
                              title={`${hasUserReacted ? 'Remove' : 'Add'} ${emoji} reaction`}
                            >
                              <span className="text-sm leading-none select-none">{emoji}</span>
                              <span className="text-[11px] font-mono">{count}</span>
                            </button>
                          );
                        })}

                        {/* Quick add reaction button next to badges */}
                        {!isUser && !msg.isError && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReactionPickerId(activeReactionPickerId === msg.id ? null : msg.id)
                            }
                            className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800/60 transition-colors"
                            title="Add reaction"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    )}

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

                          {/* Emoji Reaction Popover Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReactionPickerId(activeReactionPickerId === msg.id ? null : msg.id)
                              }
                              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                                activeReactionPickerId === msg.id || (msg.userReactions && msg.userReactions.length > 0)
                                  ? 'bg-neutral-800 text-neutral-200 font-medium'
                                  : 'hover:bg-neutral-800 hover:text-neutral-300'
                              }`}
                              title="Add reaction"
                            >
                              <SmilePlus className="h-3.5 w-3.5" />
                              <span>React</span>
                            </button>

                            {/* Floating Reaction Popover */}
                            {activeReactionPickerId === msg.id && (
                              <div
                                ref={reactionPickerRef}
                                className="absolute bottom-full left-0 mb-2 z-40 flex items-center gap-1 rounded-2xl border border-neutral-700/90 bg-neutral-900/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                              >
                                {AVAILABLE_REACTIONS.map(({ emoji, label, description }) => {
                                  const isSelected = msg.userReactions?.includes(emoji);
                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => {
                                        handleToggleReaction(msg.id, emoji);
                                        setActiveReactionPickerId(null);
                                      }}
                                      className={`group relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl transition-all duration-150 ${
                                        isSelected
                                          ? 'bg-neutral-800 ring-1 ring-neutral-600 scale-110 shadow-sm'
                                          : 'hover:bg-neutral-800 hover:scale-115 active:scale-95'
                                      }`}
                                      title={`${label} (${emoji}) - ${description}`}
                                    >
                                      <span className="text-base sm:text-lg leading-none select-none transition-transform duration-100 group-hover:scale-110">
                                        {emoji}
                                      </span>
                                      <span className="pointer-events-none absolute -top-7 rounded bg-neutral-950 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 opacity-0 shadow border border-neutral-800 transition-opacity group-hover:opacity-100 whitespace-nowrap z-50">
                                        {label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {index === messages.length - 1 && (
                            <button
                              type="button"
                              onClick={handleRetryLast}
                              className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
                              title="Regenerate response"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Regenerate</span>
                            </button>
                          )}
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
                </motion.div>
              );
            })
          )}

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

      <div className="p-4 sm:p-6 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent">
        <div className="mx-auto max-w-3xl">
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

          <div className="relative flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/95 shadow-xl focus-within:border-neutral-700 transition-colors">
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

            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
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

              <div className="flex items-center gap-2">
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

                {isLoading ? (
                  <button
                    id="btn-composer-stop"
                    type="button"
                    onClick={handleStopGeneration}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white active:scale-95 transition-all"
                    title="Stop generation"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    id="btn-composer-send"
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim() && !currentAttachment}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-950 hover:bg-white active:scale-95 disabled:opacity-30 disabled:hover:bg-neutral-100 transition-all"
                    title="Send message"
                  >
                    <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

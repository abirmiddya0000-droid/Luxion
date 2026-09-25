import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowUp,
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  Headphones,
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
  Download,
  Film,
  Sparkles,
} from 'lucide-react';
import { ChatMessage, VoiceSettings, ChatAttachment, AppSettings } from '../types';
import { sendChatMessage } from '../services/api';
import { TTSEngine, STTEngine } from '../services/speech';
import { CodeBlock } from './CodeBlock';
import { PreviewModal } from './PreviewModal';
import { TypewriterMessage } from './TypewriterMessage';
import { CommandPalette, AVAILABLE_COMMANDS } from './CommandPalette';
import { imageGenerationService } from '../services/imageGeneration';
import { videoGenerationService } from '../services/videoGeneration';
import { NavaGameSystem } from '../services/navaGameSystem';
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
    attachment?: ChatAttachment | null,
    command?: string
  ) => Promise<string>;
  onExecuteCommand?: (command: string) => void;
  onClearChat?: () => void;
  onUpdateVoiceSettings?: (voice: Partial<VoiceSettings>) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onUpdateMessages,
  voiceSettings,
  availableVoices,
  appSettings,
  onSendMessage,
  onExecuteCommand,
  onClearChat,
  onUpdateVoiceSettings,
}) => {
  const [input, setInput] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [isVoiceMode, setIsVoiceMode] = useState<boolean>(() => !!voiceSettings.continuousVoiceMode);
  const [voiceModeState, setVoiceModeState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const isVoiceModeRef = useRef<boolean>(!!voiceSettings.continuousVoiceMode);
  isVoiceModeRef.current = isVoiceMode;
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
    const unsub = TTSEngine.addStatusListener((id, status) => {
      setSpeakingId(id);
      setPlaybackState(status);
    });
    return () => {
      unsub();
      TTSEngine.stop();
      STTEngine.stopListening();
    };
  }, []);

  // Sync persistent Continuous Voice Mode setting from AppSettings
  useEffect(() => {
    const isContinuous = !!voiceSettings.continuousVoiceMode;
    setIsVoiceMode(isContinuous);
    isVoiceModeRef.current = isContinuous;

    if (isContinuous) {
      if (voiceModeState === 'idle' && !speakingId && !isLoading) {
        startVoiceModeListening();
      }
    } else {
      if (voiceModeState === 'listening') {
        STTEngine.stopListening();
        setVoiceModeState('idle');
      }
    }
  }, [voiceSettings.continuousVoiceMode]);

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

  const getActiveMaleVoice = () => {
    if (voiceSettings.userSelectedVoice && availableVoices[voiceSettings.voiceIndex]) {
      const selected = availableVoices[voiceSettings.voiceIndex];
      const analysis = TTSEngine.analyzeVoice(selected);
      if (analysis.isMasculine) {
        return selected;
      }
    }
    return TTSEngine.getBestMaleVoice();
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

  const handlePlay = (id: string, text: string) => {
    if (speakingId === id && playbackState === 'paused') {
      TTSEngine.resume();
      setPlaybackState('playing');
      return;
    }

    const voice = getActiveMaleVoice();
    const acoustics = TTSEngine.getCalibratedAcoustics(voice);
    setSpeakingId(id);
    setPlaybackState('playing');

    TTSEngine.speak(text, {
      messageId: id,
      voice,
      rate: voiceSettings.rate || acoustics.rate,
      pitch: voiceSettings.calibratedPitch || voiceSettings.pitch || acoustics.pitch,
      onStart: () => {
        setSpeakingId(id);
        setPlaybackState('playing');
      },
      onEnd: () => {
        setSpeakingId(null);
        setPlaybackState('idle');
        if (isVoiceModeRef.current) {
          startVoiceModeListening();
        }
      },
      onError: () => {
        setSpeakingId(null);
        setPlaybackState('idle');
        if (isVoiceModeRef.current) {
          startVoiceModeListening();
        }
      },
    });
  };

  const handlePause = () => {
    TTSEngine.pause();
    setPlaybackState('paused');
  };

  const handleStop = () => {
    TTSEngine.stop();
    setSpeakingId(null);
    setPlaybackState('idle');
    if (isVoiceModeRef.current) {
      setVoiceModeState('idle');
    }
  };

  const handleReplay = (id: string, text: string) => {
    const voice = getActiveMaleVoice();
    const acoustics = TTSEngine.getCalibratedAcoustics(voice);
    setSpeakingId(id);
    setPlaybackState('playing');

    TTSEngine.replay(id, text, {
      voice,
      rate: voiceSettings.rate || acoustics.rate,
      pitch: voiceSettings.calibratedPitch || voiceSettings.pitch || acoustics.pitch,
      onStart: () => {
        setSpeakingId(id);
        setPlaybackState('playing');
      },
      onEnd: () => {
        setSpeakingId(null);
        setPlaybackState('idle');
        if (isVoiceModeRef.current) {
          startVoiceModeListening();
        }
      },
      onError: () => {
        setSpeakingId(null);
        setPlaybackState('idle');
        if (isVoiceModeRef.current) {
          startVoiceModeListening();
        }
      },
    });
  };

  const startVoiceModeListening = () => {
    if (!isVoiceModeRef.current) return;
    setVoiceModeState('listening');
    let capturedTranscript = '';

    STTEngine.startListening({
      onResult: (transcript, isFinal) => {
        capturedTranscript = transcript;
        setInput(transcript);
        if (isFinal && transcript.trim().length > 0) {
          STTEngine.stopListening();
          setVoiceModeState('thinking');
          handleSend(transcript.trim());
        }
      },
      onError: (err) => {
        console.warn('Voice Mode recognition notice:', err);
        if (isVoiceModeRef.current) {
          setTimeout(() => {
            if (isVoiceModeRef.current && voiceModeState === 'listening') {
              startVoiceModeListening();
            }
          }, 1500);
        }
      },
      onEnd: () => {
        if (isVoiceModeRef.current && capturedTranscript.trim() && voiceModeState === 'listening') {
          setVoiceModeState('thinking');
          handleSend(capturedTranscript.trim());
        } else if (isVoiceModeRef.current && voiceModeState === 'listening') {
          // If browser speech recognition closed due to silence timeout, smoothly re-listen so voice mode remains continuous
          setTimeout(() => {
            if (isVoiceModeRef.current && voiceModeState === 'listening') {
              startVoiceModeListening();
            }
          }, 350);
        }
      },
    });
  };

  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      setIsVoiceMode(false);
      isVoiceModeRef.current = false;
      setVoiceModeState('idle');
      STTEngine.stopListening();
      TTSEngine.stop();
      setSpeakingId(null);
      setPlaybackState('idle');
      onUpdateVoiceSettings?.({ continuousVoiceMode: false });
    } else {
      setIsVoiceMode(true);
      isVoiceModeRef.current = true;
      onUpdateVoiceSettings?.({ continuousVoiceMode: true });
      startVoiceModeListening();
    }
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

  const normalizedQuery = input.trim().toLowerCase();
  const currentFilteredCommands = AVAILABLE_COMMANDS.filter((item) => {
    if (!normalizedQuery || normalizedQuery === '/') return true;
    const search = normalizedQuery.startsWith('/') ? normalizedQuery : `/${normalizedQuery}`;
    return (
      item.command.toLowerCase().includes(search) ||
      item.label.toLowerCase().includes(normalizedQuery.replace(/^\//, ''))
    );
  });

  const handleSend = async (overridePrompt?: string, overrideAttachment?: ChatAttachment | null) => {
    const text = overridePrompt !== undefined ? overridePrompt.trim() : input.trim();
    const activeAttach = overrideAttachment !== undefined ? overrideAttachment : currentAttachment;

    if (overridePrompt === undefined && text.startsWith('/')) {
      const trimmed = text.trim();
      const lower = trimmed.toLowerCase();

      if (lower === '/clear') {
        if (onClearChat) {
          onClearChat();
        } else {
          onUpdateMessages([]);
        }
        setInput('');
        setCurrentAttachment(null);
        return;
      }

      if (lower === '/help') {
        if (onExecuteCommand) {
          onExecuteCommand('/help');
        } else {
          onUpdateMessages([
            ...messages,
            {
              id: `bot_${Date.now()}`,
              role: 'assistant',
              content:
                '### LUXION Command System\n- `/code <request>` — Coding-focused AI response & implementation\n- `/design <request>` — System & UI design specification\n- `/analyze <request>` — Deep technical & architectural analysis\n- `/build web <request>` — Web application scaffold workflow\n- `/build game <request>` — 2D canvas game scaffold workflow\n- `/clear` — Clear current screen\n- `/help` — Display command guide and keybindings',
              timestamp: Date.now(),
            },
          ]);
        }
        setInput('');
        return;
      }
    }

    let activeCommand: string | undefined = undefined;
    if (text.startsWith('/')) {
      const lower = text.toLowerCase();
      if (lower.startsWith('/build web')) activeCommand = '/build web';
      else if (lower.startsWith('/build game')) activeCommand = '/build game';
      else if (lower.startsWith('/build app') || lower.startsWith('/build website') || lower.startsWith('/build')) activeCommand = '/build web';
      else if (lower.startsWith('/code')) activeCommand = '/code';
      else if (lower.startsWith('/design')) activeCommand = '/design';
      else if (lower.startsWith('/analyze')) activeCommand = '/analyze';
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

    const lowerText = (text || '').toLowerCase().trim();

    // 1. Check NAVA interactive loading screen build request
    if (
      lowerText.includes('build a nava loading screen') ||
      lowerText.includes('nava loading screen') ||
      (activeCommand === '/game' && lowerText.includes('loading screen'))
    ) {
      const code = NavaGameSystem.generateLoadingScreenCode();
      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: `### **NAVA Original Game — Interactive Loading Screen**\n\nHere is the runnable HTML5/CSS loading screen architecture for NAVA. You can preview it immediately using the **Preview** button:\n\n\`\`\`html\n${code}\n\`\`\``,
        timestamp: Date.now(),
      };
      onUpdateMessages([...newMessages, botMessage]);
      setIsLoading(false);
      return;
    }

    // 2. Check NAVA Main Character request
    if (
      lowerText.includes('create nava mc') ||
      lowerText.includes('nava main character') ||
      lowerText.includes('nava protagonist') ||
      (activeCommand === '/character' && (lowerText.includes('mc') || lowerText.includes('main') || !text.trim()))
    ) {
      const spec = NavaGameSystem.createMainCharacter();
      const formatted = NavaGameSystem.formatCharacterMarkdown(spec);
      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: formatted,
        timestamp: Date.now(),
      };
      onUpdateMessages([...newMessages, botMessage]);
      setIsLoading(false);
      return;
    }

    // 3. Image Generation Workflow (/image, /image-gen, or explicit image creation)
    const isImageGen =
      activeCommand === '/image' ||
      activeCommand === '/image-gen' ||
      /^(?:generate|create|render|draw|make)\s+(?:an?\s+)?(?:image|picture|artwork|illustration|portrait|drawing)\b/i.test(text);

    if (isImageGen) {
      setLoadingLabel('Creating image...');
      const cleanPrompt = text.replace(/^\/(?:image|image-gen)\s*/i, '').trim() || 'NAVA high fantasy original protagonist concept art';
      try {
        const imageResult = await imageGenerationService.generateImage(cleanPrompt);
        if (imageResult.success && (imageResult.imageData || imageResult.imageUrl)) {
          const botMessage: ChatMessage = {
            id: `bot_${Date.now()}`,
            role: 'assistant',
            content: `Generated concept image for: "${cleanPrompt}"`,
            mediaType: 'image',
            mediaData: imageResult.imageData,
            mediaUrl: imageResult.imageUrl,
            mediaPrompt: cleanPrompt,
            provider: imageResult.provider,
            timestamp: Date.now(),
          };
          onUpdateMessages([...newMessages, botMessage]);
          return;
        } else {
          const botMessage: ChatMessage = {
            id: `bot_${Date.now()}`,
            role: 'assistant',
            content: `### **LUXION Visual Concept Specification**\n\n**Visual Prompt:**\n\`\`\`text\n${cleanPrompt}\n\`\`\`\n\n> **Provider Notice:** ${imageResult.error || 'The image generation provider is not configured yet. Set IMAGE_API_KEY on the server to generate real images.'}`,
            timestamp: Date.now(),
          };
          onUpdateMessages([...newMessages, botMessage]);
          return;
        }
      } catch (err: any) {
        const botMessage: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          content: `Image generation error: ${err.message || 'Unable to connect to generation service'}.`,
          isError: true,
          timestamp: Date.now(),
        };
        onUpdateMessages([...newMessages, botMessage]);
        return;
      } finally {
        setIsLoading(false);
        setLoadingLabel(null);
      }
    }

    // 4. Video Generation Workflow (/video, /video-gen, or explicit video creation)
    const isVideoGen =
      activeCommand === '/video' ||
      activeCommand === '/video-gen' ||
      /^(?:generate|create|render|make)\s+(?:an?\s+)?(?:cinematic\s+)?(?:video|clip|animation|footage)\b/i.test(text);

    if (isVideoGen) {
      setLoadingLabel('Generating video...');
      const cleanPrompt = text.replace(/^\/(?:video|video-gen)\s*/i, '').trim() || 'NAVA cinematic high fantasy trailer cutscene';
      try {
        const videoResult = await videoGenerationService.generateVideo(cleanPrompt);
        if (videoResult.success && (videoResult.videoUrl || videoResult.videoData)) {
          const botMessage: ChatMessage = {
            id: `bot_${Date.now()}`,
            role: 'assistant',
            content: `Generated cinematic video for: "${cleanPrompt}"`,
            mediaType: 'video',
            mediaUrl: videoResult.videoUrl,
            mediaData: videoResult.videoData,
            mediaPrompt: cleanPrompt,
            provider: videoResult.provider,
            timestamp: Date.now(),
          };
          onUpdateMessages([...newMessages, botMessage]);
          return;
        } else {
          const botMessage: ChatMessage = {
            id: `bot_${Date.now()}`,
            role: 'assistant',
            content: `### **LUXION Cinematic Video Specification**\n\n**Cinematic Prompt:**\n\`\`\`text\n${cleanPrompt}\n\`\`\`\n\n> **Provider Notice:** ${videoResult.error || 'The video generation provider is not configured yet. Set VIDEO_API_KEY on the server to generate real videos.'}`,
            timestamp: Date.now(),
          };
          onUpdateMessages([...newMessages, botMessage]);
          return;
        }
      } catch (err: any) {
        const botMessage: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          content: `Video generation error: ${err.message || 'Unable to connect to generation service'}.`,
          isError: true,
          timestamp: Date.now(),
        };
        onUpdateMessages([...newMessages, botMessage]);
        return;
      } finally {
        setIsLoading(false);
        setLoadingLabel(null);
      }
    }

    // 5. Standard AI Chat / Code / Reasoning Pipeline
    try {
      setLoadingLabel(null);
      const history = newMessages
        .slice(-10)
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const reply = onSendMessage
        ? await onSendMessage(text, history, attachedSnapshot, activeCommand)
        : await sendChatMessage(text, history, attachedSnapshot, undefined, activeCommand);

      const botMessageId = `bot_${Date.now()}`;
      const botMessage: ChatMessage = {
        id: botMessageId,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      const updated = [...newMessages, botMessage];
      onUpdateMessages(updated);

      if (isVoiceModeRef.current) {
        setVoiceModeState('speaking');
        setTimeout(() => {
          handlePlay(botMessageId, reply);
        }, 200);
      } else if (voiceSettings.autoSpeak) {
        setTimeout(() => {
          handlePlay(botMessageId, reply);
        }, 200);
      }
    } catch (err: any) {
      if (isVoiceModeRef.current) {
        setVoiceModeState('idle');
        setTimeout(() => {
          if (isVoiceModeRef.current && voiceModeState === 'idle') {
            startVoiceModeListening();
          }
        }, 2200);
      }
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: err?.message || 'AI service is temporarily unavailable. Please try again later.',
        isError: true,
        timestamp: Date.now(),
      };
      onUpdateMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingLabel(null);
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
    if (input.startsWith('/') && currentFilteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev + 1) % currentFilteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(
          (prev) => (prev - 1 + currentFilteredCommands.length) % currentFilteredCommands.length
        );
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const chosen = currentFilteredCommands[selectedCommandIndex]?.command;
        if (chosen) {
          setInput(chosen);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput('');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.startsWith('/') && currentFilteredCommands.length > 0 && input.trim() === '/') {
        const chosen = currentFilteredCommands[selectedCommandIndex]?.command;
        if (chosen) {
          if (chosen === '/clear') {
            if (onClearChat) onClearChat();
            setInput('');
            return;
          }
          if (chosen === '/help') {
            if (onExecuteCommand) onExecuteCommand('/help');
            setInput('');
            return;
          }
          setInput(`${chosen} `);
          return;
        }
      }
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
            <div className="flex flex-col items-center justify-center min-h-[58vh] text-center select-none max-w-xl mx-auto px-4">
              <h1 className="text-3xl sm:text-4xl font-mono font-bold tracking-[0.28em] text-white">
                LUXION
              </h1>
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
                    className={`max-w-[92%] sm:max-w-[85%] rounded-xl p-4 text-xs sm:text-sm font-mono leading-relaxed ${
                      msg.isError
                        ? 'bg-neutral-950 text-neutral-300 border border-neutral-700 shadow-sm'
                        : isUser
                        ? 'bg-neutral-900 text-white border border-neutral-800'
                        : 'bg-black text-neutral-200 border border-neutral-900 shadow-sm'
                    }`}
                  >
                    {/* Render Real Generated Images */}
                    {msg.mediaType === 'image' && (msg.mediaData || msg.mediaUrl) && (
                      <div className="mb-3 overflow-hidden rounded-xl border border-neutral-700/60 bg-neutral-950 max-w-md">
                        <img
                          src={msg.mediaData || msg.mediaUrl}
                          alt={msg.mediaPrompt || 'Generated image'}
                          className="max-h-80 w-full object-cover rounded-t-xl"
                          referrerPolicy="no-referrer"
                        />
                        <div className="p-3 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold block">Generated Image</span>
                            {msg.mediaPrompt && (
                              <p className="text-[11px] text-neutral-300 font-mono truncate" title={msg.mediaPrompt}>
                                {msg.mediaPrompt}
                              </p>
                            )}
                          </div>
                          <a
                            href={msg.mediaData || msg.mediaUrl}
                            download="luxion-image.jpg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1 text-[11px] font-mono text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-2.5 py-1 rounded transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            <span>Save</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Render Real Generated Videos */}
                    {msg.mediaType === 'video' && (msg.mediaData || msg.mediaUrl) && (
                      <div className="mb-3 overflow-hidden rounded-xl border border-neutral-700/60 bg-neutral-950 max-w-md">
                        <video
                          src={msg.mediaData || msg.mediaUrl}
                          controls
                          className="max-h-80 w-full object-cover rounded-t-xl bg-black"
                        />
                        <div className="p-3 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold block">Generated Video</span>
                            {msg.mediaPrompt && (
                              <p className="text-[11px] text-neutral-300 font-mono truncate" title={msg.mediaPrompt}>
                                {msg.mediaPrompt}
                              </p>
                            )}
                          </div>
                          <a
                            href={msg.mediaData || msg.mediaUrl}
                            download="luxion-video.mp4"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1 text-[11px] font-mono text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-2.5 py-1 rounded transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            <span>Save</span>
                          </a>
                        </div>
                      </div>
                    )}

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
                      <div className="space-y-2 font-mono">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-white shrink-0 mt-0.5" />
                          <div className="text-xs text-neutral-300 whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRetryLast}
                          className="flex items-center gap-1 text-[11px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-2.5 py-1 rounded transition-colors"
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
                          {/* Minimal Speaker Controls with clearly differentiated Play, Pause, and Stop */}
                          {speakingId === msg.id ? (
                            <div className="flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-950 p-1 text-xs font-mono shadow-sm">
                              {/* Minimal Status Indicator */}
                              <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] border-r border-neutral-800 select-none">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    playbackState === 'playing' ? 'bg-white animate-pulse' : 'bg-neutral-500'
                                  }`}
                                />
                                <span className={playbackState === 'playing' ? 'text-white font-medium' : 'text-neutral-400'}>
                                  {playbackState === 'playing' ? 'Playing' : 'Paused'}
                                </span>
                              </div>

                              {/* Play / Resume Action */}
                              <button
                                type="button"
                                onClick={() => handlePlay(msg.id, msg.content)}
                                disabled={playbackState === 'playing'}
                                className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                                  playbackState === 'paused'
                                    ? 'bg-white text-black font-semibold hover:bg-neutral-200'
                                    : 'text-neutral-600 cursor-default opacity-40'
                                }`}
                                title={playbackState === 'paused' ? 'Resume playback' : 'Currently playing'}
                              >
                                <Play className="h-3 w-3 fill-current" />
                                <span>Play</span>
                              </button>

                              {/* Pause Action */}
                              <button
                                type="button"
                                onClick={handlePause}
                                disabled={playbackState === 'paused'}
                                className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                                  playbackState === 'playing'
                                    ? 'border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white'
                                    : 'text-neutral-600 cursor-default opacity-40'
                                }`}
                                title={playbackState === 'playing' ? 'Pause playback' : 'Currently paused'}
                              >
                                <Pause className="h-3 w-3 fill-current" />
                                <span>Pause</span>
                              </button>

                              {/* Stop Action */}
                              <button
                                type="button"
                                onClick={handleStop}
                                className="flex items-center gap-1 rounded border border-neutral-800 bg-neutral-900/60 px-2 py-0.5 text-xs text-neutral-400 hover:border-neutral-700 hover:bg-neutral-800 hover:text-white transition-colors"
                                title="Stop playback"
                              >
                                <Square className="h-2.5 w-2.5 fill-current" />
                                <span>Stop</span>
                              </button>

                              {/* Replay Action */}
                              <button
                                type="button"
                                onClick={() => handleReplay(msg.id, msg.content)}
                                className="flex items-center justify-center h-6 w-6 rounded text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                                title="Replay from start"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePlay(msg.id, msg.content)}
                              className="flex items-center gap-1.5 rounded-md border border-neutral-800/80 bg-neutral-900/60 px-2.5 py-1 text-xs font-mono text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800 hover:text-white transition-all"
                              title="Play response aloud (Deep Male Voice)"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              <span>Play</span>
                            </button>
                          )}

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
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/90 px-4 py-3 text-xs text-neutral-400 flex items-center gap-2 font-mono">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:0.2s]"></span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:0.4s]"></span>
                {loadingLabel && (
                  <span className="ml-1 text-neutral-300 font-medium tracking-wide">
                    {loadingLabel}
                  </span>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent">
        <div className="mx-auto max-w-3xl">
          {isVoiceMode && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs font-mono animate-fade-in shadow-lg">
              <div className="flex items-center gap-2.5">
                {voiceModeState === 'listening' && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    <span className="text-white font-medium">Listening...</span>
                    <span className="text-neutral-400 text-[11px] hidden sm:inline">• Hands-Free Active</span>
                  </>
                )}
                {voiceModeState === 'thinking' && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse" />
                    <span className="text-neutral-300">Thinking...</span>
                  </>
                )}
                {voiceModeState === 'speaking' && (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-white animate-pulse" />
                    <span className="text-white font-medium">Speaking...</span>
                  </>
                )}
                {voiceModeState === 'idle' && (
                  <span className="text-neutral-400">Voice Mode Ready</span>
                )}
              </div>
              <button
                type="button"
                onClick={toggleVoiceMode}
                className="text-[11px] text-neutral-400 hover:text-white px-2 py-0.5 rounded border border-neutral-800 hover:border-neutral-600 transition-colors"
                title="Exit Voice Mode"
              >
                Exit Voice Mode
              </button>
            </div>
          )}

          {!isVoiceMode && isListening && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
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

          <div className="relative flex flex-col rounded-xl border border-neutral-800 bg-black focus-within:border-neutral-600 transition-colors">
            {/* Minimal Command Suggestion Palette */}
            <CommandPalette
              query={input}
              isOpen={input.startsWith('/')}
              selectedIndex={selectedCommandIndex}
              onSelect={(cmd) => {
                if (cmd === '/clear') {
                  if (onClearChat) onClearChat();
                  setInput('');
                  return;
                }
                if (cmd === '/help') {
                  if (onExecuteCommand) onExecuteCommand('/help');
                  setInput('');
                  return;
                }
                setInput(`${cmd} `);
                if (textareaRef.current) {
                  textareaRef.current.focus();
                }
              }}
              onClose={() => setInput('')}
            />

            {input.startsWith('/') && (
              <div className="px-4 pt-2.5 flex items-center gap-2 text-[10px] font-mono select-none">
                <span className="px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-white font-bold">
                  COMMAND
                </span>
                <span className="text-neutral-400">
                  {input.trim() || '/'}
                </span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              id="chat-composer-input"
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening...' : 'Type / for commands, or message LUXION...'}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-xs sm:text-sm text-white placeholder-neutral-500 font-mono focus:outline-none max-h-44"
            />

            <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-neutral-900">
              <div className="relative" ref={plusMenuRef}>
                <button
                  id="btn-composer-plus"
                  type="button"
                  onClick={() => setShowPlusMenu((prev) => !prev)}
                  className={`flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors ${
                    showPlusMenu ? 'bg-neutral-800 text-white' : ''
                  }`}
                  title="Attach file or image"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                {showPlusMenu && (
                  <div
                    id="composer-plus-menu"
                    className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border border-neutral-800 bg-black p-1 shadow-2xl z-30 text-xs font-mono"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlusMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors text-left"
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
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors text-left"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Upload image</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-composer-voicemode"
                  type="button"
                  onClick={toggleVoiceMode}
                  className={`flex h-7 items-center gap-1.5 px-2 rounded text-xs font-mono transition-colors ${
                    isVoiceMode
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800'
                  }`}
                  title={isVoiceMode ? 'Exit Hands-Free Voice Mode' : 'Enter Hands-Free Voice Mode'}
                >
                  <Headphones className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Voice Mode</span>
                </button>

                <button
                  id="btn-composer-voice"
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                    isListening && !isVoiceMode
                      ? 'bg-white text-black'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>

                {isLoading ? (
                  <button
                    id="btn-composer-stop"
                    type="button"
                    onClick={handleStopGeneration}
                    className="flex h-7 w-7 items-center justify-center rounded bg-neutral-900 border border-neutral-700 text-white hover:bg-neutral-800 transition-colors"
                    title="Stop generation"
                  >
                    <Square className="h-3 w-3 fill-current" />
                  </button>
                ) : (
                  <button
                    id="btn-composer-send"
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim() && !currentAttachment}
                    className="flex h-7 w-7 items-center justify-center rounded bg-white text-black hover:bg-neutral-200 active:scale-95 disabled:opacity-30 disabled:hover:bg-white transition-all"
                    title="Send message or run command"
                  >
                    <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
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

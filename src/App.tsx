import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { OpeningSplash } from './components/OpeningSplash';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { StoryView } from './components/StoryView';
import { AboutModal } from './components/AboutModal';
import { AuthModal } from './components/AuthModal';
import { BuildWorkspace, BuildTarget } from './components/BuildWorkspace';
import { HelpModal } from './components/HelpModal';
import { AudioWaveVisualizer } from './components/AudioWaveVisualizer';
import { User, ChatMessage, HistorySession, VoiceSettings, ChatAttachment, AppSettings } from './types';
import {
  getSavedSessions,
  saveSession,
  deleteSession as deleteSessionStorage,
  clearAllSessions as clearAllSessionsStorage,
  generateSessionTitle,
} from './services/historyStorage';
import { TTSEngine } from './services/speech';
import { LuxionBrain } from './services/luxionBrain';
import { MemoryService } from './services/memory';
import { sendChatMessage } from './services/api';

const DEFAULT_APP_SETTINGS: AppSettings = {
  language: {
    selected: 'en',
    autoDetect: true,
  },
  persona: {
    mode: 'arrogant_android',
    arroganceLevel: 4,
    languageStyle: 'auto',
    callHumanTitle: 'insaan',
  },
  voice: {
    autoSpeak: false,
    continuousVoiceMode: false,
    rate: 0.96,
    pitch: 0.93,
    voiceIndex: 0,
    toneBadge: 'Deep Baritone • Authoritative',
    calibratedPitch: 0.93,
  },
  typewriter: {
    enabled: true,
    speed: 'normal',
    soundEnabled: true,
    soundVolume: 0.25,
    hologramGlow: true,
  },
  chat: {
    enterToSend: true,
    renderMarkdown: true,
    codePreview: true,
  },
  theme: 'cyber_cyan',
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const [activeSessionId, setActiveSessionId] = useState<string>(() => `sess_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<HistorySession[]>([]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStoriesOpen, setIsStoriesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'appearance' | 'voice' | 'chat' | 'memory' | 'about'>('voice');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Slash command workspace & help states
  const [isBuildWorkspaceOpen, setIsBuildWorkspaceOpen] = useState(false);
  const [buildTarget, setBuildTarget] = useState<BuildTarget>('web');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('luxion_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('luxion_app_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const voiceSettings = { ...DEFAULT_APP_SETTINGS.voice, ...(parsed.voice || {}) };
        const vName = (voiceSettings.voiceName || '').toLowerCase();
        const isFeminineName = /female|woman|girl|lady|zira|samantha|karen|jenny|aria|susan|google us english|victoria|hazel/.test(vName);
        if (
          isFeminineName ||
          voiceSettings.toneBadge?.includes('Android Girl') ||
          voiceSettings.pitch < 0.90 ||
          !voiceSettings.calibratedPitch
        ) {
          voiceSettings.userSelectedVoice = false;
          voiceSettings.voiceIndex = 0;
          voiceSettings.pitch = DEFAULT_APP_SETTINGS.voice.pitch;
          voiceSettings.calibratedPitch = DEFAULT_APP_SETTINGS.voice.calibratedPitch;
          voiceSettings.rate = DEFAULT_APP_SETTINGS.voice.rate;
          voiceSettings.toneBadge = DEFAULT_APP_SETTINGS.voice.toneBadge;
          voiceSettings.voiceName = undefined;
        }
        return {
          ...DEFAULT_APP_SETTINGS,
          ...parsed,
          persona: { ...DEFAULT_APP_SETTINGS.persona, ...(parsed.persona || {}) },
          voice: voiceSettings,
          typewriter: { ...DEFAULT_APP_SETTINGS.typewriter, ...(parsed.typewriter || {}) },
        };
      } catch (e) {}
    }
    return DEFAULT_APP_SETTINGS;
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const prioritized = TTSEngine.getPrioritizedVoices();
      if (prioritized && prioritized.length > 0) {
        const orderedVoices = prioritized.map((p) => p.voice);
        setAvailableVoices(orderedVoices);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    setSessions(getSavedSessions());

    const handleSessionsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<HistorySession[]>;
      if (customEvent.detail) {
        setSessions(customEvent.detail);
      } else {
        setSessions(getSavedSessions());
      }
    };

    window.addEventListener('luxion_sessions_updated', handleSessionsUpdated);
    return () => {
      window.removeEventListener('luxion_sessions_updated', handleSessionsUpdated);
    };
  }, []);

  const handleUpdateAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem('luxion_app_settings', JSON.stringify(newSettings));
  };

  const handleUpdateVoiceSettings = useCallback((partial: Partial<VoiceSettings>) => {
    setAppSettings((prev) => {
      const updated: AppSettings = {
        ...prev,
        voice: {
          ...prev.voice,
          ...partial,
        },
      };
      localStorage.setItem('luxion_app_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleUpdateMessages = useCallback(
    (newMessages: ChatMessage[]) => {
      setMessages(newMessages);
      if (newMessages.length > 0) {
        const title = generateSessionTitle(newMessages);
        const sessionToSave: HistorySession = {
          id: activeSessionId,
          title,
          messages: newMessages,
          updatedAt: Date.now(),
        };
        saveSession(sessionToSave);
      }
    },
    [activeSessionId]
  );

  const handleNewChat = useCallback(() => {
    const newId = `sess_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([]);
  }, []);

  const handleSelectSession = useCallback((session: HistorySession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
  }, []);

  const handleDeleteSession = useCallback(
    (id: string) => {
      const updated = deleteSessionStorage(id);
      setSessions(updated);
      if (activeSessionId === id) {
        handleNewChat();
      }
    },
    [activeSessionId, handleNewChat]
  );

  const handleClearAllSessions = useCallback(() => {
    clearAllSessionsStorage();
    setSessions([]);
    handleNewChat();
  }, [handleNewChat]);

  const handleAuthSuccess = (authUser: User, token: string) => {
    setUser(authUser);
    localStorage.setItem('luxion_user', JSON.stringify(authUser));
    localStorage.setItem('luxion_token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('luxion_user');
    localStorage.removeItem('luxion_token');
  };

  const handleToggleReadAloud = useCallback(() => {
    if (isSpeaking) {
      TTSEngine.stop();
      setIsSpeaking(false);
      return;
    }
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistantMsg) return;
    setIsSpeaking(true);
    const prioritized = TTSEngine.getPrioritizedVoices();
    const voiceObj = prioritized[appSettings.voice.voiceIndex]?.voice || TTSEngine.getBestMaleVoice();
    TTSEngine.speak(lastAssistantMsg.content, {
      pitch: appSettings.voice.calibratedPitch || appSettings.voice.pitch || 0.93,
      rate: appSettings.voice.rate || 0.96,
      voice: voiceObj,
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [isSpeaking, messages, appSettings.voice]);

  const handleToggleAutoSpeak = useCallback(() => {
    setAppSettings((prev) => {
      const updated = {
        ...prev,
        voice: {
          ...prev.voice,
          autoSpeak: !prev.voice.autoSpeak,
        },
      };
      localStorage.setItem('luxion_app_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleClearCurrentChat = useCallback(() => {
    setMessages([]);
    if (activeSessionId) {
      const sessionToSave: HistorySession = {
        id: activeSessionId,
        title: 'New Conversation',
        messages: [],
        updatedAt: Date.now(),
      };
      saveSession(sessionToSave);
      setSessions(getSavedSessions());
    }
  }, [activeSessionId]);

  /**
   * Main conversational pipeline:
   * USER MESSAGE -> /api/chat (Server-Side Gemini Flash) -> LUXION UI
   */
  const handleSendMessage = useCallback(
    async (
      message: string,
      history: Array<{ role: 'user' | 'assistant'; content: string }>,
      attachment?: ChatAttachment | null,
      command?: string
    ): Promise<string> => {
      return await sendChatMessage(message, history, attachment, undefined, command);
    },
    []
  );

  const handleExecuteCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      const lower = trimmed.toLowerCase();

      if (lower === '/clear') {
        handleClearCurrentChat();
        return;
      }

      if (lower === '/help') {
        setIsHelpOpen(true);
        return;
      }

      let target: BuildTarget = 'web';
      let title = 'Web Application';

      if (lower.startsWith('/build game')) {
        target = 'game';
        title = 'Interactive 2D Game';
      } else if (lower.startsWith('/build app')) {
        target = 'app';
        title = 'Frontend Application Prototype';
      } else if (lower.startsWith('/build website')) {
        target = 'website';
        title = 'Responsive Website Scaffold';
      } else if (lower.startsWith('/build web') || lower === '/build') {
        target = 'web';
        title = 'Web Application Scaffold';
      } else if (lower.startsWith('/code')) {
        target = 'code';
        title = 'Code Editor & Scratchpad';
      } else if (lower.startsWith('/analyze')) {
        target = 'analyze';
        title = 'Code & Architecture Analysis';
      } else if (lower.startsWith('/design')) {
        target = 'design';
        title = 'UI / System Design Specification';
      }

      setBuildTarget(target);
      setIsBuildWorkspaceOpen(true);

      const userMsg: ChatMessage = {
        id: `usr_${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const botMsg: ChatMessage = {
        id: `bot_${Date.now() + 1}`,
        role: 'assistant',
        content: `**LUXION Workspace Prepared**\n- Target: \`${title}\`\n- Mode: Client-Side Sandbox Scaffold\n- Status: Initialized\n\n*Frontend prototype workspace active.*`,
        timestamp: Date.now() + 1,
      };

      handleUpdateMessages([...messages, userMsg, botMsg]);
    },
    [handleClearCurrentChat, handleUpdateMessages, messages]
  );

  const handleExportChat = useCallback(() => {
    if (messages.length === 0) return;
    const formatted = messages
      .map((m) => {
        const reactionsStr =
          m.reactions && Object.entries(m.reactions).some(([_, count]) => count > 0)
            ? `\n*Reactions: ${Object.entries(m.reactions)
                .filter(([_, count]) => count > 0)
                .map(([emoji, count]) => `${emoji} ${count}`)
                .join(' ')}*\n`
            : '';
        return `### ${m.role === 'user' ? 'User' : 'LUXION'} (${new Date(
          m.timestamp
        ).toLocaleTimeString()})\n\n${m.content}\n${reactionsStr}`;
      })
      .join('\n---\n\n');
    const blob = new Blob([formatted], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luxion-chat-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-mono selection:bg-neutral-800 selection:text-white">
      <AnimatePresence>
        {showSplash && <OpeningSplash onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash && (
        <div className="flex flex-col min-h-screen animate-fade-in bg-black">
          <Header
            hasMessages={messages.length > 0}
            onNewChat={handleNewChat}
            onOpenProjects={() => {
              setBuildTarget('web');
              setIsBuildWorkspaceOpen(true);
            }}
            onOpenSettings={() => {
              setSettingsInitialTab('voice');
              setIsSettingsOpen(true);
            }}
            onOpenHelp={() => setIsHelpOpen(true)}
            onOpenAbout={() => setIsAboutOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onToggleReadAloud={handleToggleReadAloud}
            isSpeaking={isSpeaking}
            onClearCurrentChat={handleClearCurrentChat}
          />

          <main className="flex-1 flex flex-col bg-black">
            <ChatView
              messages={messages}
              onUpdateMessages={handleUpdateMessages}
              voiceSettings={appSettings.voice}
              availableVoices={availableVoices}
              appSettings={appSettings}
              onSendMessage={handleSendMessage}
              onExecuteCommand={handleExecuteCommand}
              onClearChat={handleClearCurrentChat}
              onUpdateVoiceSettings={handleUpdateVoiceSettings}
            />
          </main>

          {/* Audio Wave Visualizer when TTS is speaking */}
          <AudioWaveVisualizer
            isSpeaking={isSpeaking}
            onStop={() => {
              TTSEngine.stop();
              setIsSpeaking(false);
            }}
          />

          {/* LUXION Build Workspace */}
          <BuildWorkspace
            isOpen={isBuildWorkspaceOpen}
            target={buildTarget}
            onClose={() => setIsBuildWorkspaceOpen(false)}
            onSwitchTarget={(t) => setBuildTarget(t)}
          />

          {/* Slash Commands & Help Guide */}
          <HelpModal
            isOpen={isHelpOpen}
            onClose={() => setIsHelpOpen(false)}
            onSelectCommand={(cmd) => handleExecuteCommand(cmd)}
          />

          <HistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onNewChat={handleNewChat}
            onClearAll={handleClearAllSessions}
          />

          {isStoriesOpen && (
            <StoryView
              sessions={sessions}
              currentSessionId={activeSessionId}
              onSelectStory={(id) => {
                const found = sessions.find((s) => s.id === id);
                if (found) handleSelectSession(found);
                setIsStoriesOpen(false);
              }}
              onNewStory={handleNewChat}
              onDeleteStory={handleDeleteSession}
              onClose={() => setIsStoriesOpen(false)}
            />
          )}

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={appSettings}
            onUpdateSettings={handleUpdateAppSettings}
            initialTab={settingsInitialTab}
          />

          <AboutModal
            isOpen={isAboutOpen}
            onClose={() => setIsAboutOpen(false)}
          />

          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onSuccess={handleAuthSuccess}
          />
        </div>
      )}
    </div>
  );
}

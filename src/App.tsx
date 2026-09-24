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
    rate: 0.96,
    pitch: 0.85,
    voiceIndex: 0,
    toneBadge: 'Cyber Android Girl • Deep',
    calibratedPitch: 0.85,
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
        return {
          ...DEFAULT_APP_SETTINGS,
          ...parsed,
          persona: { ...DEFAULT_APP_SETTINGS.persona, ...(parsed.persona || {}) },
          voice: { ...DEFAULT_APP_SETTINGS.voice, ...(parsed.voice || {}) },
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
    const voiceObj = prioritized[appSettings.voice.voiceIndex]?.voice || TTSEngine.getBestRoboticGirlVoice();
    TTSEngine.speak(lastAssistantMsg.content, {
      pitch: appSettings.voice.calibratedPitch || appSettings.voice.pitch || 0.85,
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
   * Main conversational pipeline preprocessing and orchestration:
   * USER MESSAGE -> LUXION BRAIN -> INTENT + CONTEXT + PERSONALITY STATE -> RELEVANT MEMORY -> KNOWLEDGE CONTEXT -> RESPONSE PROVIDER -> MEMORY SYNC -> CHAT UI -> TTS
   */
  const handleSendMessage = useCallback(
    async (
      message: string,
      history: Array<{ role: 'user' | 'assistant'; content: string }>,
      attachment?: ChatAttachment | null
    ): Promise<string> => {
      const explicitLang = appSettings.language?.autoDetect ? undefined : appSettings.language?.selected;
      const brainResponse = await LuxionBrain.processPipeline({
        message,
        history,
        attachment,
        user,
        language: explicitLang,
      });

      return brainResponse.reply;
    },
    [user, appSettings.language]
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-neutral-800 selection:text-white">
      <AnimatePresence>
        {showSplash && <OpeningSplash onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash && (
        <div className="flex flex-col min-h-screen animate-fade-in">
          <Header
            user={user}
            onNewChat={handleNewChat}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onOpenStories={() => setIsStoriesOpen(true)}
            onOpenSettings={(tab) => {
              setSettingsInitialTab(tab || 'voice');
              setIsSettingsOpen(true);
            }}
            onOpenAbout={() => setIsAboutOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onExportChat={handleExportChat}
            onLogout={handleLogout}
            isSpeaking={isSpeaking}
            onToggleReadAloud={handleToggleReadAloud}
            autoSpeak={appSettings.voice.autoSpeak}
            onToggleAutoSpeak={handleToggleAutoSpeak}
            onClearCurrentChat={handleClearCurrentChat}
          />

          <main className="flex-1 flex flex-col">
            <ChatView
              messages={messages}
              onUpdateMessages={handleUpdateMessages}
              voiceSettings={appSettings.voice}
              availableVoices={availableVoices}
              appSettings={appSettings}
              onSendMessage={handleSendMessage}
            />
          </main>

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

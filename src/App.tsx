import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { OpeningSplash } from './components/OpeningSplash';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { AuthModal } from './components/AuthModal';
import { User, ChatMessage, HistorySession, VoiceSettings } from './types';
import {
  getSavedSessions,
  saveSession,
  deleteSession as deleteSessionStorage,
  clearAllSessions as clearAllSessionsStorage,
  generateSessionTitle,
} from './services/historyStorage';
import { TTSEngine } from './services/speech';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const [activeSessionId, setActiveSessionId] = useState<string>(() => `sess_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<HistorySession[]>([]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('luxion_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('luxion_voice_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      autoSpeak: false,
      rate: 1.0,
      pitch: 0.95,
      voiceIndex: 0,
    };
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = TTSEngine.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
        const bestMale = TTSEngine.getBestMaleVoice();
        if (bestMale) {
          const idx = voices.findIndex((v) => v.name === bestMale.name);
          if (idx >= 0 && voiceSettings.voiceIndex === 0) {
            setVoiceSettings((prev) => ({ ...prev, voiceIndex: idx }));
          }
        }
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

  const handleUpdateVoiceSettings = (newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
    localStorage.setItem('luxion_voice_settings', JSON.stringify(newSettings));
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

  const handleExportChat = useCallback(() => {
    if (messages.length === 0) return;
    const formatted = messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? 'User' : 'LUXION'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n`
      )
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
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAbout={() => setIsAboutOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onExportChat={handleExportChat}
            onLogout={handleLogout}
          />

          <main className="flex-1 flex flex-col">
            <ChatView
              messages={messages}
              onUpdateMessages={handleUpdateMessages}
              voiceSettings={voiceSettings}
              availableVoices={availableVoices}
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

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={voiceSettings}
            onChangeSettings={handleUpdateVoiceSettings}
            availableVoices={availableVoices}
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

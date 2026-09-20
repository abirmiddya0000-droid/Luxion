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

  // Active chat session state
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `sess_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<HistorySession[]>([]);

  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // User state
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('luxion_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return null;
  });

  // Voice Settings state
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('luxion_voice_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      autoSpeak: false,
      rate: 1.0,
      pitch: 0.95,
      voiceIndex: 0,
    };
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = TTSEngine.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
        // Default to best male voice if not already configured
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

  // Load saved sessions on mount
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

  // Save voice settings changes
  const handleUpdateVoiceSettings = (newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
    localStorage.setItem('luxion_voice_settings', JSON.stringify(newSettings));
  };

  // Sync active messages to current session
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

  // New Chat action
  const handleNewChat = useCallback(() => {
    const newId = `sess_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([]);
  }, []);

  // Select a past session
  const handleSelectSession = useCallback((session: HistorySession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
  }, []);

  // Delete a session
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

  // Clear all sessions
  const handleClearAllSessions = useCallback(() => {
    clearAllSessionsStorage();
    setSessions([]);
    handleNewChat();
  }, [handleNewChat]);

  // Auth actions
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

  // Export current conversation
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
      {/* 1. OPENING / SPLASH SCREEN */}
      <AnimatePresence>
        {showSplash && <OpeningSplash onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>

      {/* 2. MAIN LUXION INTERFACE */}
      {!showSplash && (
        <div className="flex flex-col min-h-screen animate-fade-in">
          {/* LUXION Header with Three-Dot Menu */}
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

          {/* Main Chat Interface */}
          <main className="flex-1 flex flex-col">
            <ChatView
              messages={messages}
              onUpdateMessages={handleUpdateMessages}
              voiceSettings={voiceSettings}
              availableVoices={availableVoices}
            />
          </main>

          {/* Modals triggered from Three-Dot Menu */}
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

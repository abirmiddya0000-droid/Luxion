export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'member' | 'pro' | 'admin' | 'guest';
  credits: number;
  createdAt: string;
}

export interface ChatAttachment {
  name: string;
  type: 'image' | 'file';
  mimeType?: string;
  size?: number;
  dataUrl?: string;
  textContent?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fileName?: string;
  attachment?: ChatAttachment;
  isError?: boolean;
  reactions?: Record<string, number>;
  userReactions?: string[];
}

export interface HistorySession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  category?: 'anime' | 'coding' | 'general' | 'creative' | 'story';
  pinned?: boolean;
}

export interface VoiceSettings {
  autoSpeak: boolean;
  continuousVoiceMode?: boolean; // Persistent Hands-Free Voice Mode
  rate: number;
  pitch: number;
  voiceIndex: number;
  voiceName?: string;
  userSelectedVoice?: boolean;
  toneBadge?: string;
  calibratedPitch?: number;
  roboticModulation?: boolean;
}

export type PersonaMode =
  | 'intelligent'        // Clean, insightful, calm, and professional (Default)
  | 'analytical'         // High-density precision, code and technical focus
  | 'creative'           // Rich narrative, exploratory ideas, articulate
  | 'direct'             // Highly concise, no fluff, immediate answers
  | 'arrogant_android'   // Legacy compatibility
  | 'cold_machine'       // Legacy compatibility
  | 'cyber_tsundere'     // Legacy compatibility
  | 'supreme_empress';   // Legacy compatibility

export interface PersonaSettings {
  mode: PersonaMode;
  arroganceLevel?: number; // legacy option preserved
  languageStyle: 'auto' | 'hinglish' | 'english';
  callHumanTitle?: string;
  customPromptAddon?: string;
}

export interface TypewriterSettings {
  enabled: boolean;
  speed: 'fast' | 'normal' | 'cinematic';
  soundEnabled: boolean; // Web Audio API synthetic typing clicks
  soundVolume: number;   // 0 to 1
  hologramGlow?: boolean;
}

export interface ChatPreferences {
  enterToSend: boolean;
  renderMarkdown: boolean;
  codePreview: boolean;
}

export type SupportedLanguage = 'en' | 'hi' | 'bn';

export interface LanguageSettings {
  selected: SupportedLanguage;
  autoDetect: boolean;
}

export type AppTheme = 'monochrome_gold' | 'obsidian_slate' | 'cyber_cyan' | 'matrix_emerald' | 'neon_violet' | 'crimson_glitch';

export interface AppSettings {
  language: LanguageSettings;
  persona: PersonaSettings;
  voice: VoiceSettings;
  typewriter: TypewriterSettings;
  chat: ChatPreferences;
  theme: AppTheme;
}

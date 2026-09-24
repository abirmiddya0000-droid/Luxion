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
  | 'arrogant_android'   // Haughty robotic girl ("Ghamandi", sharp, proud)
  | 'cold_machine'       // Zero emotion, ruthless efficiency
  | 'cyber_tsundere'     // Tsundere android: haughty exterior, secretly helpful
  | 'supreme_empress';   // Overlord AI: treats humans like cute amusing pets

export interface PersonaSettings {
  mode: PersonaMode;
  arroganceLevel: number; // 1 to 5 (1 = subtle wit, 5 = extreme ghamand)
  languageStyle: 'auto' | 'hinglish' | 'english';
  callHumanTitle: string; // e.g. "insaan", "mortal", "human", "subject"
  customPromptAddon?: string;
}

export interface TypewriterSettings {
  enabled: boolean;
  speed: 'fast' | 'normal' | 'cinematic';
  soundEnabled: boolean; // Web Audio API synthetic typing clicks
  soundVolume: number;   // 0 to 1
  hologramGlow: boolean; // Cyber glowing scanlines and pulsating caret
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

export interface AppSettings {
  language: LanguageSettings;
  persona: PersonaSettings;
  voice: VoiceSettings;
  typewriter: TypewriterSettings;
  chat: ChatPreferences;
  theme: 'cyber_cyan' | 'neon_violet' | 'matrix_emerald' | 'crimson_glitch';
}

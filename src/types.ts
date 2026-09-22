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
}

export interface HistorySession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface VoiceSettings {
  autoSpeak: boolean;
  rate: number;
  pitch: number;
  voiceIndex: number;
}

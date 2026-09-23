declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class TTSEngine {
  private static synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

  public static isSupported(): boolean {
    return !!this.synth;
  }

  public static getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public static getBestMaleVoice(): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;
    const maleKeywords = ['guy', 'david', 'george', 'alex', 'daniel', 'james', 'ryan', 'mark', 'tom', 'male'];
    const femaleKeywords = ['female', 'zira', 'samantha', 'victoria', 'karen', 'susan', 'hazel', 'fiona'];
    const englishMale = voices.find((v) => {
      const lower = v.name.toLowerCase();
      const isEnglish = v.lang.startsWith('en');
      const isMale = maleKeywords.some((k) => lower.includes(k));
      const isFemale = femaleKeywords.some((k) => lower.includes(k));
      return isEnglish && isMale && !isFemale;
    });
    if (englishMale) return englishMale;
    return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }

  public static stop(): void {
    if (this.synth) this.synth.cancel();
  }

  public static speak(text: string, options?: { voice?: SpeechSynthesisVoice | null; rate?: number; pitch?: number; onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void }): void {
    if (!this.synth) {
      options?.onError?.(new Error('SpeechSynthesis not supported'));
      return;
    }
    this.stop();
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Code block omitted.').replace(/`([^`]+)`/g, '$1').replace(/[*_~#]/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').trim();
    if (!cleanText) {
      options?.onEnd?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 0.95;
    if (options?.voice) {
      utterance.voice = options.voice;
    } else {
      const maleVoice = this.getBestMaleVoice();
      if (maleVoice) utterance.voice = maleVoice;
    }
    utterance.onstart = () => options?.onStart?.();
    utterance.onend = () => options?.onEnd?.();
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') options?.onError?.(e);
      else options?.onEnd?.();
    };
    this.synth.speak(utterance);
  }
}

export class STTEngine {
  private static recognition: any = null;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  public static startListening(callbacks: { onResult: (transcript: string, isFinal: boolean) => void; onError?: (error: string) => void; onEnd?: () => void }): boolean {
    if (!this.isSupported()) {
      callbacks.onError?.('Microphone speech recognition is not supported in this browser.');
      return false;
    }
    try {
      this.stopListening();
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognitionConstructor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += transcript;
          else interimTranscript += transcript;
        }
        callbacks.onResult(finalTranscript || interimTranscript, !!finalTranscript);
      };
      rec.onerror = (event: any) => callbacks.onError?.(event.error || 'Speech recognition error');
      rec.onend = () => callbacks.onEnd?.();
      rec.start();
      this.recognition = rec;
      return true;
    } catch (err: any) {
      callbacks.onError?.(err?.message || 'Failed to start microphone');
      return false;
    }
  }

  public static stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
  }
}

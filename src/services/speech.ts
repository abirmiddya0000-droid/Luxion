declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type AuditoryTone =
  | 'deep-baritone'
  | 'calm-articulate'
  | 'mature-command'
  | 'standard-masculine'
  | 'unclassified-male'
  | 'neutral';

export interface VoiceMetadataAnalysis {
  voice: SpeechSynthesisVoice;
  score: number;
  tone: AuditoryTone;
  isMasculine: boolean;
  isDeepTone: boolean;
  isCalm: boolean;
  isNeuralOrNatural: boolean;
  isLocal: boolean;
  dialect: string;
  badge: string;
  calibratedPitch: number;
  calibratedRate: number;
  matchReasons: string[];
}

export class TTSEngine {
  private static synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

  private static cachedAnalyses = new WeakMap<SpeechSynthesisVoice, VoiceMetadataAnalysis>();
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static activeMessageId: string | null = null;
  private static isPausedState: boolean = false;
  private static statusListeners: Set<(id: string | null, status: 'idle' | 'playing' | 'paused') => void> = new Set();

  public static isSupported(): boolean {
    return !!this.synth;
  }

  public static getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public static addStatusListener(cb: (id: string | null, status: 'idle' | 'playing' | 'paused') => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private static notifyStatus(status: 'idle' | 'playing' | 'paused'): void {
    const currentId = status === 'idle' ? null : this.activeMessageId;
    this.statusListeners.forEach((cb) => cb(currentId, status));
  }

  /**
   * Analyzes synthesis voices to identify clearly MALE voices that sound
   * deep, confident, calm, mature, and controlled.
   * Feminine, high-pitched, childish, or cartoonish voices are disqualified.
   */
  public static analyzeVoice(v: SpeechSynthesisVoice): VoiceMetadataAnalysis {
    if (this.cachedAnalyses.has(v)) {
      return this.cachedAnalyses.get(v)!;
    }

    const name = (v.name || '').toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    const isLocal = !!v.localService;

    let score = 0;
    const matchReasons: string[] = [];

    let isMasculine = false;
    let isDeepTone = false;
    let isCalm = false;
    let isNeuralOrNatural = false;

    // Strict feminine indicators to disqualify non-male voices
    const FEMALE_INDICATORS = [
      'female', 'woman', 'girl', 'zira', 'samantha', 'victoria', 'karen', 'susan',
      'hazel', 'fiona', 'jenny', 'aria', 'ava', 'emma', 'cynthia', 'stephanie',
      'catherine', 'helena', 'elena', 'serena', 'monica', 'zoe', 'amy', 'anna',
      'linda', 'sarah', 'jessica', 'lisa', 'mary', 'nancy', 'emily', 'laura',
      'chloe', 'olivia', 'sophia', 'isabella', 'mia', 'charlotte', 'amelia',
      'harper', 'evelyn', 'abigail', 'elizabeth', 'mila', 'ella', 'avery',
      'sofia', 'camila', 'scarlett', 'madison', 'luna', 'grace', 'penelope',
      'layla', 'riley', 'zoey', 'nora', 'lily', 'eleanor', 'hannah', 'lillian',
      'addison', 'aubrey', 'ellie', 'stella', 'natalie', 'leah', 'violet',
      'aurora', 'savannah', 'audrey', 'brooklyn', 'bella', 'claire', 'skylar',
      'isla', 'genesis', 'naomi', 'caroline', 'eliana', 'maya', 'valentina',
      'ruby', 'kennedy', 'ivy', 'ariana', 'aimee', 'allison'
    ];

    const hasFemaleIndicator = FEMALE_INDICATORS.some((f) => {
      const regex = new RegExp(`\\b${f}\\b`, 'i');
      return regex.test(name) || regex.test(uri);
    });

    // Default "google us english" without male tag is female in Chrome
    const isDefaultGoogleUSFemale =
      (name === 'google us english' || uri === 'google us english') &&
      !name.includes('male') &&
      !uri.includes('male');

    if (hasFemaleIndicator || isDefaultGoogleUSFemale) {
      // Disqualify from male voice selection
      const analysis: VoiceMetadataAnalysis = {
        voice: v,
        score: -1000,
        tone: 'neutral',
        isMasculine: false,
        isDeepTone: false,
        isCalm: false,
        isNeuralOrNatural: false,
        isLocal,
        dialect: this.getDialectName(lang),
        badge: 'Feminine (Excluded)',
        calibratedPitch: 1.0,
        calibratedRate: 1.0,
        matchReasons: ['Feminine voice disqualified'],
      };
      this.cachedAnalyses.set(v, analysis);
      return analysis;
    }

    // 1. Language Dialect Weighting
    if (lang.startsWith('en-gb') || lang === 'en_gb') {
      score += 45; // British male voices carry calm, authoritative, deep AI clarity
      isCalm = true;
      matchReasons.push('British English cadence (+45)');
    } else if (lang.startsWith('en-us') || lang === 'en_us') {
      score += 40;
      matchReasons.push('American English presence (+40)');
    } else if (lang.startsWith('en')) {
      score += 30;
      matchReasons.push('English dialect (+30)');
    }

    // 2. High-Fidelity Neural / Natural Engines
    if (
      uri.includes('neural') ||
      name.includes('natural') ||
      name.includes('neural') ||
      uri.includes('wavenet') ||
      uri.includes('studio') ||
      uri.includes('journey')
    ) {
      isNeuralOrNatural = true;
      score += 60;
      matchReasons.push('Neural / Natural engine (+60)');
    }

    // 3. Explicit Male Metadata Tags
    if (
      /\b(male|man|guy|boy)\b/i.test(name) ||
      /\b(male|man|guy|boy)\b/i.test(uri) ||
      name.includes('(male)') ||
      name.includes(' male') ||
      uri.includes('#male') ||
      uri.includes('_male')
    ) {
      isMasculine = true;
      score += 100;
      matchReasons.push('Explicit masculine tag (+100)');
    }

    // 4. Acoustic Sub-Model Letter Inspection (Google TTS conventions: D and J are deep male baritones; B is male)
    if (
      /(?:neural2|wavenet|standard)-[dj]\b/i.test(uri) ||
      /(?:neural2|wavenet|standard)-[dj]\b/i.test(name)
    ) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 120;
      matchReasons.push('Deep baritone sub-model [D/J] (+120)');
    } else if (
      /(?:neural2|wavenet|standard)-[bi]\b/i.test(uri) ||
      /(?:neural2|wavenet|standard)-[bi]\b/i.test(name)
    ) {
      isMasculine = true;
      score += 90;
      matchReasons.push('Masculine sub-model [B/I] (+90)');
    }

    // 5. Renowned High-Quality Male Voices
    // Google UK English Male - calm, deep, authoritative AI
    if (
      name.includes('google uk english male') ||
      uri.includes('en-gb-x-rjs#male')
    ) {
      isMasculine = true;
      isCalm = true;
      isDeepTone = true;
      score += 150;
      matchReasons.push('Google UK English Male AI (+150)');
    }

    // Microsoft Guy Neural - rich, mature, deep, calm male voice
    if (
      name.includes('guy online (natural)') ||
      uri.includes('guyneural') ||
      name.includes('microsoft guy')
    ) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 160;
      matchReasons.push('Microsoft Guy Neural mature baritone (+160)');
    }

    // Apple Alex - legendary calm, mature, deep AI voice
    if (
      name === 'alex' ||
      uri.includes('com.apple.speech.synthesis.voice.alex') ||
      name.includes('alex (en-us)')
    ) {
      isMasculine = true;
      isCalm = true;
      isDeepTone = true;
      score += 140;
      matchReasons.push('Apple Alex iconic calm voice (+140)');
    }

    // Apple Bruce - explicitly built for deep-tone baritone
    if (
      name === 'bruce' ||
      uri.includes('com.apple.speech.synthesis.voice.bruce')
    ) {
      isMasculine = true;
      isDeepTone = true;
      score += 135;
      matchReasons.push('Apple Bruce deep baritone (+135)');
    }

    // Apple Daniel - British English calm, dignified baritone
    if (
      name === 'daniel' ||
      uri.includes('com.apple.speech.synthesis.voice.daniel') ||
      name.includes('daniel (en-gb)')
    ) {
      isMasculine = true;
      isCalm = true;
      score += 130;
      matchReasons.push('Daniel British calm baritone (+130)');
    }

    // Microsoft David, George, Mark - classic Windows male baritones
    if (name.includes('microsoft david')) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 120;
      matchReasons.push('Microsoft David mature baritone (+120)');
    } else if (name.includes('microsoft george')) {
      isMasculine = true;
      isCalm = true;
      score += 115;
      matchReasons.push('Microsoft George UK male (+115)');
    } else if (name.includes('microsoft mark')) {
      isMasculine = true;
      score += 105;
      matchReasons.push('Microsoft Mark male (+105)');
    }

    // Linux Festival / eSpeak deep tones
    if (uri.includes('kal_diphone') || name.includes('kal_diphone')) {
      isMasculine = true;
      isDeepTone = true;
      score += 85;
      matchReasons.push('kal_diphone masculine (+85)');
    } else if (name.includes('espeak-en-m3') || uri.includes('espeak-en-m3') || name.includes('+m3')) {
      isMasculine = true;
      isDeepTone = true;
      score += 80;
      matchReasons.push('eSpeak m3 deep male (+80)');
    }

    // 6. Masculine Name Dictionary Scan
    const MALE_NAMES = [
      'guy', 'david', 'george', 'alex', 'daniel', 'mark', 'ryan', 'oliver',
      'christopher', 'james', 'thomas', 'arthur', 'nathan', 'richard', 'brian',
      'stephen', 'matthew', 'tom', 'fred', 'aaron', 'andrew', 'paul', 'edward',
      'michael', 'john', 'robert', 'william', 'joseph', 'charles', 'anthony',
      'steven', 'kenneth', 'joshua', 'kevin', 'timothy', 'jason', 'jacob',
      'nicholas', 'eric', 'jonathan', 'justin', 'brandon', 'benjamin', 'samuel',
      'patrick', 'jack', 'tyler', 'adam', 'henry', 'peter', 'kyle', 'ethan',
      'jeremy', 'christian', 'noah', 'sean', 'austin', 'dylan', 'bryan',
      'gabriel', 'logan', 'alan', 'eugene', 'vincent', 'russell', 'louis', 'philip',
      'bruce', 'davis', 'alfie', 'steffan'
    ];

    const hasMaleName = MALE_NAMES.some((n) => {
      const regex = new RegExp(`\\b${n}\\b`, 'i');
      return regex.test(name) || regex.test(uri);
    });

    if (hasMaleName) {
      isMasculine = true;
      score += 70;
      matchReasons.push('Recognized masculine persona (+70)');
    }

    // 7. Deeper Tone Keywords
    const DEEP_KEYWORDS = ['deep', 'baritone', 'bass', 'low', 'command', 'rich', 'mature'];
    if (DEEP_KEYWORDS.some((k) => name.includes(k) || uri.includes(k))) {
      isDeepTone = true;
      score += 50;
      matchReasons.push('Deep tone descriptor (+50)');
    }

    // Categorize auditory tone
    let tone: AuditoryTone = 'neutral';
    let badge = 'Male Voice';

    if (isDeepTone && isCalm) {
      tone = 'deep-baritone';
      badge = 'Deep Baritone • Mature';
    } else if (isDeepTone) {
      tone = 'deep-baritone';
      badge = 'Deep Baritone';
    } else if (isCalm && isMasculine) {
      tone = 'calm-articulate';
      badge = 'Calm Articulate Male';
    } else if (isMasculine) {
      tone = 'standard-masculine';
      badge = isNeuralOrNatural ? 'Neural Male' : 'Confident Male';
    } else if (score > 10) {
      tone = 'unclassified-male';
      badge = 'Male Voice';
    }

    // Optimal calibration for LUXION's powerful, deep, calm, confident male identity
    // Pitch 0.90 gives a deep baritone resonance without distortion or slowness
    // Rate 0.97 provides articulate, controlled pacing
    let calibratedPitch = 0.90;
    let calibratedRate = 0.97;

    if (tone === 'deep-baritone') {
      calibratedPitch = 0.92;
      calibratedRate = 0.97;
    } else if (tone === 'calm-articulate') {
      calibratedPitch = 0.90;
      calibratedRate = 0.96;
    } else if (isMasculine) {
      calibratedPitch = 0.88;
      calibratedRate = 0.97;
    }

    const analysis: VoiceMetadataAnalysis = {
      voice: v,
      score,
      tone,
      isMasculine,
      isDeepTone,
      isCalm,
      isNeuralOrNatural,
      isLocal,
      dialect: this.getDialectName(lang),
      badge,
      calibratedPitch,
      calibratedRate,
      matchReasons,
    };

    this.cachedAnalyses.set(v, analysis);
    return analysis;
  }

  /**
   * Returns available voices sorted by deep, calm, masculine acoustic suitability.
   */
  public static getPrioritizedVoices(): Array<{ voice: SpeechSynthesisVoice; analysis: VoiceMetadataAnalysis }> {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return [];

    const analyzed = voices.map((v) => ({
      voice: v,
      analysis: this.analyzeVoice(v),
    }));

    // Filter out disqualified feminine voices first, then sort by highest masculine score
    const maleOnly = analyzed.filter((a) => a.analysis.score > 0);
    if (maleOnly.length > 0) {
      maleOnly.sort((a, b) => b.analysis.score - a.analysis.score);
      return maleOnly;
    }

    // Fallback: sort all voices by score
    analyzed.sort((a, b) => b.analysis.score - a.analysis.score);
    return analyzed;
  }

  /**
   * Selects the highest-ranking clearly MALE, deep, confident, calm voice.
   */
  public static getBestMaleVoice(): SpeechSynthesisVoice | null {
    const prioritized = this.getPrioritizedVoices();
    if (prioritized.length === 0) return null;

    if (prioritized[0].analysis.score > 0) {
      return prioritized[0].voice;
    }

    // Fall back to first English voice
    return prioritized.map((p) => p.voice).find((v) => v.lang.startsWith('en')) || prioritized[0].voice || null;
  }

  /**
   * Returns recommended pitch and rate for LUXION's deep, confident male voice.
   */
  public static getCalibratedAcoustics(voice: SpeechSynthesisVoice | null): { pitch: number; rate: number } {
    if (!voice) {
      return { pitch: 0.90, rate: 0.97 };
    }
    const analysis = this.analyzeVoice(voice);
    return {
      pitch: analysis.calibratedPitch,
      rate: analysis.calibratedRate,
    };
  }

  private static getDialectName(lang: string): string {
    const code = lang.toLowerCase();
    if (code.startsWith('en-gb') || code === 'en_gb') return 'en-GB (British)';
    if (code.startsWith('en-us') || code === 'en_us') return 'en-US (American)';
    if (code.startsWith('en-au') || code === 'en_au') return 'en-AU (Australian)';
    if (code.startsWith('en-ca') || code === 'en_ca') return 'en-CA (Canadian)';
    if (code.startsWith('en-ie') || code === 'en_ie') return 'en-IE (Irish)';
    if (code.startsWith('en-in') || code === 'en_in') return 'en-IN (Indian)';
    if (code.startsWith('en')) return `${code} (English)`;
    return code;
  }

  /**
   * Prepares and normalizes response text for natural, clean speech synthesis.
   * Strips code blocks, links, and markdown syntax to prevent raw reading.
   */
  public static prepareSpeechText(text: string): string {
    return text
      // Replace code blocks with a brief natural marker
      .replace(/```[a-z]*\s*[\s\S]*?```/gi, 'Here is the code implementation.')
      // Replace inline code
      .replace(/`([^`]+)`/g, '$1')
      // Replace markdown headers with punctuated sentences for natural pacing
      .replace(/^#{1,6}\s+(.*)$/gm, '$1.')
      // Strip markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Clean bare URLs
      .replace(/https?:\/\/[^\s]+/gi, 'the link')
      // Clean lists and bullet points into pauses
      .replace(/^\s*[-*+]\s+(.*)$/gm, '$1, ')
      .replace(/^\s*\d+\.\s+(.*)$/gm, '$1, ')
      // Strip bold, italic, strikethrough markdown
      .replace(/[*_~]/g, '')
      // Strip blockquotes
      .replace(/^\s*>\s*(.*)$/gm, '$1.')
      // Replace pipes from tables with pauses
      .replace(/\|/g, ', ')
      // Remove decorative emojis and symbols
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}▼▲→←★•✓✕⋮]/gu, '')
      // Normalize whitespace and punctuation
      .replace(/,\s*,+/g, ', ')
      .replace(/\.\s*\.+/g, '.')
      .replace(/\n\s*\n/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static getActiveMessageId(): string | null {
    return this.activeMessageId;
  }

  public static isSpeaking(): boolean {
    return !!(this.synth && this.synth.speaking && !this.synth.paused);
  }

  public static isPaused(): boolean {
    return !!(this.synth && this.synth.paused);
  }

  public static getPlaybackState(messageId?: string): 'idle' | 'playing' | 'paused' {
    if (!this.synth) return 'idle';
    if (messageId && this.activeMessageId !== messageId) return 'idle';
    if (this.synth.paused || this.isPausedState) return 'paused';
    if (this.synth.speaking) return 'playing';
    return 'idle';
  }

  /**
   * Pause current speech playback.
   */
  public static pause(): void {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.isPausedState = true;
      this.notifyStatus('paused');
    }
  }

  /**
   * Resume paused speech playback.
   */
  public static resume(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isPausedState = false;
      this.notifyStatus('playing');
    }
  }

  /**
   * Stop all speech playback immediately.
   */
  public static stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
      this.activeMessageId = null;
      this.isPausedState = false;
      this.notifyStatus('idle');
    }
  }

  /**
   * Replay the message from the beginning.
   */
  public static replay(
    messageId: string,
    text: string,
    options?: {
      voice?: SpeechSynthesisVoice | null;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): void {
    this.stop();
    this.speak(text, {
      ...options,
      messageId,
    });
  }

  /**
   * Plays speech using a deep, calm, confident male voice.
   */
  public static speak(
    text: string,
    options?: {
      messageId?: string;
      voice?: SpeechSynthesisVoice | null;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): void {
    if (!this.synth) {
      options?.onError?.(new Error('SpeechSynthesis not supported'));
      return;
    }

    this.stop();

    const cleanText = this.prepareSpeechText(text);
    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    const targetVoice = options?.voice || this.getBestMaleVoice();
    const calibrated = this.getCalibratedAcoustics(targetVoice);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate ?? calibrated.rate;
    utterance.pitch = options?.pitch ?? calibrated.pitch;

    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    this.currentUtterance = utterance;
    this.activeMessageId = options?.messageId || null;
    this.isPausedState = false;

    utterance.onstart = () => {
      this.isPausedState = false;
      options?.onStart?.();
      this.notifyStatus('playing');
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      this.activeMessageId = null;
      this.isPausedState = false;
      options?.onEnd?.();
      this.notifyStatus('idle');
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      this.activeMessageId = null;
      this.isPausedState = false;
      if (e.error !== 'interrupted') {
        options?.onError?.(e);
      }
      this.notifyStatus('idle');
    };

    this.synth.speak(utterance);
  }
}

export class STTEngine {
  private static recognition: any = null;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  public static startListening(callbacks: {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  }): boolean {
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

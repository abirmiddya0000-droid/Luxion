declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type AuditoryTone =
  | 'robotic-girl-deep'
  | 'cyber-female'
  | 'futuristic-cyber'
  | 'deep-baritone'
  | 'calm-articulate'
  | 'standard-masculine'
  | 'unclassified-male'
  | 'feminine'
  | 'neutral';

export interface VoiceMetadataAnalysis {
  voice: SpeechSynthesisVoice;
  score: number;
  tone: AuditoryTone;
  isMasculine: boolean;
  isFuturistic: boolean;
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

  public static isSupported(): boolean {
    return !!this.synth;
  }

  public static getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  /**
   * Inspects synthesis metadata (name, voiceURI, lang, localService)
   * to detect deeper tonal characteristics, masculine resonance,
   * and futuristic/calm auditory presence.
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
    let isFuturistic = false;
    let isDeepTone = false;
    let isCalm = false;
    let isNeuralOrNatural = false;

    // Known feminine identifiers for strict exclusion / deprioritization
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
      const isNeural = uri.includes('neural') || name.includes('natural') || name.includes('google');
      const isCyberOrSynth = uri.includes('synthetic') || uri.includes('cyber') || name.includes('samantha') || name.includes('zira') || name.includes('jenny');
      
      const analysis: VoiceMetadataAnalysis = {
        voice: v,
        score: isNeural ? 250 : 180,
        tone: 'robotic-girl-deep',
        isMasculine: false,
        isFuturistic: true,
        isDeepTone: true,
        isCalm: true,
        isNeuralOrNatural: isNeural,
        isLocal,
        dialect: this.getDialectName(lang),
        badge: isNeural ? 'Cyber Android Girl • Deep' : 'Robotic Maiden • Deep',
        calibratedPitch: 0.85, // Lowered pitch gives deep robotic girl tone
        calibratedRate: 0.96,  // Controlled cadence
        matchReasons: ['Robotic Cyber Girl profile matched', isNeural ? 'Neural clarity (+40)' : 'Synth tone'],
      };
      this.cachedAnalyses.set(v, analysis);
      return analysis;
    }

    // 1. Language Dialect Weighting
    if (lang.startsWith('en-gb') || lang === 'en_gb') {
      score += 35; // British accents carry iconic, calm, J.A.R.V.I.S.-like futuristic AI clarity
      isCalm = true;
      matchReasons.push('British English cadence (+35)');
    } else if (lang.startsWith('en-us') || lang === 'en_us') {
      score += 30; // Clear American baritone presence
      matchReasons.push('American English presence (+30)');
    } else if (lang.startsWith('en')) {
      score += 25;
      matchReasons.push('English dialect (+25)');
    }

    // 2. Neural / Wavenet / Studio Quality Metadata
    if (
      uri.includes('neural') ||
      name.includes('natural') ||
      name.includes('neural') ||
      uri.includes('wavenet') ||
      uri.includes('studio') ||
      uri.includes('journey')
    ) {
      isNeuralOrNatural = true;
      score += 40;
      matchReasons.push('Neural / Natural synthesis engine (+40)');
    }

    // 3. Explicit Masculine Tags in Name or URI
    if (
      /\b(male|man|guy|boy)\b/i.test(name) ||
      /\b(male|man|guy|boy)\b/i.test(uri) ||
      name.includes('(male)') ||
      name.includes(' male') ||
      uri.includes('#male') ||
      uri.includes('_male')
    ) {
      isMasculine = true;
      score += 75;
      matchReasons.push('Explicit masculine metadata tag (+75)');
    }

    // 4. Acoustic Sub-Model Letter Inspection (Google TTS conventions: D and J are deep male baritones; B is male)
    if (
      /(?:neural2|wavenet|standard)-[dj]\b/i.test(uri) ||
      /(?:neural2|wavenet|standard)-[dj]\b/i.test(name)
    ) {
      isMasculine = true;
      isDeepTone = true;
      isFuturistic = true;
      score += 90;
      matchReasons.push('Deep-baritone acoustic model [D/J] (+90)');
    } else if (
      /(?:neural2|wavenet|standard)-[bi]\b/i.test(uri) ||
      /(?:neural2|wavenet|standard)-[bi]\b/i.test(name)
    ) {
      isMasculine = true;
      isFuturistic = true;
      score += 70;
      matchReasons.push('Masculine acoustic model [B/I] (+70)');
    }

    // 5. Specific Renowned Engines & Signatures
    // Apple "Alex" - legendary calm, mathematical formant synthesizer with futuristic AI cadence
    if (
      name === 'alex' ||
      uri.includes('com.apple.speech.synthesis.voice.alex') ||
      name.includes('alex (en-us)')
    ) {
      isMasculine = true;
      isFuturistic = true;
      isCalm = true;
      isDeepTone = true;
      score += 105;
      matchReasons.push('Apple Alex iconic calm futuristic voice (+105)');
    }

    // Google UK English Male - distinguished, calm, futuristic AI sound
    if (
      name.includes('google uk english male') ||
      uri.includes('en-gb-x-rjs#male')
    ) {
      isMasculine = true;
      isFuturistic = true;
      isCalm = true;
      score += 100;
      matchReasons.push('Google UK English Male AI voice (+100)');
    }

    // Microsoft Guy Neural - rich, calm, masculine presence
    if (
      name.includes('guy online (natural)') ||
      uri.includes('guyneural') ||
      name.includes('microsoft guy')
    ) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 95;
      matchReasons.push('Microsoft Guy Neural deep baritone (+95)');
    }

    // Apple Bruce - explicitly built for deep-tone baritone
    if (
      name === 'bruce' ||
      uri.includes('com.apple.speech.synthesis.voice.bruce')
    ) {
      isMasculine = true;
      isDeepTone = true;
      score += 90;
      matchReasons.push('Apple Bruce deep-tone baritone (+90)');
    }

    // Apple Daniel - British English calm, dignified baritone
    if (
      name === 'daniel' ||
      uri.includes('com.apple.speech.synthesis.voice.daniel') ||
      name.includes('daniel (en-gb)')
    ) {
      isMasculine = true;
      isCalm = true;
      score += 85;
      matchReasons.push('Daniel British calm baritone (+85)');
    }

    // Microsoft David & Mark - classic Windows desktop baritones
    if (name.includes('microsoft david')) {
      isMasculine = true;
      isDeepTone = true;
      score += 80;
      matchReasons.push('Microsoft David baritone (+80)');
    } else if (name.includes('microsoft mark')) {
      isMasculine = true;
      score += 75;
      matchReasons.push('Microsoft Mark male voice (+75)');
    } else if (name.includes('microsoft george')) {
      isMasculine = true;
      isCalm = true;
      score += 80;
      matchReasons.push('Microsoft George UK male (+80)');
    }

    // Linux Festival / eSpeak deep tones
    if (uri.includes('kal_diphone') || name.includes('kal_diphone')) {
      isMasculine = true;
      isDeepTone = true;
      isFuturistic = true;
      score += 75;
      matchReasons.push('Festival kal_diphone deep masculine (+75)');
    } else if (name.includes('espeak-en-m3') || uri.includes('espeak-en-m3')) {
      isMasculine = true;
      isDeepTone = true;
      score += 65;
      matchReasons.push('eSpeak m3 deep male tone (+65)');
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
      score += 45;
      matchReasons.push('Recognized masculine persona (+45)');
    }

    // 7. Deeper Tone Keywords
    const DEEP_KEYWORDS = ['deep', 'baritone', 'bass', 'low', 'solemn', 'command', 'rich'];
    if (DEEP_KEYWORDS.some((k) => name.includes(k) || uri.includes(k))) {
      isDeepTone = true;
      score += 30;
      matchReasons.push('Deep acoustic characteristic keywords (+30)');
    }

    // 8. Futuristic / Cyber / AI Keywords
    const FUTURISTIC_KEYWORDS = ['cyber', 'matrix', 'synthetic', 'quantum', 'ai', 'robot', 'futuristic', 'formant'];
    if (FUTURISTIC_KEYWORDS.some((k) => name.includes(k) || uri.includes(k))) {
      isFuturistic = true;
      score += 25;
      matchReasons.push('Futuristic / AI descriptor (+25)');
    }

    // Determine Auditory Tone Profile
    let tone: AuditoryTone = 'neutral';
    let badge = 'Neutral';

    if (isFuturistic && isDeepTone) {
      tone = 'futuristic-cyber';
      badge = 'Futuristic AI • Deep';
    } else if (isFuturistic) {
      tone = 'futuristic-cyber';
      badge = 'Futuristic AI';
    } else if (isDeepTone) {
      tone = 'deep-baritone';
      badge = 'Deep Baritone';
    } else if (isCalm && isMasculine) {
      tone = 'calm-articulate';
      badge = 'Calm Articulate';
    } else if (isMasculine) {
      tone = 'standard-masculine';
      badge = isNeuralOrNatural ? 'Neural Male' : 'Masculine';
    } else if (score > 10) {
      tone = 'unclassified-male';
      badge = 'Male Voice';
    }

    // Calibrate Optimal Acoustic Parameters for LUXION Identity
    // Target: Calm, confident, masculine, futuristic resonance
    let calibratedPitch = 0.92;
    let calibratedRate = 0.98;

    if (tone === 'deep-baritone') {
      // Deep voices already have lower fundamentals; 0.94 preserves clarity without sounding muddy
      calibratedPitch = 0.94;
      calibratedRate = 0.98;
    } else if (tone === 'futuristic-cyber') {
      // Alex & Google UK Male sound exceptionally sleek with a subtle drop to 0.90
      calibratedPitch = 0.90;
      calibratedRate = 0.98;
    } else if (tone === 'calm-articulate') {
      calibratedPitch = 0.92;
      calibratedRate = 0.97;
    } else if (isMasculine) {
      // Standard male voices benefit from a modest drop to 0.89 to hit the baritone zone
      calibratedPitch = 0.89;
      calibratedRate = 0.98;
    } else {
      calibratedPitch = 0.92;
      calibratedRate = 0.98;
    }

    const analysis: VoiceMetadataAnalysis = {
      voice: v,
      score,
      tone,
      isMasculine,
      isFuturistic,
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
   * Returns all available voices prioritized by their masculine, calm,
   * and futuristic acoustic characteristics.
   */
  public static getPrioritizedVoices(): Array<{ voice: SpeechSynthesisVoice; analysis: VoiceMetadataAnalysis }> {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return [];

    const analyzed = voices.map((v) => ({
      voice: v,
      analysis: this.analyzeVoice(v),
    }));

    analyzed.sort((a, b) => b.analysis.score - a.analysis.score);
    return analyzed;
  }

  /**
   * Selects the highest-ranking robotic girl voice (deep, crisp, futuristic female synth).
   */
  public static getBestRoboticGirlVoice(): SpeechSynthesisVoice | null {
    const prioritized = this.getPrioritizedVoices();
    if (prioritized.length === 0) return null;

    // First look for calibrated robotic girl voices
    const girlVoice = prioritized.find((p) => p.analysis.tone === 'robotic-girl-deep' || p.analysis.tone === 'cyber-female');
    if (girlVoice) {
      return girlVoice.voice;
    }

    // Fall back to any female voice or top voice
    return prioritized[0]?.voice || null;
  }

  /**
   * Selects the highest-ranking masculine, calm, and futuristic voice available.
   */
  public static getBestMaleVoice(): SpeechSynthesisVoice | null {
    const prioritized = this.getPrioritizedVoices();
    if (prioritized.length === 0) return null;

    // Pick top-scoring voice if score is positive
    if (prioritized[0].analysis.score > 0) {
      return prioritized[0].voice;
    }

    // Fall back to first English voice, or first available voice
    return prioritized.map((p) => p.voice).find((v) => v.lang.startsWith('en')) || prioritized[0].voice || null;
  }

  /**
   * Returns recommended pitch and rate for a given voice to match LUXION's
   * calm, deep, and futuristic auditory identity.
   */
  public static getCalibratedAcoustics(voice: SpeechSynthesisVoice | null): { pitch: number; rate: number } {
    if (!voice) {
      return { pitch: 0.92, rate: 0.98 };
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
    if (code.startsWith('en-nz') || code === 'en_nz') return 'en-NZ (New Zealand)';
    if (code.startsWith('en')) return `${code} (English)`;
    return code;
  }

  public static stop(): void {
    if (this.synth) this.synth.cancel();
  }

  /**
   * Prepares and normalizes response text for natural, clean speech synthesis.
   * Strips code blocks, links, and markdown syntax to prevent raw reading.
   */
  public static prepareSpeechText(text: string): string {
    return text
      // Replace code blocks with a natural spoken marker
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
      // Remove decorative emojis and symbols that speech synthesis stumbles on
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}▼▲→←★•✓✕]/gu, '')
      // Normalize multiple commas, periods, or whitespace
      .replace(/,\s*,+/g, ', ')
      .replace(/\.\s*\.+/g, '.')
      .replace(/\n\s*\n/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static getBestVoiceForLanguage(langCode?: 'en' | 'hi' | 'bn'): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    if (langCode === 'hi') {
      const hindiVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi')
      );
      if (hindiVoice) return hindiVoice;
    }

    if (langCode === 'bn') {
      const bengaliVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('bn') ||
          v.name.toLowerCase().includes('bengali') ||
          v.name.toLowerCase().includes('bangla')
      );
      if (bengaliVoice) return bengaliVoice;
    }

    // Default English / fallback to best deeper masculine voice
    return this.getBestMaleVoice();
  }

  public static speak(
    text: string,
    options?: {
      voice?: SpeechSynthesisVoice | null;
      language?: 'en' | 'hi' | 'bn';
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

    const targetVoice =
      options?.voice || this.getBestVoiceForLanguage(options?.language) || this.getBestMaleVoice();
    const calibrated = this.getCalibratedAcoustics(targetVoice);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate ?? calibrated.rate;
    utterance.pitch = options?.pitch ?? calibrated.pitch;

    if (targetVoice) {
      utterance.voice = targetVoice;
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

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
  private static currentAudio: HTMLAudioElement | null = null;
  private static audioCache = new Map<string, string>(); // cleanText -> data:audio/wav;base64,...
  private static activeMessageId: string | null = null;
  private static isPausedState: boolean = false;
  private static apiCooldownUntil: number = 0;
  private static statusListeners: Set<(id: string | null, status: 'idle' | 'playing' | 'paused') => void> = new Set();

  public static isSupported(): boolean {
    return !!this.synth || typeof Audio !== 'undefined';
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
   * Feminine, high-pitched, childish, or cartoonish voices are strictly disqualified.
   */
  public static analyzeVoice(v: SpeechSynthesisVoice): VoiceMetadataAnalysis {
    if (this.cachedAnalyses.has(v)) {
      return this.cachedAnalyses.get(v)!;
    }

    const name = (v.name || '').toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    const isLocal = !!v.localService;

    // 1. Strict feminine indicators across all operating systems & browsers
    const FEMALE_INDICATORS = [
      'female', 'woman', 'girl', 'lady', 'zira', 'samantha', 'victoria', 'karen', 'susan',
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
      'ruby', 'kennedy', 'ivy', 'ariana', 'aimee', 'allison', 'natasha', 'clara',
      'neerja', 'heera', 'sonia', 'libby', 'moira', 'tessa', 'veena', 'sangeeta',
      'kathy', 'alice', 'katie', 'joanna', 'salli', 'kendra', 'kimberly', 'carmen',
      'damayanti', 'luciana', 'ines', 'alva', 'sin-ji', 'kyoko', 'yuna', 'ting-ting'
    ];

    // Novelty, joke, or synthetic toy voices to disqualify
    const NOVELTY_ROBOTIC_INDICATORS = [
      'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'deranged',
      'good news', 'hysterical', 'pipe organ', 'trinoids', 'whisper', 'zarvox',
      'albert', 'junior', 'ralph', 'grandpa', 'grandma', 'princess', 'robot',
      'synthesizer', 'wobble', 'chipmunk', 'alien', 'organ', 'jester'
    ];

    const hasFemaleIndicator = FEMALE_INDICATORS.some((f) => {
      const regex = new RegExp(`\\b${f}\\b`, 'i');
      return regex.test(name) || regex.test(uri);
    });

    const hasRoboticNovelty = NOVELTY_ROBOTIC_INDICATORS.some((r) => {
      return name.includes(r) || uri.includes(r);
    });

    // Default "google us english" or "google uk english female" in Chrome is strictly female
    const isDefaultGoogleUSFemale =
      (name === 'google us english' || uri === 'google us english') &&
      !name.includes('male') &&
      !uri.includes('male');

    const isGenericAndroidFemale =
      (uri.includes('en-us-x-sfg') || uri.includes('en-us-x-tpd') || uri.includes('en-gb-x-fis')) &&
      !name.includes('male') &&
      !uri.includes('#male');

    if (hasFemaleIndicator || hasRoboticNovelty || isDefaultGoogleUSFemale || isGenericAndroidFemale) {
      // Disqualify entirely from selection
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
        badge: hasRoboticNovelty ? 'Robotic (Excluded)' : 'Feminine (Excluded)',
        calibratedPitch: 1.0,
        calibratedRate: 1.0,
        matchReasons: [hasRoboticNovelty ? 'Robotic toy voice disqualified' : 'Feminine voice disqualified'],
      };
      this.cachedAnalyses.set(v, analysis);
      return analysis;
    }

    let isMasculine = false;
    let isDeepTone = false;
    let isCalm = false;
    let isNeuralOrNatural = false;
    let score = 0;
    const matchReasons: string[] = [];

    // 2. Explicit Masculine Identifiers
    if (
      /\b(male|man|guy|boy|gentleman)\b/i.test(name) ||
      /\b(male|man|guy|boy)\b/i.test(uri) ||
      name.includes('(male)') ||
      name.includes(' male') ||
      uri.includes('#male') ||
      uri.includes('_male')
    ) {
      isMasculine = true;
      score += 150;
      matchReasons.push('Explicit masculine tag (+150)');
    }

    // 3. Renowned High-Fidelity Deep Male Voices
    // Microsoft Ryan Online (Natural) - deep commanding British baritone
    if (name.includes('ryan online (natural)') || uri.includes('ryanneural')) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 300;
      matchReasons.push('Microsoft Ryan Natural baritone (+300)');
    }

    // Microsoft Guy Online (Natural) - mature American baritone
    if (name.includes('guy online (natural)') || uri.includes('guyneural') || name.includes('microsoft guy')) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 290;
      matchReasons.push('Microsoft Guy Natural mature baritone (+290)');
    }

    // Microsoft Christopher Online (Natural)
    if (name.includes('christopher online (natural)') || uri.includes('christopherneural')) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 280;
      matchReasons.push('Microsoft Christopher Natural (+280)');
    }

    // Microsoft Eric, Steffan, Oliver Online (Natural)
    if (name.includes('eric online (natural)') || uri.includes('ericneural')) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 275;
      matchReasons.push('Microsoft Eric Natural (+275)');
    } else if (name.includes('steffan online (natural)') || uri.includes('steffanneural')) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 270;
      matchReasons.push('Microsoft Steffan Natural (+270)');
    }

    // Apple Alex - renowned natural breathing, calm, mature male AI voice
    if (name === 'alex' || uri.includes('voice.alex') || name.includes('alex (en-us)')) {
      isMasculine = true;
      isCalm = true;
      isDeepTone = true;
      score += 285;
      matchReasons.push('Apple Alex natural mature voice (+285)');
    }

    // Apple Daniel (Enhanced/Premium) - British dignified baritone
    if (name === 'daniel' || uri.includes('voice.daniel') || name.includes('daniel (en-gb)')) {
      isMasculine = true;
      isCalm = true;
      isDeepTone = true;
      score += 270;
      matchReasons.push('Apple Daniel authoritative baritone (+270)');
    }

    // Apple Bruce & Fred
    if (name === 'bruce' || uri.includes('voice.bruce')) {
      isMasculine = true;
      isDeepTone = true;
      score += 250;
      matchReasons.push('Apple Bruce deep baritone (+250)');
    } else if (name === 'fred' || uri.includes('voice.fred')) {
      isMasculine = true;
      score += 180;
      matchReasons.push('Apple Fred male voice (+180)');
    }

    // Apple Oliver & Tom Enhanced
    if (name.includes('oliver') && (name.includes('enhanced') || name.includes('premium'))) {
      isMasculine = true;
      isCalm = true;
      score += 260;
      matchReasons.push('Apple Oliver Enhanced (+260)');
    } else if ((name.includes('tom') || name.includes('evan') || name.includes('nathan')) && (name.includes('enhanced') || name.includes('premium'))) {
      isMasculine = true;
      isCalm = true;
      score += 250;
      matchReasons.push('Apple Enhanced male (+250)');
    }

    // Google UK English Male - calm, deep, authoritative AI
    if (name.includes('google uk english male') || uri.includes('en-gb-x-rjs#male')) {
      isMasculine = true;
      isCalm = true;
      isDeepTone = true;
      score += 270;
      matchReasons.push('Google UK English Male AI (+270)');
    }

    // Google US English Male
    if (name.includes('google us english male') || uri.includes('en-us-x-sfg#male') || uri.includes('en-us-x-iol#male')) {
      isMasculine = true;
      isCalm = true;
      isDeepTone = true;
      score += 265;
      matchReasons.push('Google US English Male AI (+265)');
    }

    // Acoustic Sub-Model Letter Inspection (Google TTS: D and J are deep baritones; B and I are male)
    if (/(?:neural2|wavenet|standard)-[dj]\b/i.test(uri) || /(?:neural2|wavenet|standard)-[dj]\b/i.test(name)) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 220;
      matchReasons.push('Deep baritone acoustic sub-model [D/J] (+220)');
    } else if (/(?:neural2|wavenet|standard)-[bi]\b/i.test(uri) || /(?:neural2|wavenet|standard)-[bi]\b/i.test(name)) {
      isMasculine = true;
      score += 180;
      matchReasons.push('Masculine sub-model [B/I] (+180)');
    }

    // Microsoft David, George, Mark - classic Windows male baritones
    if (name.includes('microsoft david')) {
      isMasculine = true;
      isDeepTone = true;
      isCalm = true;
      score += 210;
      matchReasons.push('Microsoft David mature baritone (+210)');
    } else if (name.includes('microsoft george')) {
      isMasculine = true;
      isCalm = true;
      score += 200;
      matchReasons.push('Microsoft George mature UK male (+200)');
    } else if (name.includes('microsoft mark')) {
      isMasculine = true;
      score += 190;
      matchReasons.push('Microsoft Mark male (+190)');
    }

    // Linux Festival / eSpeak deep tones
    if (uri.includes('kal_diphone') || name.includes('kal_diphone')) {
      isMasculine = true;
      isDeepTone = true;
      score += 150;
      matchReasons.push('kal_diphone male (+150)');
    } else if (name.includes('espeak-en-m') || uri.includes('espeak-en-m') || name.includes('+m')) {
      isMasculine = true;
      isDeepTone = true;
      score += 140;
      matchReasons.push('eSpeak male (+140)');
    }

    // 4. Masculine Name Dictionary Scan
    const MALE_NAMES = [
      'ryan', 'guy', 'david', 'george', 'alex', 'daniel', 'mark', 'oliver',
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

    if (!isMasculine) {
      const hasMaleName = MALE_NAMES.some((n) => {
        const regex = new RegExp(`\\b${n}\\b`, 'i');
        return regex.test(name) || regex.test(uri);
      });
      if (hasMaleName) {
        isMasculine = true;
        score += 120;
        matchReasons.push('Recognized masculine persona (+120)');
      }
    }

    // STRICT CHECK: If voice has NOT been verified as masculine, DO NOT allow it to be picked
    if (!isMasculine) {
      const analysis: VoiceMetadataAnalysis = {
        voice: v,
        score: -500,
        tone: 'neutral',
        isMasculine: false,
        isDeepTone: false,
        isCalm: false,
        isNeuralOrNatural: false,
        isLocal,
        dialect: this.getDialectName(lang),
        badge: 'Unverified / Excluded',
        calibratedPitch: 1.0,
        calibratedRate: 1.0,
        matchReasons: ['Unverified non-male voice disqualified'],
      };
      this.cachedAnalyses.set(v, analysis);
      return analysis;
    }

    // 5. High-Fidelity Neural / Natural Engines
    if (
      uri.includes('neural') ||
      name.includes('natural') ||
      name.includes('neural') ||
      uri.includes('wavenet') ||
      uri.includes('studio') ||
      uri.includes('journey') ||
      name.includes('enhanced') ||
      name.includes('premium')
    ) {
      isNeuralOrNatural = true;
      score += 80;
      matchReasons.push('High-fidelity Natural/Neural engine (+80)');
    }

    // 6. Language Dialect Weighting - only for verified male voices
    if (lang.startsWith('en-gb') || lang === 'en_gb') {
      score += 50;
      isCalm = true;
      matchReasons.push('British English authority (+50)');
    } else if (lang.startsWith('en-us') || lang === 'en_us') {
      score += 45;
      matchReasons.push('American English presence (+45)');
    } else if (lang.startsWith('en')) {
      score += 35;
      matchReasons.push('English dialect (+35)');
    }

    // 7. Deeper Tone Keywords
    const DEEP_KEYWORDS = ['deep', 'baritone', 'bass', 'low', 'command', 'rich', 'mature', 'authoritative', 'calm'];
    if (DEEP_KEYWORDS.some((k) => name.includes(k) || uri.includes(k))) {
      isDeepTone = true;
      score += 60;
      matchReasons.push('Deep tone descriptor (+60)');
    }

    // Categorize tone
    let tone: AuditoryTone = 'standard-masculine';
    let badge = 'Natural Male • Controlled';

    if (isDeepTone && isCalm) {
      tone = 'deep-baritone';
      badge = 'Deep Baritone • Authoritative';
    } else if (isDeepTone) {
      tone = 'deep-baritone';
      badge = 'Deep Baritone';
    } else if (isCalm) {
      tone = 'calm-articulate';
      badge = 'Calm Articulate • Confident';
    } else if (isNeuralOrNatural) {
      tone = 'standard-masculine';
      badge = 'Mature Baritone • Natural';
    }

    const calibratedPitch = 0.93;
    const calibratedRate = 0.96;

    const analysis: VoiceMetadataAnalysis = {
      voice: v,
      score,
      tone,
      isMasculine: true,
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
   * Returns available voices strictly sorted by deep, calm, masculine acoustic suitability.
   * Disqualifies any non-male voice.
   */
  public static getPrioritizedVoices(): Array<{ voice: SpeechSynthesisVoice; analysis: VoiceMetadataAnalysis }> {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return [];

    const analyzed = voices.map((v) => ({
      voice: v,
      analysis: this.analyzeVoice(v),
    }));

    // Strictly keep ONLY verified masculine voices with positive scores
    const maleOnly = analyzed.filter((a) => a.analysis.isMasculine && a.analysis.score > 0);
    if (maleOnly.length > 0) {
      maleOnly.sort((a, b) => b.analysis.score - a.analysis.score);
      return maleOnly;
    }

    return [];
  }

  /**
   * Selects the highest-ranking clearly MALE voice. Never returns a female voice.
   */
  public static getBestMaleVoice(): SpeechSynthesisVoice | null {
    const prioritized = this.getPrioritizedVoices();
    if (prioritized.length > 0 && prioritized[0].analysis.isMasculine) {
      return prioritized[0].voice;
    }
    return null;
  }

  /**
   * Returns recommended pitch and rate for LUXION's deep, confident male voice.
   */
  public static getCalibratedAcoustics(voice: SpeechSynthesisVoice | null): { pitch: number; rate: number } {
    if (!voice) {
      return { pitch: 0.93, rate: 0.96 };
    }
    const analysis = this.analyzeVoice(voice);
    return {
      pitch: analysis.calibratedPitch || 0.93,
      rate: analysis.calibratedRate || 0.96,
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
      .replace(/```[a-z]*\s*[\s\S]*?```/gi, 'Here is the code implementation.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+(.*)$/gm, '$1.')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s]+/gi, 'the link')
      .replace(/^\s*[-*+]\s+(.*)$/gm, '$1, ')
      .replace(/^\s*\d+\.\s+(.*)$/gm, '$1, ')
      .replace(/[*_~]/g, '')
      .replace(/^\s*>\s*(.*)$/gm, '$1.')
      .replace(/\|/g, ', ')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}▼▲→←★•✓✕⋮]/gu, '')
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
    if (this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended) {
      return true;
    }
    return !!(this.synth && this.synth.speaking && !this.synth.paused);
  }

  public static isPaused(): boolean {
    if (this.currentAudio && this.currentAudio.paused && !this.currentAudio.ended && this.isPausedState) {
      return true;
    }
    return !!(this.synth && this.synth.paused);
  }

  public static getPlaybackState(messageId?: string): 'idle' | 'playing' | 'paused' {
    if (messageId && this.activeMessageId !== messageId) return 'idle';
    if (this.currentAudio) {
      if (this.currentAudio.paused && !this.currentAudio.ended && this.isPausedState) return 'paused';
      if (!this.currentAudio.paused && !this.currentAudio.ended) return 'playing';
      return 'idle';
    }
    if (!this.synth) return 'idle';
    if (this.synth.paused || this.isPausedState) return 'paused';
    if (this.synth.speaking) return 'playing';
    return 'idle';
  }

  /**
   * Pause current speech playback.
   */
  public static pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.isPausedState = true;
      this.notifyStatus('paused');
      return;
    }
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
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {});
      this.isPausedState = false;
      this.notifyStatus('playing');
      return;
    }
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
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
    this.activeMessageId = null;
    this.isPausedState = false;
    this.notifyStatus('idle');
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
   * Prioritizes high-fidelity server-side studio male AI voice (Charon),
   * with seamless fallback to verified client male synthesizers.
   */
  public static async speak(
    text: string,
    options?: {
      messageId?: string;
      voice?: SpeechSynthesisVoice | null;
      rate?: number;
      pitch?: number;
      useClientVoice?: boolean;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    this.stop();

    const cleanText = this.prepareSpeechText(text);
    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    const messageId = options?.messageId || null;
    this.activeMessageId = messageId;
    this.isPausedState = false;

    // If an explicit client device voice is selected, route directly to Web Speech
    if (options?.voice || options?.useClientVoice) {
      this.speakViaWebSpeech(cleanText, options);
      return;
    }

    // If cooldown is active from a previous rate limit, fall back directly to client speech without delay
    if (Date.now() < this.apiCooldownUntil) {
      this.speakViaWebSpeech(cleanText, options);
      return;
    }

    // 1. Try High-Fidelity Studio Male Voice via /api/tts (Charon: Deep authoritative baritone)
    const cachedAudioUrl = this.audioCache.get(cleanText);
    if (cachedAudioUrl) {
      this.playAudioUrl(cachedAudioUrl, messageId, options);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voiceName: 'Charon' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        this.apiCooldownUntil = Date.now() + 30000;
        this.speakViaWebSpeech(cleanText, options);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
          if (this.audioCache.size > 50) {
            const firstKey = this.audioCache.keys().next().value;
            if (firstKey) this.audioCache.delete(firstKey);
          }
          this.audioCache.set(cleanText, audioUrl);
          this.playAudioUrl(audioUrl, messageId, options);
          return;
        }
      }
    } catch (e) {
      // Fallback silently to client male Web Speech synthesizer
    }

    // 2. Client Web Speech Synthesis fallback (strictly male voices only)
    this.speakViaWebSpeech(cleanText, options);
  }

  private static playAudioUrl(
    audioUrl: string,
    messageId: string | null,
    options?: {
      rate?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): void {
    const audio = new Audio(audioUrl);
    if (options?.rate) {
      audio.playbackRate = Math.max(0.75, Math.min(1.5, options.rate));
    }
    this.currentAudio = audio;
    this.activeMessageId = messageId;

    audio.onplay = () => {
      this.isPausedState = false;
      options?.onStart?.();
      this.notifyStatus('playing');
    };

    audio.onended = () => {
      this.currentAudio = null;
      this.activeMessageId = null;
      this.isPausedState = false;
      options?.onEnd?.();
      this.notifyStatus('idle');
    };

    audio.onerror = (e) => {
      this.currentAudio = null;
      this.activeMessageId = null;
      this.isPausedState = false;
      options?.onError?.(e);
      this.notifyStatus('idle');
    };

    audio.play().catch((err) => {
      console.warn('Audio play failed, falling back to Web Speech:', err);
      this.currentAudio = null;
      this.speakViaWebSpeech(options?.onStart ? '' : '', options);
    });
  }

  private static speakViaWebSpeech(
    cleanText: string,
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

    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    let targetVoice = options?.voice || this.getBestMaleVoice();
    if (targetVoice) {
      const analysis = this.analyzeVoice(targetVoice);
      if (!analysis.isMasculine) {
        // Force re-selection of a real male voice
        targetVoice = this.getBestMaleVoice();
      }
    }

    const calibrated = this.getCalibratedAcoustics(targetVoice);
    const rawRate = options?.rate ?? calibrated.rate;
    const rawPitch = options?.pitch ?? calibrated.pitch;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    // If a verified male voice is present, use pitch 0.93; if none exists, set to deep 0.70 to avoid girl tone
    utterance.pitch = targetVoice ? Math.max(0.88, Math.min(1.15, rawPitch)) : 0.70;
    utterance.rate = Math.max(0.85, Math.min(1.25, rawRate));

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

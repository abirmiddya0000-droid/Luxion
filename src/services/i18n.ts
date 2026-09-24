/**
 * LUXION CENTRALIZED LOCALIZATION & TRANSLATION ENGINE (i18n)
 * Supports English, Hindi (हिन्दी), and Bengali (বাংলা).
 * Extensible for future language additions.
 */

export type SupportedLanguage = 'en' | 'hi' | 'bn';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

export interface TranslationDictionary {
  chat: string;
  newChat: string;
  history: string;
  settings: string;
  voice: string;
  readAloud: string;
  stopReading: string;
  autoSpeak: string;
  about: string;
  clearAll: string;
  startNewChat: string;
  close: string;
  send: string;
  clearCurrentChat: string;
  appearance: string;
  memory: string;
  language: string;
  autoDetect: string;
  autoDetectDesc: string;
  testVoice: string;
  playing: string;
  listen: string;
  copy: string;
  copied: string;
  retry: string;
  stop: string;
  inputPlaceholder: string;
  listening: string;
  noMessagesTitle: string;
  noMessagesSubtitle: string;
  starterGreeting: string;
  starterAnime: string;
  starterRimuru: string;
  starterCapabilities: string;
  starterCode: string;
  confirmClear: string;
  confirmClearDesc: string;
  cancel: string;
  delete: string;
  options: string;
  save: string;
  activeLanguage: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    chat: 'Chat',
    newChat: 'New Chat',
    history: 'Chat History',
    settings: 'Settings',
    voice: 'Voice & Speech',
    readAloud: 'Read Aloud',
    stopReading: 'Stop Reading',
    autoSpeak: 'Auto Speak',
    about: 'About LUXION',
    clearAll: 'Clear All',
    startNewChat: 'Start New Chat',
    close: 'Close',
    send: 'Send',
    clearCurrentChat: 'Clear Current Chat',
    appearance: 'Appearance',
    memory: 'Memory',
    language: 'Language',
    autoDetect: 'Auto Detect Language',
    autoDetectDesc: 'Automatically detect message language (English, Hindi, Bengali, Hinglish)',
    testVoice: 'Test Voice',
    playing: 'Playing...',
    listen: 'Listen',
    copy: 'Copy',
    copied: 'Copied',
    retry: 'Retry',
    stop: 'Stop',
    inputPlaceholder: 'Ask anything... (coding, reasoning, anime, facts)',
    listening: 'Listening to your voice...',
    noMessagesTitle: 'LUXION v3.5 Core',
    noMessagesSubtitle: 'Autonomous personal AI with deep vocal presence. Ask anything—from 100% accurate anime lookups to full-stack code and math.',
    starterGreeting: 'Hey bro 👋',
    starterAnime: 'Death Note ka MC kaun hai?',
    starterRimuru: 'What anime is Rimuru from?',
    starterCapabilities: 'What can you do?',
    starterCode: 'Write a simple JavaScript function',
    confirmClear: 'Clear all conversation history?',
    confirmClearDesc: 'This will permanently wipe all stored chat sessions from your browser.',
    cancel: 'Cancel',
    delete: 'Delete',
    options: 'Options',
    save: 'Save',
    activeLanguage: 'Active Language',
  },
  hi: {
    chat: 'चैट',
    newChat: 'नई चैट',
    history: 'चैट इतिहास',
    settings: 'सेटिंग्स',
    voice: 'आवाज़ और बोली',
    readAloud: 'बोलकर सुनाएं',
    stopReading: 'पढ़ना बंद करें',
    autoSpeak: 'ऑटो स्पीक',
    about: 'लक्सियन के बारे में',
    clearAll: 'सब साफ़ करें',
    startNewChat: 'नई चैट शुरू करें',
    close: 'बंद करें',
    send: 'भेजें',
    clearCurrentChat: 'वर्तमान चैट साफ़ करें',
    appearance: 'रूप और रंग',
    memory: 'मेमोरी',
    language: 'भाषा',
    autoDetect: 'भाषा स्वतः पहचानें',
    autoDetectDesc: 'संदेश की भाषा अपने आप पहचानें (English, हिन्दी, বাংলা, हिंग्लिश)',
    testVoice: 'आवाज़ टेस्ट करें',
    playing: 'चल रहा है...',
    listen: 'सुनें',
    copy: 'कॉपी',
    copied: 'कॉपी हो गया',
    retry: 'पुनः प्रयास',
    stop: 'रोकें',
    inputPlaceholder: 'कुछ भी पूछें... (कोडिंग, तर्क, एनीमे, तथ्य)',
    listening: 'आपकी आवाज़ सुन रहा हूँ...',
    noMessagesTitle: 'LUXION v3.5 कोर',
    noMessagesSubtitle: 'गहरी आवाज़ वाला स्वायत्त व्यक्तिगत AI। कोडिंग, गणित और एनीमे से जुड़े सटीक सवालों के उत्तर प्राप्त करें।',
    starterGreeting: 'नमस्ते भाई 👋',
    starterAnime: 'Death Note का MC कौन है?',
    starterRimuru: 'Rimuru किस anime से है?',
    starterCapabilities: 'आप क्या कर सकते हैं?',
    starterCode: 'एक आसान JavaScript फ़ंक्शन लिखें',
    confirmClear: 'सारा चैट इतिहास साफ़ करें?',
    confirmClearDesc: 'यह आपके ब्राउज़र से सहेजे गए सभी चैट सत्र स्थायी रूप से हटा देगा।',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    options: 'विकल्प',
    save: 'सहेजें',
    activeLanguage: 'सक्रिय भाषा',
  },
  bn: {
    chat: 'চ্যাট',
    newChat: 'নতুন চ্যাট',
    history: 'চ্যাট ইতিহাস',
    settings: 'সেটিংস',
    voice: 'ভয়েস ও স্পিচ',
    readAloud: 'জোরে পড়ুন',
    stopReading: 'পড়া বন্ধ করুন',
    autoSpeak: 'স্বয়ংক্রিয় স্পিচ',
    about: 'লাক্সিয়ন সম্পর্কে',
    clearAll: 'সমস্ত মুছুন',
    startNewChat: 'নতুন চ্যাট শুরু করুন',
    close: 'বন্ধ করুন',
    send: 'পাঠান',
    clearCurrentChat: 'বর্তমান চ্যাট মুছুন',
    appearance: 'দৃশ্যমানতা',
    memory: 'মেমরি',
    language: 'ভাষা',
    autoDetect: 'স্বয়ংক্রিয় ভাষা সনাক্তকরণ',
    autoDetectDesc: 'মেসেজের ভাষা নিজে থেকেই চিহ্নিত করুন (English, हिन्दी, বাংলা)',
    testVoice: 'ভয়েস পরীক্ষা করুন',
    playing: 'চলছে...',
    listen: 'শুনুন',
    copy: 'কপি',
    copied: 'কপি হয়েছে',
    retry: 'পুনরায় চেষ্টা',
    stop: 'থামুন',
    inputPlaceholder: 'যেকোনো কিছু জিজ্ঞাসা করুন... (কোডিং, যুক্তি, অ্যানিমে, তথ্য)',
    listening: 'আপনার কথা শুনছি...',
    noMessagesTitle: 'LUXION v3.5 কোর',
    noMessagesSubtitle: 'গম্ভীর ভয়েস সহ ব্যক্তিগত এআই। নির্ভুল অ্যানিমে তথ্য, কোডিং, গণিত ও যেকোনো বিষয়ে সরাসরি সহায়তা নিন।',
    starterGreeting: 'কেমন আছো? 👋',
    starterAnime: 'Death Note-এর মূল চরিত্র কে?',
    starterRimuru: 'Rimuru কোন অ্যানিমের চরিত্র?',
    starterCapabilities: 'তুমি কী কী করতে পারো?',
    starterCode: 'একটি সহজ JavaScript ফাংশন লিখে দাও',
    confirmClear: 'সমস্ত চ্যাট ইতিহাস মুছে ফেলবেন?',
    confirmClearDesc: 'এটি আপনার ব্রাউজারে সংরক্ষিত সমস্ত কথোপকথন স্থায়ীভাবে মুছে ফেলবে।',
    cancel: 'বাতিল',
    delete: 'মুছুন',
    options: 'বিকল্প',
    save: 'সংরক্ষণ',
    activeLanguage: 'সক্রিয় ভাষা',
  },
};

/**
 * Returns translated UI string.
 */
export function t(key: keyof TranslationDictionary, lang: SupportedLanguage = 'en'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

/**
 * Detect language of user's message.
 * Supports Bengali (Unicode), Hindi (Devanagari), Hinglish (Romanized Hindi), and English.
 */
export function detectLanguage(text: string): {
  lang: SupportedLanguage;
  isHinglish: boolean;
  confidence: number;
} {
  if (!text || !text.trim()) {
    return { lang: 'en', isHinglish: false, confidence: 1 };
  }

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Bengali Unicode block: \u0980-\u09FF
  const bengaliChars = (raw.match(/[\u0980-\u09FF]/g) || []).length;
  if (bengaliChars >= 2 || bengaliChars / raw.length > 0.15) {
    return { lang: 'bn', isHinglish: false, confidence: 0.98 };
  }

  // 2. Hindi Devanagari Unicode block: \u0900-\u097F
  const hindiChars = (raw.match(/[\u0900-\u097F]/g) || []).length;
  if (hindiChars >= 2 || hindiChars / raw.length > 0.15) {
    return { lang: 'hi', isHinglish: false, confidence: 0.98 };
  }

  // 3. Hinglish / Romanized Hindi detection
  // Common conversational Hindi keywords in Latin script
  const HINGLISH_WORDS = [
    'kaun', 'kya', 'hai', 'hain', 'karo', 'karein', 'karna', 'batao', 'bataiye',
    'naam', 'kaisa', 'kaise', 'kaisi', 'mera', 'meri', 'mere', 'mujhe', 'hum',
    'bhai', 'bro', 'ye', 'yeh', 'woh', 'tha', 'thi', 'the', 'hoga', 'hogi',
    'kyun', 'kyu', 'kaha', 'kahan', 'accha', 'achha', 'theek', 'thik', 'nahin',
    'nahi', 'matlab', 'bolo', 'sun', 'samjhao', 'samajh', 'iska', 'iski', 'iske',
    'kisko', 'kisne', 'aur', 'lekin', 'par', 'sirf', 'pata', 'baare', 'mein',
  ];

  const words = lower.split(/[^a-z0-9]+/);
  let hinglishCount = 0;
  for (const w of words) {
    if (HINGLISH_WORDS.includes(w)) {
      hinglishCount++;
    }
  }

  // If at least 2 Hinglish words or key patterns like "ka naam kya hai", "kaun hai", "kya hai"
  const hasHinglishPhrase =
    /ka\s+naam\s+kya\s+hai|kaun\s+hai|kya\s+hai|batao|kaisa\s+hai|ye\s+anime|ka\s+mc/i.test(lower);

  if (hinglishCount >= 2 || hasHinglishPhrase) {
    return { lang: 'hi', isHinglish: true, confidence: 0.92 };
  }

  // Default to English
  return { lang: 'en', isHinglish: false, confidence: 0.85 };
}

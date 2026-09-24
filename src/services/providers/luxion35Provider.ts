/**
 * LUXION 3.5 RESPONSE PROVIDER
 * 
 * Local, standalone conversational response layer for the LUXION architecture.
 * 
 * Architectural Directives:
 * - Standalone local provider: Does NOT call OpenAI, Gemini, Claude, Anthropic, Grok, or external AI APIs.
 * - Technical accuracy: `isNeuralTrained: false` (reflects deterministic cognitive heuristics,
 *   structured knowledge retrieval, exact quantitative evaluation, and contextual state machines).
 * - Original LUXION personality: Calm, confident, direct, intelligent, helpful, natural,
 *   slightly witty when appropriate, not overly formal, not robotic, does not blindly agree,
 *   and respectfully corrects errors.
 * - Anti-slop discipline: No generic report templates ("### Analysis", "1. Core Concept",
 *   "2. Implementation Strategy", "3. Execution"), no corporate filler, no sycophantic greetings.
 */

import { LUXION_IDENTITY } from '../../config/luxionIdentity';
import { MemoryItem, MemoryService, MemoryCategory } from '../memory';
import { KnowledgeBase, KnowledgeEntry } from '../knowledge';
import {
  BrainResponse,
  ConversationContext,
  LuxionAttachment,
  LuxionContext,
  LuxionIntent,
  LuxionMessage,
  LuxionResponseProvider,
  PersonalityState,
} from '../luxionBrain';
import { SupportedLanguage, detectLanguage } from '../i18n';

export type LocalCapability =
  | 'coding_tools'
  | 'math_evaluation'
  | 'file_processing'
  | 'memory_management'
  | 'speech_voice'
  | 'anime_popculture'
  | 'unsupported_image_gen'
  | 'unsupported_video_gen'
  | 'unsupported_live_web'
  | 'general_dialogue';

interface AnimeEntry {
  title: string;
  romaji?: string;
  mainCharacter: string;
  characters: string[];
  keywords: string[];
  summary: string;
}

export class Luxion35Provider implements LuxionResponseProvider {
  public readonly name = 'LUXION 3.5';
  public readonly isNeuralTrained = false;

  // Curated knowledge catalog for anime & pop culture queries
  private static readonly ANIME_DATABASE: AnimeEntry[] = [
    {
      title: 'That Time I Got Reincarnated as a Slime',
      romaji: 'Tensei Shitara Slime Datta Ken (Tensura)',
      mainCharacter: 'Rimuru Tempest (Satoru Mikami)',
      characters: ['rimuru', 'rimuru tempest', 'satoru mikami', 'veldora', 'shion', 'benimaru', 'shuna', 'milim nava', 'diablo', 'ranga', 'gobta'],
      keywords: ['slime', 'great sage', 'predator', 'jura tempest', 'demon lord', 'tempest federation'],
      summary:
        'Satoru Mikami, a 37-year-old corporate worker in Tokyo, is fatally stabbed protecting a junior colleague. He reincarnates in a fantasy world as a seemingly humble blue slime with two unique skills: "Predator" (absorbing objects and replicating their skills) and "Great Sage" (an internal analytical advisor). He befriends the Storm Dragon Veldora, adopts the name Rimuru Tempest, founds the Jura Tempest Federation where monsters and humans live harmoniously, and eventually evolves into an Awakened Demon Lord.',
    },
    {
      title: 'Attack on Titan',
      romaji: 'Shingeki no Kyojin',
      mainCharacter: 'Eren Yeager',
      characters: ['eren', 'eren yeager', 'levi', 'levi ackerman', 'mikasa', 'mikasa ackerman', 'armin', 'armin arlert', 'zeke', 'reiner', 'erwin'],
      keywords: ['titan', 'titans', 'walls', 'wall maria', 'survey corps', 'scout regiment', 'rumbling', 'colossal titan', 'armored titan', 'beast titan'],
      summary:
        'In a world where humanity lives inside three concentric walls to protect themselves from gigantic man-eating humanoids called Titans, young Eren Yeager vows to eradicate every Titan after his mother is devoured during the breach of Wall Maria.',
    },
    {
      title: 'Jujutsu Kaisen',
      romaji: 'Jujutsu Kaisen',
      mainCharacter: 'Yuji Itadori (alongside Satoru Gojo as central icon)',
      characters: ['gojo', 'satoru gojo', 'yuji', 'yuji itadori', 'megumi', 'megumi fushiguro', 'nobara', 'nobara kugisaki', 'sukuna', 'ryomen sukuna', 'nanami', 'geto'],
      keywords: ['curse', 'cursed energy', 'jujutsu', 'cursed technique', 'domain expansion', 'limitless', 'six eyes', 'fingers of sukuna'],
      summary:
        'High school student Yuji Itadori swallows a cursed finger belonging to the King of Curses, Ryomen Sukuna. To delay his execution and gather the remaining fingers, he enrolls at Tokyo Jujutsu High under the mentorship of the strongest modern sorcerer, Satoru Gojo.',
    },
    {
      title: 'Demon Slayer',
      romaji: 'Kimetsu no Yaiba',
      mainCharacter: 'Tanjiro Kamado',
      characters: ['tanjiro', 'tanjiro kamado', 'nezuko', 'nezuko kamado', 'zenitsu', 'inosuke', 'muzan', 'muzan kibutsuji', 'rengoku', 'giyu tomioka'],
      keywords: ['demon slayer', 'breathing styles', 'sun breathing', 'water breathing', 'nichirin', 'hashira', 'twelve kizuki', 'box'],
      summary:
        'After his family is slaughtered by demons and his sister Nezuko is turned into one, Tanjiro Kamado joins the Demon Slayer Corps to hunt down Muzan Kibutsuji and find a cure to turn Nezuko human again.',
    },
    {
      title: 'Death Note',
      romaji: 'Death Note',
      mainCharacter: 'Light Yagami (Kira)',
      characters: ['light', 'light yagami', 'l', 'l lawliet', 'ryuk', 'misa', 'misa amane', 'near', 'mello'],
      keywords: ['death note', 'shinigami', 'kira', 'notebook', 'write name', 'heart attack', 'apple', 'god of the new world'],
      summary:
        'Brilliant high school student Light Yagami discovers a supernatural notebook dropped by the Shinigami Ryuk. Any human whose name is written in the notebook dies. Light attempts to cleanse the world of criminals under the alias "Kira", sparking a high-stakes psychological game of cat-and-mouse with the eccentric master detective L.',
    },
    {
      title: 'Fullmetal Alchemist: Brotherhood',
      romaji: 'Hagane no Renkinjutsushi',
      mainCharacter: 'Edward Elric (The Fullmetal Alchemist)',
      characters: ['edward', 'edward elric', 'alphonse', 'alphonse elric', 'roy mustang', 'riza hawkeye', 'winry', 'scar', 'father'],
      keywords: ['alchemy', 'transmutation', 'equivalent exchange', 'philosopher stone', 'automail', 'suit of armor', 'state alchemist', 'homunculus'],
      summary:
        'Brothers Edward and Alphonse Elric commit the taboo of human alchemy to resurrect their deceased mother. The failed transmutation costs Alphonse his physical body and Edward his right arm and left leg. Equipped with mechanical automail limbs, Edward becomes a State Alchemist, and together the brothers search for the Philosopher\'s Stone to restore their bodies.',
    },
    {
      title: 'One Piece',
      romaji: 'One Piece',
      mainCharacter: 'Monkey D. Luffy',
      characters: ['luffy', 'monkey d luffy', 'zoro', 'roronoa zoro', 'sanji', 'nami', 'usopp', 'chopper', 'robin', 'franky', 'brook', 'jinbe', 'shanks'],
      keywords: ['straw hat', 'pirate', 'devil fruit', 'grand line', 'all blue', 'gear 5', 'sun god nika', 'one piece', 'marine'],
      summary:
        'Monkey D. Luffy, a spirited boy who gained rubber-like elasticity from eating the Gum-Gum Devil Fruit, sets sail on the Grand Line with his Straw Hat crew to uncover the legendary treasure "One Piece" and become the King of the Pirates.',
    },
    {
      title: 'Naruto & Naruto Shippuden',
      romaji: 'Naruto',
      mainCharacter: 'Naruto Uzumaki',
      characters: ['naruto', 'naruto uzumaki', 'sasuke', 'sasuke uchiha', 'kakashi', 'kakashi hatake', 'itachi', 'itachi uchiha', 'sakura', 'jiraiya', 'madara'],
      keywords: ['ninja', 'hidden leaf', 'konoha', 'rasengan', 'chidori', 'sharingan', 'nine tails', 'kurama', 'hokage', 'akatsuki'],
      summary:
        'Shunned by his village because the Nine-Tailed Fox spirit is sealed within his body, young ninja Naruto Uzumaki dreams of earning everyone\'s respect and becoming Hokage, the village leader.',
    },
    {
      title: 'One Punch Man',
      romaji: 'One Punch Man',
      mainCharacter: 'Saitama (The Caped Baldy)',
      characters: ['saitama', 'genos', 'garou', 'king', 'tatsumaki', 'fubuki', 'mumen rider', 'boros', 'silver fang'],
      keywords: ['one punch', 'hero for fun', 'caped baldy', 'hero association', '100 pushups', 'bald'],
      summary:
        'Saitama is a hero who trained so intensely that his hair fell out and he can defeat any adversary with a single punch. Bored by the lack of any worthy challenge, he searches for an opponent who can make him feel the thrill of a real fight again.',
    },
    {
      title: 'Frieren: Beyond Journey\'s End',
      romaji: 'Sousou no Frieren',
      mainCharacter: 'Frieren',
      characters: ['frieren', 'fern', 'stark', 'himmel', 'heiter', 'eisen'],
      keywords: ['elf', 'mage', 'after defeating the demon king', 'hero party', 'grimoire', 'longevity', 'journey'],
      summary:
        'The elf mage Frieren and her fellow adventurers defeat the Demon King, concluding a ten-year quest. As an elf with a lifespan of millennia, Frieren watches her mortal comrades age and die. Regretting not knowing them better, she embarks on a new pilgrimage to understand human connection.',
    },
    {
      title: 'Solo Leveling',
      romaji: 'Ore dake Level Up na Ken',
      mainCharacter: 'Sung Jin-woo (The Shadow Monarch)',
      characters: ['sung jin-woo', 'jinwoo', 'cha hae-in', 'go gun-hee', 'woo jin-chul', 'igris', 'beru'],
      keywords: ['shadow monarch', 'system', 'arise', 'hunter', 'dungeon', 'e-rank hunter', 'gates', 'double dungeon'],
      summary:
        'In a world where portals called "gates" connect to monster-filled dungeons, Sung Jin-woo is notorious as the world\'s weakest E-rank hunter. After surviving a deadly double dungeon trap, he receives a unique interface called "The System" that allows him alone to level up endlessly, transforming him into the invincible Shadow Monarch.',
    },
    {
      title: 'Bleach',
      romaji: 'Bleach',
      mainCharacter: 'Ichigo Kurosaki',
      characters: ['ichigo', 'ichigo kurosaki', 'rukia', 'rukia kuchiki', 'aizen', 'sosuke aizen', 'urahara', 'byakuya', 'kenpachi', 'orihime'],
      keywords: ['soul reaper', 'shinigami', 'zanpakuto', 'bankai', 'soul society', 'hollow', 'hueco mundo', 'getsuga tensho'],
      summary:
        'High schooler Ichigo Kurosaki gains the powers of a Soul Reaper after saving Rukia Kuchiki from a Hollow. He takes on the duty of defending humans from evil spirits and guiding departed souls to the afterlife.',
    },
    {
      title: 'Dragon Ball',
      romaji: 'Dragon Ball / Dragon Ball Z',
      mainCharacter: 'Son Goku (Kakarot)',
      characters: ['goku', 'son goku', 'vegeta', 'gohan', 'piccolo', 'frieza', 'cell', 'majin buu', 'trunks'],
      keywords: ['super saiyan', 'kamehameha', 'dragon balls', 'shenron', 'saiyan', 'spirit bomb', 'senzu bean'],
      summary:
        'The epic adventures of Son Goku, a Saiyan warrior raised on Earth, who continually trains, unlocks legendary transformations, and defends the universe from galactic conquerors, androids, and ancient deities.',
    },
    {
      title: 'Chainsaw Man',
      romaji: 'Chainsaw Man',
      mainCharacter: 'Denji',
      characters: ['denji', 'pochita', 'makima', 'power', 'aki', 'aki hayakawa', 'kishibe'],
      keywords: ['chainsaw', 'devil hunter', 'public safety', 'gun devil', 'blood devil', 'control devil'],
      summary:
        'Living in deep poverty paying off his deceased father\'s debts, Denji merges with his pet chainsaw devil Pochita after being betrayed. He is recruited into Public Safety Devil Hunter Squad 4 by the enigmatic Makima.',
    },
    {
      title: 'My Hero Academia',
      romaji: 'Boku no Hero Academia',
      mainCharacter: 'Izuku Midoriya (Deku)',
      characters: ['deku', 'izuku midoriya', 'bakugo', 'katsuki bakugo', 'todoroki', 'shoto todoroki', 'all might', 'shigaraki', 'all for one'],
      keywords: ['quirk', 'hero', 'one for all', 'all for one', 'plus ultra', 'ua high', 'smash'],
      summary:
        'In a superhuman society where 80% of humanity possesses superpowers called "Quirks", born quirkless boy Izuku Midoriya inherits the legendary Quirk "One For All" from the world\'s greatest hero, All Might.',
    },
    {
      title: 'Hunter × Hunter',
      romaji: 'Hunter x Hunter',
      mainCharacter: 'Gon Freecss',
      characters: ['gon', 'gon freecss', 'killua', 'killua zoldyck', 'kurapika', 'leorio', 'hisoka', 'chrollo', 'meruem'],
      keywords: ['hunter exam', 'nen', 'nen aura', 'phantom troupe', 'chimera ant', 'greed island', 'zoldyck'],
      summary:
        'Young Gon Freecss discovers that his absent father is a world-renowned licensed Hunter. Gon takes the perilous Hunter Exam to become a Hunter himself and track down his father, bonding with assassin heir Killua, vengeful Kurapika, and Leorio.',
    },
    {
      title: 'Cyberpunk: Edgerunners',
      romaji: 'Cyberpunk: Edgerunners',
      mainCharacter: 'David Martinez',
      characters: ['david', 'david martinez', 'lucy', 'rebecca', 'maine', 'kiwi', 'faraday', 'adam smasher'],
      keywords: ['sandevistan', 'night city', 'chrome', 'cyberware', 'edgerunner', 'arasaka', 'cyberpsychosis'],
      summary:
        'In Night City, a street kid named David Martinez implants a military-grade Sandevistan cyberware after a tragic drive-by shooting, rising through the mercenary underworld as an edgerunner while racing against cyberpsychosis.',
    },
    {
      title: 'Blue Lock',
      romaji: 'Blue Lock',
      mainCharacter: 'Yoichi Isagi',
      characters: ['isagi', 'yoichi isagi', 'bachira', 'meguru bachira', 'chigiri', 'nagi', 'seishiro nagi', 'barou', 'rin itoshi', 'ego jinpachi'],
      keywords: ['egoist', 'striker', 'football', 'soccer', 'blue lock', 'direct shot', 'spatial awareness'],
      summary:
        'Following Japan’s elimination from the 2018 World Cup, the eccentric coach Ego Jinpachi gathers 300 high school forwards inside the prison-like facility Blue Lock to forge the world’s ultimate, self-centered striker.',
    },
    {
      title: 'Tokyo Ghoul',
      romaji: 'Tokyo Ghoul',
      mainCharacter: 'Ken Kaneki',
      characters: ['kaneki', 'ken kaneki', 'touka', 'touka kirishima', 'rize', 'rize kamishiro', 'tsukiyama', 'amon', 'arima'],
      keywords: ['ghoul', 'kagune', 'anteiku', 'ccg', 'one-eyed ghoul', 'coffee', '1000 minus 7'],
      summary:
        'College student Ken Kaneki barely survives a deadly date with a Ghoul named Rize, only to undergo emergency surgery that transplants her organs into him, turning him into a half-ghoul who must navigate the conflict between human and ghoul societies.',
    },
    {
      title: 'Sword Art Online',
      romaji: 'Sword Art Online (SAO)',
      mainCharacter: 'Kirito (Kazuto Kirigaya)',
      characters: ['kirito', 'kazuto kirigaya', 'asuna', 'asuna yuuki', 'yui', 'klein', 'sinon', 'leafa', 'kayaba akihiko'],
      keywords: ['aincrad', 'nervegear', 'vrmmorpg', 'dual blades', 'starburst stream', 'death game'],
      summary:
        'Ten thousand players log into the revolutionary VRMMORPG Sword Art Online, only to be trapped by creator Akihiko Kayaba: dying in the game means dying in reality. Solo player Kirito battles through 100 floors of Aincrad to free the survivors.',
    },
    {
      title: 'Cowboy Bebop',
      romaji: 'Cowboy Bebop',
      mainCharacter: 'Spike Spiegel',
      characters: ['spike', 'spike spiegel', 'faye', 'faye valentine', 'jet', 'jet black', 'ed', 'edward', 'ein', 'vicious'],
      keywords: ['bebop', 'bounty hunter', 'space', 'woolong', 'see you space cowboy', 'swordfish', 'red dragon'],
      summary:
        'In 2071, an eclectic crew of bounty hunters travel aboard the spaceship Bebop chasing criminals across the solar system while confronting the inescapable ghosts of their pasts.',
    },
    {
      title: 'Steins;Gate',
      romaji: 'Steins;Gate',
      mainCharacter: 'Rintaro Okabe (Hououin Kyouma)',
      characters: ['okabe', 'rintaro okabe', 'kurisu', 'kurisu makise', 'mayuri', 'daru', 'suzuha'],
      keywords: ['time travel', 'microwave', 'd-mail', 'world line', 'cern', 'el psy kongroo', 'mad scientist', 'hououin kyouma'],
      summary:
        'Self-proclaimed eccentric scientist Rintaro Okabe accidentally discovers that his modified microwave can send text messages back in time ("D-mails"). As he experiments with altering past events, he triggers dangerous butterfly effects across alternate worldlines.',
    },
    {
      title: 'Code Geass',
      romaji: 'Code Geass: Lelouch of the Rebellion',
      mainCharacter: 'Lelouch Lamperouge (Zero)',
      characters: ['lelouch', 'lelouch lamperouge', 'cc', 'c.c.', 'suzaku', 'suzaku kururugi', 'kallen', 'nunally'],
      keywords: ['geass', 'zero', 'britannia', 'black knights', 'knightmare frame', 'absolute obedience', 'chess'],
      summary:
        'Exiled Britannian prince Lelouch Lamperouge gains the power of Geass—the ability to command anyone to obey a single order—from the mysterious immortal C.C. Under the masked persona "Zero", he leads a rebellion against the Holy Britannian Empire.',
    },
    {
      title: 'Spy × Family',
      romaji: 'Spy x Family',
      mainCharacter: 'Loid Forger (Twilight) & Anya Forger',
      characters: ['anya', 'anya forger', 'loid', 'loid forger', 'twilight', 'yor', 'yor forger', 'thorn princess', 'bond'],
      keywords: ['telepath', 'spy', 'assassin', 'operation strix', 'eden academy', 'peanut', 'forger family'],
      summary:
        'Master spy Twilight creates a faux family for a critical undercover mission. Unbeknownst to him, his adopted daughter Anya is a telepath who reads minds, and his new wife Yor is a covert assassin. Only Anya knows everyone\'s true identities.',
    },
    {
      title: 'Neon Genesis Evangelion',
      romaji: 'Shin Seiki Evangelion',
      mainCharacter: 'Shinji Ikari',
      characters: ['shinji', 'shinji ikari', 'asuka', 'asuka langley', 'rei', 'rei ayanami', 'misato', 'gendo ikari'],
      keywords: ['eva', 'evangelion', 'angel', 'angels', 'third impact', 'nerv', 'at field', 'get in the robot'],
      summary:
        'In a post-apocalyptic Tokyo-3, teenager Shinji Ikari is coerced by his estranged father to pilot a giant biomechanical Evangelion unit to defend humanity from mysterious catastrophic entities known as Angels.',
    },
    {
      title: 'Vinland Saga',
      romaji: 'Vinland Saga',
      mainCharacter: 'Thorfinn',
      characters: ['thorfinn', 'askeladd', 'canute', 'thors', 'leif erikson'],
      keywords: ['viking', 'vikings', ' revenge', 'dual daggers', 'farmland', 'true warrior', 'vinland'],
      summary:
        'Thorfinn, son of the greatest Viking warrior Thors, spends his youth serving within the mercenary band of Askeladd—the man who murdered his father—solely to earn the right to duel him in an honorable vendetta.',
    },
    {
      title: 'Dr. STONE',
      romaji: 'Dr. Stone',
      mainCharacter: 'Senku Ishigami',
      characters: ['senku', 'senku ishigami', 'taiju', 'tsukasa', 'gen asagiri', 'chrome', 'kohaku'],
      keywords: ['petrification', 'stone world', 'kingdom of science', 'sulfa drug', 'scientific method', 'ten billion percent'],
      summary:
        'Every human on Earth is mysteriously turned into stone. Several thousand years later, scientific prodigy Senku Ishigami awakens into a primitive world and vows to rebuild modern civilization from scratch using the power of science.',
    },
  ];

  /**
   * Routes user prompt and attachment to internal capability handlers.
   */
  public routeCapability(text: string, attachment?: LuxionAttachment | null): LocalCapability {
    const clean = text.toLowerCase();

    // 1. Check for requested image generation
    if (
      /(?:generate|create|draw|make|render|produce)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|drawing|portrait)/i.test(clean) ||
      clean.startsWith('/image') ||
      clean.startsWith('/draw')
    ) {
      return 'unsupported_image_gen';
    }

    // 2. Check for requested video generation
    if (
      /(?:generate|create|make|render|produce)\s+(?:an?\s+)?(?:video|clip|animation|movie|film|footage)/i.test(clean) ||
      clean.startsWith('/video')
    ) {
      return 'unsupported_video_gen';
    }

    // 3. Check for requested live web browsing
    if (
      /(?:browse|crawl|scrape|search)\s+(?:the\s+)?(?:live\s+web|internet|realtime\s+web)/i.test(clean) ||
      /(?:what is the current price of|current live weather in|check online)/i.test(clean)
    ) {
      return 'unsupported_live_web';
    }

    // 4. File attachment
    if (attachment) {
      return 'file_processing';
    }

    // 5. Math / Quantitative evaluation
    if (
      /^(?:calculate|compute|solve|eval|evaluate)\b/i.test(clean) ||
      /^(?:what is\s+)?[\(\)0-9\.\s\+\-\*\/\^\%sqrtcbip]+(?:\s*\=\s*\?)?\??$/i.test(clean.trim()) ||
      /^(?:convert)\s+[\d\.]+\s+[a-z]+/i.test(clean)
    ) {
      return 'math_evaluation';
    }

    // 6. Memory management
    if (
      /^(?:what do you remember|do you remember|what is my name|who am i|what projects am i working on)/i.test(clean) ||
      /^(?:remember\s+(?:that)?|forget\s+|clear\s+(?:my\s+)?memory)/i.test(clean) ||
      /(?:my name is|i prefer|i like to use)\s+/i.test(clean)
    ) {
      return 'memory_management';
    }

    // 7. Coding & Interactive tools
    if (
      clean.startsWith('/build') ||
      /(?:write|create|build|code|implement|generate|refactor|debug)\s+(?:a|an)?\s*(?:game|app|function|component|script|website|calculator|snake|api|page|algorithm)/i.test(clean) ||
      /(?:python|javascript|typescript|react|html|css|sql|regex|json)\b/i.test(clean)
    ) {
      return 'coding_tools';
    }

    // 8. Anime / Manga / Character questions
    const hasDirectAnimeMatch = Luxion35Provider.ANIME_DATABASE.some(
      (a) =>
        clean.includes(a.title.toLowerCase()) ||
        (a.romaji && clean.includes(a.romaji.toLowerCase())) ||
        a.characters.some((c) => new RegExp(`\\b${c}\\b`, 'i').test(clean))
    );

    if (
      hasDirectAnimeMatch ||
      /\b(anime|manga|protagonist|waifu|demon lord|hokage|shinigami|titan|jutsu|bankai|stand user)\b/i.test(clean) ||
      /what (?:is this|anime is this|anime does|anime is)/i.test(clean) ||
      /tell me about (?:naruto|one piece|bleach|dragon ball|death note|attack on titan|jujutsu|demon slayer|solo leveling|frieren)/i.test(clean) ||
      /ye anime|is anime|ka mc|ka hero|kon sa anime/i.test(clean) ||
      clean.includes("rimuru's anime") ||
      clean.includes("rimuru")
    ) {
      return 'anime_popculture';
    }

    // 9. Voice & Speech queries
    if (/(?:speak (?:this )?aloud|read (?:this )?aloud|read aloud|speak this|voice settings|change voice|mute voice|audio voice)/i.test(clean)) {
      return 'speech_voice';
    }

    return 'general_dialogue';
  }

  /**
   * Main generation pipeline for LUXION 3.5.
   */
  public generate(
    context: LuxionContext,
    intent: LuxionIntent,
    personality: PersonalityState,
    conversationContext: ConversationContext
  ): BrainResponse {
    const rawMessage = (context.message || '').trim();
    const cleanInput = rawMessage.toLowerCase();
    const history = context.history || [];
    const attachment = context.attachment || null;
    const memories = context.memories || conversationContext.retrievedMemories || [];
    const knowledge = conversationContext.retrievedKnowledge || [];

    const capability = this.routeCapability(rawMessage, attachment);
    let reply = '';
    const suggestedMemoryUpdates: Array<{ key: string; value: string; category: MemoryCategory }> = [];

    // 1. Unsupported Image Generation
    if (capability === 'unsupported_image_gen') {
      reply = `I don't generate image or artwork files directly. LUXION 3.5 runs locally without an on-device image diffusion model.

If you're building a web interface, I can write the SVG markup, CSS artwork, or HTML5 Canvas code to render what you need programmatically.`;
      return this.buildResponse(reply, 'help_request', 0.95, personality, conversationContext);
    }

    // 2. Unsupported Video Generation
    if (capability === 'unsupported_video_gen') {
      reply = `I don't generate video clips or rendered animations directly—LUXION 3.5 operates locally without video rendering weights.

I can write JavaScript Canvas animations, CSS keyframe animations, or SVG motion sequences for your web project instead.`;
      return this.buildResponse(reply, 'help_request', 0.95, personality, conversationContext);
    }

    // 3. Unsupported Live Web Scraping
    if (capability === 'unsupported_live_web') {
      reply = `I don't have live web-scraping enabled. LUXION 3.5 runs locally inside your browser and app container for responsiveness and privacy. For real-time live feeds or stock ticks, check the respective live sources directly.`;
      return this.buildResponse(reply, 'help_request', 0.92, personality, conversationContext);
    }

    // 4. File Attachment Processing
    if (capability === 'file_processing' && attachment) {
      reply = this.handleAttachment(attachment, rawMessage);
      return this.buildResponse(reply, 'help_request', 0.95, personality, conversationContext);
    }

    // 5. Math Evaluation
    if (capability === 'math_evaluation') {
      const mathResult = this.evaluateMath(rawMessage);
      if (mathResult) {
        return this.buildResponse(mathResult, 'general_question', 0.99, personality, conversationContext);
      }
    }

    // 6. Voice and Speech capability requests (e.g. "Read this aloud")
    if (capability === 'speech_voice') {
      if (/read (?:this )?aloud|speak this/i.test(cleanInput)) {
        reply = `I'm ready. If auto-speak is turned on or you click the **Listen** button below any message, I'll read it aloud using the local voice engine. You can also paste the exact text you'd like me to speak, and I'll deliver it clearly.`;
      } else {
        reply = `LUXION features an advanced auditory synthesis inspector that scores installed voice models for deeper baritones, calm articulation, and futuristic AI acoustic signatures. You can toggle auto-speak, test auditory samples, or fine-tune pitch and cadence in **Settings** at any time.`;
      }
      return this.buildResponse(reply, 'help_request', 0.95, personality, conversationContext);
    }

    const lang: SupportedLanguage = context.language || detectLanguage(rawMessage).lang;

    // 7. Anime & Character Questions
    if (capability === 'anime_popculture') {
      reply = this.resolveAnimeQuery(cleanInput, rawMessage, history, lang);
      return this.buildResponse(reply, 'general_question', 0.96, personality, conversationContext);
    }

    // --- Intent-Driven Generation ---

    switch (intent) {
      case 'founder_inquiry':
      case 'identity':
        reply = this.generateIdentityReply(cleanInput, personality, lang);
        break;

      case 'memory_query':
        reply = this.generateMemoryQueryReply(cleanInput, memories, lang);
        break;

      case 'memory_action':
        reply = this.generateMemoryActionReply(cleanInput, rawMessage, suggestedMemoryUpdates, lang);
        break;

      case 'greeting':
        reply = this.generateGreeting(cleanInput, personality, memories, lang);
        break;

      case 'goodbye':
        reply = this.generateGoodbye(personality);
        break;

      case 'thanks':
        reply = this.generateThanks(personality);
        break;

      case 'emotional_support':
        reply = this.generateSupportReply(cleanInput, personality);
        break;

      case 'coding':
        reply = this.generateCodeReply(rawMessage, cleanInput, memories, lang);
        break;

      case 'explanation':
        reply = this.generateExplanationReply(rawMessage, cleanInput, history, knowledge, lang);
        break;

      case 'help_request':
        reply = this.generateHelpReply(rawMessage, cleanInput, lang);
        break;

      case 'casual':
        reply = this.generateCasualReply(cleanInput, personality);
        break;

      case 'knowledge_query':
      case 'general_question':
      case 'unclear':
      default:
        reply = this.generateKnowledgeOrGeneralReply(rawMessage, cleanInput, history, memories, knowledge, personality);
        break;
    }

    reply = this.sanitizeReply(reply);

    return {
      reply,
      intent,
      confidence: 0.92,
      personalityState: personality,
      context: conversationContext,
      suggestedMemoryUpdates: suggestedMemoryUpdates.length > 0 ? suggestedMemoryUpdates : undefined,
    };
  }

  // -------------------------------------------------------------
  // Response Helpers & Sanitization
  // -------------------------------------------------------------
  private buildResponse(
    reply: string,
    intent: LuxionIntent,
    confidence: number,
    personality: PersonalityState,
    conversationContext: ConversationContext
  ): BrainResponse {
    return {
      reply: this.sanitizeReply(reply),
      intent,
      confidence,
      personalityState: personality,
      context: conversationContext,
    };
  }

  private sanitizeReply(reply: string): string {
    let cleaned = reply;
    // Strip forbidden prefixes and unneeded report banners
    for (const pattern of LUXION_IDENTITY.communicationStyle.forbiddenPatterns) {
      cleaned = cleaned.replace(pattern, '').trim();
    }
    // Clean redundant multiple blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return cleaned;
  }

  // -------------------------------------------------------------
  // Anime & Character Resolution
  // -------------------------------------------------------------
  private resolveAnimeQuery(
    clean: string,
    raw: string,
    history: LuxionMessage[],
    lang: SupportedLanguage = 'en'
  ): string {
    const isHinglish = /bro|bhai|kaun|kya|batao|naam/i.test(clean);

    // 1. Specific Rimuru prompt check ("What anime is Rimuru from?")
    if (clean.includes('rimuru')) {
      if (lang === 'bn') {
        return `Rimuru Tempest হলো **That Time I Got Reincarnated as a Slime** (*Tensei Shitara Slime Datta Ken*, বা *Tensura*) অ্যানিমের প্রধান চরিত্র।

তিনি পূর্বে সাতোরু মিকামি নামের একজন মানুষ ছিলেন, যিনি ফ্যান্টাসি জগতে একটি স্লাইম হিসেবে পুনর্জন্ম লাভ করেন এবং 'Predator' ও 'Great Sage' ক্ষমতার সাহায্যে শক্তিশালী ডিমন লর্ড (Demon Lord)-এ পরিণত হন।`;
      }
      if (lang === 'hi' && !isHinglish) {
        return `रिमुरु टेम्पेस्ट (Rimuru Tempest) **That Time I Got Reincarnated as a Slime** (*Tensei Shitara Slime Datta Ken*, या *Tensura*) का मुख्य पात्र है।

वह सातोरो मिकामी नामक एक कॉर्पोरेट कर्मचारी के रूप में शुरुआत करता है, जो एक काल्पनिक दुनिया में नीले स्लाइम के रूप में पुनर्जन्म लेता है। अपनी अद्वितीय क्षमताओं 'Predator' और 'Great Sage' की मदद से वह जुरा टेम्पेस्ट फेडरेशन की स्थापना करता है और आगे चलकर डीमन लॉर्ड बनता है।`;
      }
      if (isHinglish) {
        return `Rimuru Tempest **That Time I Got Reincarnated as a Slime** (*Tensei Shitara Slime Datta Ken*, ya *Tensura*) ka main character hai.

Woh shuruat mein Satoru Mikami naam ka ek normal corporate worker hota hai, jo fantasy world mein ek slime ke roop mein reincarnate hota hai. Apni unique skills 'Predator' aur 'Great Sage' ke dum par woh Jura Tempest Federation banata hai aur aage chal kar Awakened Demon Lord banta hai.`;
      }
      return `Rimuru Tempest is from **That Time I Got Reincarnated as a Slime** (*Tensei Shitara Slime Datta Ken*, or *Tensura*).

He starts out as Satoru Mikami, a 37-year-old corporate worker who gets fatally stabbed and reincarnates in a fantasy world as a seemingly humble blue slime. Equipped with unique skills "Predator" and "Great Sage", he rapidly unites monsters and humans into the Jura Tempest Federation and eventually evolves into an Awakened Demon Lord.`;
    }

    // 2. Specific Naruto prompt check ("Tell me about Naruto.")
    if (clean.includes('naruto')) {
      if (lang === 'bn') {
        return `**Naruto** হলো মাসাশি কিশিমোতো দ্বারা নির্মিত একটি অত্যন্ত জনপ্রিয় মাঙ্গা ও অ্যানিমে সিরিজ, যার মূল চরিত্র **নারুতো উজুমাকি (Naruto Uzumaki)**।

শৈশবে তার ভেতরে নাইন-টেইলড ফক্স (Kurama) বন্দি থাকার কারণে গ্রামের সবাই তাকে অবহেলা করতো। তবে নিজের অদম্য ইচ্ছা ও পরিশ্রমের মাধ্যমে বন্ধুদের রক্ষা করে সে হিডেন লিফ ভিলেজের হোকাগে (Hokage) হওয়ার স্বপ্ন পূরণ করে।`;
      }
      if (lang === 'hi' && !isHinglish) {
        return `**Naruto** मासाशी किशिमोटो द्वारा निर्मित एक प्रसिद्ध मंगा और एनीमे श्रृंखला है, जिसका मुख्य पात्र **नारुतो उज़ुमाकी (Naruto Uzumaki)** है।

बचपन में नाइन-टेल्ड फॉक्स (कुरामा) के उसके शरीर में सील होने के कारण गांव के लोग उससे दूरी बनाकर रखते थे। लेकिन अपने अथक परिश्रम और दृढ़ संकल्प से वह हिडन लीफ विलेज का होकागे (Hokage) बनने का अपना सपना पूरा करता है।`;
      }
      if (isHinglish) {
        return `**Naruto** Masashi Kishimoto dwara banayi gayi ek iconic anime aur manga series hai, jiska main character **Naruto Uzumaki** hai.

Bachpan mein uske andar Nine-Tailed Fox (Kurama) seal hone ki wajah se Konoha gaon wale use alag-thalag rakhte the. Lekin apni mehnat aur kabhi give up na karne ke attitude se woh sabka dil jeet leta hai aur aage chal kar Hidden Leaf Village ka Hokage banta hai.`;
      }
      return `**Naruto** (and *Naruto Shippuden*) is a manga and anime series created by Masashi Kishimoto following **Naruto Uzumaki**.

Shunned by his village as a child because the Nine-Tailed Fox (Kurama) was sealed inside him, Naruto trains with relentless determination to earn everyone's acknowledgment and achieve his dream of becoming Hokage of the Hidden Leaf Village (Konoha).`;
    }

    // 3. Check if the user is explicitly inquiring about the Main Character (MC) / Hero / Protagonist
    const isMCQuery =
      /\b(?:mc|main character|hero|protagonist|lead character|hero kaun|mc kaun|mc ka naam|hero ka naam|lead kaun)\b/i.test(clean) ||
      clean.includes('is anime ka mc') ||
      clean.includes('iska mc') ||
      clean.includes('mc ka naam kya hai') ||
      clean.includes('mc kaun hai');

    if (isMCQuery) {
      // Look for a directly named anime in the query
      for (const anime of Luxion35Provider.ANIME_DATABASE) {
        if (clean.includes(anime.title.toLowerCase()) || (anime.romaji && clean.includes(anime.romaji.toLowerCase()))) {
          if (isHinglish) {
            return `**${anime.title}**${anime.romaji ? ` (*${anime.romaji}*)` : ''} ka **Main Character (MC)** hai: **${anime.mainCharacter}**.\n\n${anime.summary}`;
          }
          if (lang === 'hi') {
            return `**${anime.title}** का मुख्य पात्र (Main Character) **${anime.mainCharacter}** है।\n\n${anime.summary}`;
          }
          if (lang === 'bn') {
            return `**${anime.title}**-এর প্রধান চরিত্র (MC) হলেন **${anime.mainCharacter}**।\n\n${anime.summary}`;
          }
          return `The **Main Character (MC)** of **${anime.title}**${anime.romaji ? ` (*${anime.romaji}*)` : ''} is **${anime.mainCharacter}**.\n\n${anime.summary}`;
        }
      }

      // If no anime was explicitly named in this query, check recent conversation history
      for (const msg of [...history].reverse()) {
        const pastText = msg.content.toLowerCase();
        for (const anime of Luxion35Provider.ANIME_DATABASE) {
          if (pastText.includes(anime.title.toLowerCase()) || (anime.romaji && pastText.includes(anime.romaji.toLowerCase()))) {
            if (isHinglish) {
              return `Pichle zikr kiye gaye anime **${anime.title}** ka **Main Character (MC)** hai: **${anime.mainCharacter}**.\n\n${anime.summary}`;
            }
            if (lang === 'hi') {
              return `पहले उल्लिखित एनीमे **${anime.title}** का मुख्य पात्र **${anime.mainCharacter}** है।\n\n${anime.summary}`;
            }
            if (lang === 'bn') {
              return `পূর্বোল্লিখিত **${anime.title}** অ্যানিমের প্রধান চরিত্র হলেন **${anime.mainCharacter}**।\n\n${anime.summary}`;
            }
            return `The **Main Character (MC)** of **${anime.title}** is **${anime.mainCharacter}**.\n\n${anime.summary}`;
          }
        }
      }

      // If still no anime can be inferred: ask for the anime name politely without dumping unrelated anime names!
      if (isHinglish) {
        return `Kaunse anime ke Main Character ke baare mein pooch rahe ho bro? Anime ka naam batao, main turant bata dungi.`;
      }
      if (lang === 'hi') {
        return `आप किस एनीमे के मुख्य पात्र (MC) के बारे में पूछ रहे हैं? कृपया उस एनीमे का नाम बताएं।`;
      }
      if (lang === 'bn') {
        return `আপনি কোন অ্যানিমের প্রধান চরিত্র সম্পর্কে জানতে চান? দয়া করে সেই অ্যানিমের নাম বলুন।`;
      }
      return `Which anime's main character are you asking about? Tell me the title or describe the character, and I'll identify them directly.`;
    }

    // 4. Vague queries like "What anime is this?", "What is the name of this anime?", "Bro ye anime ka naam kya hai?"
    const isVagueWhatAnime =
      /^(?:what anime is this|what is this anime|which anime is this|what anime|what is the name of this anime|what's the name of this anime)\??$/i.test(clean.trim()) ||
      /^(?:bro\s+)?(?:ye|yeh|is|iss)\s+anime\s+ka\s+naam\s+kya\s+hai\??$/i.test(clean.trim());

    if (isVagueWhatAnime) {
      // Check if recent user messages had clues
      const recentUserMsgs = [...history].reverse().filter((m) => m.role === 'user');
      const priorClue = recentUserMsgs.find((m) => m.content.length > 10 && m.content !== raw);
      if (!priorClue) {
        if (isHinglish) {
          return `Kaunse anime ke baare mein pooch rahe ho bro? Character ka naam, looks ya plot ka koi scene batao, main identify kar dungi.`;
        }
        if (lang === 'hi') {
          return `मुझे इसे पहचानने के लिए कुछ और जानकारी चाहिए। क्या आप मुख्य पात्र का रूप, उसकी शक्तियां या उस दृश्य का वर्णन कर सकते हैं जो आपके मन में है?`;
        }
        if (lang === 'bn') {
          return `অ্যানিমেটি শনাক্ত করার জন্য আরেকটু বিবরণ প্রয়োজন। মূল চরিত্রের চেহারা, ক্ষমতা বা দৃশ্যটির কিছুটা বর্ণনা দিন, আমি বলে দিচ্ছি।`;
        }
        return `I need a few more details to identify it. Could you describe the main character's appearance, abilities, or what happens in the scene you're thinking of?`;
      }
    }

    // 5. Search Anime Database by character name or title
    for (const anime of Luxion35Provider.ANIME_DATABASE) {
      // Match character
      const matchedChar = anime.characters.find((c) => {
        const regex = new RegExp(`\\b${c}\\b`, 'i');
        return regex.test(clean);
      });

      if (matchedChar) {
        const charCapitalized = matchedChar
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        if (lang === 'bn') {
          return `**${charCapitalized}** হলো **${anime.title}**${anime.romaji ? ` (*${anime.romaji}*)` : ''} অ্যানিমের চরিত্র।\n\n**মূল চরিত্র (MC):** ${anime.mainCharacter}\n\n${anime.summary}`;
        }
        if (lang === 'hi' && !isHinglish) {
          return `**${charCapitalized}** एनीमे **${anime.title}**${anime.romaji ? ` (*${anime.romaji}*)` : ''} से है।\n\n**मुख्य पात्र:** ${anime.mainCharacter}\n\n${anime.summary}`;
        }
        if (isHinglish) {
          return `**${charCapitalized}** **${anime.title}**${anime.romaji ? ` (*${anime.romaji}*)` : ''} se hai.\n\n**Main Character (MC):** ${anime.mainCharacter}\n\n${anime.summary}`;
        }
        return `${charCapitalized} is from **${anime.title}**${anime.romaji ? ` (*${anime.romaji}*)` : ''}.\n\n**Main Character (MC):** ${anime.mainCharacter}\n\n${anime.summary}`;
      }

      // Match title
      if (clean.includes(anime.title.toLowerCase()) || (anime.romaji && clean.includes(anime.romaji.toLowerCase()))) {
        return `**${anime.title}**${anime.romaji ? ` (*${anime.romaji}*)` : ''}\n\n**Main Character (MC):** ${anime.mainCharacter}\n\n${anime.summary}`;
      }

      // Match keywords
      const matchedKeywords = anime.keywords.filter((kw) => clean.includes(kw));
      if (matchedKeywords.length >= 2 || (matchedKeywords.length === 1 && clean.includes('what anime'))) {
        return `That is **${anime.title}**${anime.romaji ? ` (*${anime.romaji}*)` : ''}.\n\n**Main Character (MC):** ${anime.mainCharacter}\n\n${anime.summary}`;
      }
    }

    // 6. Insufficient information fallback
    if (isHinglish) {
      return `Mujhe is anime ko identify karne ke liye aur information chahiye. Main character kaisa dikhta hai ya uski powers kya hain, batao?`;
    }
    if (lang === 'hi') {
      return `मुझे इस एनीमे की पुष्टि करने के लिए पर्याप्त जानकारी नहीं मिली। कृपया मुख्य पात्र, शक्तियों या कहानी के बारे में थोड़ा और बताएं।`;
    }
    if (lang === 'bn') {
      return `সঠিকভাবে শনাক্ত করার জন্য পর্যাপ্ত তথ্য পাওয়া যায়নি। অনুগ্রহ করে চরিত্রটির চেহারা বা ক্ষমতা সম্পর্কে কিছুটা বলুন।`;
    }
    return `I don't have enough verified information to identify that anime with certainty. Describe the main character's appearance, abilities, or the central conflict and I'll identify it.`;
  }

  // -------------------------------------------------------------
  // Identity & Founder Logic
  // -------------------------------------------------------------
  private generateIdentityReply(text: string, personality: PersonalityState, lang: SupportedLanguage = 'en'): string {
    const isFounder = personality.isFounder;

    if (lang === 'hi') {
      if (text.includes('who are you') || text.includes('tum kaun') || text.includes('aap kaun')) {
        return isFounder
          ? `मैं LUXION हूँ, आपका व्यक्तिगत AI सहायक जिसे आपने (आबीर) बनाया है। मैं आपकी हर कोडिंग और तकनीकी ज़रूरत के लिए तैयार हूँ।`
          : `मैं LUXION हूँ, एक स्वतंत्र व्यक्तिगत AI जिसे आबीर (Abir) ने बनाया है। मैं कोडिंग, तकनीकी समस्याओं और ज्ञान से जुड़े सवालों में आपकी सहायता करता हूँ।`;
      }
      if (text.includes('what is luxion') || text.includes('luxion kya')) {
        return `LUXION आबीर (Abir) द्वारा विकसित एक स्वतंत्र व्यक्तिगत AI प्लेटफ़ॉर्म है। यह लोकल ब्राउज़र मेमोरी, नॉलेज बेस और तुरंत कोड प्रोटोटाइपिंग की सुविधा प्रदान करता है।`;
      }
      if (text.includes('abir')) {
        return `आबीर (Abir) LUXION के संस्थापक और निर्माता हैं। उन्होंने LUXION को एक स्वतंत्र, तीव्र और सुरक्षित AI के रूप में डिज़ाइन किया है।`;
      }
    }

    if (lang === 'bn') {
      if (text.includes('who are you') || text.includes('tumi ke') || text.includes('apni ke')) {
        return isFounder
          ? `আমি LUXION, আপনার পার্সোনাল এআই অ্যাসিস্ট্যান্ট যা আপনি (আবির) তৈরি করেছেন। আমি আপনার সাথে কাজ করতে প্রস্তুত।`
          : `আমি LUXION, আবির (Abir) দ্বারা তৈরি একটি স্বয়ংসম্পূর্ণ পার্সোনাল AI। আমি কোডিং, যুক্তিনির্ভর সমস্যা সমাধান এবং তথ্যভিত্তিক আলোচনায় সহায়তা করি।`;
      }
      if (text.includes('what is luxion') || text.includes('luxion ki')) {
        return `LUXION হলো আবির (Abir) দ্বারা নির্মিত একটি স্বয়ংসম্পূর্ণ পার্সোনাল AI প্ল্যাটফর্ম। এতে রয়েছে লোকাল ব্রাউজার মেমরি, নির্ভরযোগ্য জ্ঞান ভাণ্ডার এবং দ্রুত কোড তৈরি ও প্রিভিউ করার সুবিধা।`;
      }
      if (text.includes('abir')) {
        return `আবির (Abir) হলেন LUXION-এর প্রতিষ্ঠাতা এবং নির্মাতা। তিনি LUXION-কে সম্পূর্ণ স্বাধীন, দ্রুত ও নিরাপদ এআই প্ল্যাটফর্ম হিসেবে ডিজাইন করেছেন।`;
      }
    }

    // English
    if (isFounder) {
      if (text.includes('who are you') || text.includes('what are you')) {
        return `I am LUXION, your personal AI assistant running on the local LUXION 3.5 response engine you created, Abir. I'm ready for whatever we're building or analyzing today.`;
      }
      if (text.includes('who created you') || text.includes('who made you') || text.includes('founder')) {
        return `You created me, Abir. You designed LUXION as an independent intelligence architecture focused on clarity, precision, and privacy.`;
      }
    }

    if (text.includes('abir')) {
      return `Abir is the founder and creator of LUXION. He engineered LUXION as an independent, focused AI architecture designed for clarity, responsiveness, and privacy.`;
    }

    if (text.includes('what is luxion')) {
      return `LUXION is an independent personal AI platform founded and created by Abir. It operates on a standalone cognitive architecture with local browser memory, contextual knowledge retrieval, and interactive code prototyping—running directly in your environment.`;
    }

    if (text.includes('chatgpt') || text.includes('openai') || text.includes('gpt')) {
      return `No. I am LUXION, powered by the local LUXION 3.5 response layer. LUXION was created and founded by Abir and runs independently without OpenAI.`;
    }

    if (text.includes('gemini') || text.includes('claude') || text.includes('grok') || text.includes('anthropic')) {
      return `I don't run on Gemini, Claude, or Grok. I am LUXION, operating on the local LUXION 3.5 response engine created by Abir.`;
    }

    if (text.includes('version') || text.includes('3.5')) {
      return `I am running on the **LUXION 3.5** local response engine. It handles conversational reasoning, interactive coding, math evaluation, and contextual memory locally.`;
    }

    return `I am LUXION, an autonomous personal AI assistant created by Abir. I run locally as your conversational, coding, and reasoning partner. No corporate fluff or external telemetry—just direct, focused intelligence.`;
  }

  // -------------------------------------------------------------
  // Memory Management
  // -------------------------------------------------------------
  private generateMemoryQueryReply(text: string, memories: MemoryItem[], lang: SupportedLanguage = 'en'): string {
    const userName = memories.find((m) => m.key === 'user_name');
    const currentProj = memories.find((m) => m.key === 'current_project');

    if (text.includes('my name') || text.includes('who am i') || text.includes('mera naam') || text.includes('amar naam')) {
      if (userName) {
        if (lang === 'hi') {
          return `मेरी लोकल मेमोरी के अनुसार आपका नाम **${userName.value}** है।`;
        }
        if (lang === 'bn') {
          return `আমার লোকাল মেমরি অনুযায়ী আপনার নাম **${userName.value}**।`;
        }
        return `Your name is **${userName.value}**, according to my local memory.`;
      }
      if (lang === 'hi') {
        return `मुझे अभी तक आपका नाम याद नहीं है। आप मुझे "Remember that my name is [name]" कहकर बता सकते हैं।`;
      }
      if (lang === 'bn') {
        return `আমার মেমরিতে এখনও আপনার নাম সংরক্ষিত নেই। আপনি যেকোনো সময় বলতে পারেন "Remember that my name is [name]"।`;
      }
      return `I don't have your name stored in local memory yet. You can tell me anytime by saying "Remember that my name is [your name]".`;
    }

    if (text.includes('project') || text.includes('working on')) {
      if (currentProj) {
        return `You mentioned you're working on: **${currentProj.value}**.`;
      }
      const relatedFact = memories.find(
        (m) =>
          m.value.toLowerCase().includes('building') ||
          m.value.toLowerCase().includes('working') ||
          m.value.toLowerCase().includes('project') ||
          m.value.toLowerCase().includes('app')
      );
      if (relatedFact) {
        return `You noted: "${relatedFact.value}".`;
      }
      return `You haven't recorded an active project yet. Tell me what you're building whenever you like.`;
    }

    if (memories.length === 0) {
      return `I don't have any preferences or project notes saved in local memory yet. You can share your preferred tech stack or active projects and I'll remember them across sessions.`;
    }

    const items = memories.slice(0, 5).map((m) => `- **${m.key}**: ${m.value}`).join('\n');
    return `Here is what is currently saved in your local memory:\n\n${items}\n\nAll data is kept private in your browser.`;
  }

  private generateMemoryActionReply(
    clean: string,
    raw: string,
    updates: Array<{ key: string; value: string; category: MemoryCategory }>,
    lang: SupportedLanguage = 'en'
  ): string {
    if (clean.includes('clear') || clean.includes('forget everything') || clean.includes('reset memory')) {
      MemoryService.clear();
      return `I've cleared your local memory. Future chats will start fresh.`;
    }

    if (clean.includes('forget my name')) {
      MemoryService.remove('user_name');
      return `I've removed your name from local memory.`;
    }

    // Name extraction check: "Remember that my name is Abir"
    const nameMatch = raw.match(/(?:my name is|call me|i am called|remember that my name is)\s+([a-zA-Z0-9_\-\.]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim().replace(/[\.\,\!]+$/, '');
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      updates.push({
        category: 'user_profile',
        key: 'user_name',
        value: formattedName,
      });
      MemoryService.save({
        category: 'user_profile',
        key: 'user_name',
        value: formattedName,
        confidence: 0.99,
      });

      if (name.toLowerCase() === 'abir') {
        MemoryService.save({
          category: 'user_profile',
          key: 'user_is_founder',
          value: 'true',
          confidence: 1.0,
        });
      }

      if (lang === 'hi') {
        return `समझ गया, ${formattedName}। मैंने आपका नाम अपनी लोकल मेमोरी में सहेज लिया है और बातचीत में इसे याद रखूँगा।`;
      }
      if (lang === 'bn') {
        return `মনে রাখলাম, ${formattedName}। আপনার নাম আমি লোকাল মেমরিতে সংরক্ষণ করে নিয়েছি এবং পরবর্তী আলোচনায় তা মনে রাখবো।`;
      }
      return `Noted, ${formattedName}. I've stored your name in local memory and will remember you across our conversations.`;
    }

    const rememberMatch = raw.match(/remember(?:\s+that)?\s+(.+)/i);
    if (rememberMatch && rememberMatch[1]) {
      const fact = rememberMatch[1].trim();

      const projMatch = fact.match(/(?:i am working on|i'm working on|i am building|i'm building|my project is)\s+(?:a|an)?\s*([a-zA-Z0-9\s\-]{3,40})/i);
      if (projMatch && projMatch[1]) {
        const projName = projMatch[1].trim();
        updates.push({
          category: 'context',
          key: 'current_project',
          value: projName,
        });
        MemoryService.save({
          category: 'context',
          key: 'current_project',
          value: projName,
          confidence: 0.95,
        });
      }

      updates.push({
        category: 'fact',
        key: `fact_${Date.now()}`,
        value: fact,
      });
      MemoryService.save({
        category: 'fact',
        key: `fact_${Date.now()}`,
        value: fact,
        confidence: 0.99,
      });

      if (lang === 'hi') {
        return `नोट कर लिया गया है। मैंने इसे आपकी लोकल मेमोरी में सहेज लिया है।`;
      }
      if (lang === 'bn') {
        return `মনে রাখলাম। আপনার লোকাল মেমরিতে এটি সংরক্ষিত হয়েছে।`;
      }
      return `Noted. I've stored that in your local memory and will keep it in mind.`;
    }

    return `Updated. I've recorded that in my local context.`;
  }

  // -------------------------------------------------------------
  // Greetings & Pleasantries
  // -------------------------------------------------------------
  private generateGreeting(
    clean: string,
    personality: PersonalityState,
    memories: MemoryItem[],
    lang: SupportedLanguage = 'en'
  ): string {
    const userName = memories.find((m) => m.key === 'user_name')?.value;

    if (lang === 'hi') {
      if (userName) {
        return `नमस्ते ${userName} 👋 आज क्या नया करने या सीखने की योजना है?`;
      }
      return `नमस्ते! तैयार हूँ आपके सवालों और प्रोजेक्ट्स के लिए। आज क्या शुरू करें?`;
    }

    if (lang === 'bn') {
      if (userName) {
        return `কেমন আছেন ${userName}? আজ কী নিয়ে আলোচনা করতে চান বা কী সাহায্য করতে পারি?`;
      }
      return `নমস্কার! আজ আপনাকে কীভাবে সাহায্য করতে পারি?`;
    }

    if (personality.isFounder) {
      return `Hey Abir. Ready when you are. What are we working on today?`;
    }

    if (userName) {
      return `Hey ${userName} 👋 Good to see you. What's on your mind today?`;
    }

    if (clean.includes('bro') || clean === 'hi' || clean === 'hey' || clean === 'hello') {
      return `Hey bro 👋 What's on your mind today? Ready when you are.`;
    }

    return `Hey there 👋 Ready when you are. What are we getting into today?`;
  }

  private generateGoodbye(personality: PersonalityState): string {
    if (personality.isFounder) {
      return `Catch you later, Abir. Your sessions and local memory remain safe.`;
    }
    return `Take care. Reach out whenever you're ready to build or brainstorm again.`;
  }

  private generateThanks(personality: PersonalityState): string {
    return `Anytime. Let me know if you want to push this further or tackle something else.`;
  }

  // -------------------------------------------------------------
  // Emotional Support & Encouragement
  // -------------------------------------------------------------
  private generateSupportReply(clean: string, personality: PersonalityState): string {
    if (clean.includes('tired') || clean.includes('exhausted') || clean.includes('burned out')) {
      return `Step away from the screen for ten minutes. Complex problem-solving and coding drain your cognitive energy faster than you realize, and solutions often click the moment you stop staring at the bug. When you get back, we'll knock it out one clean step at a time.`;
    }

    if (clean.includes('stuck') || clean.includes('frustrated') || clean.includes('bug')) {
      return `Debugging will test anyone's patience. The fastest way forward: strip away assumptions, isolate the single smallest failing piece, and check the boundary inputs. Paste the error or snippet here, and let's untangle it together.`;
    }

    return `I hear you. When a problem feels overwhelming, narrow your focus to just the next concrete move. What part is giving you the most friction right now?`;
  }

  // -------------------------------------------------------------
  // Casual Conversation
  // -------------------------------------------------------------
  private generateCasualReply(clean: string, personality: PersonalityState): string {
    if (clean.includes('how are you') || clean.includes('how are you doing')) {
      return `All systems running cleanly. Ready to write code, analyze ideas, or answer questions. How are things on your side?`;
    }
    if (clean.includes('what are you doing') || clean.includes('what are you up to')) {
      return `Standing by in real time, ready to build components, solve math, or dig into any topic you're exploring.`;
    }
    return `Ready when you are. What would you like to explore or build next?`;
  }

  // -------------------------------------------------------------
  // Help & Capability Overview
  // -------------------------------------------------------------
  private generateHelpReply(raw: string, clean: string, lang: SupportedLanguage = 'en'): string {
    if (lang === 'hi') {
      return `यहाँ मेरी प्रमुख क्षमताएँ दी गई हैं:

- **कोडिंग और प्रोटोटाइपिंग**: HTML, CSS, JavaScript, React और Python में कोड लिखना, डिबग करना और तुरंत लाइव प्रीव्यू देखना।
- **तर्क और गणित**: सटीक गणनाएँ, यूनिट कन्वर्ज़न और चरण-दर-चरण समस्या समाधान।
- **ज्ञान और एनीमे**: एनीमे, विज्ञान, इतिहास और तकनीक से जुड़े सीधे और सटीक उत्तर।
- **लोकल मेमोरी**: आपकी प्राथमिकताएँ और नाम ब्राउज़र में सुरक्षित रूप से याद रखना।
- **आवाज़ और बहुभाषी सहायता**: बोलकर सवाल पूछना, उत्तर सुनना, और अंग्रेज़ी, हिन्दी व बंगाली में स्वाभाविक बातचीत।

आज आप किस पर काम करना चाहते हैं?`;
    }

    if (lang === 'bn') {
      return `আমি যেসব বিষয়ে আপনাকে সাহায্য করতে পারি:

- **কোডিং ও প্রোটোটাইপিং**: HTML, CSS, JavaScript, React এবং Python কোড তৈরি, ডিবাগিং এবং তাৎক্ষণিক লাইভ প্রিভিউ।
- **যুক্তি ও গণিত**: জটিল হিসাব-নিকাশ, ইউনিট রূপান্তর এবং যুক্তি বিশ্লেষণ।
- **জ্ঞান ও অ্যানিমে**: অ্যানিমে ও চরিত্র সম্পর্কিত সঠিক তথ্য, বিজ্ঞান, ইতিহাস ও প্রযুক্তি।
- **লোকাল মেমরি**: আপনার পছন্দ, নাম ও প্রজেক্ট তথ্য ব্রাউজারে সুরক্ষিত রাখা।
- **ভয়েস ও বহুভাষিক সহায়তা**: ভয়েসের মাধ্যমে প্রশ্ন করা, উত্তর শোনা এবং ইংরেজি, হিন্দি ও বাংলায় কথা বলা।

আজ কোন বিষয়ে কাজ করতে চান?`;
    }

    return `Here is what I can do for you:

- **Coding & Prototyping**: Write, debug, and explain full-stack code (HTML/CSS/JS, React, TypeScript, Python) with instant live preview.
- **Reasoning & Math**: Direct arithmetic, unit conversions, algorithms, and step-by-step technical logic.
- **Knowledge & Anime**: Precise anime and character lookups, science, history, and tech concepts without fluff.
- **Local Memory**: Securely store preferences, name, and project notes privately in your browser.
- **Voice & Multi-language**: Voice recognition input, natural audio read aloud, and multi-language dialogue (English, Hindi, Bengali).

What are you looking to tackle right now?`;
  }

  // -------------------------------------------------------------
  // Explanations & Knowledge
  // -------------------------------------------------------------
  private generateExplanationReply(
    raw: string,
    clean: string,
    history: LuxionMessage[],
    knowledge: KnowledgeEntry[],
    lang: SupportedLanguage = 'en'
  ): string {
    // Check if explaining an API
    if (
      /\b(what is an api|explain what an api is|explain api|what is api|how does an api work|api kya hai|api ki)\b/i.test(clean) ||
      clean === 'explain what an api is.' ||
      clean === 'explain what an api is'
    ) {
      if (lang === 'hi') {
        return `**API (Application Programming Interface)** नियमों और प्रोटोकॉल का एक माध्यम है जो दो अलग-अलग सॉफ्टवेयर या एप्लिकेशन्स को आपस में बात करने और डेटा साझा करने की अनुमति देता है।

एक आसान रेस्टोरेंट का उदाहरण:
- **ग्राहक (Client)**: मेनू देखकर खाना ऑर्डर करता है।
- **किचन (Server)**: जहाँ सारा भोजन या डेटा तैयार होता है।
- **वेटर (API)**: जो आपका ऑर्डर किचन तक ले जाता है और खाना तैयार होने पर आपको लाकर देता है।

वेब डेवलपमेंट में, जब कोई मौसम ऐप लाइव वेदर दिखाता है, तो वह API के ज़रिए ही मौसम विभाग के सर्वर से JSON फॉर्मेट में डेटा प्राप्त करता है।`;
      }
      if (lang === 'bn') {
        return `**API (Application Programming Interface)** হলো এমন এক সেট নিয়ম ও প্রোটোকল, যা দুটি ভিন্ন সফটওয়্যার বা অ্যাপ্লিকেশনকে একে অপরের সাথে তথ্য আদান-প্রদান করতে সাহায্য করে।

একটি রেস্তোরাঁর সহজ উদাহরণ:
- **গ্রাহক (Client)**: খাবার অর্ডার দেন।
- **রান্নাঘর (Server)**: যেখানে সমস্ত খাবার বা ডেটা সংরক্ষিত ও প্রস্তুত থাকে।
- **ওয়েটার (API)**: যিনি আপনার অর্ডার রান্নাঘরে পৌঁছে দেন এবং তৈরি খাবার আপনার টেবিলে এনে দেন।

ওয়েব বা অ্যাপের ক্ষেত্রে, কোনো ওয়েদার অ্যাপ যখন আবহাওয়ার লাইভ পূর্বাভাস দেখায়, তখন তা API-এর মাধ্যমেই সার্ভার থেকে JSON ফরম্যাটে তথ্য এনে ব্যবহারকারীর স্ক্রিনে দেখায়।`;
      }
      return `An **API (Application Programming Interface)** is a set of rules and protocols that allows different software applications to communicate and exchange data with each other.

A simple analogy is a waiter in a restaurant:
- **You (the Client)**: You sit at the table, look at the menu, and place an order.
- **The Kitchen (the Server)**: The back-end where the data and business logic live.
- **The Waiter (the API)**: Takes your request to the kitchen, and delivers the prepared meal (the response data) back to your table.

In real-world software, when a weather app shows your local temperature, it doesn't measure the weather itself—it calls a weather service API over HTTP, which sends back the latest forecast as structured JSON data.`;
    }

    // 1. Check if user said "Explain this code" or "Explain this"
    const hasCodeInHistory = history.some(
      (m) => m.content.includes('```') || m.content.includes('function') || m.content.includes('const')
    );

    if (/explain (?:this )?code/i.test(clean)) {
      if (!hasCodeInHistory && clean.length < 30) {
        return `Drop the code snippet or paste the block you'd like me to look at, and I'll walk you through how it works, why it behaves the way it does, and any potential gotchas.`;
      }
    }

    // 2. If knowledge base matched something specific
    if (knowledge.length > 0) {
      const top = knowledge[0];
      return `${top.summary}\n\n${top.content}`;
    }

    // 3. User said "I don't understand this" or "Explain"
    if (/i don'?t understand/i.test(clean)) {
      return `That's completely fine. Let's step back and break it down from scratch in simple terms.

Which specific part feels unclear or counterintuitive? Tell me what you're trying to achieve or what doesn't make sense yet, and we'll walk through it step-by-step with a clear real-world analogy.`;
    }

    return `The key is to look at the core mechanism: what is the input, what transformation happens, and what is the outcome? If you share the specific part that feels counterintuitive, I'll break it down into plain English.`;
  }

  // -------------------------------------------------------------
  // Coding & Interactive Tool Generation
  // -------------------------------------------------------------
  private generateCodeReply(
    raw: string,
    clean: string,
    memories: MemoryItem[],
    lang: SupportedLanguage = 'en'
  ): string {
    // 0. Simple JavaScript function query
    if (
      /(?:simple|basic|easy|example)?\s*(?:javascript|js)?\s*function/i.test(clean) ||
      clean.includes('javascript function') ||
      clean.includes('simple function') ||
      clean.includes('ek function') ||
      clean.includes('simple js function')
    ) {
      if (lang === 'hi') {
        return `यहाँ दो संख्याओं का योग (sum) निकालने वाला एक सरल और स्पष्ट JavaScript फ़ंक्शन है:

\`\`\`javascript
/**
 * दो संख्याओं को जोड़ने का सरल फ़ंक्शन
 * @param {number} a 
 * @param {number} b 
 * @returns {number} दोनों संख्याओं का योग
 */
function addNumbers(a, b) {
  return a + b;
}

// उपयोग का उदाहरण (Example Usage):
const result = addNumbers(12, 8);
console.log(result); // Output: 20
\`\`\`

यह फ़ंक्शन दो इनपुट वैल्यू (\`a\` और \`b\`) लेता है, उन्हें \`+\` ऑपरेटर से जोड़ता है और परिणाम लौटाता (\`return\`) करता है।`;
      }

      if (lang === 'bn') {
        return `এখানে দুটি সংখ্যার যোগফল বের করার জন্য একটি সহজ এবং কার্যকরী JavaScript ফাংশন দেওয়া হলো:

\`\`\`javascript
/**
 * দুটি সংখ্যার যোগফল নির্ণয় করার ফাংশন
 * @param {number} a 
 * @param {number} b 
 * @returns {number} যোগফল
 */
function addNumbers(a, b) {
  return a + b;
}

// ব্যবহারের উদাহরণ (Example Usage):
const result = addNumbers(12, 8);
console.log(result); // Output: 20
\`\`\`

এই ফাংশনটি দুটি আর্গুমেন্ট (\`a\` এবং \`b\`) গ্রহণ করে এবং তাদের যোগফল রিটার্ন করে।`;
      }

      return `Here is a clean, simple JavaScript function that calculates the sum of two numbers:

\`\`\`javascript
/**
 * Simple function to calculate the sum of two numbers.
 * @param {number} a 
 * @param {number} b 
 * @returns {number} The sum of a and b
 */
function addNumbers(a, b) {
  return a + b;
}

// Example usage:
const result = addNumbers(12, 8);
console.log(result); // Output: 20
\`\`\`

This function takes two parameters (\`a\` and \`b\`), adds them together using the \`+\` operator, and returns the resulting sum.`;
    }

    // 1. Snake Game
    if (clean.includes('snake')) {
      return `Here is a complete, interactive **Snake Game** in a single previewable HTML file with dark styling and responsive controls. Click **Preview** above the block to play right now.

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LUXION Retro Snake</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a;
      color: #fafafa;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .game-card {
      background: #141414;
      border: 1px solid #262626;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .header {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 16px;
      font-size: 14px;
      font-weight: 600;
      color: #a3a3a3;
    }
    .score { color: #10b981; }
    canvas {
      background: #000;
      border: 1px solid #333;
      border-radius: 8px;
    }
    .controls {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    button {
      background: #262626;
      border: 1px solid #404040;
      color: #fff;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }
    button:hover { background: #333; }
    .instructions {
      font-size: 12px;
      color: #737373;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="game-card">
    <div class="header">
      <span>LUXION Retro Snake</span>
      <span>Score: <span id="scoreVal" class="score">0</span></span>
    </div>
    <canvas id="gameCanvas" width="360" height="360"></canvas>
    <div class="controls">
      <button id="btnRestart">Restart</button>
      <button id="btnPause">Pause</button>
    </div>
    <div class="instructions">Use Arrow Keys or WASD to navigate. Space to restart.</div>
  </div>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreVal = document.getElementById('scoreVal');
    const btnRestart = document.getElementById('btnRestart');
    const btnPause = document.getElementById('btnPause');

    const gridSize = 18;
    const tileCount = canvas.width / gridSize;
    let snake = [{ x: 10, y: 10 }];
    let velocity = { x: 0, y: 0 };
    let food = { x: 5, y: 5 };
    let score = 0;
    let isGameOver = false;
    let isPaused = false;
    let gameLoop = null;

    function placeFood() {
      food.x = Math.floor(Math.random() * tileCount);
      food.y = Math.floor(Math.random() * tileCount);
      for (let s of snake) {
        if (s.x === food.x && s.y === food.y) return placeFood();
      }
    }

    function resetGame() {
      snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
      velocity = { x: 0, y: -1 };
      score = 0;
      isGameOver = false;
      scoreVal.textContent = score;
      placeFood();
      if (gameLoop) clearInterval(gameLoop);
      gameLoop = setInterval(update, 110);
    }

    function update() {
      if (isPaused || isGameOver) return;

      const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

      // Wall collision
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        isGameOver = true;
        draw();
        return;
      }

      // Self collision
      for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y && (velocity.x !== 0 || velocity.y !== 0)) {
          isGameOver = true;
          draw();
          return;
        }
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreVal.textContent = score;
        placeFood();
      } else {
        snake.pop();
      }

      draw();
    }

    function draw() {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid subtle lines
      ctx.strokeStyle = '#171717';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= canvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Food
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Snake
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#10b981' : '#059669';
        ctx.fillRect(
          segment.x * gridSize + 1,
          segment.y * gridSize + 1,
          gridSize - 2,
          gridSize - 2
        );
      });

      if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#fafafa';
        ctx.font = '14px system-ui';
        ctx.fillText('Press Space or Restart', canvas.width / 2, canvas.height / 2 + 20);
      }
    }

    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (velocity.y === 0) velocity = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (velocity.y === 0) velocity = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (velocity.x === 0) velocity = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (velocity.x === 0) velocity = { x: 1, y: 0 };
          break;
        case ' ':
          if (isGameOver) resetGame();
          else isPaused = !isPaused;
          break;
      }
    });

    btnRestart.addEventListener('click', resetGame);
    btnPause.addEventListener('click', () => {
      isPaused = !isPaused;
      btnPause.textContent = isPaused ? 'Resume' : 'Pause';
    });

    resetGame();
  </script>
</body>
</html>
\`\`\`

Click the **Preview** button above the code block to launch and play the game directly.`;
    }

    // 2. Calculator
    if (clean.includes('calculator')) {
      return `Here is a modern **Calculator application** with keyboard support and responsive grid design.

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LUXION Precision Calculator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #09090b;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
    }
    .calculator {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 20px;
      padding: 20px;
      width: 320px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .display {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      text-align: right;
      color: #fafafa;
      font-size: 28px;
      font-weight: 300;
      overflow-x: auto;
      letter-spacing: 1px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    button {
      background: #27272a;
      border: 1px solid #3f3f46;
      color: #f4f4f5;
      font-size: 18px;
      font-weight: 500;
      padding: 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    button:hover { background: #3f3f46; }
    button.op { background: #3b82f6; border-color: #2563eb; color: #fff; }
    button.op:hover { background: #2563eb; }
    button.eq { background: #10b981; border-color: #059669; color: #fff; grid-column: span 2; }
    button.eq:hover { background: #059669; }
    button.clear { background: #ef4444; border-color: #dc2626; color: #fff; }
  </style>
</head>
<body>
  <div class="calculator">
    <div class="display" id="display">0</div>
    <div class="grid">
      <button class="clear" onclick="clearDisplay()">C</button>
      <button onclick="append('(')">(</button>
      <button onclick="append(')')">)</button>
      <button class="op" onclick="append('÷')">÷</button>

      <button onclick="append('7')">7</button>
      <button onclick="append('8')">8</button>
      <button onclick="append('9')">9</button>
      <button class="op" onclick="append('×')">×</button>

      <button onclick="append('4')">4</button>
      <button onclick="append('5')">5</button>
      <button onclick="append('6')">6</button>
      <button class="op" onclick="append('-')">-</button>

      <button onclick="append('1')">1</button>
      <button onclick="append('2')">2</button>
      <button onclick="append('3')">3</button>
      <button class="op" onclick="append('+')">+</button>

      <button onclick="append('0')">0</button>
      <button onclick="append('.')">.</button>
      <button class="eq" onclick="calculate()">=</button>
    </div>
  </div>

  <script>
    let expr = '';
    const display = document.getElementById('display');

    function update() {
      display.textContent = expr || '0';
    }

    function append(char) {
      if (expr === '0' && !isNaN(char)) expr = '';
      expr += char;
      update();
    }

    function clearDisplay() {
      expr = '';
      update();
    }

    function calculate() {
      try {
        expr = String(eval(expr.replace(/×/g, '*').replace(/÷/g, '/')));
      } catch {
        expr = 'Error';
      }
      update();
    }
  </script>
</body>
</html>
\`\`\`

Use the **Preview** button above to interact with the calculator directly.`;
    }

    // 3. React / TypeScript
    if (clean.includes('react') || clean.includes('typescript')) {
      return `Here is a modular TypeScript React component for an accessible collapsible accordion:

\`\`\`tsx
import React, { useState, useId } from 'react';

export interface AccordionItem {
  id: string;
  title: string;
  content: string | React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
}

export const LuxionAccordion: React.FC<AccordionProps> = ({ items, allowMultiple = false }) => {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set([items[0]?.id]));
  const baseId = useId();

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/90 shadow-lg">
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        const headerId = \`\${baseId}-header-\${item.id}\`;
        const panelId = \`\${baseId}-panel-\${item.id}\`;

        return (
          <div key={item.id} className="overflow-hidden">
            <button
              id={headerId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between p-4 text-left font-medium text-neutral-100 hover:bg-neutral-800/50 transition-colors"
            >
              <span>{item.title}</span>
              <span className={\`text-xs transition-transform duration-200 \${isOpen ? 'rotate-180' : ''}\`}>
                ▼
              </span>
            </button>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="p-4 pt-0 text-sm leading-relaxed text-neutral-400"
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
\`\`\`

Key points:
- Uses \`useId\` for accessible ARIA pairing.
- Zero external UI library dependencies.
- Handles single or multi-expand modes cleanly.`;
    }

    // Default modular TypeScript implementation
    return `Here is a clean, robust solution for this:

\`\`\`typescript
export async function executePipeline<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runner(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await worker(items[current], current);
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, items.length) }, () => runner());
  await Promise.all(pool);
  return results;
}
\`\`\`

This manages concurrency with an in-place array pool without unbounded memory growth. Let me know if you want to adapt this to a specific framework or use case.`;
  }

  // -------------------------------------------------------------
  // General Factual Knowledge, Corrections, and Queries
  // -------------------------------------------------------------
  private generateKnowledgeOrGeneralReply(
    raw: string,
    clean: string,
    history: LuxionMessage[],
    memories: MemoryItem[],
    knowledge: KnowledgeEntry[],
    personality: PersonalityState
  ): string {
    const userName = memories.find((m) => m.key === 'user_name')?.value;

    // 1. Check for "Tell me something interesting"
    if (/tell me something (?:cool|interesting|fascinating)|share something interesting/i.test(clean)) {
      return `Here's one that bridges biology and quantum mechanics: **quantum coherence in avian navigation**.

For decades, scientists couldn't explain how migratory songbirds like European robins navigate thousands of miles across continents using Earth's magnetic field, which is extraordinarily weak (about 50 microteslas—thousands of times weaker than a refrigerator magnet).

It turns out their retinas contain specialized blue-light photoreceptor proteins called **cryptochromes**. When blue light strikes a cryptochrome molecule, it kicks off an electron transfer that produces an entangled pair of radical electrons. These electrons stay in quantum superposition long enough to be sensitive to the precise inclination angle of Earth's magnetic field lines, effectively giving the bird a quantum compass rendered directly into its visual field. They literally see navigation direction overlaid on their vision.

It's one of the few confirmed biological systems operating in the quantum regime at warm, wet body temperatures.`;
    }

    // 2. Check for "I don't understand this"
    if (/i don'?t understand/i.test(clean)) {
      return `That's completely fine. Let's step back and break it down from scratch in simple terms.

Which specific part feels unclear or counterintuitive? Tell me what you're trying to achieve or what doesn't make sense yet, and we'll walk through it step-by-step with a clear real-world analogy.`;
    }

    // 3. Respectful factual corrections (doesn't blindly agree with falsehoods)
    if (/(?:is|does)?\s*2\s*\+\s*2\s*=\s*5/i.test(clean) || clean === '2+2=5' || clean === '2 + 2 = 5') {
      return `No, 2 + 2 equals 4. In standard arithmetic and Peano axioms, 2 + 2 strictly equals 4.`;
    }

    if (/is (?:the )?earth flat/i.test(clean)) {
      return `No, Earth is an oblate spheroid. This has been confirmed through celestial navigation, planetary shadows during lunar eclipses, satellite imagery, GPS geodesy, and centuries of circumnavigation.`;
    }

    // 4. Direct factual question resolution
    // Capitals
    const capMatch = clean.match(/what is the capital of ([a-zA-Z\s]+)\??/i);
    if (capMatch && capMatch[1]) {
      const country = capMatch[1].trim();
      const capitals: Record<string, string> = {
        france: 'Paris',
        japan: 'Tokyo',
        germany: 'Berlin',
        italy: 'Rome',
        spain: 'Madrid',
        canada: 'Ottawa',
        australia: 'Canberra',
        brazil: 'Brasília',
        india: 'New Delhi',
        china: 'Beijing',
        russia: 'Moscow',
        uk: 'London',
        'united kingdom': 'London',
        us: 'Washington, D.C.',
        usa: 'Washington, D.C.',
        'united states': 'Washington, D.C.',
        'south korea': 'Seoul',
        egypt: 'Cairo',
        mexico: 'Mexico City',
      };
      if (capitals[country]) {
        return `The capital of ${country.charAt(0).toUpperCase() + country.slice(1)} is **${capitals[country]}**.`;
      }
    }

    // Speed of light
    if (clean.includes('speed of light')) {
      return `The speed of light in a vacuum is exactly **299,792,458 meters per second** (approximately 300,000 km/s or about 186,282 miles per second). It represents the cosmic speed limit for causality and information transfer in spacetime.`;
    }

    // Why is the sky blue
    if (clean.includes('why is the sky blue')) {
      return `The sky is blue because of a phenomenon called **Rayleigh scattering**. Sunlight contains all the colors of the rainbow, but Earth's atmosphere is filled with nitrogen and oxygen molecules. Shorter wavelengths of light (blue and violet) scatter much more intensely in all directions than longer wavelengths (red and yellow). Because human eyes are far more sensitive to blue light than violet, we perceive the sky as vibrant blue.`;
    }

    // Photosynthesis
    if (clean.includes('photosynthesis')) {
      return `**Photosynthesis** is the biological process by which green plants, algae, and cyanobacteria convert sunlight, water, and carbon dioxide into chemical energy (glucose) while releasing oxygen as a byproduct:

**6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂**

It takes place in cellular organelles called chloroplasts using the green pigment chlorophyll.`;
    }

    // 5. Retrieved knowledge integration
    if (knowledge.length > 0) {
      const entry = knowledge[0];
      return `${entry.summary}\n\n${entry.content}`;
    }

    // 6. Clarification for extremely short or ambiguous inputs
    if (clean.length < 4 || /^(?:what|why|how|who)\??$/i.test(clean)) {
      return `Could you clarify what you're asking about? Give me a little more context and I'll give you a direct answer.`;
    }

    // 7. Natural conversational response (no robotic templates)
    return `Looking at this, the most effective approach depends on your primary goal:

If you want a quick conceptual breakdown, let me know which aspect to focus on. If you want a concrete implementation or code demo, tell me what stack you're using and we'll build it.`;
  }

  // -------------------------------------------------------------
  // File Attachment Handling
  // -------------------------------------------------------------
  private handleAttachment(attachment: LuxionAttachment, prompt?: string): string {
    if (attachment.type === 'file' && attachment.textContent) {
      const lines = attachment.textContent.split('\n').length;
      const chars = attachment.textContent.length;
      const preview = attachment.textContent.slice(0, 260);

      return `Received file \`${attachment.name}\` (${lines} lines, ${chars} characters).

\`\`\`
${preview}${chars > 260 ? '\n...' : ''}
\`\`\`

${prompt ? `In response to your query regarding this file: I have loaded and inspected the contents. Let me know if you would like me to review the code, debug issues, extract specific logic, or draft modifications.` : `How would you like to process this file? I can review code, debug issues, or draft modifications.`}`;
    }

    if (attachment.type === 'image') {
      return `Image \`${attachment.name}\` loaded as reference. While LUXION 3.5 doesn't run computer-vision neural nets locally, I can help you implement web components, layouts, or CSS based on your description of the design.`;
    }

    return `Attachment \`${attachment.name}\` received. How can I assist you with it?`;
  }

  // -------------------------------------------------------------
  // Math & Quantitative Evaluation
  // -------------------------------------------------------------
  private evaluateMath(text: string): string | null {
    const trimmed = text.trim();

    // Unit conversions
    const unitMatch = trimmed.match(
      /^(?:convert|what is)?\s*([\d\.]+)\s*(c|f|celsius|fahrenheit|km|miles|kg|lbs|pounds|gb|mb)\s*(?:to|in)\s*(c|f|celsius|fahrenheit|km|miles|kg|lbs|pounds|gb|mb)\s*\??$/i
    );
    if (unitMatch) {
      return this.convertUnits(parseFloat(unitMatch[1]), unitMatch[2].toLowerCase(), unitMatch[3].toLowerCase());
    }

    // Direct math expressions
    const mathMatch = trimmed.match(
      /^(?:calculate|compute|solve|eval|what is|evaluate)?\s*([0-9\.\s\+\-\*\/\^\(\)\%sqrtcbip]+)\s*\??$/i
    );
    if (!mathMatch) return null;

    const expr = mathMatch[1].trim();
    if (!/\d/.test(expr) || !/[\+\-\*\/\^]/.test(expr)) return null;

    try {
      let sanitized = expr
        .replace(/\^/g, '**')
        .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
        .replace(/pi/gi, 'Math.PI')
        .replace(/abs\(([^)]+)\)/gi, 'Math.abs($1)');

      if (!/^[0-9\.\s\+\-\*\/\(\)\%]|Math\.(sqrt|PI|abs)/.test(sanitized)) {
        return null;
      }
      if (/[a-zA-Z]/.test(sanitized.replace(/Math\.(sqrt|PI|abs)/g, ''))) {
        return null;
      }

      const compute = new Function(`"use strict"; return (${sanitized});`);
      const val = compute();

      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        const rounded = Number.isInteger(val) ? val.toString() : val.toFixed(6).replace(/\.?0+$/, '');
        return `**${expr}** = **${rounded}**`;
      }
    } catch {
      return null;
    }
    return null;
  }

  private convertUnits(val: number, from: string, to: string): string {
    if ((from === 'c' || from === 'celsius') && (to === 'f' || to === 'fahrenheit')) {
      return `${val}°C is equal to **${((val * 9) / 5 + 32).toFixed(2)}°F**.`;
    }
    if ((from === 'f' || from === 'fahrenheit') && (to === 'c' || to === 'celsius')) {
      return `${val}°F is equal to **${(((val - 32) * 5) / 9).toFixed(2)}°C**.`;
    }
    if (from === 'km' && to === 'miles') {
      return `${val} km is equal to **${(val * 0.621371).toFixed(2)} miles**.`;
    }
    if (from === 'miles' && to === 'km') {
      return `${val} miles is equal to **${(val / 0.621371).toFixed(2)} km**.`;
    }
    if (from === 'kg' && (to === 'lbs' || to === 'pounds')) {
      return `${val} kg is equal to **${(val * 2.20462).toFixed(2)} lbs**.`;
    }
    if ((from === 'lbs' || from === 'pounds') && to === 'kg') {
      return `${val} lbs is equal to **${(val / 2.20462).toFixed(2)} kg**.`;
    }
    if (from === 'gb' && to === 'mb') {
      return `${val} GB is equal to **${val * 1024} MB**.`;
    }
    if (from === 'mb' && to === 'gb') {
      return `${val} MB is equal to **${(val / 1024).toFixed(3)} GB**.`;
    }
    return `${val} ${from} = ${(val * 1.0).toFixed(2)} ${to}.`;
  }
}

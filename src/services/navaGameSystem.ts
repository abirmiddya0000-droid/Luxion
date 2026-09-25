/**
 * NAVA ORIGINAL GAME ARCHITECTURE & SPECIFICATION ENGINE
 * 
 * Original Fantasy Universe: NAVA
 * Oversees concept design, character blueprints, lore mechanics, and asset specifications.
 * 
 * Principles:
 * - 100% Originality: Transforms any referenced tropes into unique high-fantasy designs.
 * - Comprehensive Specs: Character name, Role, Age category, Gender, Appearance, Hair, Eyes,
 *   Outfit, Weapon, Abilities, Aura/Effects, Personality, Backstory, and Visual Generation Prompt.
 * - Pipeline Scope:
 *   Characters | Weapons | Monsters | NPCs | Locations | Items | UI | Cutscenes | Concept Art | Videos
 */

export interface NavaCharacterSpec {
  name: string;
  title: string;
  role: string;
  ageCategory: string;
  gender: string;
  appearance: string;
  hair: string;
  eyes: string;
  outfit: string;
  weapon: string;
  abilities: string[];
  auraEffects: string;
  personality: string;
  backstory: string;
  visualGenerationPrompt: string;
}

export interface NavaAssetSpec {
  assetType: 'character' | 'weapon' | 'monster' | 'npc' | 'location' | 'item' | 'ui' | 'cutscene';
  name: string;
  conceptSummary: string;
  technicalDetails: Record<string, string | string[]>;
  visualPrompt: string;
  sandboxCodeSuggestion?: string;
}

export class NavaGameSystem {
  /**
   * Generates or customizes the primary protagonist (MC) specification for NAVA.
   */
  public static createMainCharacter(customDetails?: Partial<NavaCharacterSpec>): NavaCharacterSpec {
    const base: NavaCharacterSpec = {
      name: customDetails?.name || 'Kaelen Vance (The Resonant Sovereign)',
      title: 'The Crimson Sovereign of NAVA',
      role: 'Protagonist / Resonant Blade Wielder',
      ageCategory: 'Early Twenties (21-23)',
      gender: 'Male',
      appearance:
        'Lean, athletic warrior physique with poised stance, sharp angular jawline, and subtle silver runic markings tracing his left collarbone.',
      hair: customDetails?.hair || 'Flowing silver-white long hair parted naturally with subtle layered bangs that catch the wind.',
      eyes: customDetails?.eyes || 'Luminous crystalline sapphire-blue eyes that faintly shimmer when channeling resonant aether.',
      outfit:
        customDetails?.outfit ||
        'Tactical obsidian-black layered duster with midnight leather Pauldron guards, reinforced lightweight carbon-weave under-armor, silver filigree trims, and high-traction greaves.',
      weapon:
        customDetails?.weapon ||
        'Muramasa-style curved Nodachi / Katana with an ominous crimson blade forged from bloodstone titanium, polished black ray-skin hilt, and a silver guard that channels resonant pulses.',
      abilities: customDetails?.abilities || [
        'Resonant Severance: Slices through dimensional rifts, displacing enemy momentum.',
        'Azure Pulse: Releases concussive shockwaves of azure energy along the ground.',
        'Flash Step (Aether Drift): High-speed instantaneous evasion leaving transient blue silhouettes.',
        'Crimson Convergence: Channeling internal resonant fire into the blade edge for searing strikes.',
      ],
      auraEffects:
        customDetails?.auraEffects ||
        'Subtle cerulean blue ambient aether mist hovering around his shoulders, flaring into electric cyan sparks during combat activation.',
      personality:
        'Stoic, analytical, fiercely protective of companions, rarely speaks without purpose, deeply philosophical about the burden of power.',
      backstory:
        'Orphaned during the Great Fracture of the Aether Citadel, he bonded with a dormant Primordial Core that turned his eyes crystalline blue. Now traversing the ruined sectors of NAVA to uncover who dismantled the Resonant Pillars.',
      visualGenerationPrompt:
        'High fantasy original game concept art of an original male protagonist, flowing long silver-white hair, intense glowing crystalline blue eyes, wearing layered midnight-black tactical warrior duster with silver accents, wielding a glowing crimson-bladed katana with subtle crimson luminescence, enveloped in faint ethereal cyan-blue energy mist, dark fantasy atmospheric background, 8k resolution, cinematic lighting, masterpiece, character design sheet.',
    };

    return { ...base, ...customDetails };
  }

  /**
   * Formats a character specification into clean, stylish markdown.
   */
  public static formatCharacterMarkdown(spec: NavaCharacterSpec): string {
    return `### **NAVA Character Specification: ${spec.name}**
*${spec.title}*

---

- **Role:** ${spec.role}
- **Age Category:** ${spec.ageCategory}
- **Gender:** ${spec.gender}
- **Appearance:** ${spec.appearance}
- **Hair:** ${spec.hair}
- **Eyes:** ${spec.eyes}
- **Outfit:** ${spec.outfit}
- **Signature Weapon:** ${spec.weapon}
- **Aura & Visual Effects:** ${spec.auraEffects}

#### **Core Abilities**
${spec.abilities.map((a, i) => `${i + 1}. **${a.split(':')[0]}:**${a.split(':')[1] || ''}`).join('\n')}

#### **Personality & Demeanor**
${spec.personality}

#### **Backstory & Motivation**
${spec.backstory}

---

#### **Visual Generation Prompt (Image Engine)**
\`\`\`text
${spec.visualGenerationPrompt}
\`\`\`
*(Tip: Type \`/image ${spec.visualGenerationPrompt.slice(0, 100)}...\` to generate a concept render when an image provider is connected!)*`;
  }

  /**
   * Detects if the prompt is asking to create the NAVA MC or a NAVA asset.
   */
  public static detectNavaIntent(prompt: string): {
    isNava: boolean;
    isMainCharacter: boolean;
    assetType?: 'character' | 'weapon' | 'monster' | 'npc' | 'location' | 'item' | 'ui' | 'loading_screen';
  } {
    const clean = prompt.toLowerCase();
    const isNavaMention = clean.includes('nava') || clean.includes('/game') || clean.includes('/character');

    const isMainChar =
      /(?:create|make|build|show|design|generate)?\s*(?:the\s+)?nava\s*(?:mc|main character|protagonist|hero)/i.test(clean) ||
      clean.includes('create nava mc') ||
      clean.includes('nava mc') ||
      clean.includes('nava protagonist');

    let assetType: any = undefined;
    if (clean.includes('loading screen') || clean.includes('loading-screen')) {
      assetType = 'loading_screen';
    } else if (clean.includes('weapon') || clean.includes('sword') || clean.includes('katana') || clean.includes('blade')) {
      assetType = 'weapon';
    } else if (clean.includes('monster') || clean.includes('boss') || clean.includes('enemy')) {
      assetType = 'monster';
    } else if (clean.includes('character') || clean.includes('hero') || clean.includes('npc')) {
      assetType = 'character';
    } else if (clean.includes('location') || clean.includes('citadel') || clean.includes('city') || clean.includes('world')) {
      assetType = 'location';
    } else if (clean.includes('ui') || clean.includes('hud') || clean.includes('menu')) {
      assetType = 'ui';
    }

    return {
      isNava: isNavaMention || isMainChar,
      isMainCharacter: isMainChar,
      assetType,
    };
  }

  /**
   * Generates a loading screen code blueprint runnable in the client preview sandbox.
   */
  public static generateLoadingScreenCode(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NAVA - Loading Screen</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #050608;
      color: #f0f4f8;
      font-family: 'Courier New', Courier, monospace;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px;
      overflow: hidden;
    }
    .background-grid {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    .title-box {
      z-index: 10;
    }
    .game-logo {
      font-size: 3.5rem;
      font-weight: 900;
      letter-spacing: 0.35em;
      background: linear-gradient(135deg, #ffffff 0%, #94a3b8 50%, #38bdf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 30px rgba(56, 189, 248, 0.3);
    }
    .subtitle {
      font-size: 0.85rem;
      color: #64748b;
      letter-spacing: 0.2em;
      margin-top: 6px;
    }
    .center-art {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 5;
    }
    .rune-circle {
      width: 200px;
      height: 200px;
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-top: 2px solid #ef4444;
      border-radius: 50%;
      animation: spin 6s linear infinite;
      margin: 0 auto 20px;
      position: relative;
    }
    .rune-circle::after {
      content: '';
      position: absolute;
      inset: 15px;
      border: 1px dashed rgba(56, 189, 248, 0.4);
      border-radius: 50%;
      animation: spinReverse 10s linear infinite;
    }
    .center-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #38bdf8;
      font-size: 1.5rem;
    }
    .lore-tip {
      font-size: 0.9rem;
      color: #cbd5e1;
      max-width: 480px;
      line-height: 1.6;
      border-left: 2px solid #ef4444;
      padding-left: 15px;
      text-align: left;
    }
    .progress-section {
      z-index: 10;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }
    .progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #94a3b8;
      margin-bottom: 8px;
      letter-spacing: 0.1em;
    }
    .progress-bar-bg {
      width: 100%;
      height: 4px;
      background: #1e293b;
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #38bdf8, #ef4444);
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
      transition: width 0.1s linear;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    @keyframes spinReverse { 100% { transform: rotate(-360deg); } }
  </style>
</head>
<body>
  <div class="background-grid"></div>

  <div class="title-box">
    <div class="game-logo">NAVA</div>
    <div class="subtitle">CHRONICLES OF THE RESONANT REALM</div>
  </div>

  <div class="center-art">
    <div class="rune-circle">
      <div class="center-icon">◆</div>
    </div>
    <div class="lore-tip">
      <strong>Lore Archive [084]:</strong> "The Crimson Blade vibrates at the frequency of shattered time. Only those attuned to the Great Fracture can wield its edge without consuming their life force."
    </div>
  </div>

  <div class="progress-section">
    <div class="progress-label">
      <span id="status-text">INITIALIZING AETHER CHANNELS...</span>
      <span id="percent-text">0%</span>
    </div>
    <div class="progress-bar-bg">
      <div id="fill" class="progress-bar-fill"></div>
    </div>
  </div>

  <script>
    const fill = document.getElementById('fill');
    const percentText = document.getElementById('percent-text');
    const statusText = document.getElementById('status-text');

    const statuses = [
      'INITIALIZING AETHER CHANNELS...',
      'CALIBRATING RESONANT NODES...',
      'COMPILING SHADER PIPELINE...',
      'FETCHING SECTOR 7 GEOMETRY...',
      'AWAKENING THE CRIMSON SOVEREIGN...',
      'READY'
    ];

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 4) + 1;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      fill.style.width = progress + '%';
      percentText.innerText = progress + '%';
      const statusIdx = Math.min(statuses.length - 1, Math.floor((progress / 100) * (statuses.length - 1)));
      statusText.innerText = statuses[statusIdx];
    }, 60);
  </script>
</body>
</html>`;
  }
}

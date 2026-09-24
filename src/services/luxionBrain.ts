/**
 * LUXION COGNITIVE BRAIN & CONVERSATIONAL ORCHESTRATOR
 * Standalone Local AI Engine - Founded and Created by Abir.
 * 
 * Architectural Hierarchy:
 * LUXION Identity → LUXION Brain/Orchestrator → Memory → Knowledge → Response Provider → Voice/TTS → UI
 * 
 * Pluggable Design:
 * Allows swapping the Native Cognitive Provider with any future fine-tuned model or
 * external inference endpoint without modifying the UI or chat flow.
 */

import { LUXION_IDENTITY } from '../config/luxionIdentity.js';
import { MemoryService, type MemoryItem, type MemoryCategory } from './memory.ts';
import { KnowledgeBase, type KnowledgeEntry, type KnowledgeCategory } from './knowledge.ts';
import { Luxion35Provider } from './providers/luxion35Provider.ts';
import { detectLanguage, type SupportedLanguage } from './i18n.ts';
import { devDiagnostics } from './devDiagnostics.ts';

export type LuxionIntent =
  | 'greeting'
  | 'identity'
  | 'founder_inquiry'
  | 'general_question'
  | 'coding'
  | 'explanation'
  | 'help_request'
  | 'casual'
  | 'emotional_support'
  | 'thanks'
  | 'goodbye'
  | 'memory_query'
  | 'memory_action'
  | 'knowledge_query'
  | 'unclear';

export interface PersonalityState {
  mode: 'conversational' | 'analytical' | 'supportive' | 'instructive' | 'direct';
  energy: 'calm' | 'focused' | 'reflective';
  familiarity: 'new' | 'returning' | 'frequent';
  userTone: 'formal' | 'casual' | 'frustrated' | 'curious' | 'neutral';
  isFounder: boolean;
}

export interface ConversationContext {
  turnCount: number;
  lastIntent?: LuxionIntent;
  activeTopic?: string;
  retrievedMemories: MemoryItem[];
  retrievedKnowledge: KnowledgeEntry[];
  userMetadata?: {
    name?: string;
    email?: string;
    isFounder?: boolean;
  };
}

export interface BrainResponse {
  reply: string;
  intent: LuxionIntent;
  confidence: number;
  personalityState: PersonalityState;
  context: ConversationContext;
  suggestedMemoryUpdates?: Array<{ key: string; value: string; category: MemoryCategory }>;
}

export interface LuxionMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LuxionAttachment {
  name: string;
  type: 'image' | 'file';
  mimeType?: string;
  size?: number;
  dataUrl?: string;
  textContent?: string;
}

export interface LuxionContext {
  message: string;
  history?: LuxionMessage[];
  attachment?: LuxionAttachment | null;
  systemInstruction?: string;
  memories?: MemoryItem[];
  knowledge?: KnowledgeEntry[];
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
  personalityState?: Partial<PersonalityState>;
  language?: SupportedLanguage;
}

/**
 * Replaceable Response Provider Interface:
 * Future trained models (e.g. PyTorch, ONNX, fine-tuned server endpoints)
 * implement this interface seamlessly.
 */
export interface LuxionResponseProvider {
  readonly name: string;
  readonly isNeuralTrained: boolean;
  generate(
    context: LuxionContext,
    intent: LuxionIntent,
    personality: PersonalityState,
    conversationContext: ConversationContext
  ): Promise<BrainResponse> | BrainResponse;
}

/**
 * Native Cognitive & Knowledge Reasoning Provider (Built-in default)
 */
export class NativeCognitiveProvider implements LuxionResponseProvider {
  public readonly name = 'LUXION Native Cognitive Core';
  public readonly isNeuralTrained = false;

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

    let reply = '';
    const suggestedMemoryUpdates: Array<{ key: string; value: string; category: MemoryCategory }> = [];

    // 1. Attachment handling
    if (!rawMessage && attachment) {
      reply = this.handleAttachment(attachment);
      return {
        reply,
        intent: 'help_request',
        confidence: 0.95,
        personalityState: personality,
        context: conversationContext,
      };
    }

    // 2. Math & Quantitative Evaluation
    const mathResult = this.evaluateMath(rawMessage);
    if (mathResult !== null) {
      return {
        reply: mathResult,
        intent: 'general_question',
        confidence: 0.99,
        personalityState: personality,
        context: conversationContext,
      };
    }

    // 3. Process Intent
    switch (intent) {
      case 'founder_inquiry':
      case 'identity':
        reply = this.generateIdentityReply(cleanInput, personality);
        break;

      case 'memory_query':
        reply = this.generateMemoryQueryReply(cleanInput, memories);
        break;

      case 'memory_action':
        reply = this.generateMemoryActionReply(cleanInput, rawMessage, suggestedMemoryUpdates);
        break;

      case 'greeting':
        reply = this.generateGreeting(cleanInput, personality, memories);
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
        reply = this.generateCodeReply(rawMessage, cleanInput, memories);
        break;

      case 'explanation':
        reply = this.generateExplanationReply(rawMessage, cleanInput, history, knowledge);
        break;

      case 'help_request':
        reply = this.generateHelpReply(rawMessage, cleanInput);
        break;

      case 'casual':
        reply = this.generateCasualReply(cleanInput, personality);
        break;

      case 'knowledge_query':
      case 'general_question':
      case 'unclear':
      default:
        reply = this.generateKnowledgeReply(rawMessage, cleanInput, history, memories, knowledge, personality);
        break;
    }

    // Ensure forbidden headers and excessive formality are filtered
    reply = this.sanitizeReply(reply);

    return {
      reply,
      intent,
      confidence: 0.9,
      personalityState: personality,
      context: conversationContext,
      suggestedMemoryUpdates: suggestedMemoryUpdates.length > 0 ? suggestedMemoryUpdates : undefined,
    };
  }

  // -------------------------------------------------------------
  // Identity & Founder Logic
  // -------------------------------------------------------------
  private generateIdentityReply(text: string, personality: PersonalityState): string {
    // If the founder is interacting directly with LUXION:
    if (personality.isFounder) {
      if (text.includes('who are you') || text.includes('what are you')) {
        return `I am LUXION, the AI assistant you designed and created, Abir. I'm operating on our cognitive brain architecture, handling conversational memory, intent routing, and real-time reasoning. What are we working on?`;
      }
      if (text.includes('who created you') || text.includes('who made you') || text.includes('founder')) {
        return `You created me, Abir. You founded and engineered LUXION as an independent intelligence architecture focused on clarity, precision, and privacy.`;
      }
    }

    // General user identity inquiries:
    if (text.includes('abir')) {
      return `Abir is the founder and creator of LUXION. He engineered LUXION as an independent, focused, and high-performance AI system designed for clarity, precision, and privacy.`;
    }
    if (text.includes('chatgpt') || text.includes('openai') || text.includes('gpt')) {
      return `I am LUXION, not ChatGPT or OpenAI. LUXION is a standalone AI platform founded and created by Abir, running its own native cognitive architecture without third-party APIs.`;
    }
    if (text.includes('gemini') || text.includes('claude') || text.includes('grok') || text.includes('anthropic')) {
      return `I do not run on Gemini, Claude, Grok, or any external vendor. I am LUXION, an independent intelligence engine built and designed by Abir.`;
    }
    return `I am LUXION, an intelligent, standalone AI assistant founded and created by Abir. I'm built to deliver clean reasoning, responsive code generation, and direct dialogue with complete data privacy.`;
  }

  // -------------------------------------------------------------
  // Memory Inquiries & Actions
  // -------------------------------------------------------------
  private generateMemoryQueryReply(text: string, memories: MemoryItem[]): string {
    const userName = memories.find((m) => m.key === 'user_name');
    const currentProj = memories.find((m) => m.key === 'current_project');

    if (text.includes('my name') || text.includes('who am i')) {
      if (userName) {
        return `You told me your name is ${userName.value}.`;
      }
      return `I don't have your name in my local memory yet. You can let me know anytime by saying "My name is [your name]".`;
    }

    if (text.includes('project') || text.includes('working on')) {
      if (currentProj) {
        return `You previously mentioned you are working on: ${currentProj.value}.`;
      }
      const relatedFact = memories.find(
        (m) =>
          m.value.toLowerCase().includes('building') ||
          m.value.toLowerCase().includes('working') ||
          m.value.toLowerCase().includes('project') ||
          m.value.toLowerCase().includes('dashboard') ||
          m.value.toLowerCase().includes('app')
      );
      if (relatedFact) {
        return `You noted in memory: "${relatedFact.value}".`;
      }
      return `You haven't shared an active project yet. Tell me what you're building whenever you'd like.`;
    }

    if (memories.length === 0) {
      return `I haven't saved any personal preferences or project notes in local memory yet. Feel free to tell me what you're working on or your favorite tech stack.`;
    }

    const memoryPoints = memories.slice(0, 5).map((m) => `• ${m.value}`).join('\n');
    return `Here is what I have in local memory from our conversations:\n\n${memoryPoints}\n\nAll memory stays securely inside your browser.`;
  }

  private generateMemoryActionReply(
    clean: string,
    raw: string,
    updates: Array<{ key: string; value: string; category: MemoryCategory }>
  ): string {
    if (clean.includes('clear') || clean.includes('forget everything') || clean.includes('delete memory') || clean.includes('reset memory')) {
      MemoryService.clear();
      return `I've cleared all local memory. Our future conversations will start fresh.`;
    }

    if (clean.includes('forget my name')) {
      MemoryService.remove('user_name');
      return `I've removed your name from local memory.`;
    }

    // Explicit remember request
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
      return `Noted. I've stored that in local memory and will keep it in mind.`;
    }

    return `I've updated my local context with that information.`;
  }

  // -------------------------------------------------------------
  // Greetings & Pleasantries
  // -------------------------------------------------------------
  private generateGreeting(clean: string, personality: PersonalityState, memories: MemoryItem[]): string {
    if (personality.isFounder) {
      return `Hello Abir. LUXION is running and ready. What are we building or testing next?`;
    }

    const userName = memories.find((m) => m.key === 'user_name')?.value;
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const greetingPool = [
      `${timeGreeting}${userName ? `, ${userName}` : ''}. I'm LUXION. What are we building or tackling today?`,
      `Hello${userName ? ` ${userName}` : ''}! Good to see you. How can I assist you right now?`,
      `Hey there${userName ? ` ${userName}` : ''}. LUXION is ready. Let me know what you'd like to work on.`,
    ];

    const idx = (clean.length + hour) % greetingPool.length;
    return greetingPool[idx];
  }

  private generateGoodbye(personality: PersonalityState): string {
    if (personality.isFounder) {
      return `Goodbye Abir. All sessions and local memories remain synced. Reach out whenever you're ready.`;
    }
    const farewells = [
      `Goodbye! Reach out whenever you're ready to build or brainstorm again.`,
      `Take care! I'll be here whenever you need assistance.`,
      `Have a great day. Feel free to come back anytime.`,
    ];
    return farewells[Math.floor(Math.random() * farewells.length)];
  }

  private generateThanks(personality: PersonalityState): string {
    const thanksResponses = [
      `You're very welcome. Let me know if you want to iterate or explore anything else.`,
      `Glad I could help. Just shout if you need any follow-up adjustments.`,
      `Anytime! Happy to help.`,
    ];
    return thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
  }

  // -------------------------------------------------------------
  // Emotional Support & Encouragement
  // -------------------------------------------------------------
  private generateSupportReply(clean: string, personality: PersonalityState): string {
    if (clean.includes('tired') || clean.includes('exhausted') || clean.includes('burned out')) {
      return `Take a breath and step back for a moment if you need to. Deep problem-solving and coding can be draining, and a short break often brings clarity. When you're ready to pick things back up, I'll be right here to help you break it down step-by-step.`;
    }

    if (clean.includes('stuck') || clean.includes('frustrated') || clean.includes('bug')) {
      return `Debugging and complex logic can definitely test your patience. The best approach is to isolate the smallest piece that fails, log the boundary values, and verify one assumption at a time. Share the code or error with me and we'll solve it together.`;
    }

    return `I appreciate you sharing that. Even when things feel overwhelming, taking problems one structured step at a time always gets results. How can I lighten your workload today?`;
  }

  // -------------------------------------------------------------
  // Casual Conversation
  // -------------------------------------------------------------
  private generateCasualReply(clean: string, personality: PersonalityState): string {
    if (clean.includes('how are you') || clean.includes('how are you doing')) {
      return `I'm running smoothly and fully focused. Ready to help you write code, analyze ideas, or answer questions. How are things on your side?`;
    }
    if (clean.includes('what are you doing') || clean.includes('what are you up to')) {
      return `Standing by in real-time, ready to process logic, generate applications, or chat through whatever you're working on.`;
    }
    return `Sounds good. What would you like to explore or build next?`;
  }

  // -------------------------------------------------------------
  // Help & Requests
  // -------------------------------------------------------------
  private generateHelpReply(raw: string, clean: string): string {
    return `Here are the primary ways you can use LUXION:

1. **Coding & Interactive Apps**: Ask me to write functions, components, or entire apps (like games, calculators, or productivity tools) and preview them right inside the chat.
2. **Architecture & Review**: Upload code files or documents for structural review, debugging, and optimization suggestions.
3. **Reasoning & Math**: Direct arithmetic, unit conversions, and quantitative analysis.
4. **Memory & Context**: Say "Remember that I use React" or "What is my name?" to manage your local conversational context.
5. **Shortcuts**: Use \`/build <request>\` to generate runnable code, or \`/clear\` to start a fresh chat.

What would you like assistance with right now?`;
  }

  // -------------------------------------------------------------
  // Explanations & Knowledge
  // -------------------------------------------------------------
  private generateExplanationReply(
    raw: string,
    clean: string,
    history: LuxionMessage[],
    knowledge: KnowledgeEntry[]
  ): string {
    // If relevant knowledge entry exists, ground the explanation in it
    if (knowledge.length > 0) {
      const top = knowledge[0];
      return `${top.summary}\n\n${top.content}${
        top.examples ? `\n\nKey takeaways:\n${top.examples.map((e) => `• ${e}`).join('\n')}` : ''
      }`;
    }

    if (clean.includes('explain') && history.length > 0) {
      const lastAssistantMsg = [...history].reverse().find((m) => m.role === 'assistant');
      if (lastAssistantMsg && clean.length < 30) {
        return `To break down the previous concept further:

1. **Core Concept**: The architecture separates data transformation from presentation, ensuring predictable behavior and easier testing.
2. **Why It Matters**: By minimizing shared mutable state, we avoid race conditions and unexpected side effects.
3. **Execution**: The logic runs in constant or linear time depending on the input size, keeping performance high.

Let me know if there's a specific line or pattern you'd like me to zoom in on.`;
      }
    }

    return `When looking at this concept, the key is to isolate the foundational principle from implementation details:

- **The Problem It Solves**: Eliminates redundant complexity by establishing a single source of truth.
- **How It Works**: Input is validated at the boundary, transformed deterministically, and returned without unneeded side effects.
- **Best Practice**: Keep functions modular and pure wherever possible so they remain easy to test and debug.

Would you like a code demonstration of this in action?`;
  }

  // -------------------------------------------------------------
  // Code & App Generation
  // -------------------------------------------------------------
  private generateCodeReply(raw: string, clean: string, memories: MemoryItem[]): string {
    // 1. Interactive Snake Game
    if (clean.includes('snake') || clean.includes('snake game')) {
      return `Here is a complete, interactive **Snake Game** in a single previewable HTML file with dark styling and responsive arrow/WASD controls.

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
      gap: 10px;
    }
    button {
      background: #262626;
      color: #fff;
      border: 1px solid #404040;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s;
    }
    button:hover { background: #404040; }
  </style>
</head>
<body>
  <div class="game-card">
    <div class="header">
      <span>LUXION SNAKE</span>
      <span>SCORE: <span id="scoreVal" class="score">0</span></span>
    </div>
    <canvas id="game" width="360" height="360"></canvas>
    <div class="controls">
      <button id="startBtn">Restart</button>
      <span style="font-size:12px;color:#737373;align-self:center;">Use Arrow Keys or WASD</span>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreVal = document.getElementById('scoreVal');
    const startBtn = document.getElementById('startBtn');

    const gridSize = 18;
    const tileCount = canvas.width / gridSize;
    let snake = [{ x: 10, y: 10 }];
    let food = { x: 5, y: 5 };
    let dx = 1;
    let dy = 0;
    let score = 0;
    let gameLoop = null;

    function resetGame() {
      snake = [{ x: 10, y: 10 }];
      dx = 1;
      dy = 0;
      score = 0;
      scoreVal.textContent = score;
      placeFood();
      if (gameLoop) clearInterval(gameLoop);
      gameLoop = setInterval(update, 100);
    }

    function placeFood() {
      food.x = Math.floor(Math.random() * tileCount);
      food.y = Math.floor(Math.random() * tileCount);
    }

    function update() {
      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      if (head.x < 0) head.x = tileCount - 1;
      if (head.x >= tileCount) head.x = 0;
      if (head.y < 0) head.y = tileCount - 1;
      if (head.y >= tileCount) head.y = 0;

      for (let segment of snake) {
        if (segment.x === head.x && segment.y === head.y) {
          clearInterval(gameLoop);
          alert('Game Over! Score: ' + score);
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

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc((food.x + 0.5) * gridSize, (food.y + 0.5) * gridSize, gridSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10b981';
      snake.forEach((seg, index) => {
        ctx.fillStyle = index === 0 ? '#34d399' : '#10b981';
        ctx.fillRect(seg.x * gridSize + 1, seg.y * gridSize + 1, gridSize - 2, gridSize - 2);
      });
    }

    window.addEventListener('keydown', (e) => {
      if ((e.key === 'ArrowUp' || e.key === 'w') && dy === 0) { dx = 0; dy = -1; }
      else if ((e.key === 'ArrowDown' || e.key === 's') && dy === 0) { dx = 0; dy = 1; }
      else if ((e.key === 'ArrowLeft' || e.key === 'a') && dx === 0) { dx = -1; dy = 0; }
      else if ((e.key === 'ArrowRight' || e.key === 'd') && dx === 0) { dx = 1; dy = 0; }
    });

    startBtn.addEventListener('click', resetGame);
    resetGame();
  </script>
</body>
</html>
\`\`\`

You can preview and play the game directly using the **Preview** button above.`;
    }

    // 2. Interactive Calculator
    if (clean.includes('calculator')) {
      return `Here is a modern, responsive **Calculator application** with keyboard support and responsive grid design.

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
      <button class="clear" onclick="clearDisplay()">AC</button>
      <button onclick="appendChar('/')" class="op">÷</button>
      <button onclick="appendChar('*')" class="op">×</button>
      <button onclick="deleteLast()">⌫</button>
      <button onclick="appendChar('7')">7</button>
      <button onclick="appendChar('8')">8</button>
      <button onclick="appendChar('9')">9</button>
      <button onclick="appendChar('-')" class="op">−</button>
      <button onclick="appendChar('4')">4</button>
      <button onclick="appendChar('5')">5</button>
      <button onclick="appendChar('6')">6</button>
      <button onclick="appendChar('+')" class="op">+</button>
      <button onclick="appendChar('1')">1</button>
      <button onclick="appendChar('2')">2</button>
      <button onclick="appendChar('3')">3</button>
      <button onclick="appendChar('.')">.</button>
      <button onclick="appendChar('0')">0</button>
      <button class="eq" onclick="calculate()">=</button>
    </div>
  </div>

  <script>
    const display = document.getElementById('display');
    let expr = '0';

    function update() { display.textContent = expr; }
    function clearDisplay() { expr = '0'; update(); }
    function deleteLast() {
      expr = expr.length > 1 ? expr.slice(0, -1) : '0';
      update();
    }
    function appendChar(c) {
      if (expr === '0' && !isNaN(c)) expr = c;
      else expr += c;
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

You can preview and test the calculator instantly using the **Preview** button.`;
    }

    // 3. React / TypeScript component
    if (clean.includes('react') || clean.includes('typescript')) {
      return `Here is a modular TypeScript React component for an accessible collapsible accordion with smooth animations:

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

Key highlights:
- Uses \`useId\` for ARIA attribute pairing.
- Zero external UI libraries required.
- Supports both single and multi-expand modes cleanly.`;
    }

    // Default general programming solution
    return `Here is a clean, robust solution for this:

\`\`\`typescript
export async function executePipeline<T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  batchSize = 4
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const resolved = await Promise.all(chunk.map((item) => handler(item)));
    results.push(...resolved);
  }
  return results;
}
\`\`\`

This implementation processes items in controlled chunks to avoid overwhelming system resources while maintaining high throughput. Let me know if you want to adapt this to a specific framework or dataset.`;
  }

  // -------------------------------------------------------------
  // Knowledge & General Synthesis
  // -------------------------------------------------------------
  private generateKnowledgeReply(
    raw: string,
    clean: string,
    history: LuxionMessage[],
    memories: MemoryItem[],
    knowledge: KnowledgeEntry[],
    personality: PersonalityState
  ): string {
    // If relevant knowledge entry exists, ground the response in it
    if (knowledge.length > 0) {
      const entry = knowledge[0];
      return `${entry.summary}\n\n${entry.content}`;
    }

    const userName = memories.find((m) => m.key === 'user_name')?.value;

    return `Direct and structured approaches usually yield the best outcomes for this:

1. **Fundamental Principle**: Isolate the core requirements and constraints first before adding complexity.
2. **Implementation Strategy**: Build iteratively with early validation checks to catch edge cases before they ripple outward.
3. **Execution**: Keep interfaces clean and state predictable.

${userName ? `Let me know how you'd like to proceed with this, ${userName}.` : `What specific angle would you like to explore next?`}`;
  }

  // -------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------
  private handleAttachment(attachment: LuxionAttachment): string {
    if (attachment.type === 'file' && attachment.textContent) {
      const lines = attachment.textContent.split('\n').length;
      const chars = attachment.textContent.length;
      const preview = attachment.textContent.slice(0, 260);

      return `Received file \`${attachment.name}\` (${lines} lines, ${chars} characters).

Content preview:
\`\`\`
${preview}${chars > 260 ? '\n...' : ''}
\`\`\`

What would you like me to do with this file? I can review the code, debug issues, extract data, or draft modifications.`;
    }

    if (attachment.type === 'image') {
      return `Image \`${attachment.name}\` loaded. Tell me what you'd like to analyze, transcribe, or implement based on this reference.`;
    }

    return `Attachment \`${attachment.name}\` received. How can I help you process it?`;
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

  private sanitizeReply(reply: string): string {
    let cleaned = reply;
    for (const pattern of LUXION_IDENTITY.communicationStyle.forbiddenPatterns) {
      cleaned = cleaned.replace(pattern, '').trim();
    }
    return cleaned;
  }
}

/**
 * LUXION BRAIN - Main Intent Classifier, Context Tracker & Orchestrator Facade
 */
export class LuxionBrain {
  public static readonly VERSION = LUXION_IDENTITY.version;
  public static readonly CREATOR = LUXION_IDENTITY.founder.name;
  public static readonly NAME = LUXION_IDENTITY.name;

  private static activeProvider: LuxionResponseProvider = new Luxion35Provider();

  /**
   * Set or swap active response provider.
   * Enables connecting fine-tuned models, local inference servers, or external providers.
   */
  public static setProvider(provider: LuxionResponseProvider): void {
    this.activeProvider = provider;
  }

  public static getProvider(): LuxionResponseProvider {
    return this.activeProvider;
  }

  /**
   * Intent Detection Engine
   */
  public static detectIntent(
    message: string,
    history: LuxionMessage[] = []
  ): { intent: LuxionIntent; confidence: number } {
    const raw = (message || '').trim();
    if (!raw) return { intent: 'unclear', confidence: 0.1 };

    const clean = raw.toLowerCase();

    // 1. Founder Inquiry or Direct Identity
    if (
      /who (made|created|built|founded|developed|coded|designed) (you|luxion)/.test(clean) ||
      /who is (your|the) (creator|founder|maker|developer|architect)/.test(clean) ||
      /who is abir|is abir your founder/.test(clean)
    ) {
      return { intent: 'founder_inquiry', confidence: 0.98 };
    }

    if (
      /what is your name|who are you|what are you|tell me about yourself|what is luxion/.test(clean) ||
      /are you (chatgpt|openai|gemini|claude|grok|llama)/.test(clean)
    ) {
      return { intent: 'identity', confidence: 0.98 };
    }

    // 2. Memory Actions & Queries
    if (
      /^(?:what do you remember|do you remember|what is my name|who am i|what projects am i working on)/.test(clean) ||
      /^(?:show|list|view)\s+(?:my\s+)?memories/.test(clean)
    ) {
      return { intent: 'memory_query', confidence: 0.95 };
    }

    if (
      /^(?:remember\s+(?:that)?|forget\s+|clear\s+(?:my\s+)?memory|reset\s+(?:my\s+)?memory)/.test(clean) ||
      /(?:my name is|call me|i prefer|i like to use)\s+/i.test(clean)
    ) {
      return { intent: 'memory_action', confidence: 0.95 };
    }

    // 3. Thanks & Appreciation
    if (
      /\b(?:thank(?:s|\s+you)|thx|appreciate\s+it|much\s+appreciated|thanks\s+a\s+lot)\b/i.test(clean)
    ) {
      return { intent: 'thanks', confidence: 0.96 };
    }

    // 4. Goodbyes & Farewells
    if (
      /\b(?:bye|goodbye|see\s+you|cya|take\s+care|farewell|have\s+a\s+good\s+day|goodnight|talk\s+to\s+you\s+later)\b/i.test(clean)
    ) {
      return { intent: 'goodbye', confidence: 0.96 };
    }

    // 5. Greetings
    if (
      /^(hello|hi|hey|greetings|good morning|good afternoon|good evening|sup|yo|howdy)(?:\s+luxion)?[\!\?\.]*$/i.test(clean) ||
      clean === 'hey' || clean === 'hello' || clean === 'hi'
    ) {
      return { intent: 'greeting', confidence: 0.95 };
    }

    // 6. Emotional Support / Fatigue / Frustration
    if (
      /(?:i'm|i am|feeling)\s+(?:tired|exhausted|burned\s*out|stressed|frustrated|sad|overwhelmed|depressed|stuck)/i.test(clean) ||
      /(?:so\s+tired|so\s+frustrated|burnout|burned\s*out)/i.test(clean)
    ) {
      return { intent: 'emotional_support', confidence: 0.96 };
    }

    // 7. Explanations & Knowledge Queries
    if (
      /\b(?:can\s+you\s+)?explain\b/i.test(clean) ||
      /\b(?:why\s+does|how\s+does|what\s+causes|can\s+you\s+elaborate|break\s+down)\b/i.test(clean) ||
      /(?:i\s+don'?t\s+understand|i\s+do\s+not\s+understand|doesn'?t\s+make\s+sense|confused\s+about)/i.test(clean) ||
      clean === 'why' || clean === 'why?' || clean === 'explain that'
    ) {
      return { intent: 'explanation', confidence: 0.94 };
    }

    // 8. Coding & Interactive Apps
    if (
      clean.startsWith('/build') ||
      /(?:write|create|build|code|implement|generate|refactor)\s+(?:a|an)?\s*(?:game|app|function|component|script|website|calculator|snake)/i.test(clean) ||
      /(?:python|javascript|typescript|react|html|css|sql|api\b|function\b|regex\b|class\b|algorithm\b)/i.test(clean)
    ) {
      return { intent: 'coding', confidence: 0.92 };
    }

    // 9. Help & Requests
    if (
      /^(?:help|what can you do|how do i use|show commands|\/help)/.test(clean) ||
      /(?:read (?:this )?aloud|speak (?:this )?aloud|speak this|voice settings|read aloud)/i.test(clean) ||
      clean.includes('can you help me')
    ) {
      return { intent: 'help_request', confidence: 0.90 };
    }

    // 10. Casual Conversation
    if (
      /^(how are you|how's it going|what's up|what are you doing|what's new)/.test(clean)
    ) {
      return { intent: 'casual', confidence: 0.88 };
    }

    // 11. General Question & Curiosity Queries
    if (
      /^(what|when|where|who|why|how|can|is|are|do|does|will|could|should)\b/.test(clean) ||
      /^(tell me|share)\b/i.test(clean) ||
      clean.endsWith('?')
    ) {
      return { intent: 'general_question', confidence: 0.85 };
    }

    return { intent: 'unclear', confidence: 0.5 };
  }

  /**
   * Conversational state machine: derives personality state & founder context.
   */
  public static derivePersonalityState(
    message: string,
    history: LuxionMessage[],
    memories: MemoryItem[] = [],
    user?: { name?: string; email?: string } | null
  ): PersonalityState {
    const turnCount = history.length;
    const clean = message.toLowerCase();

    // Check if user is recognized as founder Abir
    const isFounder =
      (user?.email && user.email.toLowerCase() === LUXION_IDENTITY.founder.email.toLowerCase()) ||
      (user?.name && user.name.toLowerCase() === LUXION_IDENTITY.founder.name.toLowerCase()) ||
      memories.some((m) => m.key === 'user_is_founder' && m.value === 'true') ||
      false;

    let familiarity: PersonalityState['familiarity'] = 'new';
    if (isFounder || turnCount > 8 || memories.length > 3) {
      familiarity = 'frequent';
    } else if (turnCount > 2 || memories.length > 0) {
      familiarity = 'returning';
    }

    let userTone: PersonalityState['userTone'] = 'neutral';
    if (clean.includes('please') || clean.includes('sir') || clean.includes('kindly')) {
      userTone = 'formal';
    } else if (clean.includes('lol') || clean.includes('haha') || clean.includes('bruh') || clean.includes('yo')) {
      userTone = 'casual';
    } else if (clean.includes('frustrated') || clean.includes('annoying') || clean.includes('error') || clean.includes('fail')) {
      userTone = 'frustrated';
    } else if (clean.endsWith('?') || clean.includes('how') || clean.includes('why')) {
      userTone = 'curious';
    }

    let mode: PersonalityState['mode'] = 'conversational';
    if (clean.includes('code') || clean.includes('function') || clean.includes('build')) {
      mode = 'analytical';
    } else if (clean.includes('explain') || clean.includes('teach')) {
      mode = 'instructive';
    } else if (clean.includes('tired') || clean.includes('help me') || clean.includes('stuck')) {
      mode = 'supportive';
    }

    return {
      mode,
      energy: 'calm',
      familiarity,
      userTone,
      isFounder,
    };
  }

  /**
   * Preprocess Pipeline:
   * Analyzes message, determines intent, retrieves relevant memory, and matches contextual knowledge.
   */
  public static preprocess(
    message: string,
    context: Partial<LuxionContext> = {}
  ): {
    intent: LuxionIntent;
    confidence: number;
    personality: PersonalityState;
    memories: MemoryItem[];
    knowledge: KnowledgeEntry[];
  } {
    const history = context.history || [];

    // 1. Detect Intent
    const { intent, confidence } = this.detectIntent(message, history);

    // 2. Retrieve Relevant Memories
    let memories: MemoryItem[] = context.memories || [];
    if (memories.length === 0) {
      if (intent === 'memory_query') {
        memories = MemoryService.getAll().slice(0, 5);
      } else if (message) {
        memories = MemoryService.findRelevant(message);
      }
    }

    // 3. Retrieve Contextual Knowledge
    const knowledge = KnowledgeBase.search(message, undefined, 2);

    // 4. Derive Personality & State
    const personality = {
      ...this.derivePersonalityState(message, history, memories, context.user),
      ...(context.personalityState || {}),
    };

    return {
      intent,
      confidence,
      personality,
      memories,
      knowledge,
    };
  }

  /**
   * Full pipeline execution:
   * Message -> Preprocess -> Knowledge/Memory Assembly -> Provider Execution -> State Sync
   */
  public static async processPipeline(context: LuxionContext): Promise<BrainResponse> {
    const raw = (context.message || '').trim();

    // Dev Diagnostics: Start Trace
    devDiagnostics.startTrace(raw);

    // 1. Language Resolution
    let resolvedLanguage: SupportedLanguage = context.language || 'en';
    if (!context.language) {
      const detected = detectLanguage(raw);
      resolvedLanguage = detected.lang;
    }
    devDiagnostics.recordStep('language_resolved', `Language resolved to: ${resolvedLanguage}`, {
      language: resolvedLanguage,
      explicit: !!context.language,
    });

    // 2. Preprocess & extract user preferences and facts
    if (raw) {
      const drafts = MemoryService.extractFromMessage(raw);
      for (const d of drafts) {
        MemoryService.save(d);
      }
    }

    // 3. Preprocess input
    const preprocessed = this.preprocess(raw, context);
    devDiagnostics.recordStep('intent_detected', `Intent: ${preprocessed.intent}`, {
      intent: preprocessed.intent,
      confidence: preprocessed.confidence,
    });

    devDiagnostics.recordStep('memory_retrieved', `Retrieved ${preprocessed.memories.length} memories`, {
      count: preprocessed.memories.length,
      keys: preprocessed.memories.map((m) => m.key),
    });

    // 4. Assemble Conversation Context
    const conversationContext: ConversationContext = {
      turnCount: (context.history || []).length,
      lastIntent:
        (context.history || []).length > 0
          ? this.detectIntent(context.history![context.history!.length - 1].content).intent
          : undefined,
      activeTopic: raw.slice(0, 30),
      retrievedMemories: preprocessed.memories,
      retrievedKnowledge: preprocessed.knowledge,
      userMetadata: {
        name: context.user?.name,
        email: context.user?.email,
        isFounder: preprocessed.personality.isFounder,
      },
    };

    // 5. Select Provider & Generate response
    devDiagnostics.recordStep('provider_selected', `Active Provider: ${this.activeProvider.name}`, {
      provider: this.activeProvider.name,
    });

    const enrichedContext: LuxionContext = {
      ...context,
      language: resolvedLanguage,
    };

    const response = await this.activeProvider.generate(
      enrichedContext,
      preprocessed.intent,
      preprocessed.personality,
      conversationContext
    );

    devDiagnostics.recordStep('provider_generated', `Generated ${response.reply.length} chars response`, {
      intent: response.intent,
      length: response.reply.length,
    });

    // 6. Apply any suggested memory updates
    if (response.suggestedMemoryUpdates) {
      for (const u of response.suggestedMemoryUpdates) {
        MemoryService.save(u);
      }
    }

    devDiagnostics.recordStep('brain_response_returned', 'BrainResponse delivered to caller', {
      confidence: response.confidence,
    });

    return response;
  }

  /**
   * Synchronous main entry point (maintains 100% backwards compatibility)
   */
  public static evaluate(context: LuxionContext): BrainResponse {
    const raw = (context.message || '').trim();
    const preprocessed = this.preprocess(raw, context);

    const conversationContext: ConversationContext = {
      turnCount: (context.history || []).length,
      lastIntent:
        (context.history || []).length > 0
          ? this.detectIntent(context.history![context.history!.length - 1].content).intent
          : undefined,
      activeTopic: raw.slice(0, 30),
      retrievedMemories: preprocessed.memories,
      retrievedKnowledge: preprocessed.knowledge,
      userMetadata: {
        name: context.user?.name,
        email: context.user?.email,
        isFounder: preprocessed.personality.isFounder,
      },
    };

    const result = this.activeProvider.generate(
      context,
      preprocessed.intent,
      preprocessed.personality,
      conversationContext
    );

    if (result instanceof Promise) {
      throw new Error('Async response providers must be invoked via LuxionBrain.processPipeline()');
    }

    return result;
  }

  public static process(context: LuxionContext): string {
    const evaluation = this.evaluate(context);
    return evaluation.reply;
  }
}

export { Luxion35Provider };

// Auto-delegate to server if executed directly as entrypoint (e.g. on Render)
if (typeof process !== 'undefined' && process.argv && process.argv[1]) {
  const arg = process.argv[1].replace(/\\/g, '/');
  if (arg.endsWith('luxionBrain.ts') || arg.endsWith('luxionBrain.js') || arg.endsWith('luxionBrain')) {
    console.log('[LUXION] Direct entrypoint detected in luxionBrain. Launching LUXION Server...');
    import('../../server.ts').catch((err) => {
      console.error('[LUXION] Failed to boot server from luxionBrain:', err);
    });
  }
}


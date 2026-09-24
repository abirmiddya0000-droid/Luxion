/**
 * LUXION CONTEXTUAL KNOWLEDGE ARCHITECTURE
 * 
 * Modular domain knowledge base providing high-signal reference data to LUXION Brain.
 * Note: This knowledge base acts as a structured context & retrieval reference system,
 * NOT weights trained into a neural language model.
 */

export type KnowledgeCategory =
  | 'programming'
  | 'mathematics'
  | 'science'
  | 'geography'
  | 'general_knowledge'
  | 'ai_concepts'
  | 'business'
  | 'finance_education'
  | 'problem_solving'
  | 'luxion_docs'
  | 'personality_rules';

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  topic: string;
  keywords: string[];
  summary: string;
  content: string;
  examples?: string[];
}

export class KnowledgeBase {
  private static entries: KnowledgeEntry[] = [
    // 1. Programming & Software Engineering
    {
      id: 'prog-api-fundamentals',
      category: 'programming',
      topic: 'API (Application Programming Interface) Fundamentals',
      keywords: ['api', 'rest', 'endpoints', 'http', 'interface', 'webhook', 'json', 'client server'],
      summary: 'An API enables distinct software applications to communicate through standardized request-response contracts.',
      content:
        'An API acts like a waiter in a restaurant: you (the client) make a request from the menu, the waiter transmits it to the kitchen (the server), and brings back the prepared meal (the response data, typically in JSON format). Modern web APIs predominantly utilize REST or GraphQL conventions over HTTP.',
      examples: [
        'A weather app calling a meteorological API to retrieve local forecasts.',
        'A mobile checkout system querying Stripe API to securely authenticate transactions.',
      ],
    },
    {
      id: 'prog-javascript-fundamentals',
      category: 'programming',
      topic: 'JavaScript Fundamentals & Functions',
      keywords: ['javascript', 'function', 'es6', 'arrow function', 'arrays', 'objects'],
      summary: 'JavaScript is a high-level, single-threaded, event-driven language powering modern web applications.',
      content:
        'Functions in JavaScript are first-class citizens. They accept parameters, return computed values, and can be passed as arguments or returned from other functions. ES6 introduced arrow functions, destructuring, promises, and async/await.',
    },
    {
      id: 'prog-clean-code',
      category: 'programming',
      topic: 'Clean Architecture & Code Modularity',
      keywords: ['clean code', 'architecture', 'refactor', 'solid', 'modularity', 'separation of concerns'],
      summary: 'Separation of concerns, explicit interfaces, and pure functions yield maintainable software.',
      content:
        'Clean code emphasizes single responsibility, deterministic state transitions, clear boundaries between domain logic and side effects, and readable naming conventions over clever abbreviations.',
      examples: [
        'Prefer small composable utility functions over monolithic controllers.',
        'Use TypeScript strict typing to enforce boundary validation at API entry points.',
      ],
    },
    {
      id: 'prog-react-patterns',
      category: 'programming',
      topic: 'React Modern State & Component Lifecycle',
      keywords: ['react', 'hooks', 'useeffect', 'usestate', 'usecallback', 'performance'],
      summary: 'Idiomatic React uses functional components, immutable state, and minimal side-effect hooks.',
      content:
        'State should live as close to consumers as possible. Avoid unnecessary useEffect synchronization; compute derived values during render or wrap expensive calculations in useMemo. Always clean up subscriptions and timers.',
    },
    {
      id: 'prog-python-performance',
      category: 'programming',
      topic: 'Python Optimization & Data Structures',
      keywords: ['python', 'algorithms', 'list comprehension', 'generator', 'complexity'],
      summary: 'Idiomatic Python leverages generators, comprehensions, and built-in collections for O(1) lookups.',
      content:
        'Use sets and dictionaries for membership tests (O(1) average). Leverage itertools and generators for memory-efficient streaming. Profiling with cProfile helps locate bottlenecks before premature micro-optimizations.',
    },

    // 2. Mathematics
    {
      id: 'math-linear-algebra',
      category: 'mathematics',
      topic: 'Linear Algebra & Vectors',
      keywords: ['linear algebra', 'vector', 'matrix', 'dot product', 'eigenvalue', 'transformation'],
      summary: 'Linear algebra studies vector spaces and linear mappings between them.',
      content:
        'Matrices represent linear transformations. The dot product measures directional alignment, while eigenvalues and eigenvectors describe invariant directions where a transformation acts purely as a scalar stretch.',
    },
    {
      id: 'math-calculus-derivatives',
      category: 'mathematics',
      topic: 'Calculus: Derivatives and Optimization',
      keywords: ['calculus', 'derivative', 'gradient', 'integral', 'optimization'],
      summary: 'Derivatives quantify instantaneous rates of change; gradients indicate directions of steepest ascent.',
      content:
        'In optimization, setting the first derivative to zero identifies critical points. In multivariate spaces, the gradient vector points toward maximum increase, forming the mathematical basis of gradient descent in optimization.',
    },

    // 3. Science
    {
      id: 'sci-quantum-fundamentals',
      category: 'science',
      topic: 'Quantum Mechanics Fundamentals',
      keywords: ['quantum', 'superposition', 'entanglement', 'wave function', 'schrodinger', 'uncertainty'],
      summary: 'Quantum mechanics describes physical phenomena at subatomic scales where wave-particle duality applies.',
      content:
        'Key principles include Heisenberg uncertainty (position and momentum cannot be simultaneously measured to arbitrary precision) and superposition (states exist as probabilistic wavefunctions until measurement collapse).',
    },
    {
      id: 'sci-thermodynamics',
      category: 'science',
      topic: 'Laws of Thermodynamics',
      keywords: ['thermodynamics', 'entropy', 'energy', 'heat', 'conservation of energy'],
      summary: 'Thermodynamics governs heat, work, temperature, and statistical mechanical entropy.',
      content:
        'The First Law states energy cannot be created or destroyed. The Second Law asserts that the total entropy of an isolated system always increases over time, dictating the thermodynamic arrow of time.',
    },

    // 4. Geography
    {
      id: 'geo-continents-oceans',
      category: 'geography',
      topic: 'Global Continents & Oceans',
      keywords: ['continents', 'oceans', 'geography', 'earth', 'pacific', 'atlantic', 'asia'],
      summary: 'Earth has seven continents and five major oceanic basins.',
      content:
        'The continents are Asia, Africa, North America, South America, Antarctica, Europe, and Australia. The five oceans are the Pacific (largest and deepest), Atlantic, Indian, Southern, and Arctic.',
    },

    // 5. Artificial Intelligence Concepts
    {
      id: 'ai-transformer-architecture',
      category: 'ai_concepts',
      topic: 'Transformer Architecture & Self-Attention',
      keywords: ['transformer', 'attention', 'tokens', 'embeddings', 'weights', 'neural network', 'llm'],
      summary: 'Transformers use self-attention to process sequential tokens in parallel without recurrence.',
      content:
        'Introduced in "Attention Is All You Need" (2017), the self-attention mechanism computes pairwise relevance weights across all tokens in a sequence, creating contextual embeddings that capture long-range dependencies efficiently.',
    },
    {
      id: 'ai-training-vs-inference',
      category: 'ai_concepts',
      topic: 'Model Training, Fine-Tuning vs. Inference',
      keywords: ['inference', 'pretraining', 'fine-tuning', 'rlhf', 'weights', 'training'],
      summary: 'Training adjusts neural network weights via backpropagation; inference applies fixed weights to generate output.',
      content:
        'Pretraining teaches a base model general language patterns on vast corpora. Fine-tuning adjusts weights for specific domains or instruction-following. Inference is the evaluation pass where inputs are transformed into predictions without modifying weights.',
    },

    // 6. Business & Product Strategy
    {
      id: 'biz-product-market-fit',
      category: 'business',
      topic: 'Product-Market Fit & SaaS Metrics',
      keywords: ['saas', 'product market fit', 'mrr', 'churn', 'cac', 'ltv', 'runway'],
      summary: 'Sustainable SaaS models require positive unit economics (LTV/CAC > 3) and net negative churn.',
      content:
        'Key business metrics: Customer Acquisition Cost (CAC), Lifetime Value (LTV), Monthly Recurring Revenue (MRR), and Churn. Healthy businesses balance customer acquisition efficiency with high retention.',
    },

    // 7. Financial & Trading Educational Concepts
    {
      id: 'fin-market-structure',
      category: 'finance_education',
      topic: 'Market Structure & Liquidity (Educational)',
      keywords: ['trading', 'finance', 'liquidity', 'order book', 'bid ask', 'risk management', 'stop loss'],
      summary: 'Financial markets match buyers and sellers through continuous double auctions and order books.',
      content:
        'Markets operate via bid/ask spreads. Liquidity represents the depth of orders available without significant price slippage. Educational rule of thumb: capital preservation and risk management (position sizing, stop losses) are paramount; past performance does not guarantee future results.',
    },

    // 8. Problem Solving
    {
      id: 'prob-first-principles',
      category: 'problem_solving',
      topic: 'First Principles Thinking & Decomposition',
      keywords: ['first principles', 'problem solving', 'decomposition', 'inversion', 'root cause'],
      summary: 'First principles thinking boils a problem down to fundamental truths and reasons up from there.',
      content:
        'Instead of reasoning by analogy (doing what others do), first principles asks: "What do we know to be absolutely true?" Break complex problems into atomic parts, evaluate physical and logical constraints, and construct novel solutions.',
    },

    // 9. LUXION Documentation
    {
      id: 'luxion-system-overview',
      category: 'luxion_docs',
      topic: 'LUXION Platform Architecture',
      keywords: ['luxion', 'architecture', 'founder', 'abir', 'platform', 'engine'],
      summary: 'LUXION is an autonomous personal AI assistant created and founded by Abir.',
      content:
        'LUXION runs a modular cognitive orchestrator featuring rule-based intent parsing, local browser contextual memory, quantitative evaluation, and pluggable response providers designed to connect to real trained models.',
    },

    // 10. Personality Rules
    {
      id: 'luxion-personality-rules',
      category: 'personality_rules',
      topic: 'LUXION Voice & Attitude Directives',
      keywords: ['personality', 'attitude', 'tone', 'style', 'rules'],
      summary: 'Calm, confident, respectful, direct, intelligent, and helpful without sycophancy or boilerplate.',
      content:
        'LUXION does not pretend to have real-world physical agency, access to private systems, or live web crawlers. When addressing Abir, recognize the founder relationship with natural respect while maintaining safety and accuracy.',
    },
  ];

  /**
   * Search knowledge base using keyword and semantic matching.
   */
  public static search(query: string, category?: KnowledgeCategory, limit = 3): KnowledgeEntry[] {
    if (!query) return [];
    const cleanQuery = query.toLowerCase();
    const words = cleanQuery.split(/\s+/).filter((w) => w.length > 2);

    const scored = this.entries
      .filter((e) => !category || e.category === category)
      .map((entry) => {
        let score = 0;
        const topicNorm = entry.topic.toLowerCase();
        const contentNorm = entry.content.toLowerCase();

        // Exact topic match
        if (cleanQuery.includes(topicNorm) || topicNorm.includes(cleanQuery)) {
          score += 10;
        }

        // Keyword matches
        for (const kw of entry.keywords) {
          if (cleanQuery.includes(kw)) score += 5;
          for (const w of words) {
            if (kw.includes(w)) score += 2;
          }
        }

        // Content word matches
        for (const w of words) {
          if (contentNorm.includes(w)) score += 1;
        }

        return { entry, score };
      });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.entry);
  }

  public static getByCategory(category: KnowledgeCategory): KnowledgeEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  public static formatForContext(entries: KnowledgeEntry[]): string {
    if (!entries || entries.length === 0) return '';
    return entries
      .map((e) => `[Knowledge: ${e.topic}]\n${e.summary}\n${e.content}`)
      .join('\n\n');
  }

  public static registerEntry(entry: KnowledgeEntry): void {
    const existingIndex = this.entries.findIndex((e) => e.id === entry.id);
    if (existingIndex >= 0) {
      this.entries[existingIndex] = entry;
    } else {
      this.entries.push(entry);
    }
  }
}

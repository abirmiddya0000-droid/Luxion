/**
 * LUXION FUTURE CAPABILITY INTERFACES
 * 
 * Clean architectural contracts for future integrations.
 * LUXION separates real working features from future capabilities.
 * These interfaces provide the expansion hooks for upcoming modules
 * (web grounding, image generation, video generation, code execution,
 * and containerized deployment) without pretending they are currently active.
 */

export type FutureCapabilityId =
  | 'web_research'
  | 'image_generation'
  | 'video_generation'
  | 'code_execution'
  | 'container_deployment'
  | 'specialized_agents';

export interface FutureCapabilityManifest {
  id: FutureCapabilityId;
  name: string;
  description: string;
  isAvailable: boolean;
  plannedProvider?: string;
  notes: string;
}

export const FUTURE_CAPABILITIES: Record<FutureCapabilityId, FutureCapabilityManifest> = {
  web_research: {
    id: 'web_research',
    name: 'Live Web Grounding',
    description: 'Real-time search grounding and URL context retrieval.',
    isAvailable: false,
    plannedProvider: 'googleSearch tool',
    notes: 'Planned for integration with Gemini search grounding in a future release.',
  },
  image_generation: {
    id: 'image_generation',
    name: 'Image Generation',
    description: 'Generating and editing visual assets from prompts.',
    isAvailable: false,
    plannedProvider: 'gemini-3.1-flash-image',
    notes: 'Future integration for multimodal generation.',
  },
  video_generation: {
    id: 'video_generation',
    name: 'Video Generation',
    description: 'Creating short video clips from text or reference frames.',
    isAvailable: false,
    plannedProvider: 'veo-3.1-lite-generate-preview',
    notes: 'Future integration for asynchronous video generation operations.',
  },
  code_execution: {
    id: 'code_execution',
    name: 'Sandboxed Code Execution',
    description: 'Server-side sandboxed container execution for Python/Node/Rust.',
    isAvailable: false,
    notes: 'Client-side HTML5/Canvas preview is active; remote multi-language sandbox is a future integration.',
  },
  container_deployment: {
    id: 'container_deployment',
    name: 'Automated Container Deployment',
    description: 'Automatic GitHub repo creation and cloud container hosting.',
    isAvailable: false,
    notes: 'Client-side code preview is active; automated cloud cluster hosting is a future integration.',
  },
  specialized_agents: {
    id: 'specialized_agents',
    name: 'Multi-Agent Coordination',
    description: 'Background autonomous multi-agent task loops.',
    isAvailable: false,
    notes: 'Planned for future autonomous workflow expansions.',
  },
};

export function getCapabilityStatus(id: FutureCapabilityId): FutureCapabilityManifest {
  return FUTURE_CAPABILITIES[id];
}

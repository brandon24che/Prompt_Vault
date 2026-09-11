import { Prompt } from '../types';

export const SEED_PROMPTS: Omit<Prompt, 'id' | 'likesCount' | 'copiesCount' | 'createdAt'>[] = [
  {
    title: 'Senior Software Architect Code Review & Refactoring',
    category: 'Coding',
    targetPlatform: 'Claude',
    promptText: `Act as a Principal Software Engineer and Staff Architect specialized in [programming language]. 
Review the following snippet or architecture for:
1. Algorithmic efficiency and Big-O computational/space complexity.
2. Edge-case vulnerability, memory leaks, and concurrency safety.
3. Clean code principles, SOLID design, and idiomatic [programming language] patterns.

Context & constraints:
- Environment: [target runtime, e.g. Node.js 22 / React 19 / Rust]
- Expected scale: [scale requirement, e.g. 50k requests/sec]

Here is the source code to review:
\`\`\`
[insert your code here]
\`\`\`

Provide prioritized refactoring steps, followed by the rewritten, production-grade implementation with concise inline rationale.`,
    outputDescription: 'Provides an exhaustive, senior-level code audit with Big-O analysis, security/edge-case breakdown, and fully rewritten idiomatic code.',
    tags: ['coding', 'architecture', 'refactor', 'senior-dev'],
    authorId: 'system-seed',
    authorUsername: 'CyberArchitect',
    isFeatured: true,
  },
  {
    title: 'Photorealistic Cinematic 8K Midjourney Concept Art',
    category: 'Image Gen',
    targetPlatform: 'Midjourney',
    promptText: `/imagine prompt: A high-contrast cinematic portrait of [subject or character], [mood or emotion], set in a futuristic [environment or biome]. Bathed in volumetric [lighting style, e.g. neon cyberpunk / golden hour haze], shot on 35mm anamorphic lens, f/1.4, Unreal Engine 5 render style, hyper-detailed textures, ray tracing --ar [aspect ratio, e.g. 16:9] --v 6.1 --stylize [stylize number 50-750]`,
    outputDescription: 'Generates breathtaking photographic rendering with realistic volumetric shadows, precise lens depth, and cinematic lighting.',
    tags: ['midjourney', 'cinematic', 'portrait', 'lighting'],
    authorId: 'system-seed',
    authorUsername: 'PixelAlchemist',
    isFeatured: true,
  },
  {
    title: 'High-Converting B2B SaaS Value Proposition & Landing Copy',
    category: 'Writing',
    targetPlatform: 'ChatGPT',
    promptText: `You are an elite direct-response SaaS copywriter who trained under Eugene Schwartz and Julian Shapiro.
Craft a high-converting landing page section for our product called "[product name]".

Target Audience: [target audience, e.g. Chief Information Security Officers]
Core Problem we solve: [core pain point]
Key Breakthrough/Feature: [unique mechanism or differentiator]
Primary Call-to-Action: [desired conversion action, e.g. Book a 15-Min Demo]

Deliver:
1. Three magnetic H1 headline variations (Direct, Curiosity-driven, Social-proof led).
2. A compelling 2-sentence subheadline establishing undeniable ROI.
3. 3 benefit-first bullet points overcoming skepticism.
4. Friction-reducing microcopy for under the CTA button.`,
    outputDescription: 'Creates high-converting, psychologically grounded marketing copy focused on customer pain points and conversion velocity.',
    tags: ['copywriting', 'marketing', 'conversion', 'b2b'],
    authorId: 'system-seed',
    authorUsername: 'GrowthHacker',
    isFeatured: true,
  },
  {
    title: 'Deep Research & Multi-Perspective Synthesis Matrix',
    category: 'Research',
    targetPlatform: 'Gemini',
    promptText: `Act as a Lead Intelligence & Policy Analyst. Conduct an objective, deep dive analysis on [research topic or emerging tech].

Please organize your output into:
1. Executive Summary & Core Definitions.
2. Current State of the Art vs. Unresolved Technical Roadblocks.
3. Multi-stakeholder Analysis:
   - Impact on [stakeholder group 1, e.g. Enterprise Businesses]
   - Impact on [stakeholder group 2, e.g. End Consumers]
   - Impact on [stakeholder group 3, e.g. Regulatory Bodies]
4. Contrarian viewpoints and steel-man arguments opposing the mainstream narrative.
5. 3-Year Prognosis with high-confidence vs. speculative indicators.`,
    outputDescription: 'Synthesizes complex research domains with clear stakeholder breakdowns, balanced contrarian arguments, and future outlook matrices.',
    tags: ['research', 'analysis', 'strategy', 'deep-dive'],
    authorId: 'system-seed',
    authorUsername: 'AeroResearch',
    isFeatured: true,
  },
  {
    title: 'Executive Pitch Deck Narrative & Investor Q&A Simulator',
    category: 'Business',
    targetPlatform: 'ChatGPT',
    promptText: `Assume the persona of a veteran Tier-1 Venture Capitalist.
I am pitching a startup named "[company name]" solving "[problem statement]".
Our business model is [business model, e.g. B2B annual recurring subscriptions] with current traction of [traction metric].

Run an interactive pitch review:
1. Critique our value proposition for defensibility (moats, network effects).
2. Generate the 5 hardest questions a Sequoia or Andreessen partner will ask during partner meeting.
3. For each question, outline what a weak founder answer sounds like versus the ideal killer answer.`,
    outputDescription: 'Simulates a Tier-1 VC partner interrogation to pressure-test startup decks, market defensibility, and founder responses.',
    tags: ['startup', 'fundraising', 'vc', 'pitch'],
    authorId: 'system-seed',
    authorUsername: 'VentureMind',
    isFeatured: false,
  },
  {
    title: 'Stable Diffusion LoRA Master Texture & Fantasy Art',
    category: 'Image Gen',
    targetPlatform: 'Stable Diffusion',
    promptText: `masterpiece, 8k resolution, photorealistic concept art of a [mythical creature or warrior], ornate [armor material or robes], glowing runes, misty atmospheric depth, dramatic rim lighting, intricate filigree, octane render, trending on ArtStation, dynamic pose, highly detailed face and eyes
Negative prompt: (worst quality, low quality:1.4), deformed, extra limbs, bad anatomy, blurry, watermark, signature
Steps: [sampling steps 25-50], Sampler: DPM++ 2M Karras, CFG scale: [cfg scale 6-8]`,
    outputDescription: 'Engineered for Stable Diffusion models with positive and negative prompt weighting for crisp, non-distorted fantasy art.',
    tags: ['stable-diffusion', 'fantasy', 'artstation', 'negative-prompt'],
    authorId: 'system-seed',
    authorUsername: 'DiffusionArtisan',
    isFeatured: false,
  },
  {
    title: 'Autonomous System Prompt / Metaprompt Optimizer',
    category: 'Productivity',
    targetPlatform: 'Claude',
    promptText: `You are an expert prompt engineer specializing in Constitutional AI and Chain-of-Thought steering.
Analyze and elevate my rough prompt draft below into a high-performance, hallucination-resistant system prompt:

Draft prompt:
"""
[paste your rough prompt here]
"""

Desired goal: [specific goal or behavior]
Key constraints: [what the AI must never do]

Produce:
1. Root cause critique of ambiguity or leakage risks in the draft.
2. The perfected prompt formatted with Markdown sections (<instructions>, <context>, <constraints>, <few_shot_examples>).
3. A test prompt to benchmark whether the AI complies with negative constraints.`,
    outputDescription: 'Restructures raw prompts into enterprise-grade system prompts with XML tags, boundary constraints, and hallucination reduction.',
    tags: ['prompt-engineering', 'claude', 'system-prompt', 'optimization'],
    authorId: 'system-seed',
    authorUsername: 'PromptGod',
    isFeatured: true,
  }
];

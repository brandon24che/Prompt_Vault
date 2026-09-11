import React from 'react';
import { Sparkles, Terminal, Cpu, Zap, ArrowRight, ShieldCheck, Copy, Sliders, Heart, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingHeroProps {
  onExploreClick: () => void;
  totalCommunityPrompts?: number;
  totalCommunityLikes?: number;
  totalPromptsCopied?: number;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onExploreClick,
  totalCommunityPrompts = 0,
  totalCommunityLikes = 0,
  totalPromptsCopied = 0,
}) => {
  const { setShowAuthModal, setAuthModalMode } = useAuth();

  return (
    <div className="relative overflow-hidden py-12 md:py-20 border-b border-slate-800/80 bg-gradient-to-b from-[#0e1626]/80 via-[#0b0f17] to-[#0b0f17]">
      {/* Subtle Neon Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-cyan-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold mb-6 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          The Modern Prompt Engineering Repository
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
          Store, Share & Discover <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            Battle-Tested AI Prompts
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Stop rewriting system prompts from scratch. Discover verified prompts for{' '}
          <span className="text-white font-semibold">ChatGPT</span>,{' '}
          <span className="text-white font-semibold">Claude</span>,{' '}
          <span className="text-white font-semibold">Gemini</span>, and{' '}
          <span className="text-white font-semibold">Midjourney</span> with direct image uploads and live variable injection.
        </p>

        {/* Call to action buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => {
              setAuthModalMode('signup');
              setShowAuthModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] transition-all active:scale-95 cursor-pointer"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreClick}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 font-semibold text-sm transition-all active:scale-95 cursor-pointer"
          >
            Explore Vault Prompts
          </button>
        </div>

        {/* Real-Time Live Community Telemetry Strip */}
        <div className="mt-10 max-w-2xl mx-auto p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Live Community Telemetry (Real-Time Firestore Sync)
            </span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-800 text-center">
            <div className="px-2">
              <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono tracking-tight">
                {totalPromptsCopied}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                <Copy className="w-3 h-3 text-cyan-400" />
                <span>Prompts Copied</span>
              </div>
            </div>

            <div className="px-2">
              <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight">
                {totalCommunityLikes}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                <Heart className="w-3 h-3 text-rose-400" />
                <span>Likes Given</span>
              </div>
            </div>

            <div className="px-2">
              <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {totalCommunityPrompts}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>User Prompts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-[#0f172a]/70 border border-slate-800 hover:border-cyan-500/30 transition backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-2.5">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white mb-1">Variable Parameter Filler</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects bracket placeholders like [topic] so you can fill custom inputs in real time.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0f172a]/70 border border-slate-800 hover:border-cyan-500/30 transition backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white mb-1">1-Click Platform Test</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantly opens ChatGPT, Claude, or Gemini in a new tab with your prompt in clipboard.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0f172a]/70 border border-slate-800 hover:border-cyan-500/30 transition backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-2.5">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white mb-1">Device Image & Link Attachments</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload actual AI-rendered outputs from your device and link to demo repositories.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0f172a]/70 border border-slate-800 hover:border-cyan-500/30 transition backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white mb-1">100% Real-Time Data</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zero fake or seeded numbers. All likes, copies, and posts update live across all users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

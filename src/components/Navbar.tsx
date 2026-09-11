import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../types';
import {
  Sparkles,
  Compass,
  Bookmark,
  FileText,
  ShieldCheck,
  Plus,
  LogOut,
  LogIn,
  Crown,
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenUpload,
}) => {
  const { currentUser, userProfile, isAdmin, logout, setShowAuthModal, setAuthModalMode } =
    useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0b0f17]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          onClick={() => setActiveTab('explore')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-purple-600 p-[1px] shadow-[0_0_20px_rgba(6,182,212,0.35)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.55)] transition-all duration-300">
            <div className="w-full h-full bg-[#0b0f17] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-white font-mono">
                PROMPT<span className="text-cyan-400">VAULT</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 uppercase tracking-widest">
                v2.0
              </span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-wider">AI Engineering Repository</span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'explore'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Explore
          </button>

          {currentUser && (
            <>
              <button
                onClick={() => setActiveTab('my-prompts')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'my-prompts'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                My Prompts
              </button>

              <button
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Saved
              </button>
            </>
          )}

          {isAdmin && (
            <button
              id="nav-admin-link"
              data-role="admin-nav"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                  : 'text-purple-400 hover:text-purple-200 hover:bg-purple-950/30 border border-transparent'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-purple-400" />
              Admin Panel
            </button>
          )}
        </nav>

        {/* Actions Right */}
        <div className="flex items-center gap-3">
          {/* Upload Button */}
          <button
            onClick={() => {
              if (!currentUser) {
                setShowAuthModal(true);
              } else {
                onOpenUpload();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_22px_rgba(6,182,212,0.45)] active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Prompt</span>
            <span className="sm:hidden">Upload</span>
          </button>

          {/* User Auth Section */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">
                    {userProfile?.username || currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  {isAdmin && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 max-w-[120px] truncate">
                  {currentUser.email}
                </span>
              </div>

              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setShowAuthModal(true);
                }}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition cursor-pointer"
              >
                Join Free
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/60 bg-slate-950/70 px-2 py-2">
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-3 rounded-lg ${
            activeTab === 'explore' ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-400'
          }`}
        >
          <Compass className="w-4 h-4" />
          Explore
        </button>
        {currentUser && (
          <>
            <button
              onClick={() => setActiveTab('my-prompts')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-3 rounded-lg ${
                activeTab === 'my-prompts' ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              My Prompts
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-3 rounded-lg ${
                activeTab === 'saved' ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-400'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved
            </button>
          </>
        )}
        {isAdmin && (
          <button
            data-role="admin-nav"
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-3 rounded-lg ${
              activeTab === 'admin' ? 'text-purple-400 bg-purple-950/40' : 'text-purple-400/70'
            }`}
          >
            <Crown className="w-4 h-4" />
            Admin
          </button>
        )}
      </div>
    </header>
  );
};

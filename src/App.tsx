import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { PromptCard } from './components/PromptCard';
import { PromptFormModal } from './components/PromptFormModal';
import { PromptDetailModal } from './components/PromptDetailModal';
import { AuthModal } from './components/AuthModal';
import { ToastContainer } from './components/ToastContainer';
import { LandingHero } from './components/LandingHero';
import { AdminDashboard } from './components/AdminDashboard';
import { Prompt, AIPlatform, PromptCategory, ActiveTab } from './types';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { isSamplePrompt, purgeSamplePromptsFromFirestore } from './utils/promptUtils';
import {
  Search,
  Filter,
  Sparkles,
  Layers,
  ArrowUpDown,
  Plus,
  Bookmark,
  FileText,
  Compass,
  AlertCircle,
  Zap,
  Heart,
  Copy,
  Activity,
} from 'lucide-react';

const ALL_PLATFORMS: (AIPlatform | 'All')[] = [
  'All',
  'ChatGPT',
  'Claude',
  'Gemini',
  'Midjourney',
  'Stable Diffusion',
];

const ALL_CATEGORIES: (PromptCategory | 'All')[] = [
  'All',
  'Coding',
  'Writing',
  'Image Gen',
  'Business',
  'Product',
  'Productivity',
  'Research',
  'Other',
];

function MainContent() {
  const { currentUser, userProfile, isAdmin, bookmarks, setShowAuthModal, setAuthModalMode } = useAuth();
  const { addToast } = useToast();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Route guarding: Protect Admin section from unauthorized access
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('explore');
      setAccessDeniedMessage('Access Denied: You must have administrator privileges to view the Admin Dashboard.');
      addToast({
        title: 'Access Denied',
        description: 'You must have administrator privileges in Firestore to view the Admin Dashboard.',
        type: 'error',
      });
      window.location.hash = '#home-feed';
    }
  }, [activeTab, isAdmin, addToast]);

  // Handle URL hash changes for direct deep linking (#admin-dashboard, #home-feed)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#admin-dashboard') {
        if (isAdmin) {
          setActiveTab('admin');
        } else {
          setActiveTab('explore');
          setAccessDeniedMessage('Access Denied: You must have administrator privileges to view the Admin Dashboard.');
          addToast({
            title: 'Access Denied',
            description: 'You must have administrator privileges in Firestore to view the Admin Dashboard.',
            type: 'error',
          });
          window.location.hash = '#home-feed';
        }
      } else if (hash === '#home-feed' || hash === '#community-feed') {
        setActiveTab('explore');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isAdmin, addToast]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<AIPlatform | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'copied' | 'newest'>('popular');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [selectedDetailPrompt, setSelectedDetailPrompt] = useState<Prompt | null>(null);

  // Clean up any remaining sample/seed prompts from Firestore on startup
  useEffect(() => {
    purgeSamplePromptsFromFirestore().catch((err) => {
      console.warn('Sample prompt purge status:', err);
    });
  }, []);

  // Subscribe to Firestore prompts collection (Real-time live sync of authentic user prompts)
  useEffect(() => {
    const promptsCol = collection(db, 'prompts');
    const q = query(promptsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Prompt[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Prompt;
          // Filter out any sample/seed prompts so only real user prompts are displayed
          if (!isSamplePrompt(data)) {
            list.push(data);
          }
        });
        setPrompts(list);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore prompts listen error:', err);
        setPrompts([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Delete Prompt Handler
  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    try {
      await deleteDoc(doc(db, 'prompts', promptId));
      addToast({
        title: 'Prompt Deleted',
        description: 'Successfully removed from the vault.',
        type: 'info',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `prompts/${promptId}`);
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setIsFormOpen(true);
  };

  // Filtered & Sorted Prompts
  const displayedPrompts = useMemo(() => {
    let list = [...prompts];

    // Tab-based view filter
    if (activeTab === 'my-prompts' && currentUser) {
      list = list.filter((p) => p.authorId === currentUser.uid);
    } else if (activeTab === 'saved' && currentUser) {
      list = list.filter((p) => bookmarks.has(p.id));
    }

    // Platform Filter
    if (selectedPlatform !== 'All') {
      list = list.filter((p) => p.targetPlatform === selectedPlatform);
    }

    // Category Filter
    if (selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Search Query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.promptText.toLowerCase().includes(q) ||
          p.outputDescription.toLowerCase().includes(q) ||
          p.targetPlatform.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sort
    if (sortBy === 'popular') {
      list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sortBy === 'copied') {
      list.sort((a, b) => (b.copiesCount || 0) - (a.copiesCount || 0));
    } else if (sortBy === 'newest') {
      list.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    return list;
  }, [
    prompts,
    activeTab,
    currentUser,
    bookmarks,
    selectedPlatform,
    selectedCategory,
    searchQuery,
    sortBy,
  ]);

  // Live real-time community statistics computed directly from Firestore collection
  const totalCommunityPrompts = prompts.length;
  const totalCommunityLikes = useMemo(
    () => prompts.reduce((acc, p) => acc + (p.likesCount || 0), 0),
    [prompts]
  );
  const totalPromptsCopied = useMemo(
    () => prompts.reduce((acc, p) => acc + (p.copiesCount || 0), 0),
    [prompts]
  );

  // Featured Prompts for Unauthenticated Preview
  const featuredPrompts = useMemo(() => {
    return prompts.filter((p) => p.isFeatured).slice(0, 3);
  }, [prompts]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => {
          setEditingPrompt(null);
          setIsFormOpen(true);
        }}
      />

      {/* Access Denied Alert if manual route bypass attempted */}
      {accessDeniedMessage && (
        <div id="access-denied-modal" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-between gap-4 text-xs text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-900/80 text-rose-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Access Denied: Restricted Admin Area</p>
                <p className="error-message-text text-rose-300">{accessDeniedMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setAccessDeniedMessage(null)}
              className="px-3 py-1.5 rounded-xl bg-rose-900/50 hover:bg-rose-900 text-rose-200 text-xs font-semibold cursor-pointer shrink-0 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Account Suspended Alert if user's account is suspended */}
      {currentUser && userProfile?.isSuspended && (
        <div id="account-suspended-banner" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-between gap-4 text-xs text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-900/80 text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Account Status: Suspended</p>
                <p className="text-amber-300">
                  Your account is currently under administrative suspension ({userProfile.suspendedReason || 'Administrative hold'}). You can browse prompts, but publishing and editing are disabled.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero for unauthenticated visitors when on Explore tab */}
      {!currentUser && activeTab === 'explore' && (
        <LandingHero
          totalCommunityPrompts={totalCommunityPrompts}
          totalCommunityLikes={totalCommunityLikes}
          totalPromptsCopied={totalPromptsCopied}
          onExploreClick={() => {
            const feedElem = document.getElementById('community-feed');
            if (feedElem) feedElem.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* Admin Panel View */}
      {activeTab === 'admin' ? (
        <AdminDashboard
          prompts={prompts}
          onRefreshPrompts={() => {}}
          onOpenPromptDetail={(p) => setSelectedDetailPrompt(p)}
        />
      ) : (
        <main
          id="community-feed"
          className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          {/* Header Banner for Visitors */}
          {!currentUser && (
            <div className="mb-8 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-cyan-200">
                <div className="p-2 rounded-xl bg-cyan-900/60 text-cyan-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">Public Visitor Preview</p>
                  <p className="text-slate-300">
                    You're viewing the public preview. Log in or create a free account to unlock the full repository, copy customized prompts, and publish your own AI prompts.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setShowAuthModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-semibold text-slate-950 transition cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}

          {/* Tab Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                {activeTab === 'my-prompts' ? (
                  <>
                    <FileText className="w-5 h-5 text-cyan-400" />
                    My Uploaded Prompts
                  </>
                ) : activeTab === 'saved' ? (
                  <>
                    <Bookmark className="w-5 h-5 text-cyan-400" />
                    Saved Bookmarks
                  </>
                ) : (
                  <>
                    <Compass className="w-5 h-5 text-cyan-400" />
                    Community Prompt Feed
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'my-prompts'
                  ? 'Manage, edit, or remove prompts you have published to the repository.'
                  : activeTab === 'saved'
                  ? 'Quick access to prompts you have bookmarked from other creators.'
                  : 'Discover verified prompts engineered for ChatGPT, Claude, Gemini, and Midjourney.'}
              </p>
            </div>

            {/* Quick Upload Action on Top */}
            <button
              onClick={() => {
                if (!currentUser) {
                  setShowAuthModal(true);
                } else {
                  setEditingPrompt(null);
                  setIsFormOpen(true);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Upload Prompt
            </button>
          </div>

          {/* Real-time Community Telemetry Ticker (Live across all interactions) */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-[#0c1426] to-slate-950 border border-slate-800/90 shadow-md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Live Community Activity (Real-Time Firestore Sync)
                </span>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-400">Total Copied:</span>
                  <span className="font-bold text-cyan-300 font-mono text-sm">{totalPromptsCopied}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-slate-400">Likes Given:</span>
                  <span className="font-bold text-rose-300 font-mono text-sm">{totalCommunityLikes}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Live Prompts:</span>
                  <span className="font-bold text-white font-mono text-sm">{totalCommunityPrompts}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search, Filter & Sort Bar */}
          <div className="p-4 rounded-2xl bg-[#0f172a]/90 border border-slate-800/90 shadow-lg mb-8 space-y-4">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts by title, keywords, parameters, or tags..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Platform Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Platform:
              </span>
              {ALL_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedPlatform === platform
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>

            {/* Category Filter & Sort Options */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/70">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400" /> Category:
                </span>
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700/80 text-xs text-white rounded-lg px-2.5 py-1 outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="popular">Most Upvoted</option>
                  <option value="copied">Most Copied</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Prompts Dynamic Grid */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span className="text-xs font-mono tracking-wider">Accessing Vault...</span>
            </div>
          ) : displayedPrompts.length === 0 ? (
            <div className="py-20 px-4 text-center rounded-2xl bg-[#0f172a]/50 border border-slate-800/80 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {prompts.length === 0 ? 'No Prompts Yet in Vault' : 'No Prompts Found'}
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                {prompts.length === 0
                  ? 'All sample and seed prompts have been cleared. Be the first creator to publish an AI prompt with direct device image uploads and external links!'
                  : activeTab === 'saved'
                  ? "You haven't bookmarked any prompts yet. Explore the community feed and click the bookmark icon to save prompts here!"
                  : activeTab === 'my-prompts'
                  ? "You haven't published any prompts yet. Share your engineered AI prompts with the community!"
                  : 'No prompts match the current search keywords or filters. Try adjusting your criteria.'}
              </p>
              {prompts.length === 0 || activeTab === 'my-prompts' ? (
                <button
                  onClick={() => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                    } else {
                      setEditingPrompt(null);
                      setIsFormOpen(true);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Upload First Prompt
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedPlatform('All');
                    setSelectedCategory('All');
                    setActiveTab('explore');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
                <span>
                  Showing {displayedPrompts.length} prompt{displayedPrompts.length !== 1 ? 's' : ''}
                </span>
                {selectedPlatform !== 'All' && (
                  <span className="font-mono text-cyan-400">Filter: {selectedPlatform}</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onEdit={handleEditPrompt}
                    onDelete={handleDeletePrompt}
                    onOpenDetail={(p) => setSelectedDetailPrompt(p)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#0a0e17] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300 font-mono">PROMPTVAULT</span>
            <span>— AI Engineering Repository</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Powered by Firebase Auth & Firestore</span>
            <span>•</span>
            <span>Targeting ChatGPT, Claude, Gemini & Midjourney</span>
          </div>
        </div>
      </footer>

      {/* Modals & Toasts */}
      <AuthModal />
      <PromptFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPrompt(null);
        }}
        editingPrompt={editingPrompt}
        onSaved={() => {
          // Trigger refresh if needed
        }}
      />
      <PromptDetailModal
        prompt={selectedDetailPrompt}
        onClose={() => setSelectedDetailPrompt(null)}
      />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainContent />
      </ToastProvider>
    </AuthProvider>
  );
}

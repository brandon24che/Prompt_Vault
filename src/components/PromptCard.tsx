import React, { useState, useEffect, useMemo } from 'react';
import { Prompt, AIPlatform } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Copy,
  Check,
  Heart,
  Bookmark,
  ExternalLink,
  Sliders,
  Sparkles,
  MoreVertical,
  Trash2,
  Edit,
  Tag,
  User,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Box,
} from 'lucide-react';
import { downloadPdfFile } from '../utils/promptUtils';

interface PromptCardProps {
  prompt: Prompt;
  onEdit?: (prompt: Prompt) => void;
  onDelete?: (promptId: string) => void;
  onOpenDetail?: (prompt: Prompt) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  onEdit,
  onDelete,
  onOpenDetail,
}) => {
  const { currentUser, isAdmin, bookmarks, likes, toggleBookmark, toggleLike, recordCopy } =
    useAuth();
  const { addToast } = useToast();

  const [copied, setCopied] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [showMenu, setShowMenu] = useState(false);
  const [localCopies, setLocalCopies] = useState(prompt.copiesCount || 0);
  const [localLikes, setLocalLikes] = useState(prompt.likesCount || 0);

  useEffect(() => {
    setLocalCopies(prompt.copiesCount || 0);
  }, [prompt.copiesCount]);

  useEffect(() => {
    setLocalLikes(prompt.likesCount || 0);
  }, [prompt.likesCount]);

  const isBookmarked = bookmarks.has(prompt.id);
  const isLiked = likes.has(prompt.id);
  const isOwnerOrAdmin = currentUser && (prompt.authorId === currentUser.uid || isAdmin);

  // Extract variables in format [variable_name]
  const parameters = useMemo(() => {
    const regex = /\[(.*?)\]/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(prompt.promptText)) !== null) {
      const clean = match[1].trim();
      if (clean && !matches.includes(clean)) {
        matches.push(clean);
      }
    }
    return matches;
  }, [prompt.promptText]);

  // Construct customized prompt if parameters are provided
  const computedPromptText = useMemo(() => {
    let text = prompt.promptText;
    parameters.forEach((param) => {
      const val = paramValues[param]?.trim();
      if (val) {
        text = text.replaceAll(`[${param}]`, val);
      }
    });
    return text;
  }, [prompt.promptText, parameters, paramValues]);

  // Platform styling & URLs
  const getPlatformDetails = (platform: AIPlatform) => {
    switch (platform) {
      case 'ChatGPT':
        return {
          color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
          glow: 'group-hover:border-emerald-500/40',
          url: 'https://chatgpt.com',
          name: 'ChatGPT',
          actionText: 'Open ChatGPT',
        };
      case 'Claude':
        return {
          color: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
          glow: 'group-hover:border-amber-500/40',
          url: 'https://claude.ai',
          name: 'Claude',
          actionText: 'Open Claude',
        };
      case 'Gemini':
        return {
          color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
          glow: 'group-hover:border-cyan-500/40',
          url: 'https://gemini.google.com',
          name: 'Gemini',
          actionText: 'Open Gemini',
        };
      case 'Midjourney':
        return {
          color: 'text-purple-400 bg-purple-950/60 border-purple-500/40',
          glow: 'group-hover:border-purple-500/40',
          url: 'https://www.midjourney.com',
          name: 'Midjourney',
          actionText: 'Open Midjourney',
        };
      case 'Stable Diffusion':
        return {
          color: 'text-rose-400 bg-rose-950/60 border-rose-500/40',
          glow: 'group-hover:border-rose-500/40',
          url: 'https://stablediffusionweb.com',
          name: 'Stable Diffusion',
          actionText: 'Open Stable Diffusion',
        };
      default:
        return {
          color: 'text-slate-300 bg-slate-800 border-slate-700',
          glow: 'group-hover:border-cyan-500/40',
          url: 'https://chatgpt.com',
          name: platform,
          actionText: `Open ${platform}`,
        };
    }
  };

  const platformInfo = getPlatformDetails(prompt.targetPlatform);

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setLocalCopies((c) => c + 1);
      await navigator.clipboard.writeText(computedPromptText);
      await recordCopy(prompt.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);

      const hasCustomized = Object.values(paramValues).some((v: string) => v && v.trim().length > 0);
      addToast({
        title: 'Prompt Copied to Clipboard!',
        description: hasCustomized
          ? `Copied with your customized parameters. Ready to paste in ${prompt.targetPlatform}!`
          : `Ready to paste into ${prompt.targetPlatform}.`,
        type: 'success',
      });
    } catch {
      addToast({
        title: 'Copy Failed',
        description: 'Please copy the text manually.',
        type: 'error',
      });
    }
  };

  const handleTestInNewTab = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Copy the filled prompt so it's ready in clipboard
    await handleCopy();
    window.open(platformInfo.url, '_blank', 'noopener,noreferrer');
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = !isLiked;
    setLocalLikes((l) => Math.max(0, l + (newLiked ? 1 : -1)));
    const liked = await toggleLike(prompt);
    addToast({
      title: liked ? 'Prompt Upvoted!' : 'Upvote Removed',
      type: 'info',
    });
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = await toggleBookmark(prompt.id);
    addToast({
      title: saved ? 'Saved to Bookmarks' : 'Removed from Bookmarks',
      type: 'info',
    });
  };

  // Render text highlighting bracket variables
  const renderHighlightedPreview = (text: string) => {
    const parts = text.split(/(\[.*?\])/g);
    return parts.slice(0, 15).map((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const key = part.slice(1, -1);
        const replaced = paramValues[key];
        return (
          <span
            key={index}
            className="inline-block px-1.5 py-0.5 mx-0.5 rounded font-mono text-[11px] font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
          >
            {replaced || part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      id={`prompt-card-${prompt.id}`}
      className="group relative flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#131b2e]/90 to-[#0d1322]/95 border border-slate-800/90 hover:border-cyan-500/40 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.12)] p-5 backdrop-blur-md"
    >
      <div>
        {/* Header Badges & Actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Platform Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${platformInfo.color}`}
            >
              <Sparkles className="w-3 h-3" />
              {platformInfo.name}
            </span>

            {/* Category Tag */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-900/80 border border-slate-800">
              <Tag className="w-3 h-3 text-slate-500" />
              {prompt.category}
            </span>

            {/* Product Badge */}
            {(prompt.isProduct || prompt.category === 'Product') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-amber-300 bg-amber-950/80 border border-amber-500/40 shadow-sm shadow-amber-500/20">
                <Box className="w-3 h-3 text-amber-400" />
                Product
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Bookmark Button */}
            <button
              id={`bookmark-btn-${prompt.id}`}
              onClick={handleBookmarkClick}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Bookmark'}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isBookmarked
                  ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-cyan-400' : ''}`} />
            </button>

            {/* Owner or Admin Dropdown Menu */}
            {isOwnerOrAdmin && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-8 z-30 w-36 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 text-xs"
                  >
                    {onEdit && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onEdit(prompt);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-cyan-400" />
                        Edit Prompt
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onDelete(prompt.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        Delete Prompt
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image Preview Banner if uploaded */}
        {prompt.imageUrl && (
          <div
            onClick={() => onOpenDetail && onOpenDetail(prompt)}
            className="relative mb-3.5 rounded-xl overflow-hidden border border-cyan-500/25 bg-slate-950 group/cardimg cursor-pointer max-h-52"
          >
            <img
              src={prompt.imageUrl}
              alt={prompt.title}
              className="w-full h-44 sm:h-48 object-cover group-hover/cardimg:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // If broken link, gracefully hide container
                (e.target as HTMLElement).parentElement?.classList.add('hidden');
              }}
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-cyan-500/30 text-[10px] font-semibold text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Attached Output
            </div>
          </div>
        )}

        {/* Title */}
        <h3
          onClick={() => onOpenDetail && onOpenDetail(prompt)}
          className="text-base font-bold text-white leading-snug tracking-tight mb-2 hover:text-cyan-300 cursor-pointer transition-colors"
        >
          {prompt.title}
        </h3>

        {/* Expected Output / Capabilities preview */}
        <div className="mb-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-cyan-400 uppercase tracking-wider text-[10px] block mb-0.5">
            Expected Output
          </span>
          <p className="line-clamp-2">{prompt.outputDescription}</p>
        </div>

        {/* External Reference Link & PDF Attachment Downloads */}
        {(prompt.externalLink || prompt.pdfUrl) && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {prompt.pdfUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadPdfFile(prompt.pdfUrl!, prompt.pdfName || `${prompt.title}_guide.pdf`);
                  addToast({
                    title: 'Downloading Document',
                    description: `Downloading ${prompt.pdfName || 'attached PDF file'}`,
                    type: 'info',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/90 border border-indigo-500/40 text-indigo-300 hover:text-white text-[11px] font-medium transition cursor-pointer group/pdf shadow-sm shadow-indigo-500/10"
                title="Download attached PDF document"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400 group-hover/pdf:scale-110 transition-transform" />
                <span className="truncate max-w-[150px]">{prompt.pdfName || 'PDF Guide'}</span>
                <Download className="w-3 h-3 text-indigo-400 ml-0.5" />
              </button>
            )}

            {prompt.externalLink && (
              <a
                href={prompt.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 hover:text-white text-[11px] font-medium transition group/extlink"
              >
                <ExternalLink className="w-3 h-3 text-cyan-400 group-hover/extlink:scale-110 transition-transform" />
                <span className="truncate max-w-[180px]">Live Reference / Demo</span>
              </a>
            )}
          </div>
        )}

        {/* Prompt Preview Code Box */}
        <div className="relative mb-3.5 rounded-xl bg-[#090d16] border border-slate-800/90 p-3 font-mono text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto">
          <div className="whitespace-pre-wrap">{renderHighlightedPreview(prompt.promptText)}</div>
        </div>

        {/* Interactive Parameter Filler (if [variables] exist) */}
        {parameters.length > 0 && (
          <div className="mb-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 p-3">
            <button
              onClick={() => setShowParameters(!showParameters)}
              className="w-full flex items-center justify-between text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Customize {parameters.length} Variable{parameters.length > 1 ? 's' : ''}
              </span>
              {showParameters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showParameters && (
              <div className="mt-3 space-y-2 pt-2 border-t border-cyan-500/20 animate-in fade-in duration-200">
                <p className="text-[11px] text-slate-400">
                  Fill in parameters before copying to inject your values automatically:
                </p>
                {parameters.map((param) => (
                  <div key={param} className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-cyan-200 uppercase tracking-wider">
                      [{param}]
                    </label>
                    <input
                      type="text"
                      value={paramValues[param] || ''}
                      onChange={(e) =>
                        setParamValues((prev) => ({ ...prev, [param]: e.target.value }))
                      }
                      placeholder={`Enter ${param}...`}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-lg text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {prompt.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Meta & Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-3">
        {/* Creator and Stats */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 truncate max-w-[150px]">
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate font-medium text-slate-300">
              @{prompt.authorUsername || 'anon'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Copy Counter */}
            <span
              title="Times copied"
              className="flex items-center gap-1 text-[11px] text-slate-400"
            >
              <Copy className="w-3 h-3 text-slate-500" />
              {localCopies}
            </span>

            {/* Like Counter & Button */}
            <button
              onClick={handleLikeClick}
              className={`flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                isLiked ? 'text-rose-400' : 'text-slate-400 hover:text-rose-400'
              }`}
              title={isLiked ? 'Unlike' : 'Upvote prompt'}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              {localLikes}
            </button>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* One-Click Copy */}
          <button
            id={`copy-btn-${prompt.id}`}
            onClick={handleCopy}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 hover:border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                Copy Prompt
              </>
            )}
          </button>

          {/* One-Click Test on Platform */}
          <button
            onClick={handleTestInNewTab}
            title={`Copy & test immediately on ${prompt.targetPlatform}`}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 font-semibold text-xs transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">Test on {prompt.targetPlatform.split(' ')[0]}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

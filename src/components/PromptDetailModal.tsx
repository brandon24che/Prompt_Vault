import React, { useState, useEffect, useMemo } from 'react';
import { Prompt } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Heart,
  Bookmark,
  Sparkles,
  Tag,
  User,
  Sliders,
  Calendar,
  FileText,
  Download,
  Box,
} from 'lucide-react';
import { downloadPdfFile } from '../utils/promptUtils';

interface PromptDetailModalProps {
  prompt: Prompt | null;
  onClose: () => void;
}

export const PromptDetailModal: React.FC<PromptDetailModalProps> = ({ prompt, onClose }) => {
  const { bookmarks, likes, toggleBookmark, toggleLike, recordCopy } = useAuth();
  const { addToast } = useToast();

  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [localCopies, setLocalCopies] = useState(0);
  const [localLikes, setLocalLikes] = useState(0);

  useEffect(() => {
    if (prompt) {
      setLocalCopies(prompt.copiesCount || 0);
      setLocalLikes(prompt.likesCount || 0);
    }
  }, [prompt]);

  if (!prompt) return null;

  const isBookmarked = bookmarks.has(prompt.id);
  const isLiked = likes.has(prompt.id);

  // Extract variables
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

  // Replace variables
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

  const handleCopy = async () => {
    try {
      setLocalCopies((c) => c + 1);
      await navigator.clipboard.writeText(computedPromptText);
      await recordCopy(prompt.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);

      addToast({
        title: 'Prompt Copied to Clipboard!',
        description: `Ready to paste into ${prompt.targetPlatform}.`,
        type: 'success',
      });
    } catch {
      addToast({
        title: 'Copy Failed',
        description: 'Please copy manually.',
        type: 'error',
      });
    }
  };

  const handleLikeToggle = async () => {
    const newLiked = !isLiked;
    setLocalLikes((l) => Math.max(0, l + (newLiked ? 1 : -1)));
    const liked = await toggleLike(prompt);
    addToast({
      title: liked ? 'Prompt Upvoted!' : 'Upvote Removed',
      type: 'info',
    });
  };

  const getPlatformUrl = () => {
    switch (prompt.targetPlatform) {
      case 'ChatGPT':
        return 'https://chatgpt.com';
      case 'Claude':
        return 'https://claude.ai';
      case 'Gemini':
        return 'https://gemini.google.com';
      case 'Midjourney':
        return 'https://www.midjourney.com';
      case 'Stable Diffusion':
        return 'https://stablediffusionweb.com';
      default:
        return 'https://chatgpt.com';
    }
  };

  const handleLaunch = async () => {
    await handleCopy();
    window.open(getPlatformUrl(), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-6">
      <div className="min-h-full flex items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="relative w-full max-w-3xl bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.18)] text-slate-100 p-5 sm:p-8">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
            {prompt.targetPlatform}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-400">
            {prompt.category}
          </span>
          {(prompt.isProduct || prompt.category === 'Product') && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300 flex items-center gap-1 shadow-sm shadow-amber-500/20">
              <Box className="w-3 h-3 text-amber-400" /> Product Template
            </span>
          )}
          {prompt.isFeatured && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Featured
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">
          {prompt.title}
        </h2>

        {/* Author info */}
        <div className="flex items-center gap-4 text-xs text-slate-400 mb-6">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>by @{prompt.authorUsername || 'anon'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-300">{localCopies} copies</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold text-rose-300">{localLikes} upvotes</span>
          </div>
        </div>

        {/* Uploaded Image Showcase if present */}
        {prompt.imageUrl && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950">
            <div className="relative group/modalimg">
              <img
                src={prompt.imageUrl}
                alt={prompt.title}
                className="w-full max-h-96 object-contain bg-black/60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-cyan-500/30 text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Verified Output Sample
              </div>
              <a
                href={prompt.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black backdrop-blur-md border border-white/15 text-xs text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Full Size
              </a>
            </div>
          </div>
        )}

        {/* Attached PDF Document (Direct Download) */}
        {prompt.pdfUrl && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 flex items-center justify-between gap-4 shadow-lg shadow-indigo-950/40">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2.5 rounded-lg bg-indigo-950/80 border border-indigo-500/50 text-indigo-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {prompt.pdfName || 'Attached PDF Document'}
                </p>
                <p className="text-[11px] text-indigo-300">
                  {prompt.pdfSize ? `${(prompt.pdfSize / 1024).toFixed(0)} KB • ` : ''}Official Prompt Guide / Blueprint
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                downloadPdfFile(prompt.pdfUrl!, prompt.pdfName || `${prompt.title}_guide.pdf`);
                addToast({
                  title: 'Downloading Document',
                  description: `Downloading ${prompt.pdfName || 'attached PDF file'}`,
                  type: 'info',
                });
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>
        )}

        {/* External Reference / Live Output Link if present */}
        {prompt.externalLink && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shrink-0">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white">Reference & Live Output Resource</p>
                <p className="text-[11px] text-slate-400 truncate">{prompt.externalLink}</p>
              </div>
            </div>
            <a
              href={prompt.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Visit Link
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Expected Output */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
            Expected Capabilities & Output
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {prompt.outputDescription}
          </p>
        </div>

        {/* Interactive Parameter Filler if any */}
        {parameters.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Interactive Parameters ({parameters.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parameters.map((param) => (
                <div key={param} className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono text-cyan-200">[{param}]</label>
                  <input
                    type="text"
                    value={paramValues[param] || ''}
                    onChange={(e) =>
                      setParamValues((prev) => ({ ...prev, [param]: e.target.value }))
                    }
                    placeholder={`Insert ${param}...`}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-lg text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Prompt Text Block */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Prompt Instructions
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              {computedPromptText.length} characters
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
            {computedPromptText}
          </div>
        </div>

        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {prompt.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 text-slate-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isLiked
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400' : ''}`} />
              {isLiked ? 'Upvoted' : 'Upvote'} ({localLikes})
            </button>

            <button
              onClick={() => toggleBookmark(prompt.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isBookmarked
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-cyan-400' : ''}`} />
              {isBookmarked ? 'Saved' : 'Save'}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Prompt'}
            </button>

            <button
              onClick={handleLaunch}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Copy & Launch {prompt.targetPlatform.split(' ')[0]}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

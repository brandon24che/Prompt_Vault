import React, { useState, useEffect, useRef } from 'react';
import { Prompt, AIPlatform, PromptCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  X,
  Sparkles,
  Plus,
  Tag,
  Layers,
  FileText,
  HelpCircle,
  Eye,
  Edit3,
  Image as ImageIcon,
  UploadCloud,
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  Download,
  Box,
  AlertCircle,
  Type,
} from 'lucide-react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  compressImageFile,
  readPdfFileAsDataUrl,
  downloadPdfFile,
} from '../utils/promptUtils';

interface PromptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPrompt?: Prompt | null;
  onSaved?: () => void;
}

const CATEGORIES: PromptCategory[] = [
  'Coding',
  'Writing',
  'Image Gen',
  'Business',
  'Product',
  'Productivity',
  'Research',
  'Other',
];

const PLATFORMS: AIPlatform[] = [
  'ChatGPT',
  'Claude',
  'Gemini',
  'Midjourney',
  'Stable Diffusion',
];

const QUICK_VARIABLES = [
  '[topic]',
  '[tone]',
  '[target audience]',
  '[programming language]',
  '[constraints]',
  '[camera lens]',
  '[aspect ratio]',
];

export const PromptFormModal: React.FC<PromptFormModalProps> = ({
  isOpen,
  onClose,
  editingPrompt,
  onSaved,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { addToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PromptCategory>('Coding');
  const [targetPlatform, setTargetPlatform] = useState<AIPlatform>('ChatGPT');
  const [promptText, setPromptText] = useState('');
  const [outputDescription, setOutputDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  // Product Prompt Mode
  const [isProduct, setIsProduct] = useState(false);

  // PDF Document Attachment State
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [pdfSize, setPdfSize] = useState<number | undefined>(undefined);
  const [pdfInputMode, setPdfInputMode] = useState<'upload' | 'url'>('upload');
  const [pdfUrlInput, setPdfUrlInput] = useState('');
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [isReadingPdf, setIsReadingPdf] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingPrompt) {
      setTitle(editingPrompt.title);
      setCategory(editingPrompt.category);
      setTargetPlatform(editingPrompt.targetPlatform);
      setPromptText(editingPrompt.promptText);
      setOutputDescription(editingPrompt.outputDescription);
      setTagsInput(editingPrompt.tags ? editingPrompt.tags.join(', ') : '');
      setImageUrl(editingPrompt.imageUrl || '');
      setExternalLink(editingPrompt.externalLink || '');
      setIsProduct(Boolean(editingPrompt.isProduct || editingPrompt.category === 'Product'));
      setPdfUrl(editingPrompt.pdfUrl || '');
      setPdfName(editingPrompt.pdfName || '');
      setPdfSize(editingPrompt.pdfSize);

      if (editingPrompt.imageUrl && !editingPrompt.imageUrl.startsWith('data:')) {
        setImageInputMode('url');
      } else {
        setImageInputMode('upload');
      }

      if (editingPrompt.pdfUrl && !editingPrompt.pdfUrl.startsWith('data:')) {
        setPdfInputMode('url');
      } else {
        setPdfInputMode('upload');
      }
    } else {
      setTitle('');
      setCategory('Coding');
      setTargetPlatform('ChatGPT');
      setPromptText('');
      setOutputDescription('');
      setTagsInput('');
      setImageUrl('');
      setExternalLink('');
      setIsProduct(false);
      setPdfUrl('');
      setPdfName('');
      setPdfSize(undefined);
      setImageInputMode('upload');
      setPdfInputMode('upload');
      setPdfUrlInput('');
    }
    setErrorMsg(null);
  }, [editingPrompt, isOpen]);

  const handlePdfFileSelect = async (file: File) => {
    setIsReadingPdf(true);
    setErrorMsg(null);
    try {
      const result = await readPdfFileAsDataUrl(file);
      setPdfUrl(result.dataUrl);
      setPdfName(result.name);
      setPdfSize(result.size);
      addToast({
        title: 'PDF Attached',
        description: `${result.name} (${(result.size / 1024).toFixed(0)} KB) ready for download.`,
        type: 'info',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process PDF file.';
      setErrorMsg(msg);
    } finally {
      setIsReadingPdf(false);
    }
  };

  const isProductMode = isProduct || category === 'Product';

  if (!isOpen) return null;

  const handleInsertVariable = (variable: string) => {
    setPromptText((prev) => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + variable);
  };

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP, etc.)');
      return;
    }

    setIsCompressingImage(true);
    setErrorMsg(null);
    try {
      const compressedDataUrl = await compressImageFile(file, 1000, 0.82);
      setImageUrl(compressedDataUrl);
      addToast({
        title: 'Image Attached',
        description: `${file.name} compressed and ready to save.`,
        type: 'info',
      });
    } catch (err: unknown) {
      console.error('Image compression error:', err);
      setErrorMsg('Failed to process image. Please try another image.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      setErrorMsg('You must be signed in to publish a prompt.');
      return;
    }

    if (userProfile?.isSuspended) {
      setErrorMsg(`Account Suspended: ${userProfile.suspendedReason || 'Administrative hold'}. You cannot publish or modify prompts.`);
      return;
    }

    if (!promptText.trim()) {
      setErrorMsg('Please enter your prompt text in "The Actual Prompt Text" field.');
      return;
    }

    // Auto-generate a smart title if user didn't specify one
    const effectiveTitle =
      title.trim() ||
      promptText
        .trim()
        .split('\n')[0]
        .replace(/[#*`_[\]:]/g, '')
        .trim()
        .slice(0, 60) ||
      'AI Prompt Template';

    if (externalLink.trim() && !/^https?:\/\//i.test(externalLink.trim())) {
      setErrorMsg('External link must begin with http:// or https://');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter((t) => t.length > 0)
        .slice(0, 10);

      const username =
        userProfile?.username || currentUser.displayName || currentUser.email?.split('@')[0] || 'PromptSmith';

      const cleanedDescription =
        outputDescription.trim() || effectiveTitle;
      const cleanedImageUrl = imageUrl.trim() || undefined;
      const cleanedExternalLink = externalLink.trim() || undefined;
      const cleanedPdfUrl = pdfUrl.trim() || undefined;
      const cleanedPdfName = pdfName.trim() || undefined;

      if (editingPrompt) {
        const promptRef = doc(db, 'prompts', editingPrompt.id);
        const updatePayload: Partial<Prompt> = {
          title: effectiveTitle,
          category,
          targetPlatform,
          promptText: promptText.trim(),
          outputDescription: cleanedDescription,
          tags: parsedTags,
          imageUrl: cleanedImageUrl,
          externalLink: cleanedExternalLink,
          pdfUrl: cleanedPdfUrl,
          pdfName: cleanedPdfName,
          pdfSize: pdfSize || undefined,
          isProduct: isProductMode,
          updatedAt: new Date().toISOString(),
        };
        await updateDoc(promptRef, updatePayload);

        addToast({
          title: 'Prompt Updated!',
          description: 'Your changes and attachments have been saved.',
          type: 'success',
        });
      } else {
        const newId = 'prompt_' + Math.random().toString(36).substring(2, 11);
        const promptRef = doc(db, 'prompts', newId);

        const newPrompt: Prompt = {
          id: newId,
          title: effectiveTitle,
          category,
          targetPlatform,
          promptText: promptText.trim(),
          outputDescription: cleanedDescription,
          tags: parsedTags,
          imageUrl: cleanedImageUrl,
          externalLink: cleanedExternalLink,
          pdfUrl: cleanedPdfUrl,
          pdfName: cleanedPdfName,
          pdfSize: pdfSize || undefined,
          isProduct: isProductMode,
          authorId: currentUser.uid,
          authorUsername: username,
          authorEmail: currentUser.email || '',
          likesCount: 0,
          copiesCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(promptRef, newPrompt);

        addToast({
          title: 'Prompt Published Successfully!',
          description: isProductMode
            ? 'Your customizable product prompt and documents are live in the vault.'
            : 'Your prompt and attachments are live for the community to discover.',
          type: 'success',
        });
      }

      onClose();
      if (onSaved) onSaved();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, 'prompts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-6">
      <div className="min-h-full flex items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="relative w-full max-w-2xl bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] text-slate-100 p-5 sm:p-8">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              {editingPrompt ? <Edit3 className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {editingPrompt ? 'Edit Prompt' : 'Upload New AI Prompt'}
              </h2>
              <p className="text-xs text-slate-400">
                Share your prompt, attach sample output imagery from your device, and link to resources.
              </p>
            </div>
          </div>

          {userProfile?.isSuspended && (
            <div className="my-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Account Suspended</span>
                Your account is currently under administrative suspension ({userProfile.suspendedReason || 'Administrative hold'}). Publishing or editing prompts is disabled.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="my-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-6">
            {/* 1. PROMPT TITLE - HIGH VISIBILITY AT TOP */}
            <div className="p-4 rounded-xl bg-slate-900 border-2 border-cyan-500/50 shadow-md shadow-cyan-500/10">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="prompt-title-field" className="text-xs font-bold text-white flex items-center gap-2">
                  <div className="p-1 rounded bg-cyan-500/20 text-cyan-400">
                    <Type className="w-3.5 h-3.5" />
                  </div>
                  <span>Prompt Title (Name of your prompt)</span>
                </label>
                {promptText.trim().length > 0 && !title.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const candidate = promptText.trim().split('\n')[0].replace(/[#*`_[\]:]/g, '').trim().slice(0, 50);
                      if (candidate) setTitle(candidate);
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-fill from prompt
                  </button>
                )}
              </div>
              <input
                id="prompt-title-field"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Full-Stack Architect Review (or leave blank to auto-name)"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl text-sm font-medium text-white placeholder-slate-500 outline-none transition"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                <span>Give your prompt a clear name, or leave blank to automatically name it from your prompt text.</span>
                <span className="text-[10px] text-cyan-400/80 font-mono">Auto-named if blank</span>
              </p>
            </div>

            {/* Category & Platform Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Target AI Platform <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={targetPlatform}
                  onChange={(e) => setTargetPlatform(e.target.value as AIPlatform)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-xl text-sm text-white outline-none transition"
                >
                  {PLATFORMS.map((plat) => (
                    <option key={plat} value={plat} className="bg-slate-900 text-white">
                      {plat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Category <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const val = e.target.value as PromptCategory;
                    setCategory(val);
                    if (val === 'Product') {
                      setIsProduct(true);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-xl text-sm text-white outline-none transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PRODUCT PROMPT MODE TOGGLE */}
            <div
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isProductMode
                  ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isProductMode
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white">
                    Mark as Product / Monetized Template
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Adds product badges for marketplace templates (dynamic brackets optional).
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isProductMode}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsProduct(checked);
                    if (checked && category !== 'Product') {
                      setCategory('Product');
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

          {/* Prompt Text with Quick Variables (OPTIONAL) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span>The Actual Prompt Text</span> <span className="text-cyan-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Variables optional e.g. <span className="font-mono text-cyan-300">[topic]</span>
              </span>
            </div>

            {/* Quick Variable Chips Bar - COMPLETELY OPTIONAL */}
            <div className="p-3 rounded-xl mb-2 bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-medium flex items-center gap-1.5 text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Optional Dynamic Variables (Click to insert):
                </span>
                <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  Optional
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className="px-2.5 py-1 rounded-lg font-mono text-[11px] font-medium bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-100 border border-cyan-500/30 hover:border-cyan-400/60 transition cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    + {v}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={5}
              placeholder="Act as an expert. Review this code and provide refactoring suggestions..."
              className="w-full px-3.5 py-2.5 bg-slate-900 font-mono text-xs border border-slate-700/80 focus:border-cyan-400 rounded-xl text-white placeholder-slate-500 outline-none transition leading-relaxed"
            />
          </div>

          {/* Output Description / What it does (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Description of Output / Capabilities <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
            </div>
            <textarea
              value={outputDescription}
              onChange={(e) => setOutputDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of what output this prompt generates (optional)..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* IMAGE UPLOAD SECTION (Device Upload & Link) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                Prompt Output Image / Visual Asset (Optional)
              </label>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageInputMode('upload')}
                  className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                    imageInputMode === 'upload'
                      ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  From Device
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('url')}
                  className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                    imageInputMode === 'url'
                      ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {/* Mode 1: Device Upload (Drag & Drop + Click to Browse) */}
            {imageInputMode === 'upload' && !imageUrl && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'border-slate-700 hover:border-cyan-500/50 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {isCompressingImage ? 'Processing & optimizing image...' : 'Click to browse or drag & drop image'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      PNG, JPG, WebP, GIF from your computer or phone (auto-optimized)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Direct Image URL */}
            {imageInputMode === 'url' && !imageUrl && (
              <div>
                <div className="relative">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or https://i.imgur.com/..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Paste a direct link to an image generated by Midjourney, DALL-E, Stable Diffusion, or stored online.
                </p>
              </div>
            )}

            {/* Preview of Selected/Pasted Image */}
            {imageUrl && (
              <div className="relative p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt="Prompt output preview"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0 bg-slate-900"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setErrorMsg('Failed to load image from URL. Please check the link.');
                    }}
                  />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">Image Attached</p>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                      Ready to publish with prompt
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 text-xs font-semibold transition cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* PDF DOCUMENT ATTACHMENT SECTION (Upload from Device / Web URL & Download) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Prompt Document / PDF Guide (Optional)
              </label>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPdfInputMode('upload')}
                  className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                    pdfInputMode === 'upload'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  From Device
                </button>
                <button
                  type="button"
                  onClick={() => setPdfInputMode('url')}
                  className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                    pdfInputMode === 'url'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  PDF URL
                </button>
              </div>
            </div>

            {/* Mode 1: Device Upload (Drag & Drop + Click to Browse) */}
            {pdfInputMode === 'upload' && !pdfUrl && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingPdf(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDraggingPdf(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setIsDraggingPdf(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const f = e.dataTransfer.files[0];
                    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
                      await handlePdfFileSelect(f);
                    } else {
                      setErrorMsg('Only PDF documents are supported for file attachments.');
                    }
                  }
                }}
                onClick={() => pdfFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDraggingPdf
                    ? 'border-indigo-400 bg-indigo-950/40 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                    : 'border-slate-700 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={pdfFileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      await handlePdfFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {isReadingPdf ? 'Reading & preparing PDF file...' : 'Click to upload PDF or drag & drop'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Attach cheat sheets, guidelines, product blueprints, or documentation (up to 900KB)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: External PDF URL */}
            {pdfInputMode === 'url' && !pdfUrl && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="url"
                    value={pdfUrlInput}
                    onChange={(e) => setPdfUrlInput(e.target.value)}
                    placeholder="https://example.com/document.pdf"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!pdfUrlInput.trim()) {
                      setErrorMsg('Please enter a valid PDF URL.');
                      return;
                    }
                    setPdfUrl(pdfUrlInput.trim());
                    const name = pdfUrlInput.split('/').pop()?.split('?')[0] || 'document.pdf';
                    setPdfName(name.endsWith('.pdf') ? name : `${name}.pdf`);
                    setPdfUrlInput('');
                    addToast({
                      title: 'PDF Link Added',
                      description: 'External PDF link attached to prompt.',
                      type: 'info',
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Attach Link
                </button>
              </div>
            )}

            {/* Attached PDF Preview & Download Card */}
            {pdfUrl && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-indigo-500/30 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">
                      {pdfName || 'Attached Document.pdf'}
                    </p>
                    <p className="text-[11px] text-indigo-400 flex items-center gap-1">
                      {pdfSize ? `${(pdfSize / 1024).toFixed(0)} KB • ` : ''}Ready for user download
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadPdfFile(pdfUrl, pdfName || 'prompt_guide.pdf')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-medium transition cursor-pointer"
                    title="Test Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfUrl('');
                      setPdfName('');
                      setPdfSize(undefined);
                      if (pdfFileInputRef.current) pdfFileInputRef.current.value = '';
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 text-xs font-semibold transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* EXTERNAL REFERENCE / OUTPUT LINK */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              Reference Link / Live Output URL (Optional)
            </label>
            <input
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="e.g. https://chatgpt.com/share/... or https://github.com/..."
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Add a link to a shared conversation, live demo, documentation, or model repository.
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. coding, typescript, optimization, clean-architecture"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 focus:border-cyan-400 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Error message above footer if any */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressingImage || isReadingPdf || Boolean(userProfile?.isSuspended)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSubmitting
                ? 'Saving...'
                : editingPrompt
                ? 'Save Changes'
                : 'Publish to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
};

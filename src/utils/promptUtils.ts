import { Prompt } from '../types';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const SAMPLE_TITLES = new Set([
  'Senior Software Architect Code Review & Refactoring',
  'Photorealistic Cinematic 8K Midjourney Concept Art',
  'High-Converting B2B SaaS Value Proposition & Landing Copy',
  'Deep Research & Multi-Perspective Synthesis Matrix',
  'Executive Pitch Deck Narrative & Investor Q&A Simulator',
  'Stable Diffusion LoRA Master Texture & Fantasy Art',
  'Autonomous System Prompt / Metaprompt Optimizer',
  'Senior Full-Stack Code Reviewer & Architect',
  'Midjourney Cinematic Sci-Fi Landscape (v6)',
  'Executive B2B Cold Outreach Sequence',
  'Academic Paper Deep Explainer',
  'High-Converting Landing Page Copywriter',
  'Python Algorithm Profiler & Memory Optimizer',
]);

const SAMPLE_USERNAMES = new Set([
  'CyberArchitect',
  'PixelAlchemist',
  'GrowthHacker',
  'AeroResearch',
  'VentureMind',
  'DiffusionArtisan',
  'PromptGod',
  'PromptSmith',
]);

/**
 * Identifies if a prompt is a sample / placeholder prompt
 * rather than a prompt authored by a real user.
 */
export function isSamplePrompt(prompt: Prompt): boolean {
  if (!prompt) return false;
  if (prompt.isSample) return true;
  if (prompt.authorId === 'system-seed') return true;
  if (
    prompt.id.startsWith('prompt_init_') ||
    prompt.id.startsWith('seed_') ||
    prompt.id.startsWith('fallback_')
  ) {
    return true;
  }
  if (SAMPLE_TITLES.has(prompt.title)) {
    return true;
  }
  if (SAMPLE_USERNAMES.has(prompt.authorUsername) && (!prompt.authorEmail || prompt.authorEmail === '')) {
    return true;
  }
  return false;
}

/**
 * Purges any sample / template prompts directly from the Firestore prompts collection
 * so only real user prompts remain in the database.
 */
export async function purgeSamplePromptsFromFirestore(): Promise<number> {
  try {
    const colRef = collection(db, 'prompts');
    const snapshot = await getDocs(colRef);
    let count = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Prompt;
      const promptObj = { ...data, id: docSnap.id };

      if (isSamplePrompt(promptObj)) {
        try {
          await deleteDoc(doc(db, 'prompts', docSnap.id));
          count++;
          console.log(`[PromptVault] Removed sample prompt: ${docSnap.id} - "${data.title}"`);
        } catch (err) {
          console.warn(`[PromptVault] Could not delete sample doc ${docSnap.id}:`, err);
        }
      }
    }
    return count;
  } catch (err) {
    console.warn('[PromptVault] Error checking/purging sample prompts from Firestore:', err);
    return 0;
  }
}

/**
 * Compresses an image file from the user's device to a lightweight base64 Data URL
 * suitable for instant storage, avoiding external storage bucket complexity or CORS issues.
 */
export function compressImageFile(file: File, maxDimension = 1000, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context could not be initialized.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP with JPEG fallback
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export interface PdfUploadResult {
  dataUrl: string;
  name: string;
  size: number;
}

/**
 * Reads a PDF file from the device into a base64 Data URL for attachment.
 * Validates file type and size to keep document storage within reliable bounds.
 */
export function readPdfFileAsDataUrl(file: File, maxSizeBytes = 900 * 1024): Promise<PdfUploadResult> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      reject(new Error('Selected file must be a PDF document (.pdf).'));
      return;
    }

    if (file.size > maxSizeBytes) {
      const sizeKb = Math.round(file.size / 1024);
      const limitKb = Math.round(maxSizeBytes / 1024);
      reject(new Error(`PDF file is ${sizeKb} KB. Please select a PDF under ${limitKb} KB for direct storage, or use a PDF link.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: reader.result as string,
        name: file.name,
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read PDF file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Downloads a PDF file from either a base64 Data URL or an external link.
 */
export function downloadPdfFile(url: string, filename = 'document.pdf'): void {
  try {
    const cleanName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

    // Handle base64 Data URLs via Blob for robust cross-browser download
    if (url.startsWith('data:application/pdf;base64,') || url.startsWith('data:application/octet-stream;base64,')) {
      const base64Data = url.split(',')[1];
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      return;
    }

    // Standard HTTP/HTTPS link
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('PDF download error:', err);
    window.open(url, '_blank');
  }
}

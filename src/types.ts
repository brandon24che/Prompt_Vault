export type AIPlatform = 'ChatGPT' | 'Claude' | 'Gemini' | 'Midjourney' | 'Stable Diffusion';

export type PromptCategory = 
  | 'Coding'
  | 'Writing'
  | 'Image Gen'
  | 'Business'
  | 'Product'
  | 'Productivity'
  | 'Research'
  | 'Other';

export interface Prompt {
  id: string;
  title: string;
  category: PromptCategory;
  targetPlatform: AIPlatform;
  promptText: string;
  outputDescription: string;
  tags: string[];
  authorId: string;
  authorUsername: string;
  authorEmail?: string;
  imageUrl?: string;
  externalLink?: string;
  pdfUrl?: string;
  pdfName?: string;
  pdfSize?: number;
  isProduct?: boolean;
  likesCount: number;
  copiesCount: number;
  isFeatured?: boolean;
  isSample?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
  photoURL?: string;
  isSuspended?: boolean;
  suspendedReason?: string;
  promptsCount?: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'error' | 'warning';
}

export type ActiveTab = 'explore' | 'my-prompts' | 'saved' | 'admin' | 'create';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { X, Lock, Mail, User as UserIcon, Sparkles, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    showAuthModal,
    setShowAuthModal,
    authModalMode,
    setAuthModalMode,
    signInWithGoogle,
    loginWithEmail,
    signupWithEmail,
  } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!showAuthModal) return null;

  const isLogin = authModalMode === 'login';

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      addToast({
        title: 'Welcome to PromptVault!',
        description: 'Successfully signed in with Google.',
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (!isLogin && !username) {
      setErrorMsg('Please provide a username for your profile.');
      return;
    }
    if (!isLogin && password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        addToast({
          title: 'Welcome back!',
          description: `Logged in as ${email}`,
          type: 'success',
        });
      } else {
        await signupWithEmail(email, password, username);
        addToast({
          title: 'Account created!',
          description: `Welcome to the community, @${username}!`,
          type: 'success',
        });
      }
    } catch (err: unknown) {
      let message = 'Authentication failed. Please check your credentials.';
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/wrong-password')) {
          message = 'Invalid email or password.';
        } else if (err.message.includes('auth/email-already-in-use')) {
          message = 'This email is already registered. Please sign in instead.';
        } else if (err.message.includes('auth/weak-password')) {
          message = 'Password is too weak. Please use at least 6 characters.';
        } else if (err.message.includes('auth/operation-not-allowed')) {
          message = 'Email/Password sign-in is not enabled in Firebase console. Please use Google Sign-In!';
        } else {
          message = err.message;
        }
      }
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#0f172a]/95 border border-cyan-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={() => setShowAuthModal(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isLogin ? 'Sign In to PromptVault' : 'Join PromptVault'}
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          {isLogin
            ? 'Unlock the full prompt repository, bookmark favorites, and publish your own AI prompts.'
            : 'Create your account to start curating, parameterizing, and sharing prompts.'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm transition-all duration-200 shadow-md shadow-white/5 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative bg-[#0f172a] px-3 text-xs uppercase tracking-wider text-slate-500">
            or use email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username / Display Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. PromptNinja"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-cyan-500/25 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting
              ? 'Authenticating...'
              : isLogin
              ? 'Sign In with Email'
              : 'Create Account'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400">
          {isLogin ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signup');
                  setErrorMsg(null);
                }}
                className="text-cyan-400 hover:underline font-semibold cursor-pointer"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setErrorMsg(null);
                }}
                className="text-cyan-400 hover:underline font-semibold cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

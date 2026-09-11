import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              toast.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-100 shadow-rose-950/50'
                : toast.type === 'info'
                ? 'bg-sky-950/80 border-sky-500/40 text-sky-100 shadow-sky-950/50'
                : 'bg-[#0f172a]/90 border-cyan-500/40 text-cyan-50 shadow-cyan-950/60'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : toast.type === 'info' ? (
                <Info className="w-5 h-5 text-sky-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight text-white">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-1"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

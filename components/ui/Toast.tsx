'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: ToastItem[];
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 left-4 z-[100] flex flex-col gap-2 sm:bottom-6 sm:right-6 sm:left-auto sm:w-80 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2 w-full sm:w-auto max-w-sm ${
              t.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : t.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                t.type === 'success'
                  ? 'bg-emerald-500'
                  : t.type === 'error'
                    ? 'bg-red-500'
                    : 'bg-slate-400'
              }`}
            />
            <p className="flex-1 text-sm font-medium break-words">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-current opacity-50 transition hover:opacity-100 shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

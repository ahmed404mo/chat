"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const icons = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div
        className="fixed pointer-events-none"
        style={{
          top: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 360,
        }}
      >
        {toasts.map((toast, i) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-2xl border"
            style={{
              background: `var(--toast-${toast.type}-bg)`,
              borderColor: `var(--toast-${toast.type}-border)`,
              animation: `toastSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
            onMouseEnter={() => {
              const el = document.getElementById(toast.id);
              if (el) el.style.animationPlayState = "paused";
            }}
            onMouseLeave={() => {
              const el = document.getElementById(toast.id);
              if (el) el.style.animationPlayState = "running";
            }}
          >
            <span
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: `var(--toast-${toast.type}-icon-bg)`,
                color: `var(--toast-${toast.type}-text)`,
              }}
            >
              {icons[toast.type]}
            </span>
            <span
              className="flex-1 text-sm font-medium"
              style={{ color: `var(--toast-${toast.type}-text)` }}
            >
              {toast.message}
            </span>
            <button
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center opacity-40 hover:opacity-70 transition-opacity"
              style={{
                background: `var(--toast-${toast.type}-icon-bg)`,
                color: `var(--toast-${toast.type}-text)`,
              }}
              onClick={() => removeToast(toast.id)}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

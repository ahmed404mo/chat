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
        className="fixed"
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
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2 px-3 py-2 shadow rounded-lg"
            style={{
              background:
                toast.type === "success"
                  ? "#d1fae5"
                  : toast.type === "error"
                    ? "#fee2e2"
                    : "#dbeafe",
              color:
                toast.type === "success"
                  ? "#065f46"
                  : toast.type === "error"
                    ? "#991b1b"
                    : "#1e40af",
              fontSize: "0.85rem",
              animation: "slideIn 0.25s ease",
              border: "1px solid",
              borderColor:
                toast.type === "success"
                  ? "#a7f3d0"
                  : toast.type === "error"
                    ? "#fecaca"
                    : "#bfdbfe",
            }}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              className="btn-close"
              style={{ fontSize: "0.6rem", opacity: 0.5 }}
              onClick={() => removeToast(toast.id)}
            />
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

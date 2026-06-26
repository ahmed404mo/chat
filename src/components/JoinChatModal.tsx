"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/context/SocketContext";
import { useToast } from "./ToastProvider";

interface JoinChatModalProps {
  open: boolean;
  onClose: () => void;
}

export default function JoinChatModal({ open, onClose }: JoinChatModalProps) {
  const { fetchConversations } = useChat();
  const { addToast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat/invite/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid invitation code");

      addToast("Successfully joined the conversation!", "success");
      // نضيف تأخير بسيط جداً لإعطاء فرصة للخادم لتحديث البيانات قبل أن نطلبها
      setTimeout(async () => {
        await fetchConversations();
        onClose();
      }, 200);
      setCode("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join chat");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && mounted && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md theme-dark:bg-white/5 bg-white/90 backdrop-blur-2xl border theme-dark:border-white/10 border-gray-200 rounded-t-[1.5rem] sm:rounded-[1.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b theme-dark:border-white/10 border-gray-200">
              <div className="font-semibold theme-dark:text-white text-gray-900">
                Join with Code
              </div>
              <button
                className="w-8 h-8 rounded-full theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 flex items-center justify-center theme-dark:text-gray-400 text-gray-500 theme-dark:hover:text-white hover:text-gray-900 theme-dark:hover:bg-white/10 hover:bg-gray-200 transition-all"
                onClick={onClose}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold theme-dark:text-gray-400 text-gray-500 uppercase tracking-wider mb-1.5">
                  Invitation Code
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 text-center font-mono text-lg theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:text-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:theme-dark:bg-white/10 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="Enter code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ letterSpacing: "0.15em" }}
                  maxLength={8}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  className="flex-1 py-2.5 text-sm font-medium theme-dark:text-white text-gray-700 theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:hover:bg-white/10 hover:bg-gray-200 transition-all"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  disabled={!code.trim() || loading}
                  onClick={handleJoin}
                >
                  {loading ? "Joining..." : "Join Chat"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

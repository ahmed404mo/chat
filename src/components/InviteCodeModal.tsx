"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/context/SocketContext";

interface InviteCodeModalProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
}

export default function InviteCodeModal({ open, onClose, conversationId }: InviteCodeModalProps) {
  const { generateInvite } = useChat();
  const [invite, setInvite] = useState<{
    code: string;
    inviteLink: string;
    expiresAt: string | null;
    maxUses: number;
  } | null>(null);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxUses, setMaxUses] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await generateInvite(conversationId, expiresInHours, maxUses);
      setInvite(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate invite");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md theme-dark:bg-white/5 bg-white/90 backdrop-blur-2xl border theme-dark:border-white/10 border-gray-200 rounded-t-[1.5rem] sm:rounded-[1.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b theme-dark:border-white/10 border-gray-200">
          <div className="font-semibold theme-dark:text-white text-gray-900">Generate Invitation Code</div>
          <button
            className="w-8 h-8 rounded-full theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 flex items-center justify-center theme-dark:text-gray-400 text-gray-500 theme-dark:hover:text-white hover:text-gray-900 theme-dark:hover:bg-white/10 hover:bg-gray-200 transition-all"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-3 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
              {error}
            </div>
          )}

          {!invite ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold theme-dark:text-gray-400 text-gray-500 uppercase tracking-wider mb-1.5">Expires In (hours)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl text-sm theme-dark:text-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:theme-dark:bg-white/10 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold theme-dark:text-gray-400 text-gray-500 uppercase tracking-wider mb-1.5">Max Uses</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl text-sm theme-dark:text-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:theme-dark:bg-white/10 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={maxUses}
                  onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                />
              </div>
              <button
                className="w-full py-2.5 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Code"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-2xl p-4 text-center">
                <div className="text-xs font-semibold theme-dark:text-gray-400 text-gray-500 uppercase tracking-wider mb-2">Invitation Code</div>
                <div
                  className="font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 cursor-pointer"
                  style={{ fontSize: "1.5rem", letterSpacing: "0.15em" }}
                  onClick={() => copyToClipboard(invite.code)}
                >
                  {invite.code}
                </div>
                <button
                  className="mt-2 text-xs px-4 py-1.5 font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-500 hover:to-purple-500 transition-all shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                  onClick={() => copyToClipboard(invite.code)}
                >
                  {copied ? "Copied!" : "Copy Code"}
                </button>
              </div>

              <div className="theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-2xl p-4">
                <div className="text-xs font-semibold theme-dark:text-gray-400 text-gray-500 uppercase tracking-wider mb-1">Share Link</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-1.5 text-sm theme-dark:bg-white/5 bg-white border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:text-gray-300 text-gray-600 focus:outline-none focus:border-blue-500/50"
                    value={invite.inviteLink}
                    readOnly
                  />
                  <button
                    className="px-3 py-1.5 text-xs font-medium theme-dark:text-white text-gray-700 theme-dark:bg-white/10 bg-gray-200 border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:hover:bg-white/20 hover:bg-gray-300 transition-all"
                    onClick={() => copyToClipboard(invite.inviteLink)}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 text-center text-sm">
                <div className="flex-1 theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl py-2">
                  <div className="font-semibold theme-dark:text-white text-gray-900">{invite.expiresAt ? `${expiresInHours}h` : "Never"}</div>
                  <div className="text-xs theme-dark:text-gray-500 text-gray-400">Expires</div>
                </div>
                <div className="flex-1 theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl py-2">
                  <div className="font-semibold theme-dark:text-white text-gray-900">{invite.maxUses}</div>
                  <div className="text-xs theme-dark:text-gray-500 text-gray-400">Max Uses</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t theme-dark:border-white/10 border-gray-200">
          <button
            className="px-5 py-2 text-sm font-medium theme-dark:text-white text-gray-700 theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:hover:bg-white/10 hover:bg-gray-200 transition-all"
            onClick={onClose}
          >
            {invite ? "Done" : "Cancel"}
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

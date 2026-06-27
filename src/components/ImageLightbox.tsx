"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.img
          key={src}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          src={src}
          alt=""
          className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

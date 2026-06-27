"use client";

import { motion } from "framer-motion";

interface SplashScreenProps {
  message?: string;
}

export default function SplashScreen({ message = "جاري التحميل..." }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: "var(--color-bg)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold gradient-text">Company Chat</h1>
          <p className="text-sm text-[var(--color-muted)] mt-2">{message}</p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--color-primary)" }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

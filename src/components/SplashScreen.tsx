"use client";

import { motion } from "framer-motion";

interface SplashScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function SplashScreen({
  message = "جاري التحميل...",
  fullScreen = true,
}: SplashScreenProps) {
  return (
    <div
      className={`${
        fullScreen ? "min-h-[100dvh]" : "h-full"
      } flex items-center justify-center theme-dark:bg-[#09090b] bg-gray-50 relative overflow-hidden`}
    >
      {/* Animated background orbs */}
      <div className="absolute top-[-15%] ltr:left-[-10%] rtl:right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-transparent rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-15%] ltr:right-[-10%] rtl:left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/20 via-blue-600/20 to-transparent rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex flex-col items-center z-10">
        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6"
        >
          {/* Glow behind logo */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[2rem] blur-3xl opacity-30 animate-pulse" />

          {/* Logo mark */}
          <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] relative">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {/* Decorative dots */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 animate-ping" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-purple-400 animate-ping" style={{ animationDelay: "0.5s" }} />
          </div>
        </motion.div>

        {/* Company name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Mentora
            </span>
          </h1>
          <div className="text-xs theme-dark:text-gray-500 text-gray-400 font-medium tracking-[0.2em] uppercase">
            Company Platform
          </div>
        </motion.div>

        {/* Animated dots loader */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 flex items-center gap-1.5"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-blue-500"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-purple-500"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-pink-500"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </motion.div>

        {/* Loading message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-4 text-sm theme-dark:text-gray-500 text-gray-400 font-medium"
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}

"use client";

import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-16 h-8 rounded-full bg-white/5 animate-pulse"></div>;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-16 h-8 rounded-full p-1 transition-colors duration-500 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner overflow-hidden flex items-center
        ${
          isDark
            ? "bg-[#1e1b4b] border border-indigo-500/30" // كحلي غامق للدارك مود
            : "bg-gradient-to-r from-sky-300 to-amber-200 border border-sky-300/50" // تدرج سماوي لأصفر للوضع الفاتح
        }
      `}
      aria-label="Toggle Theme"
    >
      {/* النجوم (بتظهر بس في الوضع المظلم وتكون على اليمين) */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="absolute top-2 right-2 w-1 h-1 bg-white rounded-full opacity-80 shadow-[0_0_2px_#fff]"></span>
        <span className="absolute top-4 right-5 w-[2px] h-[2px] bg-white rounded-full opacity-50 shadow-[0_0_2px_#fff]"></span>
        <span className="absolute top-5 right-3 w-[1.5px] h-[1.5px] bg-white rounded-full opacity-60"></span>
      </div>

      {/* الدايرة المتحركة (Knob) */}
      <div
        className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full transition-transform duration-500 shadow-[0_2px_5px_rgba(0,0,0,0.2)]
          ${
            isDark
              ? "-translate-x-8 bg-indigo-900 border border-indigo-700 text-blue-200" // تتحرك شمال في الدارك
              : "translate-x-0 bg-amber-400 border border-amber-300 text-white" // تثبت يمين في الفاتح
          }
        `}
      >
        {isDark ? (
          // أيقونة القمر
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          // أيقونة الشمس
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </div>
    </button>
  );
}
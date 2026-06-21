"use client";

import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState } from "react";

const stars = [
  { delay: 0.2, size: 2, top: 3, offset: 6 },
  { delay: 1.0, size: 1.5, top: 7, offset: 14 },
  { delay: 1.8, size: 2.5, top: 2, offset: 20 },
];

export default function SkyToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.dir === "rtl");
  }, []);

  const translateX = isDark ? (isRTL ? -24 : 24) : 0;

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "relative",
        width: 52,
        height: 28,
        borderRadius: 14,
        border: "none",
        cursor: "pointer",
        outline: "none",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        padding: "0 3px",
        overflow: "hidden",
        transition: "background 0.4s ease, box-shadow 0.4s ease",
        background: isDark ? "#1e1b4b" : "#bae6fd",
        boxShadow: isDark
          ? "inset 0 1px 3px rgba(255,255,255,0.1), 0 0 6px rgba(124,58,237,0.3)"
          : "inset 0 1px 3px rgba(0,0,0,0.08), 0 0 6px rgba(251,191,36,0.3)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = isDark
          ? "inset 0 1px 3px rgba(255,255,255,0.15), 0 0 10px rgba(124,58,237,0.5)"
          : "inset 0 1px 3px rgba(0,0,0,0.1), 0 0 10px rgba(251,191,36,0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = isDark
          ? "inset 0 1px 3px rgba(255,255,255,0.1), 0 0 6px rgba(124,58,237,0.3)"
          : "inset 0 1px 3px rgba(0,0,0,0.08), 0 0 6px rgba(251,191,36,0.3)";
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), background 0.4s ease",
          transform: `translateX(${translateX}px)`,
          background: isDark ? "#312e81" : "#fbbf24",
          position: "relative",
          animation: isDark ? "sky-moon-glow 3s ease-in-out infinite" : "sky-sun-glow 3s ease-in-out infinite",
        }}
      >
        {isDark ? (
          <span
            key="moon"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c4b5fd",
              animation: "sky-float-in 0.4s ease forwards",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          </span>
        ) : (
          <span
            key="sun"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              animation: "sky-float-in 0.4s ease forwards",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
          </span>
        )}
      </div>

      {isDark && stars.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0,
            top: s.top,
            [isRTL ? "left" : "right"]: s.offset,
            animation: `sky-twinkle ${2 + s.delay}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </button>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface VoiceInputProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  isRecording: boolean;
  recordingTime: number;
}

export function VoiceInput({
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  isRecording,
  recordingTime,
}: VoiceInputProps) {
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* 
        شريط التسجيل العائم
        يظهر بجوار الزر ليعرض الوقت وزر الإلغاء بدون أن يكسر التصميم
      */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: isRtl ? -10 : 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: isRtl ? -10 : 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute flex items-center gap-3 bg-red-500/10 backdrop-blur-md border border-red-500/20 px-3 py-1.5 rounded-full shadow-sm pointer-events-auto"
            style={{
              [isRtl ? "left" : "right"]: "100%",
              [isRtl ? "marginLeft" : "marginRight"]: "12px",
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelRecording();
              }}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
              title="إلغاء التسجيل"
              aria-label="Cancel recording"
            >
              <Trash2 size={14} />
            </button>

            <div className="w-[1px] h-4 bg-red-500/20" />

            <div className="flex items-center gap-1.5 min-w-[45px] justify-center">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-500 tabular-nums">
                {formatTime(recordingTime)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
        الزر الرئيسي
        يتغير شكله بين الميكروفون (للبدء) ومربع الإيقاف (للإنهاء)
      */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isRecording ? onStopRecording : onStartRecording}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 shadow-sm"
            : "bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-active)]"
        }`}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? (
          <Square size={16} fill="currentColor" className="animate-pulse" />
        ) : (
          <Mic size={20} />
        )}
      </motion.button>
    </div>
  );
}
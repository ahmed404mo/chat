"use client";

import React from "react";
import { Mic } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "../../lib/utils";

interface VoiceInputProps {
  onToggleRecording: () => void;
  isRecording: boolean;
  recordingTime: number;
  className?: string;
}

export function VoiceInput({
  className,
  onToggleRecording,
  isRecording,
  recordingTime,
}: VoiceInputProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <motion.div
        className="flex p-2 border items-center justify-center rounded-full cursor-pointer theme-dark:bg-[#233138] bg-white theme-dark:border-white/[0.06] border-gray-100"
        layout
        transition={{
          layout: {
            duration: 0.4,
          },
        }}
        onClick={onToggleRecording}
      >
        <div className="h-6 w-6 items-center justify-center flex ">
          {isRecording ? (
            <motion.div
              className="w-4 h-4 bg-red-500 rounded-sm"
              animate={{
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          ) : (
            <Mic className="theme-dark:text-gray-400 text-gray-500" />
          )}
        </div>
        <AnimatePresence mode="wait">
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{
                duration: 0.4,
              }}
              className="overflow-hidden flex gap-2 items-center justify-center"
            >
              {/* Frequency Animation */}
              <div className="flex gap-0.5 items-center justify-center">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 bg-red-500 rounded-full"
                    initial={{ height: 2 }}
                    animate={{
                      height: isRecording
                        ? [2, 3 + Math.random() * 10, 3 + Math.random() * 5, 2]
                        : 2,
                    }}
                    transition={{
                      duration: isRecording ? 1 : 0.3,
                      repeat: isRecording ? Infinity : 0,
                      delay: isRecording ? i * 0.05 : 0,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
              {/* Timer */}
              <div className="text-xs text-red-400 w-10 text-center tabular-nums">
                {formatTime(recordingTime)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

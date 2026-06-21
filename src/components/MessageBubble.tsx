"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string; role: string };
}

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  publicId: string | null;
  createdAt: string;
}

interface MessageBubbleProps {
  id: string;
  content: string;
  sender: { id: string; name: string; role: string };
  isSent: boolean;
  timestamp: string;
  showSender: boolean;
  attachments?: Attachment[];
  reactions?: Reaction[];
  readBy?: { userId: string; user: { id: string; name: string; role: string }; readAt: string }[];
  conversationId: string;
}

// --------------------------------------------------------------------
// مشغل الصوت المخصص (WhatsApp Style Audio Player)
// --------------------------------------------------------------------
// --------------------------------------------------------------------
// مشغل الصوت المخصص (WhatsApp Style Audio Player)
// --------------------------------------------------------------------
const CustomAudioPlayer = ({ src, isSent }: { src: string; isSent: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      const seekTime = (Number(e.target.value) / 100) * audio.duration;
      audio.currentTime = seekTime;
      setProgress(Number(e.target.value));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-3 p-1.5 rounded-xl min-w-[240px] max-w-full ${isSent ? "bg-white/10" : "theme-dark:bg-white/[0.04] bg-gray-100"}`}>
      <button
        onClick={togglePlayPause}
        className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95 shadow-sm ${
          isSent ? "bg-white text-[#005c4b]" : "bg-[#00a884] text-white"
        }`}
      >
        {isPlaying ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          // أيقونة الـ Play مسبوطة عشان تفضل باصة يمين
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ltr:ml-1 rtl:mr-1">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
        )}
      </button>

      <div className="flex flex-col flex-1 gap-1">
        <input
          type="range"
          min="0"
          max="100"
          value={progress || 0}
          onChange={handleSeek}
          className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${
            isSent ? "bg-white/30 accent-white" : "bg-gray-300 theme-dark:bg-gray-600 accent-[#00a884]"
          }`}
          style={{
            backgroundSize: `${progress}% 100%`,
            backgroundImage: isSent
              ? "linear-gradient(white, white)"
              : "linear-gradient(#00a884, #00a884)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right center", // 👈 السر هنا: إجبار اللون إنه يبدأ يتملي من اليمين
          }}
        />
        <div className={`flex justify-between text-[11px] font-medium ${isSent ? "text-white/80" : "text-gray-500 theme-dark:text-gray-400"}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : "0:00"}</span>
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
};

// --------------------------------------------------------------------
// المكون الأساسي للرسالة
// --------------------------------------------------------------------

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📽️";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "📦";
  return "📎";
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isAudio(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

export default function MessageBubble({
  id,
  content,
  sender,
  isSent,
  timestamp,
  showSender,
  attachments,
  reactions = [],
  readBy = [],
  conversationId,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const { addReaction, removeReaction } = useChat();
  const [showPicker, setShowPicker] = useState(false);
  const [showReadPopover, setShowReadPopover] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const readPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
      if (readPopoverRef.current && !readPopoverRef.current.contains(e.target as Node)) {
        setShowReadPopover(false);
      }
    };
    if (showPicker || showReadPopover) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker, showReadPopover]);

  const handleReaction = (emoji: string) => {
    const myReaction = reactions.find((r) => r.userId === user?.id);
    if (myReaction) {
      if (myReaction.emoji === emoji) {
        removeReaction(id, conversationId);
      } else {
        addReaction(id, emoji, conversationId);
      }
    } else {
      addReaction(id, emoji, conversationId);
    }
    setShowPicker(false);
  };

  const hasReactions = reactions.length > 0;
  const groupedReactions = hasReactions
    ? reactions.reduce<Record<string, Reaction[]>>((acc, r) => {
        if (!acc[r.emoji]) acc[r.emoji] = [];
        acc[r.emoji].push(r);
        return acc;
      }, {})
    : {};

  const otherParticipantsRead = readBy.filter((r) => r.userId !== user?.id);
  const showReadStatus = isSent && otherParticipantsRead.length > 0;

  const ROLE_LABELS: Record<string, string> = {
    admin: "Admin", hr: "HR", employee: "Employee", user: "عميل",
  };
  const ROLE_COLORS: Record<string, string> = {
    admin: "bg-red-500/20 text-red-400",
    hr: "bg-blue-500/20 text-blue-400",
    employee: "bg-emerald-500/20 text-emerald-400",
    user: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[75%] sm:max-w-[65%]">
        {showSender && !isSent && (
          <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
            <span className="text-xs font-medium text-blue-400/80">{sender.name}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLORS[sender.role] || ROLE_COLORS.user}`}>
              {ROLE_LABELS[sender.role] || "عميل"}
            </span>
          </div>
        )}

        <div className="relative group">
          <div
            className={`relative ${
              isSent
                ? "bg-[#005c4b] text-white rounded-2xl rounded-br-sm shadow-lg"
                : "theme-dark:bg-[#1f2c33] bg-white border theme-dark:border-white/[0.06] border-gray-100 theme-dark:text-white text-gray-900 rounded-2xl rounded-bl-sm shadow-sm"
            }`}
            style={{ padding: "8px 14px 6px" }}
          >
            {attachments && attachments.length > 0 && (
              <div className={`flex flex-col gap-1 ${content ? "mb-1.5" : ""}`}>
                {attachments.map((att, index) => (
                  <div key={att.id || att.url || `attachment-${index}`}>
                    {isImage(att.mimeType) ? (
                      <a href={att.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={att.url}
                          alt={att.fileName}
                          className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: 260, objectFit: "cover" }}
                          loading="lazy"
                        />
                      </a>
                    ) : isAudio(att.mimeType) ? (
                      // === تم استدعاء مشغل الصوت المخصص هنا ===
                      <CustomAudioPlayer src={att.url} isSent={isSent} />
                    ) : (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.fileName}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl no-underline transition-colors ${
                          isSent
                            ? "bg-white/10 hover:bg-white/15 text-white"
                            : "theme-dark:bg-white/[0.06] bg-gray-50 hover:bg-gray-100 theme-dark:hover:bg-white/[0.1] theme-dark:text-white text-gray-900"
                        }`}
                      >
                        <span className="text-lg">{getFileIcon(att.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{att.fileName}</div>
                          <div className={`text-xs ${isSent ? "text-white/60" : "theme-dark:text-gray-400 text-gray-500"}`}>
                            {formatFileSize(att.fileSize)}
                          </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {content && <div className="text-[15px] leading-[1.45] whitespace-pre-wrap">{content}</div>}

            <div className="flex items-center justify-end gap-0.5 mt-0.5">
              <span className={`text-[11px] leading-none ${isSent ? "text-white/45" : "theme-dark:text-gray-400/70 text-gray-400"}`}>
                {formatTime(timestamp)}
              </span>
              {isSent && (
                <span className={`text-[11px] leading-none ${showReadStatus ? "text-[#53bdeb]" : "text-white/45"}`}>
                  {showReadStatus ? "✓✓" : "✓"}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowPicker(!showPicker)}
              className="absolute -bottom-3 ltr:right-2 rtl:left-2 w-7 h-7 rounded-full theme-dark:bg-[#233138] bg-white border theme-dark:border-white/[0.06] border-gray-100 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:scale-110 active:scale-90"
            >
              😊
            </button>
          </div>

          {hasReactions && (
            <div className={`flex flex-wrap gap-1 mt-0.5 ${isSent ? "justify-end" : "justify-start"}`}>
              {Object.entries(groupedReactions).map(([emoji, reactors]) => {
                const userReacted = reactors.some((r) => r.userId === user?.id);
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
                      userReacted
                        ? "bg-[#005c4b]/20 border-[#005c4b]/30 text-[#00a884]"
                        : "theme-dark:bg-white/[0.06] bg-gray-50 border-transparent theme-dark:text-gray-300 text-gray-600"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className={`text-[11px] ${userReacted ? "font-semibold" : ""}`}>{reactors.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          {showPicker && (
            <div
              ref={pickerRef}
              className={`flex gap-1 p-1.5 theme-dark:bg-[#233138] bg-white border theme-dark:border-white/[0.06] border-gray-100 rounded-xl shadow-xl ${isSent ? "justify-end" : "justify-start"}`}
              style={{ marginTop: 6 }}
            >
              {QUICK_EMOJIS.map((emoji) => {
                const userReacted = reactions.some((r) => r.userId === user?.id && r.emoji === emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-lg transition-all hover:scale-125 active:scale-90 ${
                      userReacted ? "bg-[#005c4b]/20 scale-110" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
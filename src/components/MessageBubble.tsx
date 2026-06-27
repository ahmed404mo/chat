"use client";

import { memo, useCallback, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reply } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import ReactionViewer from "./ReactionViewer";

interface User {
  id: string;
  name: string | null;
  role?: string;
}
interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string; role: string };
  createdAt?: string;
}
interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  publicId: string | null;
}
interface Message {
  id: string;
  content: string;
  sender: User;
  senderId: string;
  conversationId?: string;
  createdAt: string;
  status?: string;
  readBy: { userId: string; user: User; readAt: string }[];
  repliedTo?: (Message & { sender: User }) | null;
  reactions?: Reaction[];
  attachments?: Attachment[];
  isEdited?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  showSender: boolean;
  isGroup: boolean;
  isGroupStart?: boolean;
  isGroupEnd?: boolean;
  hasNextFromSameSender?: boolean;
  onReply: (message: Message) => void;
  onContextMenu: (e: React.MouseEvent, message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string) => void;
  currentUserId: string;
  highlight?: boolean;
  onScrollToMessage?: (messageId: string) => void;
  onImageClick?: (url: string) => void;
  onlineUsers?: Set<string>;
}

const SWIPE_THRESHOLD = 55;
const SWIPE_MAX = 80;

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function AudioPlayer({
  attachment,
  isSent,
}: {
  attachment: Attachment;
  isSent: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [isListened, setIsListened] = useState(false);
  const playedOnce = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const generateWaveform = async () => {
      try {
        const ctx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        const response = await fetch(attachment.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const samples = 40;
        const blockSize = Math.floor(channelData.length / samples);
        const data: number[] = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j] || 0);
          }
          data.push(sum / blockSize);
        }
        const max = Math.max(...data, 0.01);
        setWaveform(data.map((v) => v / max));
        ctx.close();
      } catch {
        setWaveform(
          Array.from({ length: 40 }, () => Math.random() * 0.6 + 0.2),
        );
      }
    };
    generateWaveform();

    const onLoadedData = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
    };
    audio.addEventListener("loadeddata", onLoadedData);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadeddata", onLoadedData);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [attachment.url]);

  useEffect(() => {
    if (progress > 80 && !isListened) {
      setIsListened(true);
    }
  }, [progress, isListened]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        playedOnce.current = true;
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleWaveformClick = (e: React.MouseEvent) => {
    const rect = waveformRef.current?.getBoundingClientRect();
    if (!rect || !audioRef.current || !audioRef.current.duration) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct * 100);
  };

  const changeSpeed = (speed: number) => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  const formatTime = (t: number) => {
    if (!t || !isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div
      className={`relative flex items-center gap-1.5 w-full min-w-0 rounded-xl ${!isListened && !isSent && !playedOnce.current ? "bg-[var(--color-primary)]/5" : ""}`}
    >
      <audio ref={audioRef} src={attachment.url} preload="metadata" />
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{
          background: isPlaying ? "var(--color-primary)" : "var(--color-hover)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={isPlaying ? "white" : "var(--color-text)"}
        >
          {isPlaying ? (
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          ) : (
            <path d="M8 5v14l11-7z" />
          )}
        </svg>
      </button>
      {/* Waveform */}
      <div
        ref={waveformRef}
        onClick={handleWaveformClick}
        className="flex-1 flex items-center gap-[2px] h-10 cursor-pointer py-1"
      >
        {waveform.length > 0 ? (
          waveform.map((amp, i) => {
            const played = (i / waveform.length) * 100 <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors duration-100"
                style={{
                  height: `${Math.max(amp * 32, 3)}px`,
                  background: played
                    ? "var(--color-primary)"
                    : "var(--color-border)",
                }}
              />
            );
          })
        ) : (
          <div className="flex-1 flex items-center gap-1">
            <div className="w-1 h-3 rounded-full bg-[var(--color-border)] animate-pulse" />
            <div className="w-1 h-5 rounded-full bg-[var(--color-border)] animate-pulse" />
            <div className="w-1 h-3 rounded-full bg-[var(--color-border)] animate-pulse" />
          </div>
        )}
      </div>
      {/* Time */}
      <div className="text-[11px] text-[var(--color-muted)] tabular-nums w-10 text-center shrink-0 leading-none">
        {isPlaying || progress > 0
          ? formatTime(currentTime)
          : formatTime(duration)}
      </div>
      {/* Speed */}
      <div className="relative shrink-0">
        <button
          onClick={() => setShowSpeedMenu((p) => !p)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-all"
        >
          {playbackRate}x
        </button>
        {showSpeedMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowSpeedMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute bottom-full mb-1 start-1/2 -translate-x-1/2 z-50 rounded-xl border shadow-xl overflow-hidden"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              {speeds.map((speed) => (
                <button
                  key={speed}
                  onClick={() => changeSpeed(speed)}
                  className={`block w-full text-start px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${playbackRate === speed ? "text-[var(--color-primary)] bg-[var(--color-active)]" : "text-[var(--color-text)] hover:bg-[var(--color-hover)]"}`}
                >
                  {speed}x
                </button>
              ))}
            </motion.div>
          </>
        )}
      </div>
      {/* Unread indicator */}
      {!isListened && !isSent && !playedOnce.current && (
        <div className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-bg)]" />
      )}
    </div>
  );
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  )
    return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "📽️";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "📦";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.startsWith("video/")) return "🎬";
  return "📎";
}

function MessageStatus({
  message,
  isSent,
}: {
  message: Message;
  isSent: boolean;
}) {
  if (!isSent) return null;
  if (message.status === "sending") {
    return (
      <span className="flex items-center gap-0.5">
        <svg
          className="animate-spin"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="2.5"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            strokeDasharray="31.4 31.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  const isRead = message.readBy && message.readBy.length > 0;
  return (
    <span
      className={`text-[10px] leading-none ${isRead ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"}`}
    >
      {isRead ? "✓✓" : "✓"}
    </span>
  );
}

function ReplyPreview({
  repliedTo,
  onScrollToMessage,
}: {
  repliedTo: Message & { sender: User };
  onScrollToMessage?: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onScrollToMessage?.(repliedTo.id)}
      className="flex items-start gap-2 px-2 py-1.5 mb-1.5 rounded-lg bg-black/[0.12] hover:bg-black/[0.18] transition-colors text-start w-full border-l-[3px] border-[var(--color-primary)]"
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-[var(--color-primary)] truncate">
          {repliedTo.sender.name}
        </div>
        <div className="text-xs text-[var(--color-muted)] truncate">
          {repliedTo.content ||
            (repliedTo.attachments?.length ? "📎 File" : "")}
        </div>
      </div>
    </button>
  );
}

function ReactionBadge({
  reactions,
  messageId,
  currentUserId,
  onReact,
  onRemoveReaction,
  isSent,
  onViewReactions,
}: {
  reactions: Reaction[];
  messageId: string;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string) => void;
  isSent: boolean;
  onViewReactions: (messageId: string) => void;
}) {
  if (!reactions || reactions.length === 0) return null;
  const grouped = reactions.reduce<Record<string, Reaction[]>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});
  const entries = Object.entries(grouped);
  const totalCount = reactions.length;
  const MAX_VISIBLE = 5;
  const sorted = entries.sort((a, b) => {
    const aLast = Math.max(
      ...a[1].map((r) => new Date(r.createdAt || 0).getTime()),
    );
    const bLast = Math.max(
      ...b[1].map((r) => new Date(r.createdAt || 0).getTime()),
    );
    return bLast - aLast;
  });

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      onClick={() => onViewReactions(messageId)}
      className="flex items-center h-5 px-1.5 rounded-full shadow-sm border hover:ring-2 hover:ring-[var(--color-primary)]/30 transition-all cursor-pointer"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center -space-x-0.5">
        {sorted.slice(0, MAX_VISIBLE).map(([emoji]) => (
          <span key={emoji} className="text-[11px] leading-none">
            {emoji}
          </span>
        ))}
        {sorted.length > MAX_VISIBLE && (
          <span className="text-[10px] text-[var(--color-muted)] leading-none ms-0.5">
            +{sorted.length - MAX_VISIBLE}
          </span>
        )}
      </div>
      {totalCount > 1 && (
        <span className="text-[10px] font-medium text-[var(--color-muted)] ms-1 leading-none tabular-nums">
          {totalCount}
        </span>
      )}
    </motion.button>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  isSent,
  showSender,
  isGroup,
  isGroupStart,
  isGroupEnd,
  hasNextFromSameSender,
  onReply,
  onContextMenu,
  onReact,
  onRemoveReaction,
  currentUserId,
  highlight,
  onScrollToMessage,
  onImageClick,
  onlineUsers,
}: MessageBubbleProps) {
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showReplyButton, setShowReplyButton] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionViewer, setShowReactionViewer] = useState(false);
  const [showAddedReaction, setShowAddedReaction] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
  }, []);

  const [lastUsedEmoji, setLastUsedEmoji] = useState<string | null>(() => {
    try {
      const recent = JSON.parse(localStorage.getItem("recentEmojis") || "[]");
      return recent.length > 0 ? recent[0] : null;
    } catch {
      return null;
    }
  });

  const updateLastUsedEmoji = useCallback((emoji: string) => {
    setLastUsedEmoji((prev) => (emoji !== prev ? emoji : prev));
  }, []);

  const handleBubbleClick = () => {
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      setShowQuickReactions((prev) => !prev);
      setShowReplyButton((prev) => !prev);
    }
  };

  useEffect(() => {
    if (highlight && bubbleRef.current) {
      bubbleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const el = bubbleRef.current;
      el.classList.add("highlight-flash");
      const timer = setTimeout(
        () => el.classList.remove("highlight-flash"),
        1500,
      );
      return () => clearTimeout(timer);
    }
  }, [highlight]);

  const isDeleted = message.content === "🗑️ This message was deleted";

  const bubbleStyle = isSent
    ? {
        background:
          message.status === "sending"
            ? "linear-gradient(135deg, rgba(124, 92, 255, 0.12), rgba(139, 92, 246, 0.08))"
            : "linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(139, 92, 246, 0.15))",
        borderColor:
          message.status === "sending"
            ? "rgba(124, 92, 255, 0.06)"
            : "rgba(124, 92, 255, 0.12)",
        boxShadow:
          message.status === "sending"
            ? "0 2px 8px rgba(124, 92, 255, 0.03)"
            : "0 2px 8px rgba(124, 92, 255, 0.06)",
      }
    : {
        background: "var(--color-received)",
        borderColor: "var(--color-border)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      };

  const showTail = isSent || showSender;

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      onReact(message.id, emoji);
      updateLastUsedEmoji(emoji);
      setShowEmojiPicker(false);
      setShowAddedReaction(true);
      setTimeout(() => setShowAddedReaction(false), 1500);
    },
    [message.id, onReact, updateLastUsedEmoji],
  );

  const handleViewReactions = useCallback(() => {
    setShowReactionViewer(true);
  }, []);

  const hasReactions = message.reactions && message.reactions.length > 0;

  const handleDrag = useCallback(
    (_: any, info: { offset: { x: number } }) => {
      if (isDeleted) return;
      const absX = Math.abs(info.offset.x);
      const progress = Math.min(absX / SWIPE_THRESHOLD, 1);
      setSwipeProgress(progress);
    },
    [isDeleted],
  );

  const handleDragEnd = useCallback(
    (_: any, info: { offset: { x: number } }) => {
      if (isDeleted) {
        setSwipeProgress(0);
        return;
      }
      const absX = Math.abs(info.offset.x);
      if (absX >= SWIPE_THRESHOLD) {
        if (typeof navigator !== "undefined" && navigator.vibrate)
          navigator.vibrate(10);
        onReply(message);
      }
      setSwipeProgress(0);
    },
    [isDeleted, message, onReply],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col w-full ${isSent ? "items-end" : "items-start"}`}
    >
      <div className="relative max-w-full">
        {!isDeleted && (
          <div
            className="absolute inset-y-0 start-0 flex items-center pointer-events-none z-10 ps-3 transition-opacity duration-150"
            style={{ opacity: swipeProgress }}
          >
            <motion.div
              animate={{ scale: 0.5 + swipeProgress * 0.5 }}
              className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm"
              style={{
                background: "rgba(124, 92, 255, 0.12)",
                border: "1px solid rgba(124, 92, 255, 0.2)",
              }}
            >
              <Reply
                size={16}
                className={`text-[var(--color-primary)] ${isRtl ? "scale-x-[-1]" : ""}`}
              />
            </motion.div>
          </div>
        )}

        <motion.div
          drag="x"
          dragConstraints={
            isRtl
              ? { left: -SWIPE_MAX, right: 0 }
              : { left: 0, right: SWIPE_MAX }
          }
          dragElastic={0.15}
          dragSnapToOrigin
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className="relative z-20"
          style={{ touchAction: "pan-y" }}
        >
          <div
            ref={bubbleRef}
            className={`relative group`}
            onContextMenu={(e) => onContextMenu(e, message)}
            onMouseEnter={() => {
              setShowQuickReactions(true);
              setShowReplyButton(true);
            }}
            onMouseLeave={() => {
              setShowQuickReactions(false);
              setShowReplyButton(false);
            }}
            onClick={handleBubbleClick}
          >
            {/* Sender name for group chats */}
            {!isSent && showSender && (
              <div className="flex items-center gap-2 mb-1 px-1">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {(message.sender.name || "?")[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-[var(--color-primary)] truncate">
                  {message.sender.name}
                  {message.sender.role && message.sender.role !== "client" && (
                    <span className="text-[10px] text-[var(--color-muted)] font-normal ms-1">
                      ({message.sender.role})
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Message bubble */}
            <div
              className={`relative px-3 py-2 shadow-sm border rounded-2xl ${
                isSent
                  ? isGroupStart
                    ? "rounded-tr-sm"
                    : "rounded-tr-[18px]"
                  : isGroupStart
                    ? "rounded-tl-sm"
                    : "rounded-tl-[18px]"
              } ${isDeleted ? "opacity-60 italic" : ""} ${message.status === "sending" ? "opacity-70" : ""}`}
              style={bubbleStyle}
            >
              {/* Reply preview */}
              {message.repliedTo && (
                <ReplyPreview
                  repliedTo={message.repliedTo}
                  onScrollToMessage={onScrollToMessage}
                />
              )}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="space-y-1">
                  {message.attachments.map((att, index) => (
                    <AttachmentPreview
                      key={att.id || `${att.publicId}-${index}`}
                      att={att}
                      onImageClick={onImageClick}
                      isSent={isSent}
                    />
                  ))}
                </div>
              )}

              {/* Content */}
              {message.content &&
                message.content !== "🗑️ This message was deleted" && (
                  <div className="flex items-end gap-2 max-w-full min-w-0">
                    <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap break-words leading-relaxed overflow-hidden [overflow-wrap:anywhere] select-none">
                      {message.content.split(/(@\w+)/g).map((part, i) =>
                        part.startsWith("@") ? (
                          <span
                            key={i}
                            className="font-semibold text-[var(--color-primary)]"
                          >
                            {part}
                          </span>
                        ) : (
                          part
                        ),
                      )}
                    </p>
                  </div>
                )}

              {/* Edited + timestamp + status */}
              <div className="flex items-center gap-1.5 mt-1">
                {message.isEdited && (
                  <span className="text-[10px] text-[var(--color-muted)] italic opacity-70">
                    edited
                  </span>
                )}
                <div className="flex items-center gap-1 ms-auto">
                  <span className="text-[10px] text-[var(--color-muted)] tabular-nums leading-none">
                    {formatTime(message.createdAt)}
                  </span>
                  <MessageStatus message={message} isSent={isSent} />
                </div>
              </div>

              {/* Reactions badge - inline, attached to bubble */}
              {hasReactions && (
                <div
                  className={`flex mt-1.5 -mb-1 ${isSent ? "justify-end" : "justify-start"}`}
                >
                  <ReactionBadge
                    reactions={message.reactions!}
                    messageId={message.id}
                    currentUserId={currentUserId}
                    onReact={onReact}
                    onRemoveReaction={onRemoveReaction}
                    isSent={isSent}
                    onViewReactions={handleViewReactions}
                  />
                </div>
              )}

              {/* Hover reply button */}
              <AnimatePresence>
                {!isDeleted && showReplyButton && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onReply(message)}
                    className="absolute -top-2.5 inset-inline-end-[-8px] w-7 h-7 rounded-full flex items-center justify-center shadow-lg border z-10 hover:scale-110 active:scale-95 cursor-pointer"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                    }}
                    title="Reply"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="text-[var(--color-muted)]"
                    >
                      <path d="M5.92,4.42A.5.5,0,0,0,5,5.13V6.5A5.5,5.5,0,0,0,10.5,12H12a.5.5,0,0,0,0-1H10.5A4.5,4.5,0,0,1,6,6.5V7.88a.5.5,0,0,0,.92.35l2.5-3a.5.5,0,0,0,0-.71l-2.5-3A.5.5,0,0,0,5.92,4.42Z" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Quick reactions bar */}
              <AnimatePresence>
                {showQuickReactions && !isDeleted && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute -top-10 ${isSent ? "inset-inline-end-0" : "inset-inline-start-0"} flex items-center gap-0.5 rounded-xl border shadow-xl px-1.5 py-1 z-20`}
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                    }}
                    onMouseEnter={() => {
                      setShowQuickReactions(true);
                      setShowReplyButton(true);
                    }}
                    onMouseLeave={() => {
                      setShowQuickReactions(false);
                      setShowReplyButton(false);
                    }}
                  >
                    {["👍", "❤️", "😂", "😮"].map((emoji) => {
                      const hasMine = message.reactions?.some(
                        (r) => r.userId === currentUserId && r.emoji === emoji,
                      );
                      return (
                        <button
                          key={emoji}
                          onClick={() => {
                            if (hasMine) onRemoveReaction(message.id);
                            else {
                              onReact(message.id, emoji);
                              updateLastUsedEmoji(emoji);
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] transition-all text-lg hover:scale-125 active:scale-95"
                        >
                          {emoji}
                        </button>
                      );
                    })}
                    {lastUsedEmoji &&
                      !["👍", "❤️", "😂", "😮"].includes(lastUsedEmoji) &&
                      (() => {
                        const hasMine = message.reactions?.some(
                          (r) =>
                            r.userId === currentUserId &&
                            r.emoji === lastUsedEmoji,
                        );
                        return (
                          <button
                            key={lastUsedEmoji}
                            onClick={() => {
                              if (hasMine) onRemoveReaction(message.id);
                              else {
                                onReact(message.id, lastUsedEmoji!);
                                updateLastUsedEmoji(lastUsedEmoji!);
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] transition-all text-lg hover:scale-125 active:scale-95"
                          >
                            {lastUsedEmoji}
                          </button>
                        );
                      })()}
                    {/* "+" button to open full emoji picker */}
                    <div
                      className="w-px h-5 mx-0.5"
                      style={{ background: "var(--color-border)" }}
                    />
                    <button
                      ref={addButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] transition-all text-base hover:scale-125 active:scale-90 text-[var(--color-muted)]"
                      title="More emojis"
                    >
                      +
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Animated "+1" indicator */}
              <AnimatePresence>
                {showAddedReaction && (
                  <motion.div
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: -20, scale: 1.3 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute -top-3 inset-inline-end-2 text-lg font-bold text-[var(--color-primary)] pointer-events-none z-20"
                  >
                    +1
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
            anchorRect={addButtonRef.current?.getBoundingClientRect()}
          />
        )}
      </AnimatePresence>

      {/* Reaction Viewer */}
      <AnimatePresence>
        {showReactionViewer &&
          message.reactions &&
          message.reactions.length > 0 && (
            <ReactionViewer
              reactions={message.reactions}
              onClose={() => setShowReactionViewer(false)}
              onlineUsers={onlineUsers}
              anchorRect={
                badgeRef.current?.getBoundingClientRect() ||
                bubbleRef.current?.getBoundingClientRect()
              }
            />
          )}
      </AnimatePresence>
    </motion.div>
  );
});

function AttachmentPreview({
  att,
  onImageClick,
  isSent,
}: {
  att: Attachment;
  onImageClick?: (url: string) => void;
  isSent: boolean;
}) {
  if (att.mimeType.startsWith("image/")) {
    return (
      <button
        onClick={() => onImageClick?.(att.url)}
        className="block rounded-xl overflow-hidden mb-1.5 group w-full"
      >
        <img
          src={att.url}
          alt={att.fileName}
          className="max-w-full w-full max-h-64 object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.02]"
          loading="lazy"
        />
      </button>
    );
  }
  if (att.mimeType.startsWith("audio/"))
    return <AudioPlayer attachment={att} isSent={isSent} />;
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--color-hover)] hover:bg-[var(--color-hover)] transition-colors mb-1.5 text-sm"
    >
      <span className="text-lg">{getFileIcon(att.mimeType)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-[var(--color-text)]">
          {att.fileName}
        </div>
        <div className="text-xs text-[var(--color-muted)]">
          {formatFileSize(att.fileSize)}
        </div>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-[var(--color-muted)]"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
  );
}

export default MessageBubble;

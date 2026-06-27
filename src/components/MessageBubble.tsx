"use client";

import { memo, useCallback, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

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
  onReply: (message: Message) => void;
  onContextMenu: (e: React.MouseEvent, message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string) => void;
  currentUserId: string;
  highlight?: boolean;
  onScrollToMessage?: (messageId: string) => void;
  onImageClick?: (url: string) => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatAudioTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedData = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
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
  }, []);

  const togglePlay = () => {
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
    if (audioRef.current) {
      const newTime =
        (audioRef.current.duration / 100) * Number(e.target.value);
      audioRef.current.currentTime = newTime;
    }
  };

  const controlColor = isSent
    ? "theme-dark:text-gray-100 text-gray-800"
    : "theme-dark:text-gray-100 text-gray-800";
  const progressBg = isSent
    ? "theme-dark:bg-white/30 bg-black/20"
    : "theme-dark:bg-black/30 bg-gray-300";
  const progressFg = isSent
    ? "theme-dark:bg-white bg-gray-600"
    : "theme-dark:bg-gray-400 bg-gray-500";
  const timeColor = isSent
    ? "theme-dark:text-gray-300/80 text-gray-500/80"
    : "theme-dark:text-gray-400 text-gray-500";

  return (
    <div className="flex items-center gap-2 p-1 w-full max-w-[280px] min-w-[250px]">
      <audio ref={audioRef} src={attachment.url} preload="metadata" />
      <button
        onClick={togglePlay}
        className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-transform active:scale-90 ${controlColor}`}
      >
        {isPlaying ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="rtl:-scale-x-100 ltr:ml-0.5"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div className="relative h-4 flex items-center group">
          <div className={`w-full h-1 rounded-full ${progressBg}`}>
            <div
              className={`h-1 rounded-full ${progressFg}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            className={`absolute w-3 h-3 rounded-full ${progressFg} shadow transition-opacity opacity-0 group-hover:opacity-100`}
            style={{ left: `${progress}%`, transform: "translateX(-50%)" }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        <div className={`text-xs self-end tabular-nums ${timeColor}`}>
          {formatAudioTime(duration)}
        </div>
      </div>
      <div className="ml-2 flex-shrink-0">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-green-400 opacity-80"
        >
          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
        </svg>
      </div>
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

  const isRead = message.readBy && message.readBy.length > 0;
  const isDelivered = message.status === "DELIVERED" || isRead;

  return (
    <span
      className={`text-[10px] leading-none ${isRead ? "text-blue-400" : "theme-dark:text-gray-500 text-gray-400"}`}
    >
      {isRead ? "✓✓" : isDelivered ? "✓✓" : "✓"}
    </span>
  );
}

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

  if (att.mimeType.startsWith("audio/")) {
    return <AudioPlayer attachment={att} isSent={isSent} />;
  }

  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl theme-dark:bg-white/[0.06] bg-black/[0.04] hover:theme-dark:bg-white/[0.1] hover:bg-black/[0.08] transition-colors mb-1.5 text-sm"
    >
      <span className="text-lg">{getFileIcon(att.mimeType)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium theme-dark:text-gray-200 text-gray-700">
          {att.fileName}
        </div>
        <div className="text-xs theme-dark:text-gray-500 text-gray-400">
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
        className="shrink-0 theme-dark:text-gray-400 text-gray-500"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
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
      className="reply-preview flex items-start gap-2 px-2 py-1 mb-1 rounded-md theme-dark:bg-black/[0.18] bg-black/[0.05] rtl:border-r-[3px] ltr:border-l-[3px] border-blue-500 cursor-pointer hover:theme-dark:bg-black/[0.25] hover:bg-black/[0.08] transition-colors text-left w-full"
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-blue-500 truncate">
          {repliedTo.sender.name}
        </div>
        <div className="text-xs theme-dark:text-gray-400 text-gray-500 truncate">
          {repliedTo.content ||
            (repliedTo.attachments?.length ? "📎 File" : "")}
        </div>
      </div>
    </button>
  );
}

function ReactionBar({
  reactions,
  messageId,
  currentUserId,
  onReact,
  onRemoveReaction,
  isSent,
}: {
  reactions: Reaction[];
  messageId: string;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string) => void;
  isSent: boolean;
}) {
  if (!reactions || reactions.length === 0) return null;

  const grouped = reactions.reduce<Record<string, Reaction[]>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});

  const entries = Object.entries(grouped);
  const totalCount = reactions.length;
  const mine = reactions.find((r) => r.userId === currentUserId);

  // WhatsApp shows a single small pill overlapping the bubble's bottom
  // corner: stacked emoji (up to 3 distinct) + total count, not one pill
  // per emoji laid out in a row.
  return (
    <button
      onClick={() =>
        mine ? onRemoveReaction(messageId) : onReact(messageId, entries[0][0])
      }
      title={reactions.map((r) => `${r.user.name}: ${r.emoji}`).join(", ")}
      className={`absolute -bottom-2.5 ${isSent ? "right-1.5" : "left-1.5"} flex items-center h-5 pl-1 pr-1.5 rounded-full theme-dark:bg-[#2a3942] bg-white shadow-md border theme-dark:border-white/[0.08] border-black/[0.06] z-10 hover:scale-105 transition-transform`}
    >
      <div className="flex items-center -space-x-1">
        {entries.slice(0, 3).map(([emoji]) => (
          <span key={emoji} className="text-[11px] leading-none">
            {emoji}
          </span>
        ))}
      </div>
      {totalCount > 1 && (
        <span className="text-[10px] font-medium theme-dark:text-gray-300 text-gray-500 ml-1 leading-none tabular-nums">
          {totalCount}
        </span>
      )}
    </button>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  isSent,
  showSender,
  isGroup,
  onReply,
  onContextMenu,
  onReact,
  onRemoveReaction,
  currentUserId,
  highlight,
  onScrollToMessage,
  onImageClick,
}: MessageBubbleProps) {
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showReplyButton, setShowReplyButton] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleBubbleClick = () => {
    // On touch devices, a tap will show the reply button and quick reactions.
    // A second tap on the bubble (but not on a button) could hide them.
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

  const bubbleColors = isSent
    ? "theme-dark:bg-[#005c4b] bg-[#d9fdd3] rounded-[1.125rem] rounded-tr-sm"
    : "theme-dark:bg-[#202c33] bg-white rounded-[1.125rem] rounded-tl-sm";

  // WhatsApp only draws the little corner tail on the first bubble of a
  // received group; sent bubbles keep theirs since we don't receive a
  // "first in group" flag for the current user's own messages.
  const showTail = isSent || showSender;
  const tailFillClass = isSent
    ? "theme-dark:fill-[#005c4b] fill-[#d9fdd3]"
    : "theme-dark:fill-[#202c33] fill-white";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex flex-col w-full ${isSent ? "items-end" : "items-start"}`}
    >
      <div
        ref={bubbleRef}
        className={`relative group max-w-[85%] sm:max-w-[70%] ${isSent ? "ms-12" : "me-12"}`}
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
        {/* Sender name (group chats) */}
        {!isSent && showSender && (
          <div className="flex items-center gap-2 mb-0.5 px-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {(message.sender.name || "?")[0].toUpperCase()}
            </div>
            <span className="text-xs font-semibold theme-dark:text-blue-400 text-blue-600 truncate">
              {message.sender.name}
              {message.sender.role && message.sender.role !== "user" && (
                <span className="text-[10px] theme-dark:text-gray-500 text-gray-400 font-normal ml-1">
                  ({message.sender.role})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`relative px-2.5 py-[6px] shadow-sm border theme-dark:border-white/[0.04] border-black/[0.04] ${bubbleColors} ${isDeleted ? "opacity-60 italic" : ""} ${message.reactions && message.reactions.length > 0 ? "mb-2.5" : ""}`}
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
                <p className="text-sm theme-dark:text-gray-100 text-gray-800 whitespace-pre-wrap break-words leading-relaxed overflow-hidden [overflow-wrap:anywhere]">
                  {message.content}
                </p>
              </div>
            )}

          {/* Edited indicator + timestamp + status */}
          <div
            className={`flex items-center gap-1.5 mt-0.5 ${message.content ? "" : ""}`}
          >
            {message.isEdited && (
              <span className="text-[10px] theme-dark:text-gray-500 text-gray-400 italic">
                edited
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[10px] theme-dark:text-gray-400 text-gray-400 tabular-nums leading-none">
                {formatTime(message.createdAt)}
              </span>
              <MessageStatus message={message} isSent={isSent} />
            </div>
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <ReactionBar
              reactions={message.reactions}
              messageId={message.id}
              currentUserId={currentUserId}
              onReact={onReact}
              onRemoveReaction={onRemoveReaction}
              isSent={isSent}
            />
          )}

          {/* Hover reply button */}
          {!isDeleted && showReplyButton && (
            <button
              onClick={() => onReply(message)}
              className="absolute -top-2 rtl:left-[-8px] ltr:right-[-8px] transition-all duration-200 theme-dark:bg-[#2a3942] bg-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg border theme-dark:border-white/[0.08] border-gray-200 hover:scale-110 active:scale-95"
              title="Reply"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="theme-dark:text-gray-300 text-gray-600"
              >
                <path d="M5.92,4.42A.5.5,0,0,0,5,5.13V6.5A5.5,5.5,0,0,0,10.5,12H12a.5.5,0,0,0,0-1H10.5A4.5,4.5,0,0,1,6,6.5V7.88a.5.5,0,0,0,.92.35l2.5-3a.5.5,0,0,0,0-.71l-2.5-3A.5.5,0,0,0,5.92,4.42Z" />
              </svg>
            </button>
          )}

          {/* Quick reactions */}
          {showQuickReactions && !isDeleted && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className={`absolute -bottom-8 ${isSent ? "right-0" : "left-0"} flex gap-0.5 theme-dark:bg-[#1a1a2e]/95 bg-white/95 backdrop-blur-lg rounded-xl border theme-dark:border-white/[0.08] border-gray-200 shadow-xl px-1.5 py-1 z-20`}
              onMouseEnter={() => {
                setShowQuickReactions(true);
                setShowReplyButton(true);
              }}
              onMouseLeave={() => {
                setShowQuickReactions(false);
                setShowReplyButton(false);
              }}
            >
              {QUICK_EMOJIS.map((emoji) => {
                const hasMine = message.reactions?.some(
                  (r) => r.userId === currentUserId && r.emoji === emoji,
                );
                return (
                  <button
                    key={emoji}
                    onClick={() =>
                      hasMine
                        ? onRemoveReaction(message.id)
                        : onReact(message.id, emoji)
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:theme-dark:bg-white/[0.1] hover:bg-gray-100 transition-all text-lg hover:scale-125 active:scale-95"
                  >
                    {emoji}
                  </button>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default MessageBubble;

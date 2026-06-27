"use client";
import { useAuth } from "@/context/AuthContext";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
} from "react";
import { VoiceInput } from "./ui/voice-input";

interface UploadedFile {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface Message {
  id: string;
  content: string;
  sender: { id: string; name: string | null };
  repliedTo?: Message | null;
}

interface Participant {
  userId: string;
  user: { id: string; name: string; role: string };
}

interface ChatInputProps {
  conversationId: string;
  onSend: (content: string, files?: UploadedFile[]) => void;
  onSendFile: (content: string, files: UploadedFile[]) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onRecording?: () => void;
  onStopRecording?: () => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  participants?: Participant[];
  currentUserId?: string;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-rar-compressed",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
];

function getFileIcon(mimeType: string): string {
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
  return "📎";
}

// الكشف عن الصيغة المدعومة للتسجيل لتفادي أخطاء متصفح Safari
const getSupportedMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm", "audio/mp4", "audio/ogg"];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
};

export default function ChatInput({
  conversationId,
  onSend,
  onSendFile,
  onTyping,
  onStopTyping,
  onRecording,
  onStopRecording,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  participants = [],
  currentUserId,
}: ChatInputProps) {
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [pendingRecording, setPendingRecording] = useState<{
    blob: Blob;
    duration: number;
    mimeType: string;
  } | null>(null);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
    }
  }, [editingMessage]);

  const handleToggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const mentionableUsers = useMemo(() => {
    const allItem = { id: "all", name: "all" };
    const users = participants
      .filter((p) => p.userId !== currentUserId)
      .map((p) => ({ id: p.userId, name: p.user.name }))
      .filter((u) => !mentionSearch || u.name.toLowerCase().includes(mentionSearch.toLowerCase()));
    const showAll = !mentionSearch || "all".startsWith(mentionSearch.toLowerCase());
    return showAll ? [allItem, ...users] : users;
  }, [participants, currentUserId, mentionSearch]);

  const showMentionPopup = mentionSearch !== null && mentionableUsers.length > 0;

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      onTyping();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        onStopTyping();
      }, 1500);

      const cursorPos = textareaRef.current?.selectionStart ?? value.length;
      const beforeCursor = value.slice(0, cursorPos);
      const atIndex = beforeCursor.lastIndexOf("@");
      if (atIndex !== -1 && (atIndex === 0 || beforeCursor[atIndex - 1] === " ")) {
        const afterAt = beforeCursor.slice(atIndex + 1);
        const hasSpace = /\s/.test(afterAt);
        if (!hasSpace) {
          setMentionSearch(afterAt);
          setMentionIndex(0);
          return;
        }
      }
      setMentionSearch(null);
    },
    [onTyping, onStopTyping],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          if (!ALLOWED_TYPES.includes(file.type)) {
            console.warn(`Unsupported file type: ${file.type}`);
            continue;
          }
          const formData = new FormData();
          formData.append("file", file);
          formData.append("conversationId", conversationId);
          const res = await fetch("/api/chat/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            setUploadedFiles((prev) => [...prev, data]);
          }
        }
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [conversationId, token],
  );

  const startRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        onStopRecording?.();

        // استخدام الصيغة المدعومة
        const finalMimeType = mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalMimeType });
        if (blob.size === 0) {
          setRecording(false);
          setRecordingTime(0);
          return;
        }

        setRecording(false);
        setRecordingTime(0);
        setPendingRecording({
          blob,
          duration: recordingTimeRef.current,
          mimeType: finalMimeType,
        });
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
        setRecording(false);
        onStopRecording?.();
      };

      recorder.start();
      setRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      onRecording?.();
      recordingTimerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (err: any) {
      setRecordingError("Microphone access denied or not supported.");
    }
  }, [onRecording, onStopRecording]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sendPendingRecording = useCallback(async () => {
    const rec = pendingRecording;
    if (!rec) return;
    setPendingRecording(null);
    setUploading(true);
    try {
      // بناء الاسم والامتداد بناءً على المتصفح
      const ext = rec.mimeType.includes("mp4")
        ? "m4a"
        : rec.mimeType.includes("webm")
          ? "webm"
          : "ogg";
      const file = new File([rec.blob], `voice-${Date.now()}.${ext}`, {
        type: rec.mimeType,
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // 👈 التعديل هنا
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        onSendFile("", [data]);
      } else {
        console.error("Upload failed", await res.text());
      }
    } catch (err) {
      console.error("Voice send error:", err);
    } finally {
      setUploading(false);
    }
  }, [pendingRecording, onSendFile, conversationId, token]);

  const cancelRecording = useCallback(() => {
    setPendingRecording(null);
    onStopRecording?.();
  }, [onStopRecording]);

  const cancelRecordingDuringRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecording(false);
    setRecordingTime(0);
    setRecordingError(null);
    onStopRecording?.();
  }, [onStopRecording]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && uploadedFiles.length === 0) return;

    if (uploadedFiles.length > 0) {
      onSendFile(trimmed, uploadedFiles);
      setUploadedFiles([]);
    } else {
      onSend(trimmed, undefined);
    }

    setText("");
    onStopTyping();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    onCancelEdit?.();
  }, [text, uploadedFiles, onSend, onSendFile, onStopTyping, onCancelEdit]);

  const insertMention = useCallback((name: string) => {
    const cursorPos = textareaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, cursorPos);
    const after = text.slice(cursorPos);
    const atIndex = before.lastIndexOf("@");
    const newText = before.slice(0, atIndex) + `@${name} ` + after;
    setText(newText);
    setMentionSearch(null);
    requestAnimationFrame(() => {
      const newPos = atIndex + name.length + 2;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    });
  }, [text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionPopup) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionableUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionableUsers.length) % mentionableUsers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionableUsers[mentionIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setMentionSearch(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = text.trim().length > 0 || uploadedFiles.length > 0;

  return (
    <div className="theme-dark:bg-[#1f2c33] bg-[#f0f2f5] px-3 py-2">
      {/* --- Reply/Edit Preview --- */}
      {replyingTo && (
        <div className="theme-dark:bg-[#2a3942] bg-gray-100 p-2 rounded-xl mb-2 flex justify-between items-center ltr:border-l-[3px] rtl:border-r-[3px] border-blue-500">
          <div className="pl-2 min-w-0 flex-1">
            <p className="font-bold text-xs text-blue-500">
              Replying to {replyingTo.sender.name}
            </p>
            <p className="text-sm theme-dark:text-gray-300 text-gray-600 truncate">
              {replyingTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center theme-dark:hover:bg-white/[0.08] hover:bg-gray-200 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="theme-dark:text-gray-400 text-gray-500"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      {editingMessage && (
        <div className="theme-dark:bg-[#2a3942] bg-gray-100 p-2 rounded-xl mb-2 flex justify-between items-center ltr:border-l-[3px] rtl:border-r-[3px] border-green-500">
          <div className="pl-2 min-w-0 flex-1">
            <p className="font-bold text-xs text-green-500">Editing message</p>
            <p className="text-sm theme-dark:text-gray-300 text-gray-600 truncate">
              {editingMessage.content}
            </p>
          </div>
          <button
            onClick={onCancelEdit}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center theme-dark:hover:bg-white/[0.08] hover:bg-gray-200 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="theme-dark:text-gray-400 text-gray-500"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {recordingError && (
        <div className="text-xs text-red-400 text-center mb-1">
          {recordingError}
        </div>
      )}
      {uploadedFiles.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {uploadedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2.5 py-1.5 theme-dark:bg-white/[0.08] bg-white border theme-dark:border-white/[0.06] border-gray-100 rounded-xl text-sm"
            >
              {file.mimeType.startsWith("image/") ? (
                <img
                  src={file.url}
                  alt={file.fileName}
                  className="w-7 h-7 rounded-lg object-cover"
                />
              ) : (
                <span>{getFileIcon(file.mimeType)}</span>
              )}
              <span className="theme-dark:text-gray-300 text-gray-600 truncate max-w-[100px] text-xs">
                {file.fileName}
              </span>
              <button
                className="theme-dark:text-gray-500 text-gray-400 hover:text-red-400 transition-colors"
                onClick={() => removeFile(idx)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5 transition-all duration-200">
        {/* Voice button - always on the right in RTL */}
        {!text.trim() && !uploadedFiles.length && !pendingRecording && !recording && (
          <VoiceInput
            isRecording={recording}
            recordingTime={recordingTime}
            onToggleRecording={handleToggleRecording}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileSelect}
        />

        {pendingRecording ? (
          <div className="flex items-center gap-2 flex-1">
            <button
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
              onClick={cancelRecording}
              title="Cancel recording"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="flex items-center gap-2 text-[#00a884] text-sm font-medium">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span className="tabular-nums">
                {formatRecordingTime(pendingRecording.duration)}
              </span>
            </div>
            <div className="flex-1" />
            <button
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[#00a884] text-white hover:bg-[#06cf9c] transition-all active:scale-90 shadow-md"
              onClick={sendPendingRecording}
              disabled={uploading}
              aria-label="Send recording"
              title="Send recording"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        ) : recording ? (
          <div className="flex items-center gap-1.5 flex-1">
            <button
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
              onClick={cancelRecordingDuringRecording}
              title="Cancel recording"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <VoiceInput
              isRecording={recording}
              recordingTime={recordingTime}
              onToggleRecording={handleToggleRecording}
              className="flex-1"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 theme-dark:bg-[#233138] bg-white border theme-dark:border-white/[0.06] border-gray-100 rounded-xl px-3 py-1.5 transition-all duration-200 flex-1">
            <div className="flex-1 relative">
            {showMentionPopup && (
              <div className="absolute bottom-full left-0 right-0 mb-1 z-50">
                <div className="theme-dark:bg-[#1f2c33] bg-white border theme-dark:border-white/[0.08] border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                  {mentionableUsers.map((u, i) => (
                    <button
                      key={u.id}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        i === mentionIndex
                          ? "theme-dark:bg-white/[0.1] bg-gray-100"
                          : "theme-dark:hover:bg-white/[0.05] hover:bg-gray-50"
                      } theme-dark:text-gray-200 text-gray-700`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(u.name);
                      }}
                    >
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.name[0].toUpperCase()}
                      </span>
                      <span className="truncate">{u.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                editingMessage
                  ? "Edit your message..."
                  : uploadedFiles.length > 0
                    ? "Add a caption..."
                    : "Type a message"
              }
              rows={1}
              className="flex-1 w-full resize-none bg-transparent border-none outline-none text-sm theme-dark:text-white text-gray-900 placeholder-gray-500 leading-relaxed py-1.5 max-h-[120px] font-inherit"
              aria-label="Message input"
            />
          </div>
            <button
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
                canSend && !uploading
                  ? editingMessage
                    ? "bg-green-500 text-white shadow-md hover:bg-green-400"
                    : "bg-[#00a884] text-white shadow-md hover:bg-[#06cf9c]"
                  : "theme-dark:text-gray-400 text-gray-500"
              }`}
              onClick={handleSend}
              disabled={!canSend || uploading}
              aria-label={editingMessage ? "Save edit" : "Send message"}
            >
              {editingMessage ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        )}
        {/* Attach button - always on the left in RTL */}
        {!recording && !pendingRecording && (
          <button
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full theme-dark:text-gray-400 text-gray-500 theme-dark:hover:text-white hover:text-gray-900 transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach file"
          >
            {uploading ? (
              <svg
                className="animate-spin"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeDasharray="31.4 31.4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

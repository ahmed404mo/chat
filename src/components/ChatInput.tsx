"use client";

import { useState, useRef, useCallback, useEffect, useMemo, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Smile, ArrowUp, X, Check, Loader2, Mic, AlertCircle, Square, Trash2, Pause, Play } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EmojiPicker from "./EmojiPicker";

// ==========================================
// 1. Types & Interfaces
// ==========================================
interface UploadedFile { url: string; publicId: string; fileName: string; fileSize: number; mimeType: string; }
interface Attachment { mimeType: string; fileName: string; }
interface Message { id: string; content: string; sender: { id: string; name: string | null }; repliedTo?: Message | null; attachments?: Attachment[]; }
interface Participant { userId: string; user: { id: string; name: string; role: string }; }

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

// ==========================================
// 2. Constants & Utilities
// ==========================================
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
  "text/plain", "text/csv", "application/zip", "application/x-rar-compressed",
  "audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg",
];

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📽️";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "📦";
  return "📎";
};

const formatRecordingTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const getSupportedMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm", "audio/mp4", "audio/ogg"];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
};

// ==========================================
// 3. Sub-Components
// ==========================================

const ReplyOrEditPreview = ({ replyingTo, editingMessage, onCancel }: { replyingTo: Message | null; editingMessage: Message | null | undefined; onCancel: () => void }) => {
  if (!replyingTo && !editingMessage) return null;
  const isReply = !!replyingTo;
  const targetMessage = replyingTo || editingMessage;
  const titleColor = isReply ? "var(--color-primary)" : "var(--color-success)";
  const bgGradient = isReply ? "linear-gradient(135deg, var(--color-primary), var(--color-secondary))" : "linear-gradient(135deg, var(--color-success), #059669)";

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden w-full">
      <div className="w-full px-2 sm:px-4 pb-2">
        <div className="flex items-start gap-3 px-4 py-2.5 rounded-2xl border-s-[4px] shadow-sm bg-[var(--color-surface)] border-[var(--color-border)]" style={{ borderLeftColor: titleColor }}>
          <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ background: bgGradient }}>
            {(targetMessage?.sender?.name || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-xs truncate" style={{ color: titleColor }}>
              {isReply ? `Replying to ${targetMessage?.sender?.name}` : "Editing message"}
            </p>
            <p className="text-sm text-[var(--color-muted)] truncate mt-0.5">
              {targetMessage?.content || (targetMessage?.attachments?.length ? targetMessage.attachments[0].fileName : "Attachment")}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-input)] hover:bg-[var(--color-active)] transition-colors text-[var(--color-muted)] hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const FileUploadPreview = ({ files, onRemove }: { files: UploadedFile[]; onRemove: (index: number) => void }) => {
  if (files.length === 0) return null;
  return (
    <div className="w-full px-2 sm:px-4 pb-2">
      <div className="flex gap-2 flex-wrap">
        {files.map((file, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm shadow-sm" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            {file.mimeType.startsWith("image/") ? <img src={file.url} alt={file.fileName} className="w-7 h-7 rounded-md object-cover" /> : <span>{getFileIcon(file.mimeType)}</span>}
            <span className="text-[var(--color-text)] truncate max-w-[120px] text-xs font-medium">{file.fileName}</span>
            <button type="button" className="text-[var(--color-muted)] hover:text-red-500 transition-colors ml-1" onClick={() => onRemove(idx)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MentionPopup = ({ users, selectedIndex, onSelect }: { users: { id: string; name: string }[]; selectedIndex: number; onSelect: (name: string) => void }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} className="absolute bottom-full left-0 right-0 mb-2 z-50">
      <div className="rounded-2xl border shadow-xl overflow-hidden max-h-48 overflow-y-auto" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        {users.map((u, i) => (
          <button
            key={u.id}
            type="button"
            className={`w-full text-start px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${i === selectedIndex ? "bg-[var(--color-active)]" : "hover:bg-[var(--color-hover)]"} text-[var(--color-text)]`}
            onMouseDown={(e) => { e.preventDefault(); onSelect(u.name); }}
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {u.name[0].toUpperCase()}
            </span>
            <span className="truncate font-medium">{u.name}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// ⭐ مكوّن مشغّل الصوت المصغر قبل الإرسال (Audio Preview Player)
const VoicePreviewPlayer = ({ audioUrl, duration, onDelete, onSend, isUploading }: { audioUrl: string; duration: number; onDelete: () => void; onSend: () => void; isUploading: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = (clickX / rect.width) * duration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-between w-full rounded-[28px] border p-1.5 shadow-sm bg-[var(--color-surface)] border-[var(--color-border)]">
      <audio ref={audioRef} src={audioUrl} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onEnded={() => { setIsPlaying(false); setCurrentTime(0); }} />

      <button type="button" onClick={onDelete} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="إلغاء">
        <Trash2 size={20} />
      </button>

      {/* شريط التحكم المنزلق */}
      <div className="flex-1 flex items-center gap-3 mx-2 px-3 py-2 rounded-2xl bg-[var(--color-input)] border border-[var(--color-border)]/40">
        <button type="button" onClick={togglePlay} className="shrink-0 text-[var(--color-primary)] hover:opacity-80 transition-opacity">
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>

        {/* Waveform / Seekbar */}
        <div className="flex-1 h-2 bg-[var(--color-border)]/60 rounded-full overflow-hidden cursor-pointer relative" onClick={handleSeek}>
          <div className="h-full bg-[var(--color-primary)] transition-all duration-75" style={{ width: `${Math.min((currentTime / (duration || 1)) * 100, 100)}%` }} />
        </div>

        <span className="text-[11px] font-semibold text-[var(--color-muted)] tabular-nums min-w-[34px] text-end">
          {formatRecordingTime(isPlaying ? currentTime : duration)}
        </span>
      </div>

      <button type="button" onClick={onSend} disabled={isUploading} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-primary)] text-white shadow-md hover:brightness-110 active:scale-95 transition-all">
        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={20} />}
      </button>
    </motion.div>
  );
};

// ==========================================
// 4. Main Component
// ==========================================

export default function ChatInput({
  conversationId, onSend, onSendFile, onTyping, onStopTyping,
  onRecording, onStopRecording, replyingTo, onCancelReply,
  editingMessage, onCancelEdit, participants = [], currentUserId,
}: ChatInputProps) {
  const { token } = useAuth();
  
  // States
  const [text, setText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Mentions State
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  // Audio Recording State
  const [recording, setRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [pendingRecording, setPendingRecording] = useState<{ blob: Blob; url: string; duration: number; mimeType: string } | null>(null);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const recordingCancelledRef = useRef(false);

  // --- Effects ---
  useEffect(() => { if (editingMessage) setText(editingMessage.content); }, [editingMessage]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
  }, [text]);

  // تنظيف الذاكرة وحفظ الأداء
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (pendingRecording?.url) URL.revokeObjectURL(pendingRecording.url);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      }
    };
  }, [pendingRecording]);

  // --- Mentions Logic ---
  const mentionableUsers = useMemo(() => {
    const allItem = { id: "all", name: "all" };
    const users = participants
      .filter((p) => p.userId !== currentUserId)
      .map((p) => ({ id: p.userId, name: p.user.name }))
      .filter((u) => !mentionSearch || u.name.toLowerCase().includes(mentionSearch.toLowerCase()));
    return (!mentionSearch || "all".startsWith(mentionSearch.toLowerCase())) ? [allItem, ...users] : users;
  }, [participants, currentUserId, mentionSearch]);

  const showMentionPopup = mentionSearch !== null && mentionableUsers.length > 0;

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
      textareaRef.current?.focus();
    });
  }, [text]);

  // --- Handlers ---
  const handleTextChange = useCallback((value: string) => {
    setText(value);
    onTyping();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(onStopTyping, 1500);

    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf("@");

    if (atIndex !== -1 && (atIndex === 0 || beforeCursor[atIndex - 1] === " ")) {
      const afterAt = beforeCursor.slice(atIndex + 1);
      if (!/\s/.test(afterAt)) { setMentionSearch(afterAt); setMentionIndex(0); return; }
    }
    setMentionSearch(null);
  }, [onTyping, onStopTyping]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionPopup) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((p) => (p + 1) % mentionableUsers.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((p) => (p - 1 + mentionableUsers.length) % mentionableUsers.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionableUsers[mentionIndex].name); return; }
      if (e.key === "Escape") { setMentionSearch(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendSubmit(); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!ALLOWED_TYPES.includes(file.type)) continue;
        const formData = new FormData();
        formData.append("file", file); formData.append("conversationId", conversationId);
        const res = await fetch("/api/chat/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
        if (res.ok) { const data = await res.json(); setUploadedFiles((prev) => [...prev, data]); }
      }
    } catch (err) { console.error("Upload error:", err); } 
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleSendSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && uploadedFiles.length === 0) return;
    setSending(true);
    
    if (uploadedFiles.length > 0) { onSendFile(trimmed, uploadedFiles); setUploadedFiles([]); } 
    else { onSend(trimmed); }
    
    setText("");
    onStopTyping();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    onCancelEdit?.();
    
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setSending(false);
    });
  }, [text, uploadedFiles, onSend, onSendFile, onStopTyping, onCancelEdit]);

  // ==========================================
  // ⭐ Audio Logic (المنطق الكامل المطور)
  // ==========================================

  const startTimer = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
  };

  const pauseTimer = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const startRecording = async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pendingStreamRef.current = stream;
      const mimeType = getSupportedMimeType() || "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        if (recordingCancelledRef.current) {
          recordingCancelledRef.current = false;
          stream.getTracks().forEach((t) => t.stop());
          setRecording(false);
          setRecordingTime(0);
          return;
        }
        stream.getTracks().forEach((t) => t.stop());
        pauseTimer();
        onStopRecording?.();

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size === 0) { setRecording(false); setRecordingTime(0); return; }
        
        const url = URL.createObjectURL(blob);
        setRecording(false); 
        setIsPaused(false);
        setPendingRecording({ blob, url, duration: recordingTime, mimeType });
        setRecordingTime(0);
      };
      
      recorder.start();
      setRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      pendingStreamRef.current = null;
      onRecording?.();
      startTimer();
    } catch { 
      setRecordingError("Microphone access denied."); 
      pendingStreamRef.current = null; 
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pauseTimer();
    } else if (mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    audioChunksRef.current = [];
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    pauseTimer();
    setRecording(false); setIsPaused(false); setRecordingTime(0); setRecordingError(null); onStopRecording?.();
  };

  const discardPendingRecording = () => {
    if (pendingRecording?.url) URL.revokeObjectURL(pendingRecording.url);
    setPendingRecording(null);
  };

  const sendPendingRecording = async () => {
    if (!pendingRecording) return;
    setUploading(true);
    try {
      const ext = pendingRecording.mimeType.includes("mp4") ? "m4a" : pendingRecording.mimeType.includes("webm") ? "webm" : "ogg";
      const file = new File([pendingRecording.blob], `voice-${Date.now()}.${ext}`, { type: pendingRecording.mimeType });
      const formData = new FormData();
      formData.append("file", file); formData.append("conversationId", conversationId);
      
      const res = await fetch("/api/chat/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (res.ok) { 
        const data = await res.json(); 
        onSendFile("", [data]); 
        discardPendingRecording();
      }
    } catch (err) { console.error("Voice send error:", err); } 
    finally { setUploading(false); }
  };

  const canSend = text.trim().length > 0 || uploadedFiles.length > 0;

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="w-full relative pb-2 sm:pb-4 pt-1">
      
      {/* التنبيه بالخطأ في أعلى الشريط */}
      <AnimatePresence>
        {recordingError && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute -top-10 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md shadow-sm">
              <AlertCircle size={14} />
              <span className="font-medium">{recordingError}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <ReplyOrEditPreview replyingTo={replyingTo} editingMessage={editingMessage} onCancel={replyingTo ? onCancelReply : (onCancelEdit || (() => {}))} />
      </AnimatePresence>

      <FileUploadPreview files={uploadedFiles} onRemove={(idx) => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))} />
      
      <input ref={fileInputRef} type="file" className="hidden" multiple accept={ALLOWED_TYPES.join(",")} onChange={handleFileSelect} />

      <div className="w-full px-2 sm:px-4">
        <AnimatePresence mode="wait">
          {recording ? (
            // ==========================================
            // الحالة 1: جاري التسجيل (يظهر في المنتصف)
            // ==========================================
            <motion.div key="recording" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center justify-between w-full rounded-[28px] border p-1.5 shadow-sm bg-[var(--color-surface)] border-red-500/30">
              <button type="button" onClick={cancelRecording} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="إلغاء">
                <Trash2 size={20} />
              </button>

              <div className="flex items-center justify-center gap-2.5 font-semibold text-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                <span className={`tabular-nums tracking-widest ${isPaused ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'}`}>
                  {formatRecordingTime(recordingTime)}
                </span>
                {isPaused && <span className="text-[10px] uppercase tracking-wider text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded-md font-bold">Paused</span>}
              </div>

              <div className="flex items-center gap-1.5">
                <button type="button" onClick={togglePause} className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPaused ? 'bg-yellow-500/10 text-yellow-600' : 'bg-black/5 dark:bg-white/5 text-[var(--color-text)]'}`} title={isPaused ? "إكمال" : "إيقاف مؤقت"}>
                  {isPaused ? <Mic size={18} /> : <Pause size={18} />}
                </button>

                <button type="button" onClick={stopRecording} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-500 text-white shadow-md hover:bg-red-600 active:scale-95 transition-all" title="إنهاء ومعاينة">
                  <Square size={16} fill="currentColor" />
                </button>
              </div>
            </motion.div>

          ) : pendingRecording ? (
            // ==========================================
            // الحالة 2: المعاينة والاستماع قبل الإرسال
            // ==========================================
            <VoicePreviewPlayer 
              key="preview"
              audioUrl={pendingRecording.url} 
              duration={pendingRecording.duration} 
              onDelete={discardPendingRecording} 
              onSend={sendPendingRecording} 
              isUploading={uploading} 
            />

          ) : (
            // ==========================================
            // الحالة 3: شريط النص الطبيعي (Default)
            // ==========================================
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex items-end rounded-[28px] border transition-all duration-200 shadow-sm pr-1.5 pl-1 py-1.5 bg-[var(--color-surface)]" style={{ borderColor: isFocused ? "var(--color-primary)" : "var(--color-border)" }}>
              <div className="shrink-0 pb-0.5">
                <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                </motion.button>
              </div>

              <div className="flex-1 relative min-w-0 flex items-center">
                <AnimatePresence>
                  {showMentionPopup && <MentionPopup users={mentionableUsers} selectedIndex={mentionIndex} onSelect={insertMention} />}
                </AnimatePresence>
                
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => { setIsFocused(false); setShowEmojiPicker(false); }}
                  placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
                  rows={1}
                  className="block w-full bg-transparent text-[15px] text-[var(--color-text)] placeholder-[var(--color-muted)]/60 resize-none py-2.5 px-2 mx-1 border-0 focus:ring-0 focus:outline-none shadow-none"
                  style={{ height: "auto", WebkitAppearance: "none" }}
                />
              </div>

              <div className="shrink-0 pb-0.5">
                <motion.button type="button" ref={emojiBtnRef} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors" onClick={() => setShowEmojiPicker((p) => !p)}>
                  <Smile size={20} />
                </motion.button>
              </div>

              <div className="shrink-0 pb-0.5 ml-1">
                <AnimatePresence mode="wait">
                  {canSend ? (
                    <motion.button key="send" type="button" initial={{ scale: 0.7 }} animate={{ scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-all" style={{ background: editingMessage ? "var(--color-success)" : "var(--color-primary)" }} onClick={handleSendSubmit} disabled={uploading || sending}>
                      {sending ? <Loader2 size={18} className="animate-spin" /> : editingMessage ? <Check size={18} /> : <ArrowUp size={20} />}
                    </motion.button>
                  ) : (
                    <motion.button key="mic" type="button" initial={{ scale: 0.7 }} animate={{ scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors" onClick={startRecording}>
                      <Mic size={20} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showEmojiPicker && <EmojiPicker onSelect={(emoji) => { setText(p => p + emoji); textareaRef.current?.focus(); }} onClose={() => setShowEmojiPicker(false)} anchorRect={emojiBtnRef.current?.getBoundingClientRect()} />}
      </AnimatePresence>
    </div>
  );
}
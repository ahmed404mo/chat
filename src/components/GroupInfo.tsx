"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/SocketContext";
import { useToast } from "./ToastProvider";

interface Conversation {
  id: string;
  title: string | null;
  imageUrl: string | null;
  isGroup: boolean;
  createdById: string | null;
  participants: {
    id: string;
    userId: string;
    user: { id: string; name: string; avatarUrl?: string | null };
  }[];
  inviteCodes?: { code: string }[];
}

interface GroupInfoProps {
  conversation: Conversation;
  onClose: () => void;
}

export default function GroupInfo({ conversation, onClose }: GroupInfoProps) {
  const { user } = useAuth();
  const {
    conversations,
    users,
    isManager,
    fetchConversations,
    addMembers,
    deleteConversation,
    generateInvite,
    renameConversation,
    uploadConversationImage,
  } = useChat();
  const { addToast } = useToast();
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(conversation.title || "");
  const [renaming, setRenaming] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "admin";
  const isParticipant = conversation.participants.some(
    (p) => p.userId === user?.id,
  );
  const canManageGroup = isAdmin || (isManager && isParticipant);
  const nonMembers = users.filter(
    (u) => !conversation.participants.some((p) => p.userId === u.id),
  );

  const toggleUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAddMembers = async () => {
    if (selectedIds.length === 0) return;
    setAdding(true);
    try {
      await addMembers(conversation.id, selectedIds);
      addToast("Members added", "success");
      setSelectedIds([]);
      setShowAddMember(false);
      // fetchConversations is already called inside the addMembers context function,
      // so this call is no longer needed here.
    } catch (err: unknown) {
      addToast(
        err instanceof Error ? err.message : "Failed to add members",
        "error",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteGroup = async () => {
    setDeleting(true);
    try {
      await deleteConversation(conversation.id);
      addToast("Group deleted successfully", "success");
      onClose();
    } catch (err: unknown) {
      addToast(
        err instanceof Error ? err.message : "Failed to delete group",
        "error",
      );
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return createPortal(
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg theme-dark:bg-white/5 bg-white/90 backdrop-blur-2xl border theme-dark:border-white/10 border-gray-200 rounded-t-[1.5rem] sm:rounded-[1.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b theme-dark:border-white/10 border-gray-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center theme-dark:text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.3)] overflow-hidden">
                    {conversation.imageUrl ? (
                      <img
                        src={conversation.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (conversation.title || (conversation.isGroup ? "G" : "C"))
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>
                  {canManageGroup && conversation.isGroup && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          console.log("File selected:", file.name, file.size);
                          setUploadingImage(true);
                          try {
                            await uploadConversationImage(
                              conversation.id,
                              file,
                            );
                            addToast("Group image updated", "success");
                          } catch (err) {
                            console.error("Upload error:", err);
                            addToast(
                              err instanceof Error
                                ? err.message
                                : "Failed to upload image",
                              "error",
                            );
                          } finally {
                            setUploadingImage(false);
                            if (e.target) e.target.value = "";
                          }
                        }}
                      />
                      <button
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white border-2 theme-dark:border-[#09090b] border-white transition-transform hover:scale-110 active:scale-95"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        title="Change group image"
                      >
                        {uploadingImage ? (
                          <svg
                            className="animate-spin w-3 h-3"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          >
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                </div>
                {editingTitle ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="text"
                      className="flex-1 min-w-0 px-3 py-2 text-sm theme-dark:bg-white/10 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:text-white text-gray-900 focus:outline-none focus:border-blue-500/50"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                        if (e.key === "Escape") {
                          setTitleDraft(conversation.title || "");
                          setEditingTitle(false);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50"
                      disabled={!titleDraft.trim() || renaming}
                      onClick={async () => {
                        if (!titleDraft.trim() || renaming) return;
                        setRenaming(true);
                        try {
                          await renameConversation(
                            conversation.id,
                            titleDraft.trim(),
                          );
                          addToast("Group renamed", "success");
                          setEditingTitle(false);
                        } catch {
                          addToast("Failed to rename group", "error");
                        } finally {
                          setRenaming(false);
                        }
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center theme-dark:bg-white/10 bg-gray-200 theme-dark:text-gray-400 text-gray-500 hover:theme-dark:bg-white/20 hover:bg-gray-300 transition-all"
                      onClick={() => {
                        setTitleDraft(conversation.title || "");
                        setEditingTitle(false);
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
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
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="font-semibold theme-dark:text-white text-gray-900 truncate">
                      {conversation.title ||
                        (conversation.isGroup
                          ? "Group Info"
                          : "Conversation Info")}
                    </div>
                    {canManageGroup && conversation.isGroup && (
                      <button
                        className="shrink-0 w-8 h-8 rounded-full theme-dark:bg-white/10 bg-gray-200 flex items-center justify-center theme-dark:text-gray-400 text-gray-500 theme-dark:hover:bg-white/20 hover:bg-gray-300 transition-all"
                        onClick={() => {
                          setTitleDraft(conversation.title || "");
                          setEditingTitle(true);
                        }}
                        title="Rename group"
                      >
                        <svg
                          width="13"
                          height="13"
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
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                className="w-8 h-8 rounded-full theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 flex items-center justify-center theme-dark:text-gray-400 text-gray-500 theme-dark:hover:text-white hover:text-gray-900 theme-dark:hover:bg-white/10 hover:bg-gray-200 transition-all"
                onClick={onClose}
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

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Invite Code Section */}
              {conversation.isGroup &&
                (() => {
                  const baseUrl =
                    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
                  const groupCode = conversation.inviteCodes?.[0]?.code || null;
                  const inviteLink = groupCode
                    ? `${baseUrl}/join?code=${groupCode}`
                    : null;
                  const copyCode = () => {
                    if (groupCode) {
                      navigator.clipboard.writeText(groupCode);
                      addToast("Code copied", "success");
                    }
                  };
                  const copyLink = () => {
                    if (inviteLink) {
                      navigator.clipboard.writeText(inviteLink);
                      addToast("Invite link copied", "success");
                    }
                  };
                  const handleGenerateNew = async () => {
                    try {
                      await generateInvite(conversation.id, 24, 100);
                      addToast("New invite code generated", "success");
                      await fetchConversations();
                    } catch {
                      addToast("Failed to generate invite code", "error");
                    }
                  };
                  return canManageGroup ? (
                    <div className="theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-2xl p-4">
                      <div className="text-xs font-semibold theme-dark:text-gray-400 text-gray-500 uppercase tracking-wider mb-3 text-center">
                        Invitation
                      </div>
                      {groupCode ? (
                        <>
                          <div className="text-center mb-3">
                            <div
                              className="font-bold font-mono cursor-pointer text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"
                              style={{
                                fontSize: "1.3rem",
                                letterSpacing: "0.15em",
                              }}
                              onClick={copyCode}
                              title="Click to copy code"
                            >
                              {groupCode}
                            </div>
                            <button
                              className="text-xs px-3 py-1.5 font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-500 hover:to-purple-500 transition-all shadow-[0_0_10px_rgba(99,102,241,0.25)] mt-1"
                              onClick={copyCode}
                            >
                              Copy Code
                            </button>
                          </div>
                          {inviteLink && (
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                className="flex-1 px-3 py-1.5 text-sm theme-dark:bg-white/5 bg-white border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:text-gray-300 text-gray-600 focus:outline-none focus:border-blue-500/50"
                                value={inviteLink}
                                readOnly
                              />
                              <button
                                className="px-3 py-1.5 text-xs font-medium theme-dark:text-white text-gray-700 theme-dark:bg-white/10 bg-gray-200 border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:hover:bg-white/20 hover:bg-gray-300 transition-all shrink-0"
                                onClick={copyLink}
                              >
                                Copy Link
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center text-sm theme-dark:text-gray-500 text-gray-400">
                          No code available
                        </div>
                      )}
                      <button
                        className="w-full mt-3 py-2 text-sm font-medium theme-dark:text-white text-gray-700 theme-dark:bg-white/10 bg-gray-200 border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:hover:bg-white/20 hover:bg-gray-300 transition-all"
                        onClick={handleGenerateNew}
                      >
                        {groupCode
                          ? "Generate New Code"
                          : "Generate Invite Code"}
                      </button>
                    </div>
                  ) : null;
                })()}

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold theme-dark:text-gray-400 text-gray-500 uppercase tracking-wider">
                    Members ({conversation.participants.length})
                  </span>
                  {canManageGroup && !showAddMember && (
                    <button
                      className="text-xs px-3 py-1.5 font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-500 hover:to-purple-500 transition-all shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                      onClick={() => setShowAddMember(true)}
                    >
                      + Add Member
                    </button>
                  )}
                </div>
                <div
                  className="theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-2xl overflow-hidden"
                  style={{ maxHeight: 200, overflowY: "auto" }}
                >
                  {conversation.participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5 border-b theme-dark:border-white/5 border-gray-200 last:border-b-0 hover:theme-dark:bg-white/5 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="rounded-full flex items-center justify-center theme-dark:text-white font-bold shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden"
                        style={{ width: 34, height: 34, fontSize: "0.85rem" }}
                      >
                        {p.user.avatarUrl ? (
                          <img
                            src={p.user.avatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          p.user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold theme-dark:text-white text-gray-900">
                          {p.user.name}
                          {p.userId === conversation.createdById && (
                            <span
                              className="inline-block rounded-full px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/20 ml-2"
                              style={{ fontSize: "0.55rem", fontWeight: 600 }}
                            >
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Members */}
              {showAddMember && canManageGroup && (
                <div className="theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold theme-dark:text-gray-400 text-gray-500">
                      Add Members ({selectedIds.length})
                    </span>
                    <button
                      className="text-xs px-3 py-1.5 font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-500 hover:to-purple-500 transition-all shadow-[0_0_10px_rgba(99,102,241,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={selectedIds.length === 0 || adding}
                      onClick={handleAddMembers}
                    >
                      {adding ? "Adding..." : "Add"}
                    </button>
                  </div>
                  <div
                    className="theme-dark:bg-white/5 bg-gray-100 border theme-dark:border-white/10 border-gray-200 rounded-xl"
                    style={{ maxHeight: 160, overflowY: "auto" }}
                  >
                    {nonMembers.length === 0 ? (
                      <div className="text-center theme-dark:text-gray-500 text-gray-400 py-3 text-sm">
                        All users are already members
                      </div>
                    ) : (
                      nonMembers.map((u) => (
                        <label
                          key={u.id}
                          className={`flex items-center gap-3 px-3 py-2 border-b theme-dark:border-white/5 border-gray-200 cursor-pointer transition-colors ${
                            selectedIds.includes(u.id)
                              ? "bg-blue-500/10"
                              : "theme-dark:hover:bg-white/5 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="accent-blue-500"
                            checked={selectedIds.includes(u.id)}
                            onChange={() => toggleUser(u.id)}
                          />
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center theme-dark:text-white font-bold shrink-0 text-xs overflow-hidden">
                            {(u as any).avatarUrl ? (
                              <img
                                src={(u as any).avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-sm theme-dark:text-white text-gray-900">
                              {u.name}
                            </div>
                            <div className="text-xs theme-dark:text-gray-500 text-gray-400">
                              {u.role}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Delete */}
              {canManageGroup && !showDeleteConfirm && (
                <button
                  className="w-full py-2.5 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Conversation
                </button>
              )}

              {showDeleteConfirm && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <div className="text-sm font-semibold text-red-400 mb-2">
                    Are you sure you want to delete this conversation?
                  </div>
                  <div className="text-xs text-red-400/70 mb-3">
                    This will permanently delete all messages, files, and
                    membership records. This action cannot be undone.
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 py-2 text-sm font-medium theme-dark:text-white text-gray-700 theme-dark:bg-white/10 bg-gray-200 border theme-dark:border-white/10 border-gray-200 rounded-xl theme-dark:hover:bg-white/20 hover:bg-gray-300 transition-all"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleDeleteGroup}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

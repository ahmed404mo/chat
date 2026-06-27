"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ToastProvider";
import { motion } from "framer-motion";
import BottomTabBar from "@/components/BottomTabBar";
import SplashScreen from "@/components/SplashScreen";
import AuroraBackground from "@/components/reactbits/AuroraBackground";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  hr: "HR Manager",
  employee: "Employee",
  client: "Client",
};

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  const handleSave = async () => {
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    if (!email.trim()) { setError("Email is required"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      localStorage.setItem("user", JSON.stringify(data.user));
      addToast("Profile updated successfully", "success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        headers: { authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setAvatarUrl(data.url);
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.avatarUrl = data.url;
      localStorage.setItem("user", JSON.stringify(storedUser));
      addToast("Avatar updated", "success");
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <SplashScreen message="جاري تحميل الملف الشخصي..." />;
  }

  if (!user) return null;

  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden sm:p-4 lg:p-8 font-sans"
      style={{ background: "var(--color-bg)" }}
    >
      <AuroraBackground color="#7C5CFF" speed={0.12} />
      <div className="noise-overlay" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 ltr:-end-40 rtl:-start-40 w-80 h-80 rounded-full opacity-[0.04]"
          style={{ background: "var(--color-primary)", filter: "blur(80px)" }} />
        <div className="absolute -bottom-40 ltr:-start-40 rtl:-end-40 w-80 h-80 rounded-full opacity-[0.03]"
          style={{ background: "var(--color-accent)", filter: "blur(80px)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1600px] h-[100dvh] sm:h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] relative z-10"
      >
        <div
          className="h-full flex flex-col overflow-hidden sm:rounded-[2.5rem] sm:border shadow-2xl border-0 sm:border"
          style={{
            background: "rgba(21, 26, 35, 0.75)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderColor: "rgba(124, 92, 255, 0.12)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,92,255,0.06) inset",
          }}
        >
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <div className="max-w-lg mx-auto p-5 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl sm:text-lg font-bold" style={{ color: "var(--color-text)" }}>Profile</h1>
                <div className="w-9 h-9" />
              </div>

              <div className="flex flex-col items-center mb-8 sm:mb-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="relative group"
                  aria-label="Change avatar"
                >
                  <div
                    className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden transition-all duration-300 group-hover:opacity-80"
                    style={{
                      width: 104, height: 104, fontSize: "2.5rem",
                      background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                      boxShadow: "0 0 20px rgba(124, 92, 255, 0.3)",
                    }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Role</label>
                  <div className="px-4 py-3 sm:py-2.5 rounded-xl text-sm flex items-center gap-2"
                    style={{
                      background: "var(--color-input)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-muted)",
                    }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-primary)" }}></span>
                    {ROLE_LABELS[user.role] || user.role}
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3.5 sm:py-2.5 text-base sm:text-sm rounded-xl outline-none transition-all duration-200"
                    style={{
                      background: "var(--color-input)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 sm:py-2.5 text-base sm:text-sm rounded-xl outline-none transition-all duration-200"
                    style={{
                      background: "var(--color-input)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    placeholder="your@email.com"
                  />
                </div>

                {error && (
                  <div className="text-sm rounded-xl px-4 py-3" style={{
                    color: "var(--color-danger)",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.15)",
                  }}>{error}</div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3.5 sm:py-2.5 text-base sm:text-sm font-medium text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                    boxShadow: "0 4px 16px rgba(124, 92, 255, 0.25)",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  onClick={() => { logout(); router.push("/"); }}
                  className="w-full py-3.5 sm:py-2.5 text-base sm:text-sm font-medium rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{
                    color: "var(--color-danger)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
          <BottomTabBar />
        </div>
      </motion.div>
    </div>
  );
}

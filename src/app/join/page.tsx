"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import AuroraBackground from "@/components/reactbits/AuroraBackground";

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [status, setStatus] = useState<
    "idle" | "joining" | "success" | "error" | "no_code"
  >(searchParams.get("code") ? "idle" : "no_code");
  const [message, setMessage] = useState("");
  const [checkingChats, setCheckingChats] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkUserStatus = async () => {
      if (!user) return;

      const isManager = user.role === "admin" || user.role === "hr";
      if (isManager) {
        router.push("/chat");
        return;
      }

      const urlCode = searchParams.get("code");
      if (!urlCode) {
        setCheckingChats(true);
        try {
          const res = await fetch("/api/chat/conversations", {
            headers: { authorization: `Bearer ${token}` },
          });
          const data = await res.json();

          if (!isMounted) return;

          if (data.conversations && data.conversations.length > 0) {
            router.push("/chat");
          } else {
            setCheckingChats(false);
          }
        } catch (err) {
          if (isMounted) setCheckingChats(false);
        }
      }
    };

    if (!loading && user) {
      checkUserStatus();
    }

    if (!loading && !user) {
      const currentCode = searchParams.get("code");
      const redirectPath = currentCode
        ? `/join?code=${encodeURIComponent(currentCode)}`
        : "/join";
      router.push(`/?redirect=${encodeURIComponent(redirectPath)}`);
    }

    return () => {
      isMounted = false;
    };
  }, [user, loading, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("code") && user && status === "idle") {
      handleJoin();
    }
  }, [searchParams, user, status]);

  const handleJoin = async () => {
    if (!code.trim()) {
      return;
    }

    setStatus("joining");
    setMessage("");

    try {
      const res = await fetch("/api/chat/invite/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Invalid invitation code");
        return;
      }

      setStatus("success");
      setMessage("Successfully joined the conversation!");
      setTimeout(async () => {
        router.push("/chat");
      }, 1500);
    } catch {
      setStatus("error");
      setMessage("Failed to connect. Please try again.");
    }
  };

  if (loading || checkingChats || (user && status === "idle")) {
    return <SplashScreen message="جاري التحميل..." />;
  }

  if (!user) return null;

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden px-4"
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
        className="w-full sm:max-w-md relative z-10 sm:px-0"
      >
        <div
          className="sm:rounded-[28px] border-0 sm:border shadow-2xl overflow-hidden text-center sm:min-h-0 sm:h-auto"
          style={{
            background: "rgba(21, 26, 35, 0.75)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderColor: "rgba(124, 92, 255, 0.12)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,92,255,0.06) inset",
            minHeight: "100dvh",
            height: "100%",
          }}
        >
          <div className="hidden sm:block h-[3px] w-full relative overflow-hidden">
            <div className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-primary))",
                backgroundSize: "300% 100%",
                animation: "gradient-shift 4s ease infinite",
              }}
            />
            <style>{`@keyframes gradient-shift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }`}</style>
          </div>

          <div className="flex flex-col justify-center min-h-[100dvh] sm:min-h-0 px-5 sm:px-10 py-8">
            <AnimatePresence mode="wait">
              {status === "no_code" || status === "error" ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                      boxShadow: "0 8px 24px rgba(124, 92, 255, 0.25)",
                    }}
                  >
                    <svg width="36" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
                    </svg>
                  </motion.div>
                  <h4 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
                    Invitation Required
                  </h4>
                  <p className="text-sm sm:text-base mb-6" style={{ color: "var(--color-muted)" }}>
                    To join a conversation, you need an invitation link from your manager.
                  </p>

                  <AnimatePresence>
                    {status === "error" && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mb-4 p-3 text-sm rounded-xl"
                        style={{
                          color: "var(--color-danger)",
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.15)",
                        }}
                      >
                        {message}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mb-4 text-start">
                    <label className="block text-xs font-semibold mb-1.5 px-1 uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                      Or enter code manually
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3.5 sm:py-3 text-center font-mono text-xl sm:text-lg rounded-xl outline-none transition-all duration-200"
                      style={{
                        background: "var(--color-input)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                        letterSpacing: "0.15em",
                      }}
                      placeholder="Enter code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={8}
                    />
                  </div>
                  <button
                    className="w-full py-3.5 sm:py-2.5 font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                      boxShadow: "0 4px 16px rgba(124, 92, 255, 0.25)",
                    }}
                    onClick={handleJoin}
                    disabled={!code.trim()}
                  >
                    Join Chat
                  </button>
                </motion.div>
              ) : status === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(34, 197, 94, 0.15)" }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </motion.div>
                  <h4 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "#22c55e" }}>Welcome!</h4>
                  <p className="text-sm sm:text-base mb-0" style={{ color: "var(--color-text)" }}>
                    {message}
                  </p>
                  <p className="text-sm sm:text-base mt-1" style={{ color: "var(--color-muted)" }}>
                    Redirecting to chat...
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="joining"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                      boxShadow: "0 8px 24px rgba(124, 92, 255, 0.25)",
                    }}
                  >
                    <svg className="animate-spin w-8 h-8 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </motion.div>
                  <p className="text-sm sm:text-base" style={{ color: "var(--color-muted)" }}>
                    Joining conversation, please wait...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <SplashScreen message="جاري التحميل..." />
      }
    >
      <JoinContent />
    </Suspense>
  );
}

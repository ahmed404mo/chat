"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SocketProvider, useChat } from "@/context/SocketContext";
import { motion, AnimatePresence } from "framer-motion";
import ChatSidebar from "@/components/ChatSidebar";
import ChatWindow from "@/components/ChatWindow";
import BottomTabBar from "@/components/BottomTabBar";
import SplashScreen from "@/components/SplashScreen";
import AuroraBackground from "@/components/reactbits/AuroraBackground";

function ChatPageInner() {
  const { user, loading } = useAuth();
  const { activeConversation, setActiveConversation } = useChat();
  const router = useRouter();
  const synced = useRef(false);
  const [isRtl, setIsRtl] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const active = params.get("active");
      if (active) {
        setActiveConversation(active);
      }
    }
  }, [setActiveConversation]);

  useEffect(() => {
    if (synced.current && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (activeConversation) {
        if (params.get("active") !== activeConversation) {
          router.replace(`/chat?active=${activeConversation}`, { scroll: false });
        }
      } else {
        if (params.has("active")) {
          router.replace("/chat", { scroll: false });
        }
      }
    }
    synced.current = true;
  }, [activeConversation, router]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return <SplashScreen message="جاري تحميل المحادثات..." />;
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--color-bg)] flex items-center justify-center relative overflow-hidden sm:p-4 lg:p-6 font-sans text-[var(--color-text)]">
      {mounted && <AuroraBackground color="#7C5CFF" speed={0.2} />}

      <div className="noise-overlay" />

      <div
        className="w-full max-w-[1640px] h-[100dvh] sm:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 relative"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="flex-1 flex overflow-hidden min-h-0 ltr:flex-row rtl:flex-row-reverse"
          style={{ direction: "ltr" }}
        >
          {/* Mobile view */}
          <div className="flex sm:hidden w-full relative overflow-hidden">
            <AnimatePresence mode="wait">
              {!activeConversation ? (
                <motion.div
                  key="sidebar"
                  initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full shrink-0"
                >
                  <ChatSidebar />
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: isRtl ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 30 : -30 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full shrink-0"
                >
                  <ChatWindow onToggleSidebar={() => setActiveConversation(null)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop sidebar */}
          <motion.aside
            animate={{
              width: sidebarCollapsed ? 72 : 380,
              minWidth: sidebarCollapsed ? 72 : 380,
            }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hidden sm:flex flex-col overflow-hidden border-r border-[var(--color-border)]"
            style={{ background: "var(--color-sidebar)" }}
          >
            <ChatSidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </motion.aside>

          {/* Desktop chat window */}
          <main className="hidden sm:flex flex-1 flex-col overflow-hidden" style={{ background: "var(--color-bg)" }}>
            <ChatWindow onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
          </main>
        </div>

        <div
          className={`${activeConversation ? "sm:block hidden" : ""} pb-[env(safe-area-inset-bottom,0px)]`}
          style={{
            borderTop: "1px solid var(--color-border)",
            background: "var(--color-sidebar)",
          }}
        >
          <BottomTabBar />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <SocketProvider>
      <ChatPageInner />
    </SocketProvider>
  );
}

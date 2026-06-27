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

function ChatPageInner() {
  const { user, loading } = useAuth();
  const { activeConversation, setActiveConversation } = useChat(); 
  const router = useRouter();
  const synced = useRef(false);
  const [isRtl, setIsRtl] = useState(false);
  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
  }, []);

  // Read URL ?active= param on mount and set active conversation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const active = params.get("active");
      if (active) {
        setActiveConversation(active);
      }
    }
  }, [setActiveConversation]);

  // Sync activeConversation state → URL (without scroll)
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
    <div className="min-h-[100dvh] w-full theme-dark:bg-[#09090b] bg-[#f8fafc] flex items-center justify-center relative overflow-hidden sm:p-4 lg:p-8 font-sans theme-dark:text-white text-gray-900">
      <div className="absolute top-[-20%] ltr:left-[-10%] rtl:right-[-10%] w-[500px] h-[500px] theme-dark:bg-blue-600/20 bg-blue-400/20 rounded-full blur-[150px] pointer-events-none"></div>
      {/* <div className=""></div> */}

      <div className="w-full max-w-[1600px] h-[100dvh] sm:h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] theme-dark:bg-white/5 bg-white/70 backdrop-blur-2xl sm:border theme-dark:border-white/10 border-gray-200 sm:rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col overflow-hidden z-10 relative">
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Mobile view: animated switch */}
          <div className="flex sm:hidden w-full relative overflow-hidden">
            <AnimatePresence mode="wait">
              {!activeConversation ? (
                <motion.div
                  key="sidebar"
                  initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 30 : -30 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full shrink-0"
                >
                  <ChatSidebar />
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: isRtl ? -40 : 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? -40 : 40 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full shrink-0"
                >
                  <ChatWindow />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop view: side by side */}
          <aside className="hidden sm:flex sm:w-[380px] md:w-[420px] flex-shrink-0 ltr:sm:border-l rtl:sm:border-r theme-dark:border-white/10 border-gray-200 theme-dark:bg-black/20 bg-white/50 flex-col overflow-hidden">
            <ChatSidebar />
          </aside>

          <main className="hidden sm:flex flex-1 flex-col bg-transparent overflow-hidden">
            <ChatWindow />
          </main>
        </div>
        <div className={activeConversation ? "sm:block hidden" : ""}>
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

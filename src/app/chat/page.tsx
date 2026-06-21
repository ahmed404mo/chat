"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SocketProvider, useChat } from "@/context/SocketContext";
import ChatSidebar from "@/components/ChatSidebar";
import ChatWindow from "@/components/ChatWindow";
import BottomTabBar from "@/components/BottomTabBar";

function ChatPageInner() {
  const { user, loading } = useAuth();
  const { activeConversation, setActiveConversation } = useChat(); 
  const router = useRouter();
  const synced = useRef(false);

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
    return (
      <div className="min-h-[100dvh] flex items-center justify-center theme-dark:bg-[#09090b] bg-gray-50 relative overflow-hidden">
        <div className="absolute top-[-10%] ltr:left-[-10%] rtl:right-[-10%] w-96 h-96 bg-blue-600/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] ltr:right-[-10%] rtl:left-[-10%] w-96 h-96 bg-purple-600/30 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="flex flex-col items-center z-10 animate-fade-in-up">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-r-2 border-blue-500 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <div className="text-sm theme-dark:text-gray-400 text-gray-500 font-medium tracking-wide">Loading chats...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] w-full theme-dark:bg-[#09090b] bg-[#f8fafc] flex items-center justify-center relative overflow-hidden sm:p-4 lg:p-8 font-sans theme-dark:text-white text-gray-900">
      <div className="absolute top-[-20%] ltr:left-[-10%] rtl:right-[-10%] w-[500px] h-[500px] theme-dark:bg-blue-600/20 bg-blue-400/20 rounded-full blur-[150px] pointer-events-none"></div>
      {/* <div className=""></div> */}

      <div className="w-full max-w-[1600px] h-[100dvh] sm:h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] theme-dark:bg-white/5 bg-white/70 backdrop-blur-2xl sm:border theme-dark:border-white/10 border-gray-200 sm:rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col overflow-hidden z-10 relative">
        <div className="flex-1 flex overflow-hidden min-h-0">
          <aside
            className={`w-full sm:w-[380px] md:w-[420px] flex-shrink-0 sm:border-l theme-dark:border-white/10 border-gray-200 theme-dark:bg-black/20 bg-white/50 flex flex-col relative transition-all duration-300 overflow-hidden
              ${activeConversation ? "hidden sm:flex" : "flex"} 
            `}
          >
            <ChatSidebar />
          </aside>

          <main
            className={`flex-1 flex flex-col bg-transparent relative transition-all duration-300 overflow-hidden
              ${activeConversation ? "flex" : "hidden sm:flex"}
            `}
          >
            <ChatWindow />
          </main>
        </div>
        <BottomTabBar />
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

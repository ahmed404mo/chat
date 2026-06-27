"use client";

import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  {
    id: "chats",
    label: "Chats",
    path: "/chat",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "var(--color-primary)" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    path: "/profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "var(--color-primary)" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = pathname.startsWith("/profile") ? "profile" : "chats";

  return (
    <div 
      className="md:hidden flex items-center justify-around px-6 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] w-full" 
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => router.push(tab.path)}
            className={`flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all duration-200 relative active:scale-95 ${
              isActive ? "text-[var(--color-text)]" : "text-[var(--color-muted)]"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute -top-2 w-10 h-1 rounded-full"
                style={{ background: "var(--color-primary)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <div className={`transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
              {tab.icon(isActive)}
            </div>
            <span className={`text-[10px] font-medium tracking-wide transition-all duration-200 ${
              isActive ? "opacity-100" : "opacity-60"
            }`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
"use client";

import { useRouter, usePathname } from "next/navigation";

const tabs = [
  {
    id: "chats",
    label: "Chats",
    path: "/chat",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    path: "/profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="flex items-center justify-around px-6 py-2 theme-dark:bg-black/40 bg-white/80 backdrop-blur-2xl border-t theme-dark:border-white/10 border-gray-200">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => router.push(tab.path)}
            className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all duration-300 relative ${
              isActive
                ? "theme-dark:text-white text-gray-900"
                : "theme-dark:text-gray-500 text-gray-400"
            }`}
          >
            {isActive && (
              <span className="absolute -top-2 w-8 h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            )}
            <div className={`transition-transform duration-300 ${isActive ? "scale-110" : ""}`}>
              {tab.icon(isActive)}
            </div>
            <span className={`text-[10px] font-semibold tracking-wide transition-all duration-300 ${
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

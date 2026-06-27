"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AvatarUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastActive?: string;
}

interface AvatarGroupProps {
  users: AvatarUser[];
  maxVisible?: number;
  size?: number;
  ringColor?: string;
  showStatusRing?: boolean;
  className?: string;
}

export default function AvatarGroup({
  users,
  maxVisible = 5,
  size = 40,
  ringColor = "var(--color-primary)",
  showStatusRing = true,
  className,
}: AvatarGroupProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRtl, setIsRtl] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
  }, []);

  const visible = users.slice(0, maxVisible);
  const overflowCount = users.length - maxVisible;
  const overlap = size * 0.25;

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ direction: "ltr" }}
    >
      <div className="flex items-center" style={{ direction: isRtl ? "rtl" : "ltr" }}>
        {visible.map((user, i) => (
          <div
            key={user.id}
            className="relative shrink-0 transition-transform duration-200 hover:scale-110 hover:z-10"
            style={{
              ...(isRtl
                ? { marginRight: i === 0 ? 0 : -overlap }
                : { marginLeft: i === 0 ? 0 : -overlap }
              ),
              zIndex: visible.length - i,
            }}
            title={user.name}
          >
              {showStatusRing && (
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 40 40"
                  style={{ filter: "drop-shadow(0 0 4px rgba(124,92,255,0.3))" }}
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="17"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="2.5"
                    strokeDasharray={`${user.isOnline ? 106.8 : 0} 106.8`}
                    strokeLinecap="round"
                    opacity={user.isOnline ? 0.8 : 0.15}
                    className="transition-all duration-500"
                  />
                </svg>
              )}
              <div
                className="rounded-full overflow-hidden ring-2 ring-[var(--color-surface)] flex items-center justify-center font-bold text-white shrink-0"
                style={{ width: size, height: size, fontSize: size * 0.4 }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] w-full h-full flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {user.isOnline && (
                <span
                  className="absolute bottom-0 right-0 border-2 border-[var(--color-surface)] rounded-full bg-[var(--color-online)]"
                  style={{ width: size * 0.3, height: size * 0.3 }}
                />
              )}
            </div>
          ))}
        {overflowCount > 0 && (
          <div
            className="relative shrink-0 rounded-full flex items-center justify-center font-bold select-none"
            style={{
              width: size,
              height: size,
              ...(isRtl
                ? { marginRight: -overlap }
                : { marginLeft: -overlap }
              ),
              fontSize: size * 0.35,
              background: "var(--color-active)",
              color: "var(--color-primary)",
              border: "2px solid var(--color-surface)",
            }}
            title={`${overflowCount} more`}
          >
            +{overflowCount}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute top-full mt-2 z-50 min-w-[200px] rounded-2xl p-2 shadow-[0_8px_32px_rgba(0,0,0,0.32)] backdrop-blur-2xl",
              "border border-[var(--color-border)]",
              isRtl ? "right-0" : "left-0",
            )}
            style={{ background: "var(--color-card)" }}
          >
            <div className="space-y-1">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--color-hover)] transition-colors cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <div
                      className="rounded-full overflow-hidden flex items-center justify-center font-bold text-white"
                      style={{ width: 32, height: 32, fontSize: 13 }}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] w-full h-full flex items-center justify-center">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {user.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--color-online)] border-2 border-[var(--color-card)] rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--color-text)] truncate">
                      {user.name}
                    </div>
                    {user.lastActive && (
                      <div className="text-xs text-[var(--color-muted)] truncate">
                        {formatLastActive(user.lastActive)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatLastActive(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

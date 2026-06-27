"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  LogOut,
  User,
  Mail,
  Shield,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";

// A simple, reusable list item component for the profile page
function ProfileListItem({
  icon,
  label,
  value,
  isButton = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  isButton?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileTap={
        isButton ? { scale: 0.97, backgroundColor: "var(--color-hover)" } : {}
      }
      onClick={onClick}
      className={`flex items-center justify-between p-4 rounded-xl transition-colors ${isButton ? "cursor-pointer hover:bg-[var(--color-hover)]" : ""}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--color-input)] text-[var(--color-muted)]">
          {icon}
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted)]">{label}</p>
          <p className="text-sm font-medium text-[var(--color-text)]">
            {value}
          </p>
        </div>
      </div>
      {isButton && (
        <ChevronRight size={18} className="text-[var(--color-muted)]" />
      )}
    </motion.div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!user) {
    // Optional: redirect or show a loading state if user is not available yet
    return null;
  }

  return (
    <div className="h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center text-center py-8"
        >
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl text-white bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] ring-4 ring-[var(--color-surface)]">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-sm text-[var(--color-muted)] capitalize">
            {user.role}
          </p>
        </motion.div>

        {/* Profile Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-2 bg-[var(--color-surface)] p-2 rounded-2xl border border-[var(--color-border)]"
        >
          <ProfileListItem
            icon={<User size={20} />}
            label="Full Name"
            value={user.name}
          />
          <ProfileListItem
            icon={<Mail size={20} />}
            label="Email Address"
            value={user.email}
          />
          <ProfileListItem
            icon={<Shield size={20} />}
            label="Role"
            value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          />
        </motion.div>

        {/* Actions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 space-y-2 bg-[var(--color-surface)] p-2 rounded-2xl border border-[var(--color-border)]"
        >
          <ProfileListItem
            icon={<MessageSquare size={20} />}
            label="Back to Chat"
            isButton
            onClick={() => router.push("/chat")}
          />
          <div className="px-4">
            <div className="h-px bg-[var(--color-border)]" />
          </div>
          <ProfileListItem
            icon={<LogOut size={20} />}
            label="Logout"
            isButton
            onClick={handleLogout}
          />
        </motion.div>
      </div>
    </div>
  );
}

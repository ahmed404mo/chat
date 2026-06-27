"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
  isOwn?: boolean;
}

export default function ContextMenu({ x, y, actions, onClose, isOwn }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [focusedIndex, setFocusedIndex] = useState(0);

  const reposition = useCallback(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 16;
    const maxY = window.innerHeight - rect.height - 16;
    setPosition({
      x: Math.min(x, maxX),
      y: Math.min(y, maxY),
    });
  }, [x, y]);

  useEffect(() => {
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [reposition]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex((prev) => (prev + 1) % actions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex((prev) => (prev - 1 + actions.length) % actions.length); return; }
      if (e.key === "Enter") { e.preventDefault(); actions[focusedIndex]?.onClick(); onClose(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [actions, focusedIndex, onClose]);

  return (
    <motion.div
      ref={menuRef}
      role="menu"
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-[9999] min-w-[200px] rounded-xl border shadow-2xl overflow-hidden py-1"
      style={{
        left: position.x,
        top: position.y,
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {actions.map((action, i) => (
        <button
          key={action.id}
          role="menuitem"
          tabIndex={focusedIndex === i ? 0 : -1}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
            focusedIndex === i ? "bg-[var(--color-active)]" : "hover:bg-[var(--color-hover)]"
          } ${action.danger ? "text-red-400" : "text-[var(--color-text)]"}`}
          onClick={() => { action.onClick(); onClose(); }}
          onMouseEnter={() => setFocusedIndex(i)}
        >
          {action.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{action.icon}</span>}
          <span>{action.label}</span>
        </button>
      ))}
    </motion.div>
  );
}

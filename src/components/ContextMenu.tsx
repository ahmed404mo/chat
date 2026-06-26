"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
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
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']");
      if (!items?.length) return;
      const current = document.activeElement;
      const currentIndex = Array.from(items).indexOf(current as HTMLButtonElement);
      const nextIndex = e.key === "ArrowDown"
        ? Math.min(currentIndex + 1, items.length - 1)
        : Math.max(currentIndex - 1, 0);
      items[nextIndex]?.focus();
    }
  }, [onClose]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, handleKeyDown]);

  useEffect(() => {
    const first = listRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']");
    first?.focus();
  }, []);

  const menuX = Math.min(x, window.innerWidth - 240);
  const menuY = Math.min(y, window.innerHeight - actions.length * 44 - 16);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        role="menu"
        aria-label="Message actions"
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ left: menuX, top: menuY }}
        className="fixed z-[9999] min-w-[200px] overflow-hidden rounded-2xl border theme-dark:border-white/[0.08] border-gray-200 theme-dark:bg-[#1a1a2e]/95 bg-white/95 backdrop-blur-2xl shadow-2xl"
      >
        <ul ref={listRef} className="py-1.5">
          {actions.map((action) => (
            <li key={action.id}>
              {action.divider && (
                <div className="mx-3 my-1.5 h-px theme-dark:bg-white/[0.06] bg-gray-200" />
              )}
              <button
                role="menuitem"
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150
                  ${action.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "theme-dark:text-gray-200 text-gray-700 hover:theme-dark:bg-white/[0.06] hover:bg-gray-100"
                  }`}
              >
                <span className="text-base w-5 text-center shrink-0">{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A focus-trapping modal built on a native <dialog> element for free
 * accessibility semantics (top-layer stacking, Escape-to-close, inert
 * background) rather than reimplementing a portal + aria-modal from
 * scratch.
 */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    node.addEventListener("cancel", handleCancel);
    return () => node.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      aria-describedby={description ? "dialog-description" : undefined}
      className="m-auto rounded-2xl border-0 bg-transparent p-0 backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn("w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900", className)}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="dialog-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </h2>
                {description && (
                  <p id="dialog-description" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>,
    document.body,
  );
}

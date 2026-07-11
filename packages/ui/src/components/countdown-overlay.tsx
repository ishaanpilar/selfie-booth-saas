"use client";

import { AnimatePresence, motion } from "framer-motion";

/** Overlays a live camera preview with a big countdown number and a brief
 * white flash at zero — shared by every capture surface (apps/lite,
 * apps/web's booth flow) so the "about to be photographed" moment feels
 * identical across the whole product. */
export function CountdownOverlay({ secondsRemaining }: { secondsRemaining: number | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {secondsRemaining !== null && secondsRemaining > 0 && (
          <motion.span
            key={secondsRemaining}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-9xl font-bold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
          >
            {secondsRemaining}
          </motion.span>
        )}
        {secondsRemaining === 0 && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 bg-white"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

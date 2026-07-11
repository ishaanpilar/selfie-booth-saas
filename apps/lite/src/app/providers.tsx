"use client";

import type { ReactNode } from "react";
import { ThemeProvider, ToastProvider } from "@selfie-booth/ui";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Selfie Booth",
    template: "%s · Selfie Booth",
  },
  description: "Enterprise multi-tenant selfie booth platform for events.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Selfie Booth",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

// Runs before hydration to set the `dark` class synchronously, avoiding a
// flash of the wrong theme on kiosk devices that stay on the same page for
// hours (ThemeProvider's own effect would otherwise run one paint late).
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('selfie-booth-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {children}
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}

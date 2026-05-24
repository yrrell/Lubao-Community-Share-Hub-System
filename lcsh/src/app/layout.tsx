// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lubao Community Share Hub",
  description: "Borrow and lend tools within the Lubao, Pampanga community.",
  applicationName: "Lubao Share Hub",
};

// Fixed viewport – no user zoom on mobile
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${sora.variable}`} suppressHydrationWarning>
      {/* Inline script prevents dark-mode flash before React hydrates */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('lsh-theme');
                const d = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (t === 'dark' || (!t && d)) document.documentElement.classList.add('dark');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 antialiased font-sans transition-colors duration-200">
        <ThemeProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "500",
              },
              success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

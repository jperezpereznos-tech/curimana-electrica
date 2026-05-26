import type { Metadata } from "next";
import { Playfair_Display, Nunito_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SerwistProvider } from "@serwist/turbopack/react"
import { AuthProvider } from "@/hooks/use-auth";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Curimana Eléctrica",
  description: "Sistema Eléctrico Municipal de Curimana",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0a4a3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${nunitoSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
          Saltar al contenido
        </a>
        <ThemeProvider>
          <SerwistProvider swUrl="/serwist/sw.js">
            <AuthProvider>
              {children}
              <PWAInstallPrompt />
              <Toaster position="top-right" richColors closeButton />
            </AuthProvider>
          </SerwistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

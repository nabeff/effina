import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nabil Effina",
  description: "Bills first, then the rest split into envelopes so every dirham has a job.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nabil Effina",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <Providers>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-center" />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}

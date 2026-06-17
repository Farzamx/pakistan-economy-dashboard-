import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CreatorBadge from "@/components/CreatorBadge";
import GalaxyBackground from "@/components/GalaxyBackground";
import MotionProvider from "@/components/MotionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pakistan Economic Intelligence Center",
  description:
    "A futuristic dashboard tracking Pakistan's key economic indicators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        {/* Runs synchronously before first paint — reads localStorage and sets
            data-theme on <html> so there is never a flash of wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('dashboard-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <GalaxyBackground />
          <MotionProvider>
            {children}
            <CreatorBadge />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

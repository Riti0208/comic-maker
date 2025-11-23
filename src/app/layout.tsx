import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "4コマメイカー",
  description: "AIで4コマ漫画を簡単に作成できるツール",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://comic-maker-three.vercel.app',
    title: '4コマメイカー',
    description: 'AIで4コマ漫画を簡単に作成できるツール',
    siteName: '4コマメイカー',
    images: [
      {
        url: '/ogp.jpg',
        width: 1200,
        height: 630,
        alt: '4コマメイカー - AIで4コマ漫画を簡単作成',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '4コマメイカー',
    description: 'AIで4コマ漫画を簡単に作成できるツール',
    images: ['/ogp.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

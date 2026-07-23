import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "주유소알리미 - 내 주변 저가 주유소",
  description: "현재 위치 기준 가장 저렴한 주유소 TOP5를 찾아드립니다",
};

export const viewport: Viewport = {
  themeColor: "#262626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

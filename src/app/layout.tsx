import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SITE, URL_SITUS } from "@/lib/site-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITUS),
  title: SITE.namaAplikasi,
  description: `Sistem absensi berbasis QR Code dengan kamera scanner untuk Perangkat Desa ${SITE.namaDesa}, Kecamatan ${SITE.kecamatan}, Kabupaten ${SITE.kabupaten}.`,
  keywords: ["absensi desa", "QR code", "perangkat desa", SITE.namaDesa, SITE.kecamatan, SITE.kabupaten],
  authors: [{ name: SITE.pemerintahDesa }],
  icons: {
    icon: SITE.logo,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

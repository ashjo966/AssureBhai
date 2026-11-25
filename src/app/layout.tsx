import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Satisfy } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const satisfy = Satisfy({
  variable: "--font-satisfy",
  subsets: ["latin"],
  weight: "400",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://assurebhai-production.up.railway.app"),
  title: "AssureBhai - Your Insurance Policy, Simplified",
  description:
    "Stress-test your Health and Life insurance policies against official and hyperlocal Indian government statistics.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "AssureBhai - Your Insurance Policy, Simplified",
    description:
      "Stress-test your Health and Life insurance policies against official and hyperlocal Indian government statistics.",
    url: "https://assurebhai-production.up.railway.app",
    siteName: "AssureBhai",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AssureBhai - Your Insurance Policy, Simplified",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AssureBhai - Your Insurance Policy, Simplified",
    description:
      "Stress-test your Health and Life insurance policies against official and hyperlocal Indian government statistics.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${satisfy.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col w-full max-w-full overflow-x-hidden">
        {umamiWebsiteId && (
          <Script
            src="https://cloud.umami.is/script.js"
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        )}
        {children}
      </body>
    </html>
  );
}

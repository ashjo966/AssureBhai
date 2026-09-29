import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://assurebhai.com"),
  title: "AssureBhai | Professional AI Insurance Policy Analysis & Simplified Evaluations",
  description: "Upload your health or term life insurance policy PDF to analyze clauses, check IRDAI claim settlement ratios, and verify solvency benchmarks with online search grounding.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "AssureBhai | Professional AI Insurance Policy Analysis & Simplified Evaluations",
    description: "Upload your policy PDF to analyze terms, uncover hidden clauses, and verify statutory IRDAI benchmarks instantly using AI.",
    url: "https://assurebhai.com",
    siteName: "AssureBhai",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://assurebhai.com/OG_AssureBhai.jpg",
        width: 1200,
        height: 630,
        alt: "AssureBhai - AI Insurance Policy Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AssureBhai | Professional AI Insurance Policy Analysis & Simplified Evaluations",
    description: "Upload your policy PDF to analyze terms, uncover hidden clauses, and verify statutory IRDAI benchmarks instantly using AI.",
    images: ["https://assurebhai.com/OG_AssureBhai.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

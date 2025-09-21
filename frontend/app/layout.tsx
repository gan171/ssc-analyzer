import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import PageProgressBar from "../components/PageProgressBar"; // <-- IMPORT

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SSC Analyzer",
  description: "Analyze your SSC mock test performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-gray-100`}>
        <PageProgressBar /> {/* <-- ADD COMPONENT HERE */}
        <nav className="bg-gray-800 shadow-md">
          <div className="container mx-auto px-6 py-3 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white hover:text-indigo-400">
              SSC Analyzer
            </Link>
            <div className="flex space-x-4">
              <Link href="/dashboard" className="px-3 py-2 text-gray-300 rounded-md hover:bg-gray-700 hover:text-white">
                Dashboard
              </Link>
              <Link href="/report" className="px-3 py-2 text-gray-300 rounded-md hover:bg-gray-700 hover:text-white">
                Performance Report
              </Link>
            </div>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MockPal",
  description: "dynamic voice interviews powered by ai",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-[#FAF6F1] text-[#1A1A1A] antialiased`}>
        {children}
      </body>
    </html>
  );
}

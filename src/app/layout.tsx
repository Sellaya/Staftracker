import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Staff Tracker",
  description: "Hospitality staffing, shift operations, and timesheet tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans text-[15px] font-normal leading-[1.55] text-foreground">
        {children}
      </body>
    </html>
  );
}

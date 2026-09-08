import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlassPortal — B2B Client Delivery",
  description:
    "Notion-driven B2B client delivery & proposal portal with executive light aesthetics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="relative z-[1] min-h-screen bg-[#F9FAFB] font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

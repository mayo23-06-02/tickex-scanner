import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Tickex Scanner",
  description: "Event ticket scanner",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tickex Scan",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-black text-slate-900 font-sans overflow-hidden">
      {/* 
        This layout is purposely minimal and specific to the scanner 
        to avoid inheriting the main dashboard chrome (sidebar, etc).
      */}
      {children}
    </div>
  );
}

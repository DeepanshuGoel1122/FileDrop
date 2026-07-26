"use client";

import Link from "next/link";
import { DownloadCloud, Info } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPwaInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsPwaInstallable(false);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary/20 p-2 rounded-xl group-hover:bg-primary/30 transition-colors">
            <DownloadCloud className="w-6 h-6 text-primary" />
          </div>
          <span className="font-outfit font-bold text-xl tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            FileDrop
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/about" className="text-sm font-medium text-white/60 hover:text-white transition-colors flex items-center gap-1.5 hidden sm:flex">
            <Info className="w-4 h-4" />
            About
          </Link>
          {isPwaInstallable && (
            <button 
              onClick={handleInstallClick}
              className="glass-button text-xs font-semibold px-4 py-2 rounded-full hidden sm:block"
            >
              Install App
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

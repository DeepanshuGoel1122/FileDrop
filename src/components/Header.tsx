"use client";

import Link from "next/link";
import { DownloadCloud, Info } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    }

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
    } else {
      alert("To install this app:\n\nOn iOS Safari: Tap the Share button and select 'Add to Home Screen'.\nOn Android/Desktop Chrome: Look for the Install icon in the address bar or browser menu.");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary/20 p-2 rounded-xl group-hover:bg-primary/30 transition-colors">
            <DownloadCloud className="w-6 h-6 text-primary" />
          </div>
          <span className="font-outfit font-bold text-xl tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            FileDrop
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {!isStandalone && (
            <button 
              onClick={handleInstallClick}
              className="glass-button text-xs font-semibold px-4 py-2 rounded-full"
            >
              Install App
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

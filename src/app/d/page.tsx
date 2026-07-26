"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Lock, Loader2, X, ArrowRight, Server, Link as LinkIcon, Shield } from "lucide-react";
import { generateRoomName } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function DirectLanding() {
  const router = useRouter();
  
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  
  const [roomName, setRoomName] = useState("");
  const [joinRoomName, setJoinRoomName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDirectCreateClick = () => {
    setRoomName(generateRoomName());
    setIsDirectModalOpen(true);
    setPassword("");
    setError("");
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    const formattedName = roomName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!formattedName) {
      setError("Room name cannot be empty.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data: existingRoom } = await supabase.from("rooms").select("id, expires_at").eq("name", formattedName).single();
      if (existingRoom) {
        if (new Date(existingRoom.expires_at) < new Date()) {
          await supabase.from("rooms").delete().eq("name", formattedName);
        } else {
          setError("This room name is currently active. Please choose another.");
          setIsLoading(false);
          return;
        }
      }

      // Direct rooms expire in 24 hours by default as a safety net
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error: dbError } = await supabase
        .from("rooms")
        .insert([{ name: formattedName, password_hash: passwordHash, expires_at: expiresAt.toISOString() }]);

      if (dbError) {
        console.error(dbError);
        setError("Failed to create direct room. Please try again.");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem(`direct_pwd_${formattedName}`, password);
      sessionStorage.setItem(`direct_host_${formattedName}`, "true");
      router.push(`/d/${formattedName}`);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <section className="w-full max-w-5xl mx-auto flex flex-col items-center text-center pt-12 pb-20 relative z-10">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 hover:bg-white/10 transition-colors text-sm font-medium text-white/80"
        >
          <ArrowRight className="w-4 h-4 rotate-180" /> Back to Standard Mode
        </Link>
        
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
          <Zap className="w-10 h-10 text-emerald-400" />
        </div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight font-outfit mb-6 bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
        >
          Direct Mode
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-white/60 max-w-2xl mb-12"
        >
          Peer-to-peer file sharing powered by WebRTC. Files transfer directly between devices, completely bypassing our servers. No file size limits. Maximum speed.
        </motion.p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap justify-center w-full max-w-lg">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={handleDirectCreateClick}
            className="flex-1 w-full glass-card flex justify-center items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all duration-300 group"
          >
            Create Direct
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={() => setIsJoinModalOpen(true)}
            className="flex-1 w-full glass-card flex justify-center items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-white/10 hover:border-white/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group border-white/10"
          >
            Join Direct
          </motion.button>
        </div>
      </section>

      <section className="w-full max-w-5xl mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="glass-card p-6 flex flex-col items-start text-left border-emerald-500/10"
          >
            <div className="p-3 bg-emerald-500/10 rounded-xl mb-4 border border-emerald-500/20">
              <Server className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white/90">Zero Server Storage</h3>
            <p className="text-white/50 leading-relaxed text-sm">
              Your files are never uploaded to a server. They stream directly from your browser to the recipient's browser.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="glass-card p-6 flex flex-col items-start text-left border-emerald-500/10"
          >
            <div className="p-3 bg-emerald-500/10 rounded-xl mb-4 border border-emerald-500/20">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white/90">Maximum Privacy</h3>
            <p className="text-white/50 leading-relaxed text-sm">
              Since files transfer directly between devices, there is zero risk of data leaks. When you close the tab, the room vanishes.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="glass-card p-6 flex flex-col items-start text-left border-emerald-500/10"
          >
            <div className="p-3 bg-emerald-500/10 rounded-xl mb-4 border border-emerald-500/20">
              <LinkIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white/90">No Size Limits</h3>
            <p className="text-white/50 leading-relaxed text-sm">
              Share files of any size. Whether it's a 10MB document or a 50GB video project, Direct Mode handles it instantly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px]" />
      </div>

      {/* Direct Create Modal */}
      <AnimatePresence>
        {isDirectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDirectModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 relative z-10"
            >
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/30 rounded-full blur-[3xl]" />
              </div>
              
              <button 
                onClick={() => setIsDirectModalOpen(false)}
                className="absolute top-4 right-4 p-1 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-6 mt-2 relative z-10">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                  <Zap className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold font-outfit text-white mb-1">Create Direct Room</h2>
                <p className="text-white/60 text-sm">
                  Peer-to-peer file sharing. No limits, no storage.
                </p>
              </div>

              <form onSubmit={handleDirectSubmit} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1 ml-1">Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/40 font-mono text-sm"
                    placeholder="e.g. fast-transfer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1 ml-1">Password</label>
                  <input
                    type="password"
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/40"
                    autoFocus
                  />
                  {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mt-4">
                  <p className="text-xs text-emerald-400/90 leading-relaxed text-center">
                    Files sent in Direct mode bypass the server entirely. You must keep the window open while sharing!
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-4 bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Sharing Direct"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 relative overflow-hidden z-10"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/30 rounded-full blur-[3xl] pointer-events-none" />
              <button onClick={() => setIsJoinModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white bg-white/5 p-1 rounded-full transition-colors z-20">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center text-center mb-6 mt-2">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                   <ArrowRight className="w-6 h-6 text-white/60" />
                </div>
                <h2 className="text-2xl font-bold font-outfit text-white mb-1">Join Direct Room</h2>
                <p className="text-white/60 text-sm">Enter the room name to join</p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (joinRoomName.trim()) {
                  router.push(`/d/${joinRoomName.trim().toLowerCase()}`);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5 ml-1">Room Name</label>
                  <input
                    type="text"
                    value={joinRoomName}
                    onChange={(e) => setJoinRoomName(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="e.g. bold-tree"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={!joinRoomName.trim()}
                  className="glass-button w-full py-3 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  Join Room
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    <Footer />
    </>
  );
}

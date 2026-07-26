"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Clock, Zap, ArrowRight, Lock, Loader2, X, ChevronDown, Share2 } from "lucide-react";
import { generateRoomName } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";

export default function Home() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinRoomName, setJoinRoomName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [password, setPassword] = useState("");
  const [expiryDays, setExpiryDays] = useState(1); // 1 = 24h
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isExpiryDropdownOpen, setIsExpiryDropdownOpen] = useState(false);

  const expiryOptions = [
    { value: 1, label: "24 Hours" },
    { value: 3, label: "3 Days" },
    { value: 7, label: "7 Days" },
    { value: 15, label: "15 Days" },
    { value: 30, label: "30 Days" }
  ];

  const [isGeneratingName, setIsGeneratingName] = useState(false);

  const handleCreateRoomClick = async () => {
    setIsGeneratingName(true);
    let newName = generateRoomName();
    let isUnique = false;

    while (!isUnique) {
      const { data } = await supabase.from("rooms").select("id, expires_at").eq("name", newName).single();
      if (data) {
        if (new Date(data.expires_at) < new Date()) {
          // It's expired, we can take over the name by deleting it first
          await supabase.from("rooms").delete().eq("name", newName);
          isUnique = true;
        } else {
          // Already active, generate another one
          newName = generateRoomName();
        }
      } else {
        // Name is unique
        isUnique = true;
      }
    }

    setRoomName(newName);
    setIsModalOpen(true);
    setPassword("");
    setError("");
    setExpiryDays(1);
    setIsGeneratingName(false);
  };

  const handleDirectCreateClick = () => {
    router.push('/d');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
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
          // Overwrite expired room
          await supabase.from("rooms").delete().eq("name", formattedName);
        } else {
          setError("This room name is currently active. Please choose another.");
          setIsLoading(false);
          return;
        }
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expiryDays));

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
        setError("Failed to create room. Please try again.");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem(`room_pwd_${formattedName}`, password);
      router.push(`/${formattedName}`);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      title: "No Login Required",
      description: "Start sharing instantly without creating an account. Privacy and simplicity first."
    },
    {
      icon: <Clock className="w-6 h-6 text-rose-400" />,
      title: "Auto-Delete",
      description: "Shared files are automatically deleted after your selected time, keeping data secure."
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Instant Sharing",
      description: "Share files, text, and URLs instantly with a unique readable room link."
    },
    {
      icon: <Share2 className="w-6 h-6 text-blue-400" />,
      title: "Direct Mode (P2P)",
      description: "Send massive files directly between browsers. No size limits, zero server storage."
    }
  ];

  return (
    <>
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <section className="w-full max-w-5xl mx-auto flex flex-col items-center text-center pt-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-sm font-medium text-white/80">Secure, Ephemeral Sharing</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight font-outfit mb-6 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent"
        >
          Share files securely, <br className="hidden md:block" /> without a trace.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-white/60 max-w-2xl mb-12"
        >
          Create temporary spaces to share files, text, and URLs with anyone. 
          No registration required. Everything is destroyed automatically.
        </motion.p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap justify-center">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={handleCreateRoomClick}
            disabled={isGeneratingName}
            className="glass-button flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 group disabled:opacity-50"
          >
            {isGeneratingName ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Preparing...
              </>
            ) : (
              <>
                Create Room
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={() => setIsJoinModalOpen(true)}
            className="glass-card flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-white/10 hover:border-white/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group border-white/10"
          >
            Join Room
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            onClick={handleDirectCreateClick}
            className="glass-card flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all duration-300 group"
          >
            Direct
          </motion.button>
        </div>
      </section>

      <section className="w-full max-w-5xl mx-auto py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
              className="glass-card p-6 flex flex-col items-start text-left"
            >
              <div className="p-3 bg-white/5 rounded-xl mb-4 border border-white/5">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white/90">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 relative z-10"
            >
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/30 rounded-full blur-[3xl]" />
              </div>
              
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-6 mt-2">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 border border-primary/30">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-outfit text-white mb-1">Secure Your Room</h2>
                <p className="text-white/60 text-sm">
                  Customize the generated room name if you like.
                </p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1 ml-1">Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/40 font-mono text-sm"
                    placeholder="e.g. my-secret-room"
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
                
                <div className="relative">
                  <label className="block text-xs font-medium text-white/60 mb-1 ml-1">Auto-Delete Expiry</label>
                  <div 
                    className="relative"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setIsExpiryDropdownOpen(false);
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsExpiryDropdownOpen(!isExpiryDropdownOpen)}
                      className="glass-input w-full px-4 py-3 rounded-xl text-white text-left flex items-center justify-between transition-colors hover:bg-white/5 focus:bg-white/5 outline-none"
                    >
                      <span>{expiryOptions.find(opt => opt.value === expiryDays)?.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpiryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isExpiryDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 w-full mt-2 py-2 bg-zinc-900/95 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 shadow-2xl"
                        >
                          {expiryOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setExpiryDays(option.value);
                                setIsExpiryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/10 flex items-center justify-between ${
                                expiryDays === option.value ? 'bg-primary/20 text-primary font-medium' : 'text-white/80'
                              }`}
                            >
                              {option.label}
                              {expiryDays === option.value && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="glass-button w-full py-3 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Create & Enter Room"
                  )}
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
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/30 rounded-full blur-[3xl] pointer-events-none" />
              <button onClick={() => setIsJoinModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white bg-white/5 p-1 rounded-full transition-colors z-20">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center text-center mb-6 mt-2">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                   <ArrowRight className="w-6 h-6 text-white/60" />
                </div>
                <h2 className="text-2xl font-bold font-outfit text-white mb-1">Join Room</h2>
                <p className="text-white/60 text-sm">Enter the room name to join</p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (joinRoomName.trim()) {
                  router.push(`/${joinRoomName.trim().toLowerCase()}`);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5 ml-1">Room Name</label>
                  <input
                    type="text"
                    value={joinRoomName}
                    onChange={(e) => setJoinRoomName(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-primary/50"
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDirectRoom } from "@/hooks/useDirectRoom";
import { useDropzone } from "react-dropzone";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Copy, Check, Lock, Loader2, X, Download, FileIcon, Users, Zap, Trash2
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

export default function DirectRoom() {
  const { roomName } = useParams();
  const router = useRouter();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // We determine if we are the host if we have the direct_host flag
  const [isHost, setIsHost] = useState(false);
  const [localPeerId, setLocalPeerId] = useState("");

  useEffect(() => {
    // Check if we are the host who created the room
    const hostFlag = sessionStorage.getItem(`direct_host_${roomName}`);
    if (hostFlag === "true") {
      setIsHost(true);
      setIsAuthenticated(true); // Host is automatically authenticated
    }
    
    // Check if we have a saved password
    const savedPwd = sessionStorage.getItem(`direct_pwd_${roomName}`);
    if (savedPwd) {
      setPassword(savedPwd);
    }
    
    // Generate a unique peer ID for this session
    setLocalPeerId(uuidv4());
  }, [roomName]);

  const { 
    files, 
    peers, 
    transfers, 
    error: signalingError, 
    hostLeft,
    addHostFiles,
    removeHostFile,
    requestDownload,
    cancelTransfer
  } = useDirectRoom(
    roomName as string, 
    localPeerId, 
    isHost
  );

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter a password");
      return;
    }
    
    setIsJoining(true);
    setError("");

    try {
      const { data: existingRoom, error: dbError } = await supabase.from("rooms").select("password_hash").eq("name", roomName).single();
      
      if (dbError || !existingRoom) {
        setError("Room not found or has been closed by the host.");
        setIsJoining(false);
        return;
      }
      
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (passwordHash !== existingRoom.password_hash) {
        setError("Incorrect password");
        setIsJoining(false);
        return;
      }
      
      sessionStorage.setItem(`direct_pwd_${roomName}`, password);
      setIsAuthenticated(true);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleCloseRoom = async () => {
    if (isHost) {
      await supabase.from("rooms").delete().eq("name", roomName);
      sessionStorage.removeItem(`direct_host_${roomName}`);
    }
    sessionStorage.removeItem(`direct_pwd_${roomName}`);
    router.push("/");
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!isHost) return;
    addHostFiles(acceptedFiles);
  }, [isHost, addHostFiles]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
    onDrop,
    noClick: true,
    noKeyboard: true 
  });

  const shareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (hostLeft) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold font-outfit text-white mb-2">Host Disconnected</h2>
          <p className="text-white/60 mb-6">The host has closed their browser or left the room. This direct sharing session has ended.</p>
          <button 
            onClick={() => router.push('/')}
            className="glass-button w-full py-3 rounded-xl font-bold"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isHost) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center flex flex-col items-center relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-[3xl] pointer-events-none" />
          
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
            <Lock className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold font-outfit text-white mb-2">Join Direct Room</h2>
          <p className="text-white/60 text-sm mb-6">Enter the room password to connect to the host.</p>
          
          <form onSubmit={handleJoinSubmit} className="w-full space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/40"
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-2 text-left ml-1">{error}</p>}
            </div>
            
            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex justify-center items-center disabled:opacity-50"
            >
              {isJoining ? <Loader2 className="w-5 h-5 animate-spin" /> : "Connect to Host"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!localPeerId) return null;

  return (
    <div {...getRootProps()} className={`flex-1 flex flex-col items-center p-4 md:p-8 transition-colors duration-300 ${isDragActive ? 'bg-primary/5' : ''}`}>
      <input {...getInputProps()} />
      
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 relative z-10">
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink min-w-0">
          <div className="h-10 px-3 sm:px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-mono text-emerald-400/90 font-medium truncate">{roomName}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-sm text-white/50 bg-white/5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/5 flex-shrink-0">
             <Users className="w-4 h-4" />
             <span>{peers.length}</span>
             <span className="hidden sm:inline">{peers.length === 1 ? 'Peer' : 'Peers'} Connected</span>
          </div>
        </div>

        <div className="flex gap-2">
           {isHost && (
             <button onClick={handleCloseRoom} className="px-3 py-1.5 flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-500/20">
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Close Room</span>
             </button>
           )}
           <button onClick={shareLink} className="px-3 py-1.5 flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors border border-white/5">
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isCopied ? "Copied" : "Share"}</span>
           </button>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        
        {/* Left Column: Info & Upload */}
        <div className="md:col-span-1 space-y-6">
           <div className="glass-card p-6 flex flex-col items-center text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Direct Mode Active</h3>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                 {isHost ? "You are the host. Files sent bypass the server. Keep this window open to continue sharing." : "You are connected directly to the host. Files will download over WebRTC."}
              </p>
              
              {isHost && (
                 <div className="w-full bg-white/5 p-4 rounded-xl border border-white/5 mb-6 flex justify-center">
                    <QRCodeSVG 
                      value={typeof window !== 'undefined' ? window.location.href : ''} 
                      size={140} 
                      bgColor="transparent" 
                      fgColor="#ffffff" 
                      level="L" 
                    />
                 </div>
              )}

              {isHost && (
                 <div 
                   onClick={open}
                   className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                 >
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mb-3">
                       <Zap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-white/90">Drag & Drop or Click</p>
                    <p className="text-xs text-white/50 mt-1">to select files</p>
                 </div>
              )}
           </div>
        </div>

        {/* Right Column: Files & Transfers */}
        <div className="md:col-span-2 space-y-6">
           {files.length === 0 ? (
              <div className="glass-card p-12 flex flex-col items-center text-center justify-center h-full border-dashed border-white/10">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <FileIcon className="w-8 h-8 text-white/30" />
                 </div>
                 <h3 className="text-lg font-medium text-white/90 mb-1">No files shared yet</h3>
                 <p className="text-sm text-white/50">
                    {isHost ? "Drag and drop files anywhere to start sharing." : "Waiting for the host to share files."}
                 </p>
              </div>
           ) : (
              <div className="glass-card p-2 overflow-hidden flex flex-col max-h-[600px]">
                 <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white/90">Shared Files ({files.length})</h3>
                 </div>
                 <div className="p-2 overflow-y-auto space-y-2">
                    {files.map(file => {
                       const transfer = transfers[file.id];
                       return (
                          <div key={file.id} className="bg-white/5 rounded-xl p-3 flex flex-col gap-3 border border-white/5">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                   <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                      <FileIcon className="w-5 h-5 text-emerald-400" />
                                   </div>
                                   <div className="flex flex-col overflow-hidden">
                                      <span className="text-sm font-medium text-white/90 truncate">{file.name}</span>
                                      <span className="text-xs text-white/50">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                   {isHost ? (
                                      <button onClick={() => removeHostFile(file.id)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-red-400">
                                         <X className="w-4 h-4" />
                                      </button>
                                   ) : (
                                      <button 
                                         onClick={() => requestDownload(file.id)} 
                                         disabled={!!transfer}
                                         className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                                      >
                                         <Download className="w-4 h-4" />
                                      </button>
                                   )}
                                </div>
                             </div>

                             {transfer && (
                                <div className="w-full flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                   <div className="flex justify-between items-center text-xs text-white/60">
                                      <div className="flex items-center gap-2">
                                         <span>{isHost ? "Uploading..." : "Downloading..."}</span>
                                         <button onClick={() => cancelTransfer(file.id)} className="p-0.5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white" title="Cancel Transfer">
                                            <X className="w-3 h-3" />
                                         </button>
                                      </div>
                                      <div className="flex gap-3">
                                         <span className="text-emerald-400 font-mono">{transfer.speedMbps.toFixed(1)} Mbps</span>
                                         <span>{Math.min(100, Math.round(transfer.progress))}%</span>
                                      </div>
                                   </div>
                                   <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                      <div 
                                         className="bg-emerald-500 h-full transition-all duration-300 relative" 
                                         style={{ width: `${Math.min(100, transfer.progress)}%` }}
                                      >
                                         <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite] -skew-x-12" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}></div>
                                      </div>
                                   </div>
                                </div>
                             )}
                          </div>
                       );
                    })}
                 </div>
              </div>
           )}
        </div>
      </div>
      
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-400/5 blur-[100px]" />
      </div>
    </div>
  );
}

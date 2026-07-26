"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Loader2, Copy, Trash2, File as FileIcon, Image as ImageIcon, Check, Paperclip, Send, Download, FileText, FileSpreadsheet, Video, AlertTriangle, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";

export default function RoomPage({ params }: { params: Promise<{ roomName: string }> }) {
  const resolvedParams = use(params);
  const roomName = resolvedParams.roomName;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [room, setRoom] = useState<any>(null);

  // Content state
  const [texts, setTexts] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [newText, setNewText] = useState("");
  const [isPostingText, setIsPostingText] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [page, setPage] = useState(0);
  const [hasMoreFiles, setHasMoreFiles] = useState(true);
  const [hasMoreTexts, setHasMoreTexts] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const PAGE_SIZE = 20;

  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  
  const abortControllers = useRef<{ [key: string]: AbortController }>({});
  const abortedUploads = useRef<Set<string>>(new Set());
  
  // Modal state
  const [isDestroyModalOpen, setIsDestroyModalOpen] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [isRoomExpiredModalOpen, setIsRoomExpiredModalOpen] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'file' | 'text', path?: string } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedPassword = sessionStorage.getItem(`room_pwd_${roomName}`);
    if (savedPassword) {
      verifyPassword(savedPassword);
    } else {
      setIsLoading(false);
    }
  }, [roomName]);

  const verifyPassword = async (pwd: string) => {
    setIsLoading(true);
    setError("");

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pwd);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: roomData, error: dbError } = await supabase
        .from("rooms")
        .select("*")
        .eq("name", roomName)
        .single();

      if (dbError || !roomData) {
        setError("Room not found or expired.");
        setIsLoading(false);
        return;
      }

      if (roomData.password_hash === passwordHash) {
        setRoom(roomData);
        setIsAuthenticated(true);
        fetchContent(roomData.id);
      } else {
        setError("Incorrect Password!");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContent = async (roomId: string) => {
    setPage(0);
    const { data: textData } = await supabase.from("texts").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).range(0, PAGE_SIZE - 1);
    if (textData) {
      setTexts(textData);
      setHasMoreTexts(textData.length === PAGE_SIZE);
    }

    const { data: fileData } = await supabase.from("files").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).range(0, PAGE_SIZE - 1);
    if (fileData) {
      setFiles(fileData);
      setHasMoreFiles(fileData.length === PAGE_SIZE);
    }
  };

  const fetchMoreContent = async () => {
    if (!room?.id || isFetchingMore) return;
    if (!hasMoreFiles && !hasMoreTexts) return;

    setIsFetchingMore(true);
    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let newTexts: any[] = [];
    let newFiles: any[] = [];

    if (hasMoreTexts) {
      const { data } = await supabase.from("texts").select("*").eq("room_id", room.id).order("created_at", { ascending: false }).range(from, to);
      if (data) {
        newTexts = data;
        setHasMoreTexts(data.length === PAGE_SIZE);
      }
    }

    if (hasMoreFiles) {
      const { data } = await supabase.from("files").select("*").eq("room_id", room.id).order("created_at", { ascending: false }).range(from, to);
      if (data) {
        newFiles = data;
        setHasMoreFiles(data.length === PAGE_SIZE);
      }
    }

    if (newTexts.length > 0) {
      setTexts(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const filtered = newTexts.filter(t => !existingIds.has(t.id));
        return [...prev, ...filtered];
      });
    }

    if (newFiles.length > 0) {
      setFiles(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const filtered = newFiles.filter(f => !existingIds.has(f.id));
        return [...prev, ...filtered];
      });
    }

    setPage(nextPage);
    setIsFetchingMore(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 150 && !isFetchingMore) {
      if (hasMoreFiles || hasMoreTexts) {
        fetchMoreContent();
      }
    }
  };

  useEffect(() => {
    if (!room?.id) return;

    const channelName = `room_${room.id}`;
    supabase.removeChannel(supabase.channel(channelName));

    const channel = supabase.channel(channelName);

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'texts', filter: `room_id=eq.${room.id}` }, (payload) => {
      setTexts((current) => {
        if (current.find(t => t.id === payload.new.id)) return current;
        return [payload.new, ...current];
      });
    });

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'files', filter: `room_id=eq.${room.id}` }, (payload) => {
      setFiles((current) => {
        if (current.find(f => f.id === payload.new.id)) return current;
        return [payload.new, ...current];
      });
    });

    channel.subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [room?.id]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPassword(password);
  };

  const shareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const confirmDestroyRoom = async () => {
    setIsDestroying(true);
    try {
      if (files.length > 0) {
        const filePaths = files.map(f => f.file_path);
        await supabase.storage.from("filedrop").remove(filePaths);
      }
      
      await supabase.from("rooms").delete().eq("id", room.id);
      sessionStorage.removeItem(`room_pwd_${roomName}`);
      router.push("/");
    } catch (e) {
      console.error("Failed to destroy room", e);
      setIsDestroying(false);
      setIsDestroyModalOpen(false);
    }
  };

  const handleRoomDeletedError = () => {
    setIsRoomExpiredModalOpen(true);
  };

  const handlePostText = async () => {
    if (!newText.trim()) return;
    setIsPostingText(true);
    const textToPost = newText;
    setNewText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const { data, error } = await supabase.from("texts").insert([{ room_id: room.id, content: textToPost }]).select();
      if (error) throw error;
      
      if (data && data[0]) {
        setTexts((prev) => {
          if (prev.find(t => t.id === data[0].id)) return prev;
          return [data[0], ...prev];
        });
      }
    } catch (e: any) {
      if (e?.code === '23503') {
        handleRoomDeletedError();
      } else {
        console.error(e);
        setNewText(textToPost);
      }
    } finally {
      setIsPostingText(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostText();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`);
        continue;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${room.id}/${fileName}`;
      
      const fileId = uuidv4();
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      const interval = setInterval(() => {
        if (abortedUploads.current.has(fileId)) {
          clearInterval(interval);
          return;
        }
        setUploadProgress(prev => {
          if (abortedUploads.current.has(fileId)) return prev;
          const current = prev[fileId] || 0;
          if (current >= 90) return prev;
          return { ...prev, [fileId]: current + (Math.random() * 15 + 5) };
        });
      }, 300);

      try {
        const uploadPromise = supabase.storage.from("filedrop").upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
        const delayPromise = new Promise(res => setTimeout(res, 800));

        const [{ error: uploadError }] = await Promise.all([uploadPromise, delayPromise]);

        clearInterval(interval);
        
        if (abortedUploads.current.has(fileId)) {
           abortedUploads.current.delete(fileId);
           await supabase.storage.from("filedrop").remove([filePath]);
           throw new Error("Upload aborted by user");
        }

        if (uploadError) throw uploadError;
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        const { data, error } = await supabase.from("files").insert([{
          room_id: room.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          size: file.size
        }]).select();

        if (error) throw error;

        if (data && data[0]) {
          setFiles((prev) => {
            if (prev.find(f => f.id === data[0].id)) return prev;
            return [data[0], ...prev];
          });
        }
      } catch (err: any) {
        clearInterval(interval);
        if (err?.message === "Upload aborted by user") {
          console.log(err.message);
        } else if (err?.code === '23503') {
          handleRoomDeletedError();
        } else {
          console.error("Upload failed", err);
        }
      }
      
      setTimeout(() => {
        setUploadProgress(prev => {
           const newP = { ...prev };
           delete newP[fileId];
           return newP;
        });
      }, 500);
    }
  }, [room]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
    onDrop,
    noClick: true,
    noKeyboard: true 
  });

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from('filedrop').getPublicUrl(path);
    return data.publicUrl;
  };

  const getThumbnailUrl = (path: string) => {
    const { data } = supabase.storage.from('filedrop').getPublicUrl(path, {
      transform: {
        width: 400,
        height: 400,
        resize: 'contain',
        quality: 70
      }
    });
    return data.publicUrl;
  };

  const handleDownload = async (path: string, fileName: string, fileId: string) => {
    if (downloadProgress[fileId] !== undefined) return;
    try {
      const controller = new AbortController();
      abortControllers.current[fileId] = controller;
      setDownloadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      const url = getFileUrl(path);
      const response = await fetch(url, { signal: controller.signal });
      
      if (!response.body) {
        const { data, error } = await supabase.storage.from('filedrop').download(path);
        if (error) throw error;
        triggerDownload(data, fileName);
        return;
      }

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength || '0', 10);
      
      let loaded = 0;
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) {
          setDownloadProgress(prev => ({ ...prev, [fileId]: (loaded / total) * 100 }));
        } else {
          setDownloadProgress(prev => {
            const current = prev[fileId] || 0;
            return { ...prev, [fileId]: current < 90 ? current + 10 : 90 };
          });
        }
      }
      
      setDownloadProgress(prev => ({ ...prev, [fileId]: 100 }));
      const blob = new Blob(chunks);
      triggerDownload(blob, fileName);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Download aborted by user");
      } else {
        console.error("Error downloading file:", err);
      }
    } finally {
      delete abortControllers.current[fileId];
      setTimeout(() => {
        setDownloadProgress(prev => {
           const newP = { ...prev };
           delete newP[fileId];
           return newP;
        });
      }, 1000);
    }
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
  };

  const cancelUpload = (fileId: string) => {
    abortedUploads.current.add(fileId);
    setUploadProgress(prev => {
      const newP = { ...prev };
      delete newP[fileId];
      return newP;
    });
  };

  const cancelDownload = (fileId: string) => {
    if (abortControllers.current[fileId]) {
      abortControllers.current[fileId].abort();
    }
    setDownloadProgress(prev => {
      const newP = { ...prev };
      delete newP[fileId];
      return newP;
    });
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    try {
      if (itemToDelete.type === 'text') {
        const { error } = await supabase.from('texts').delete().eq('id', itemToDelete.id);
        if (error) throw error;
        setTexts(prev => prev.filter(t => t.id !== itemToDelete.id));
      } else if (itemToDelete.type === 'file') {
        const { error: dbError } = await supabase.from('files').delete().eq('id', itemToDelete.id);
        if (dbError) throw dbError;
        if (itemToDelete.path) {
          await supabase.storage.from('filedrop').remove([itemToDelete.path]);
        }
        setFiles(prev => prev.filter(f => f.id !== itemToDelete.id));
      }
    } catch (err) {
      console.error("Error deleting item:", err);
    } finally {
      setIsDeletingItem(false);
      setItemToDelete(null);
    }
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderFileIcon = (fileType: string, fileName: string) => {
    if (fileType.includes('image')) return <ImageIcon className="w-8 h-8" />;
    if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-red-400" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.csv')) return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />;
    if (fileType.includes('word') || fileName.endsWith('.docx')) return <FileText className="w-8 h-8 text-blue-400" />;
    if (fileType.includes('video')) return <Video className="w-8 h-8 text-purple-400" />;
    return <FileIcon className="w-8 h-8" />;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-6 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/30 rounded-full blur-[3xl] pointer-events-none" />
          <div className="flex flex-col items-center text-center mb-6 mt-2">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 border border-primary/30">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold font-outfit text-white mb-1">Enter Room</h2>
            <p className="text-white/60 text-sm">
              Room: <span className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">{roomName}</span>
            </p>
          </div>
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <input type="password" placeholder="Enter room password" value={password} onChange={(e) => setPassword(e.target.value)} className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/40" autoFocus />
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="glass-button w-full py-3 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              Join Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className="flex-1 flex flex-col relative min-h-0 h-[calc(100dvh-49px)] max-h-[calc(100dvh-49px)] overflow-hidden">
      <input {...getInputProps()} />
      
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-primary/20 backdrop-blur-sm border-4 border-dashed border-primary flex items-center justify-center m-4 rounded-3xl">
           <h2 className="text-3xl font-bold text-white font-outfit drop-shadow-lg">Drop files to upload</h2>
        </div>
      )}

      {/* Destroy Confirmation Modal */}
      <AnimatePresence>
        {isDestroyModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDestroying && setIsDestroyModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-sm p-6 relative z-10 overflow-hidden border-red-500/30"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-[3xl] pointer-events-none" />
              
              <button 
                onClick={() => !isDestroying && setIsDestroyModalOpen(false)}
                disabled={isDestroying}
                className="absolute top-4 right-4 p-1 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-6 mt-2">
                <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold font-outfit text-white mb-2">Destroy Room?</h2>
                <p className="text-white/60 text-sm">
                  Are you sure you want to permanently delete <strong className="text-white">{roomName}</strong>? All files and texts will be destroyed forever. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDestroyModalOpen(false)}
                  disabled={isDestroying}
                  className="flex-1 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDestroyRoom}
                  disabled={isDestroying}
                  className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                >
                  {isDestroying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Destroy It"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Room Expired Modal */}
      <AnimatePresence>
        {isRoomExpiredModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-sm p-6 relative z-10 overflow-hidden border-orange-500/30"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/20 rounded-full blur-[3xl] pointer-events-none" />
              
              <div className="flex flex-col items-center text-center mb-6 mt-2 relative z-10">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-4 border border-orange-500/30">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                </div>
                <h2 className="text-xl font-bold font-outfit text-white mb-2">Room Unavailable</h2>
                <p className="text-white/70 text-sm">
                  This room has expired or been destroyed by another user.
                </p>
              </div>

              <div className="flex relative z-10">
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer"
                >
                  Return Home
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Item Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingItem && setItemToDelete(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-sm p-6 relative z-10 overflow-hidden border-red-500/30"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-[3xl] pointer-events-none" />
              
              <button 
                onClick={() => !isDeletingItem && setItemToDelete(null)}
                disabled={isDeletingItem}
                className="absolute top-4 right-4 p-1 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-6 mt-2">
                <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold font-outfit text-white mb-2">Delete Item?</h2>
                <p className="text-white/60 text-sm">
                  Are you sure you want to delete this {itemToDelete.type}? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setItemToDelete(null)}
                  disabled={isDeletingItem}
                  className="flex-1 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteItem}
                  disabled={isDeletingItem}
                  className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingItem ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-4 max-w-6xl flex-1 flex flex-col h-full min-h-0">
        <div className="glass-card p-2 md:p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-10">
          <div className="text-center sm:text-left">
            <h1 className="text-lg md:text-xl font-bold font-outfit text-white">Room: {room.name}</h1>
            <p className="text-white/60 text-[10px] md:text-xs mt-0.5">Expires at {new Date(room.expires_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
             <button onClick={shareLink} className="px-2 py-1.5 md:px-3 md:py-1.5 flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors">
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isCopied ? "Copied" : "Share"}</span>
             </button>
             <button onClick={() => setIsDestroyModalOpen(true)} className="px-2 py-1.5 md:px-3 md:py-1.5 flex items-center gap-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Destroy</span>
             </button>
          </div>
        </div>

        {Object.keys(uploadProgress).length > 0 && (
          <div className="mb-4 space-y-3 shrink-0 z-10">
            {Object.entries(uploadProgress).map(([id, progress]) => (
              <div key={id} className="w-full flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <span>Uploading file...</span>
                    <button onClick={() => cancelUpload(id)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white" title="Cancel Upload">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <span>{Math.min(100, Math.round(progress))}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300 relative" 
                    style={{ width: `${Math.min(100, progress)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite] -skew-x-12" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.keys(downloadProgress).length > 0 && (
          <div className="mb-4 space-y-3 shrink-0 z-10">
            {Object.entries(downloadProgress).map(([id, progress]) => (
              <div key={id} className="w-full flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <span>Downloading file...</span>
                    <button onClick={() => cancelDownload(id)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white" title="Cancel Download">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <span>{Math.min(100, Math.round(progress))}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300 relative" 
                    style={{ width: `${Math.min(100, progress)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite] -skew-x-12" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 md:pb-24 relative z-0" onScroll={handleScroll}>
          {texts.length === 0 && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-4">
               <div className="p-4 bg-white/5 rounded-full">
                 <Paperclip className="w-8 h-8 opacity-50" />
               </div>
               <p>Nothing shared yet. Drop a file or type a message!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {files.map(f => (
                <div key={f.id} className="glass-card p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group relative">
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <button 
                      onClick={() => handleDownload(f.file_path, f.file_name, f.id)} 
                      disabled={downloadProgress[f.id] !== undefined}
                      className="p-2 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Download File"
                    >
                      {downloadProgress[f.id] !== undefined ? (
                         <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                         <Download className="w-4 h-4" />
                      )}
                    </button>
                    <button 
                      onClick={() => setItemToDelete({ id: f.id, type: 'file', path: f.file_path })} 
                      className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                      title="Delete File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white/5 rounded-lg text-primary shrink-0 mt-1">
                        {renderFileIcon(f.file_type, f.file_name)}
                      </div>
                      <div className="overflow-hidden pr-16">
                        <p className="font-medium text-sm truncate" title={f.file_name}>{f.file_name}</p>
                        <p className="text-xs text-white/40 mt-1">{(f.size / 1024 / 1024).toFixed(2)} MB • {f.file_name.split('.').pop()?.toUpperCase()}</p>
                      </div>
                    </div>
                    {/* Image Preview */}
                    {f.file_type.includes('image') && (
                      <div className="w-full h-32 rounded-lg overflow-hidden bg-black/20 mt-2 flex items-center justify-center relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={getThumbnailUrl(f.file_path)} 
                          alt={f.file_name} 
                          className="max-w-full max-h-full object-contain" 
                          loading="lazy" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

               {texts.map(t => (
                <div key={t.id} className="glass-card p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group relative">
                   <div className="absolute top-2 right-2 flex gap-2 z-10">
                     <button onClick={() => copyToClipboard(t.content)} className="p-2 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="Copy Text">
                       <Copy className="w-4 h-4" />
                     </button>
                     <button onClick={() => setItemToDelete({ id: t.id, type: 'text' })} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer" title="Delete Text">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                   <p className="text-sm text-white/80 whitespace-pre-wrap break-words max-h-48 overflow-y-auto custom-scrollbar mb-4 mt-2 pr-16">
                     {t.content}
                   </p>
                </div>
              ))}
            </div>
          )}
          
          {isFetchingMore && (
            <div className="w-full flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-12 z-20 pointer-events-none">
          <div className="container mx-auto max-w-4xl relative pointer-events-auto">
            <div className="glass-card p-2 flex items-end gap-2 bg-black/40 shadow-2xl border-white/10 backdrop-blur-xl">
              <button 
                onClick={open}
                className="p-3 text-white/60 hover:text-primary hover:bg-white/5 rounded-xl transition-colors shrink-0"
                title="Upload File"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <textarea
                ref={textareaRef}
                value={newText}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Type a message or paste a URL... (Shift+Enter for new line)"
                className="flex-1 bg-transparent border-none text-white placeholder-white/40 resize-none py-3 px-2 max-h-[150px] focus:outline-none custom-scrollbar"
                style={{ height: '48px' }}
              />
              
              <button 
                onClick={handlePostText}
                disabled={isPostingText || !newText.trim()}
                className="p-3 text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary rounded-xl transition-colors shrink-0"
              >
                {isPostingText ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

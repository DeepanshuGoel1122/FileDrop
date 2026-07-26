import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SignalingChannel, SignalingMessage } from '../lib/signaling/SignalingChannel';
import { WebRTCConnection } from '../lib/webrtc/PeerConnection';
import { FileSender } from '../lib/fileTransfer/FileSender';
import { FileReceiver } from '../lib/fileTransfer/FileReceiver';

export interface DirectFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File; // Only present on host
}

export interface TransferState {
  progress: number;
  speedMbps: number;
}

export const useDirectRoom = (roomId: string, localPeerId: string, isHost: boolean) => {
  const [files, setFiles] = useState<DirectFile[]>([]);
  const [peers, setPeers] = useState<string[]>([]);
  const [transfers, setTransfers] = useState<{ [id: string]: TransferState }>({});
  const [error, setError] = useState<string | null>(null);
  const [hostLeft, setHostLeft] = useState(false);

  const signaling = useRef<SignalingChannel | null>(null);
  const connections = useRef<Map<string, WebRTCConnection>>(new Map());
  const senders = useRef<Map<string, FileSender>>(new Map());
  const receivers = useRef<Map<string, FileReceiver>>(new Map());
  
  // Host files ref so signaling callbacks can access latest state
  const filesRef = useRef<DirectFile[]>([]);
  useEffect(() => { filesRef.current = files; }, [files]);

  const getConnection = useCallback((peerId: string) => {
    if (!connections.current.has(peerId)) {
      const pc = new WebRTCConnection(isHost, peerId, localPeerId, signaling.current!);
      
      pc.onDataChannel = (channel) => {
        if (!isHost && channel.label.startsWith('file-')) {
          const fileId = channel.label.replace('file-', '');
          const fileMeta = filesRef.current.find(f => f.id === fileId);
          if (fileMeta) {
            const receiver = new FileReceiver(channel, fileMeta.size);
            receivers.current.set(fileId, receiver);
            
            receiver.onProgress = (progress, speed) => {
              setTransfers(prev => ({ ...prev, [fileId]: { progress, speedMbps: speed } }));
            };
            
            receiver.onComplete = (blob) => {
              setTransfers(prev => { const n = { ...prev }; delete n[fileId]; return n; });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileMeta.name;
              a.click();
              URL.revokeObjectURL(url);
            };

            receiver.onError = (err) => {
              console.error(`Download error for ${fileId}:`, err);
              setTransfers(prev => { const n = { ...prev }; delete n[fileId]; return n; });
            };
          }
        }
      };

      pc.onConnectionStateChange = (state) => {
        if (state === 'disconnected' || state === 'failed') {
           connections.current.delete(peerId);
           setPeers(prev => prev.filter(p => p !== peerId));
        }
      };
      
      connections.current.set(peerId, pc);
    }
    return connections.current.get(peerId)!;
  }, [isHost, localPeerId]);

  useEffect(() => {
    signaling.current = new SignalingChannel(
      supabase,
      roomId,
      localPeerId,
      isHost,
      async (msg: SignalingMessage) => {
        switch (msg.type) {
          case 'offer':
            if (!isHost) {
              const pc = getConnection(msg.from);
              await pc.handleOffer(msg.sdp);
            }
            break;
          case 'answer':
            if (isHost) {
              const pc = getConnection(msg.from);
              await pc.handleAnswer(msg.sdp);
            }
            break;
          case 'ice-candidate':
            {
              const pc = getConnection(msg.from);
              await pc.handleIceCandidate(msg.candidate);
            }
            break;
          case 'file-metadata':
            if (!isHost) {
              setFiles(msg.files);
            }
            break;
          case 'request-file':
            if (isHost) {
              const file = filesRef.current.find(f => f.id === msg.fileId);
              if (file && file.file) {
                const pc = getConnection(msg.from);
                const channel = pc.createDataChannel(`file-${msg.fileId}`);
                const sender = new FileSender(file.file, channel);
                senders.current.set(`${msg.from}-${msg.fileId}`, sender);
                
                sender.onProgress = (progress, speed) => {
                  setTransfers(prev => ({ ...prev, [msg.fileId]: { progress, speedMbps: speed } }));
                };
                
                sender.onComplete = () => {
                  setTransfers(prev => { const n = { ...prev }; delete n[msg.fileId]; return n; });
                  senders.current.delete(`${msg.from}-${msg.fileId}`);
                };
              }
            }
            break;
        }
      },
      (peerJoined) => {
        setPeers(prev => [...prev, peerJoined]);
        if (isHost) {
          // Send metadata to the new peer
          signaling.current?.send({
            type: 'file-metadata',
            files: filesRef.current.map(f => ({ id: f.id, name: f.name, size: f.size, type: f.type })),
            to: peerJoined
          });
          // Initialize connection by requesting it
          getConnection(peerJoined);
        }
      },
      (peerLeft) => {
        setPeers(prev => prev.filter(p => p !== peerLeft));
        if (connections.current.has(peerLeft)) {
          connections.current.get(peerLeft)?.close();
          connections.current.delete(peerLeft);
        }
      },
      () => {
         setHostLeft(true);
      }
    );

    signaling.current.connect().catch(e => setError(e.message));

    return () => {
      signaling.current?.disconnect();
      connections.current.forEach(pc => pc.close());
    };
  }, [roomId, localPeerId, isHost, getConnection]);

  const addHostFiles = (newFiles: File[]) => {
    if (!isHost) return;
    const directFiles: DirectFile[] = newFiles.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      file: f
    }));
    
    setFiles(prev => {
      const updated = [...prev, ...directFiles];
      signaling.current?.send({
        type: 'file-metadata',
        files: updated.map(f => ({ id: f.id, name: f.name, size: f.size, type: f.type }))
      });
      return updated;
    });
  };

  const removeHostFile = (fileId: string) => {
    if (!isHost) return;
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      signaling.current?.send({
        type: 'file-metadata',
        files: updated.map(f => ({ id: f.id, name: f.name, size: f.size, type: f.type }))
      });
      return updated;
    });
  };

  const requestDownload = (fileId: string) => {
    if (isHost) return;
    // We send request-file to the host. Host is implicitly known by whoever sent the metadata,
    // but in our broadcast setup, the host is the one listening for 'request-file'.
    // We will just broadcast the request. Only the host acts on it.
    signaling.current?.send({
      type: 'request-file',
      fileId,
      from: localPeerId,
      to: '' // host will pick it up
    });
  };

  const cancelTransfer = (fileId: string) => {
     // If host, cancel sender
     if (isHost) {
        // Find senders for this fileId
        for (const [key, sender] of senders.current.entries()) {
           if (key.endsWith(`-${fileId}`)) {
              sender.cancel();
           }
        }
     } else {
        // If receiver, cancel receiver
        if (receivers.current.has(fileId)) {
           receivers.current.get(fileId)?.cancel();
        }
     }
     setTransfers(prev => { const n = { ...prev }; delete n[fileId]; return n; });
  };

  return {
    files,
    peers,
    transfers,
    error,
    hostLeft,
    addHostFiles,
    removeHostFile,
    requestDownload,
    cancelTransfer
  };
};

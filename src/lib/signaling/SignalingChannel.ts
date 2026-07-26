import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type SignalingMessage = 
  | { type: 'offer'; sdp: RTCSessionDescriptionInit; from: string; to: string }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit; from: string; to: string }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit; from: string; to: string }
  | { type: 'request-file'; fileId: string; from: string; to: string }
  | { type: 'accept-file'; fileId: string; to: string; from: string }
  | { type: 'reject-file'; fileId: string; to: string; from: string; reason: string }
  | { type: 'file-metadata'; files: { id: string, name: string, size: number, type: string }[]; to?: string };

export class SignalingChannel {
  private channel: RealtimeChannel;
  private localPeerId: string;
  private isHost: boolean;
  
  constructor(
    supabase: SupabaseClient, 
    roomId: string, 
    localPeerId: string, 
    isHost: boolean,
    private onMessage: (msg: SignalingMessage) => void,
    private onPeerJoined?: (peerId: string) => void,
    private onPeerLeft?: (peerId: string) => void,
    private onHostLeft?: () => void
  ) {
    this.localPeerId = localPeerId;
    this.isHost = isHost;
    
    // Create a unique channel for this room's signaling
    this.channel = supabase.channel(`direct_room_${roomId}`, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: localPeerId }
      }
    });

    // Listen for incoming signaling messages
    this.channel.on('broadcast', { event: 'signaling' }, (payload) => {
      const msg = payload.payload as SignalingMessage;
      // Only process messages explicitly addressed to us
      if (msg.to && msg.to !== this.localPeerId) return;
      this.onMessage(msg);
    });

    // Track when peers join or leave using Presence
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel.presenceState();
      
      // If we are a receiver, check if the host is still in the room
      if (!this.isHost && this.onHostLeft) {
         let hostFound = false;
         for (const key of Object.keys(state)) {
            const presences = state[key] as any[];
            if (presences.some(p => p.isHost)) {
               hostFound = true;
               break;
            }
         }
         if (!hostFound) {
            this.onHostLeft();
         }
      }
    });

    this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
       if (key !== this.localPeerId) {
          if (this.onPeerJoined) this.onPeerJoined(key);
       }
    });

    this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
       if (key !== this.localPeerId) {
          if (this.onPeerLeft) this.onPeerLeft(key);
       }
    });
  }

  public async connect() {
    return new Promise<void>((resolve, reject) => {
      this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence so others know we are here
          await this.channel.track({ isHost: this.isHost, joinedAt: new Date().toISOString() });
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Signaling connect failed: ${status}`));
        }
      });
    });
  }

  public send(msg: SignalingMessage) {
    this.channel.send({
      type: 'broadcast',
      event: 'signaling',
      payload: msg
    });
  }

  public disconnect() {
    this.channel.unsubscribe();
  }
}

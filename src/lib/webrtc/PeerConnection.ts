import { SignalingChannel } from '../signaling/SignalingChannel';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // TURN servers can be added here later
  ]
};

export class WebRTCConnection {
  public pc: RTCPeerConnection;
  private isHost: boolean;
  private peerId: string;
  private localId: string;
  private signaling: SignalingChannel;
  
  public onDataChannel?: (channel: RTCDataChannel) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

  constructor(
    isHost: boolean, 
    peerId: string, 
    localId: string, 
    signaling: SignalingChannel
  ) {
    this.isHost = isHost;
    this.peerId = peerId;
    this.localId = localId;
    this.signaling = signaling;
    
    this.pc = new RTCPeerConnection(RTC_CONFIG);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({
          type: 'ice-candidate',
          candidate: event.candidate,
          from: this.localId,
          to: this.peerId
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.pc.connectionState);
      }
    };

    this.pc.ondatachannel = (event) => {
      if (this.onDataChannel) {
        this.onDataChannel(event.channel);
      }
    };

    // If host, create a primary control channel to establish SCTP
    if (this.isHost) {
      this.pc.createDataChannel('control');
      
      this.pc.onnegotiationneeded = async () => {
        try {
          const offer = await this.pc.createOffer();
          await this.pc.setLocalDescription(offer);
          this.signaling.send({
            type: 'offer',
            sdp: this.pc.localDescription as RTCSessionDescriptionInit,
            from: this.localId,
            to: this.peerId
          });
        } catch (err) {
          console.error("Failed to create offer", err);
        }
      };
    }
  }

  public async handleOffer(offer: RTCSessionDescriptionInit) {
    if (this.isHost) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signaling.send({
      type: 'answer',
      sdp: this.pc.localDescription as RTCSessionDescriptionInit,
      from: this.localId,
      to: this.peerId
    });
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.isHost) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("Error adding received ice candidate", e);
    }
  }

  public createDataChannel(label: string): RTCDataChannel {
    return this.pc.createDataChannel(label);
  }

  public close() {
    this.pc.close();
  }
}

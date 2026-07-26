export class FileReceiver {
  private channel: RTCDataChannel;
  private expectedSize: number;
  private chunks: ArrayBuffer[] = [];
  private receivedBytes: number = 0;
  
  public onProgress?: (progress: number, speedMbps: number) => void;
  public onComplete?: (blob: Blob) => void;
  public onError?: (error: Error) => void;

  private startTime: number = 0;
  private lastReportTime: number = 0;
  private bytesSinceLastReport: number = 0;
  private isCanceled: boolean = false;

  constructor(channel: RTCDataChannel, expectedSize: number) {
    this.channel = channel;
    this.expectedSize = expectedSize;
    this.channel.binaryType = 'arraybuffer';
    
    this.channel.onopen = () => {
      this.startTime = performance.now();
      this.lastReportTime = this.startTime;
    };

    this.channel.onmessage = (event) => {
      if (this.isCanceled) return;
      
      const buffer = event.data as ArrayBuffer;
      this.chunks.push(buffer);
      this.receivedBytes += buffer.byteLength;
      this.bytesSinceLastReport += buffer.byteLength;
      
      this.reportProgress();
    };

    this.channel.onerror = (err) => {
      if (this.onError) this.onError(new Error("DataChannel error during receive"));
    };

    this.channel.onclose = () => {
      if (this.isCanceled) return;
      
      if (this.receivedBytes >= this.expectedSize) {
        const blob = new Blob(this.chunks);
        this.chunks = []; // free memory
        if (this.onComplete) this.onComplete(blob);
      } else {
        if (this.onError) this.onError(new Error("Channel closed prematurely"));
      }
    };
  }

  private reportProgress() {
    const now = performance.now();
    const dt = now - this.lastReportTime;
    
    if (dt > 200) {
      const progress = (this.receivedBytes / this.expectedSize) * 100;
      const speedMbps = (this.bytesSinceLastReport * 8) / (dt * 1000); // Mbps
      
      if (this.onProgress) this.onProgress(progress, speedMbps);
      
      this.lastReportTime = now;
      this.bytesSinceLastReport = 0;
    }
  }

  public cancel() {
    this.isCanceled = true;
    this.chunks = []; // free memory
    this.channel.close();
  }
}

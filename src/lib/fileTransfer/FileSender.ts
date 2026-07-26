export class FileSender {
  private file: File;
  private channel: RTCDataChannel;
  private chunkSize: number = 64 * 1024; // 64 KB
  private offset: number = 0;
  private isCanceled: boolean = false;
  
  public onProgress?: (progress: number, speedMbps: number) => void;
  public onComplete?: () => void;
  public onError?: (error: Error) => void;

  private startTime: number = 0;
  private lastReportTime: number = 0;
  private bytesSinceLastReport: number = 0;

  constructor(file: File, channel: RTCDataChannel) {
    this.file = file;
    this.channel = channel;
    this.channel.binaryType = 'arraybuffer';
    
    this.channel.onopen = () => {
      this.startTime = performance.now();
      this.lastReportTime = this.startTime;
      this.sendNextChunk();
    };

    this.channel.onerror = (err) => {
      if (this.onError) this.onError(new Error("DataChannel error during send"));
    };

    this.channel.onclose = () => {
       if (this.offset < this.file.size && !this.isCanceled) {
         if (this.onError) this.onError(new Error("Channel closed prematurely"));
       }
    };
  }

  private sendNextChunk = () => {
    if (this.isCanceled) {
      this.channel.close();
      return;
    }

    // Handle backpressure
    if (this.channel.bufferedAmount > this.channel.bufferedAmountLowThreshold) {
      this.channel.onbufferedamountlow = () => {
        this.channel.onbufferedamountlow = null;
        this.sendNextChunk();
      };
      return;
    }

    const end = Math.min(this.offset + this.chunkSize, this.file.size);
    const slice = this.file.slice(this.offset, end);
    
    slice.arrayBuffer().then(buffer => {
      if (this.isCanceled || this.channel.readyState !== 'open') return;
      
      try {
        this.channel.send(buffer);
        this.bytesSinceLastReport += buffer.byteLength;
        this.offset += buffer.byteLength;
        this.reportProgress();

        if (this.offset < this.file.size) {
          // Use setTimeout to avoid call stack size exceeded on fast networks
          setTimeout(this.sendNextChunk, 0);
        } else {
          // File sent completely
          setTimeout(() => {
            if (this.onComplete) this.onComplete();
            this.channel.close();
          }, 100); // small delay to ensure last chunk is flushed
        }
      } catch (e: any) {
        if (this.onError) this.onError(e);
      }
    });
  }

  private reportProgress() {
    const now = performance.now();
    const dt = now - this.lastReportTime;
    
    // Update progress every 200ms
    if (dt > 200) {
      const progress = (this.offset / this.file.size) * 100;
      const speedMbps = (this.bytesSinceLastReport * 8) / (dt * 1000); // Mbps
      
      if (this.onProgress) this.onProgress(progress, speedMbps);
      
      this.lastReportTime = now;
      this.bytesSinceLastReport = 0;
    }
  }

  public cancel() {
    this.isCanceled = true;
  }
}

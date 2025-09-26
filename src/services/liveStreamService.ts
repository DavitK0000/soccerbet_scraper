import axios, { AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import { LiveStreamResponse, LiveData, LiveSubscriptionData } from '../types/liveTypes';

export class LiveStreamService extends EventEmitter {
  private readonly baseUrl = 'https://www.soccerbet.rs/live';
  private isStreaming: boolean = false;
  private shouldStream: boolean = false;
  private currentTimestamp: number | null = null;
  private liveData: LiveData | null = null;
  private abortController: AbortController | null = null;

  /**
   * Initialize live events stream
   */
  async initializeLiveEvents(sport: 'football' | 'tennis' | 'basketball'): Promise<LiveData> {
    try {
      console.log(`Initializing live events for sport: ${sport}`);
      
      const url = `${this.baseUrl}/events/sr`;
      console.log(`Fetching live events from: ${url}`);
      
      this.abortController = new AbortController();
      
      const response: AxiosResponse = await axios.get(url, {
        timeout: 30000, // 30 second timeout for SSE
        signal: this.abortController.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
          'Referer': 'https://www.soccerbet.rs/'
        },
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        let dataBuffer = '';
        let liveSports: any[] = [];
        let liveHeaders: any[] = [];
        let liveBets: any[] = [];
        let endTimestamp: number | null = null;

        response.data.on('data', (chunk: Buffer) => {
          dataBuffer += chunk.toString();
          
          // Process complete lines
          const lines = dataBuffer.split('\n\n');
          dataBuffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                // Handle SSE data format
                let jsonData = line;
                if (line.startsWith('data:')) {
                  jsonData = line.substring(5); // Remove 'data:' prefix
                }
                
                // Skip empty data lines
                if (!jsonData.trim()) {
                  continue;
                }
                
                // Check for END message
                if (jsonData.startsWith('END ')) {
                  endTimestamp = parseInt(jsonData.replace('END ', '').trim());
                  console.log(`Received END timestamp: ${endTimestamp}`);
                  continue;
                }
                
                // Try to parse JSON data
                const data = JSON.parse(jsonData);
                this.processLiveStreamData(data, liveSports, liveHeaders, liveBets);
              } catch (error) {
                console.log(line)
                // Skip non-JSON lines (like SSE format lines)
                if (!line.startsWith('data: ') && !line.startsWith('event: ') && !line.startsWith('id: ')) {
                  console.log(`Skipping non-JSON line: ${line.substring(0, 100)}...`);
                }
              }
            }
          }
        });

        response.data.on('end', () => {
          if (endTimestamp) {
            this.currentTimestamp = endTimestamp;
            
            const liveData: LiveData = {
              sports: liveSports,
              headers: liveHeaders,
              bets: liveBets,
              lastTimestamp: endTimestamp,
              initializedAt: new Date(),
              sport
            };
            
            this.liveData = liveData;
            console.log(`Live events initialized with ${liveHeaders.length} headers and ${liveBets.length} bets`);
            resolve(liveData);
          } else {
            reject(new Error('No END timestamp received from live events stream'));
          }
        });

        response.data.on('error', (error: Error) => {
          if (error.name === 'AbortError') {
            console.log('Live events stream aborted');
            return;
          }
          console.error('Error in live events stream:', error);
          reject(error);
        });
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Live events initialization aborted');
        throw error;
      }
      console.error('Error initializing live events:', error);
      throw new Error(`Failed to initialize live events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process live stream data
   */
  private processLiveStreamData(data: any, liveSports: any[], liveHeaders: any[], liveBets: any[]): void {
    if (data.liveSports) {
      liveSports.push(...data.liveSports);
      console.log(`Received ${data.liveSports.length} live sports`);
    }
    
    if (data.liveHeaders) {
      liveHeaders.push(...data.liveHeaders);
      console.log(`Received ${data.liveHeaders.length} live headers`);
    }
    
    if (data.liveBets) {
      liveBets.push(...data.liveBets);
      console.log(`Received ${data.liveBets.length} live bets`);
    }
    
    // Log if no expected data fields found
    if (!data.liveSports && !data.liveHeaders && !data.liveBets) {
      console.log(`Received data without expected fields:`, Object.keys(data));
    }
  }

  /**
   * Start live subscription for updates
   */
  async startLiveSubscription(): Promise<void> {
    if (!this.currentTimestamp) {
      throw new Error('No timestamp available. Initialize live events first.');
    }

    if (this.isStreaming) {
      console.log('Live subscription already running');
      return;
    }

    this.isStreaming = true;
    this.shouldStream = true;
    console.log(`Starting live subscription with timestamp: ${this.currentTimestamp}`);
    
    await this.subscribeToLiveUpdates();
  }

  /**
   * Subscribe to live updates
   */
  private async subscribeToLiveUpdates(): Promise<void> {
    if (!this.currentTimestamp) return;

    try {
      // Use current timestamp instead of the stored timestamp
      const currentTimestamp = Date.now();
      const url = `${this.baseUrl}/subscribe/sr?lastInitId=${currentTimestamp}`;
      console.log(`Subscribing to live updates from: ${url}`);
      
      this.abortController = new AbortController();
      
      const response: AxiosResponse = await axios.get(url, {
        timeout: 0, // No timeout for continuous streaming
        signal: this.abortController.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
          'Referer': 'https://www.soccerbet.rs/'
        },
        responseType: 'stream'
      });

      let dataBuffer = '';

      response.data.on('data', (chunk: Buffer) => {
        dataBuffer += chunk.toString();
        
        // Process complete lines
        const lines = dataBuffer.split('\n');
        dataBuffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              // Handle SSE data format
              let jsonData = line;
              if (line.startsWith('data:')) {
                jsonData = line.substring(5); // Remove 'data: ' prefix
              }
              
              // Skip empty data lines
              if (!jsonData.trim()) {
                continue;
              }
              
              const data = JSON.parse(jsonData);
              this.processLiveUpdateData(data);
            } catch (error) {
              // Skip non-JSON lines
              // if (!line.startsWith('data:') && !line.startsWith('event:') && !line.startsWith('id:')) {
              //   console.log(`Skipping non-JSON line in subscription: ${line.substring(0, 50)}...`);
              // }
            }
          }
        }
      });

      response.data.on('end', () => {
        console.log('Live subscription stream ended, checking if should restart...');
        this.isStreaming = false;
        // Restart subscription after a short delay if we should still be streaming
        setTimeout(() => {
          if (this.shouldStream) {
            console.log('Restarting live subscription...');
            this.isStreaming = true;
            this.subscribeToLiveUpdates();
          } else {
            console.log('Not restarting - streaming was manually stopped');
          }
        }, 1000);
      });

      response.data.on('error', (error: Error) => {
        if (error.name === 'AbortError') {
          console.log('Live subscription stream aborted');
          return;
        }
        console.error('Error in live subscription stream:', error);
        this.isStreaming = false;
        // Restart subscription after error if we should still be streaming
        setTimeout(() => {
          if (this.shouldStream) {
            this.subscribeToLiveUpdates();
          }
        }, 5000);
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Live subscription aborted');
        this.isStreaming = false;
        return;
      }
      console.error('Error in live subscription:', error);
      this.isStreaming = false;
      throw error;
    }
  }

  /**
   * Process live update data
   */
  private processLiveUpdateData(data: any): void {
    const updateData: LiveSubscriptionData = {
      headers: data.liveHeaders || [],
      bets: data.liveBets || [],
      timestamp: Date.now()
    };

    // Emit update event
    this.emit('liveUpdate', updateData);
    
    // Update stored data by merging/updating existing records
    if (this.liveData) {
      if (data.liveHeaders) {
        this.updateLiveHeaders(data.liveHeaders);
      }
      if (data.liveBets) {
        this.updateLiveBets(data.liveBets);
      }
    }

    console.log(`Live update received: ${updateData.headers.length} headers, ${updateData.bets.length} bets`);
    
    // Log if no expected data fields found
    if (!data.liveHeaders && !data.liveBets) {
      console.log(`Update data without expected fields:`, Object.keys(data));
    }
  }

  /**
   * Update live headers by merging/updating existing records
   */
  private updateLiveHeaders(newHeaders: any[]): void {
    if (!this.liveData) return;
    
    for (const newHeader of newHeaders) {
      const existingIndex = this.liveData.headers.findIndex(h => h.id === newHeader.id);
      if (existingIndex >= 0) {
        // Update existing header
        this.liveData.headers[existingIndex] = { ...this.liveData.headers[existingIndex], ...newHeader };
      } else {
        // Add new header
        this.liveData.headers.push(newHeader);
      }
    }
  }

  /**
   * Update live bets by merging/updating existing records
   */
  private updateLiveBets(newBets: any[]): void {
    if (!this.liveData) return;
    
    for (const newBet of newBets) {
      const existingIndex = this.liveData.bets.findIndex(b => b.id === newBet.id);
      if (existingIndex >= 0) {
        // Update existing bet
        this.liveData.bets[existingIndex] = { ...this.liveData.bets[existingIndex], ...newBet };
      } else {
        // Add new bet
        this.liveData.bets.push(newBet);
      }
    }
  }

  /**
   * Stop live subscription
   */
  stopLiveSubscription(): void {
    this.isStreaming = false;
    this.shouldStream = false;
    
    // Abort any ongoing requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    console.log('Live subscription stopped and requests aborted');
  }

  /**
   * Get current live data
   */
  getLiveData(): LiveData | null {
    return this.liveData;
  }

  /**
   * Check if currently streaming
   */
  isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Get current timestamp
   */
  getCurrentTimestamp(): number | null {
    return this.currentTimestamp;
  }
}

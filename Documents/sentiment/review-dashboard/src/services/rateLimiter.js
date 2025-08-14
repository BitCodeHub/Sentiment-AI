// Rate limiter for OpenAI API calls
class RateLimiter {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.retryAfter = null;
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // Minimum 1 second between requests
    this.maxRetries = 3;
    this.baseDelay = 1000; // Base delay for exponential backoff
  }

  async addRequest(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Check if we're still in rate limit cooldown
      if (this.retryAfter && Date.now() < this.retryAfter) {
        const waitTime = this.retryAfter - Date.now();
        await this.sleep(waitTime);
      }
      
      // Enforce minimum time between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await this.sleep(this.minRequestInterval - timeSinceLastRequest);
      }
      
      const { fn, resolve, reject } = this.queue.shift();
      
      try {
        this.lastRequestTime = Date.now();
        const result = await this.executeWithRetry(fn);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.processing = false;
  }

  async executeWithRetry(fn, attempt = 1) {
    try {
      return await fn();
    } catch (error) {
      // Handle rate limit errors
      if (error.status === 429) {
        if (attempt <= this.maxRetries) {
          // Extract retry-after header if available
          const retryAfterSeconds = error.response?.headers?.['retry-after'] || 
                                   Math.pow(2, attempt - 1) * this.baseDelay / 1000;
          
          const retryAfterMs = retryAfterSeconds * 1000;
          this.retryAfter = Date.now() + retryAfterMs;
          
          // Notify about rate limit with countdown
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('openai-rate-limit', {
              detail: {
                retryAfter: this.retryAfter,
                attempt,
                maxRetries: this.maxRetries
              }
            }));
          }
          
          console.log(`Rate limited. Retrying after ${retryAfterSeconds}s (attempt ${attempt}/${this.maxRetries})`);
          await this.sleep(retryAfterMs);
          
          // Clear rate limit flag after waiting
          this.retryAfter = null;
          
          // Retry with exponential backoff
          return this.executeWithRetry(fn, attempt + 1);
        } else {
          throw new Error(`Rate limit exceeded after ${this.maxRetries} retries. Please try again later.`);
        }
      }
      
      // Handle other errors
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current rate limit status
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
      retryAfter: this.retryAfter,
      isRateLimited: this.retryAfter && Date.now() < this.retryAfter
    };
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
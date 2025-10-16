import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  maxConcurrent: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly requestQueue: Array<() => Promise<void>> = [];
  private activeRequests = 0;
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  private readonly config: RateLimitConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      maxRequests: this.configService.get<number>('MAX_REQUESTS_PER_WINDOW', 10),
      windowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60000), // 1 minute
      maxConcurrent: this.configService.get<number>('MAX_CONCURRENT_DOWNLOADS', 3)
    };
    
    this.logger.log(`Rate limiter initialized: ${this.config.maxRequests} requests per ${this.config.windowMs}ms, max concurrent: ${this.config.maxConcurrent}`);
  }

  async executeWithRateLimit<T>(
    key: string,
    operation: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeOperation = async () => {
        try {
          // Check rate limit
          if (!this.checkRateLimit(key)) {
            this.logger.warn(`Rate limit exceeded for key: ${key}`);
            reject(new Error(`Rate limit exceeded for ${key}`));
            return;
          }

          // Check concurrent limit
          if (this.activeRequests >= this.config.maxConcurrent) {
            this.logger.warn(`Concurrent limit reached: ${this.activeRequests}/${this.config.maxConcurrent}`);
            reject(new Error('Concurrent request limit reached'));
            return;
          }

          this.activeRequests++;
          this.incrementRequestCount(key);

          try {
            const result = await operation();
            resolve(result);
          } finally {
            this.activeRequests--;
            this.processQueue();
          }
        } catch (error) {
          this.activeRequests--;
          this.processQueue();
          reject(error);
        }
      };

      // Add to queue based on priority
      if (priority === 'high') {
        this.requestQueue.unshift(executeOperation);
      } else {
        this.requestQueue.push(executeOperation);
      }

      // Process queue if not at limit
      this.processQueue();
    });
  }

  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    if (record.count >= this.config.maxRequests) {
      return false;
    }

    return true;
  }

  private incrementRequestCount(key: string): void {
    const record = this.requestCounts.get(key);
    if (record) {
      record.count++;
    }
  }

  private processQueue(): void {
    if (this.requestQueue.length === 0 || this.activeRequests >= this.config.maxConcurrent) {
      return;
    }

    const nextOperation = this.requestQueue.shift();
    if (nextOperation) {
      nextOperation().catch(error => {
        this.logger.error(`Queued operation failed: ${error.message}`, error.stack);
      });
    }
  }

  getStats(): {
    activeRequests: number;
    queueLength: number;
    maxConcurrent: number;
    rateLimitConfig: RateLimitConfig;
  } {
    return {
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      maxConcurrent: this.config.maxConcurrent,
      rateLimitConfig: this.config
    };
  }

  reset(): void {
    this.requestQueue.length = 0;
    this.activeRequests = 0;
    this.requestCounts.clear();
    this.logger.log('Rate limiter reset');
  }
}


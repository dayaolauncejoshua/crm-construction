// server/services/messageQueue.ts

interface QueuedMessage {
  from: string;
  message: string;
  timestamp: number;
  retries: number;
  phoneNumberId?: string;
  messageId?: string; // ✅ Already here - good!
}

interface ProcessingLock {
  isLocked: boolean;
  queue: QueuedMessage[];
}

export class MessageQueueService {
  // Map of phone numbers to their processing state
  private locks: Map<string, ProcessingLock> = new Map();
  
  // Track processing metrics
  private metrics = {
    totalProcessed: 0,
    totalQueued: 0,
    duplicatesPrevented: 0,
  };

  /**
   * Add message to queue for a specific phone number
   * If not locked, process immediately
   * If locked, add to queue for sequential processing
   */
  async enqueueMessage(
    from: string,
    message: string,
    timestamp: number,
    processFunction: (
      from: string, 
      message: string, 
      timestamp: number, 
      phoneNumberId?: string,
      messageId?: string // ✅ ADD THIS
    ) => Promise<void>,
    phoneNumberId?: string,
    messageId?: string // ✅ ADD THIS PARAMETER
  ): Promise<void> {
    const normalizedPhone = this.normalizePhone(from);
    
    console.log(`📨 Message received from ${normalizedPhone}`);
    if (phoneNumberId) {
      console.log(`📞 Received on WhatsApp Business number ID: ${phoneNumberId}`);
    }
    if (messageId) {
      console.log(`📋 WhatsApp Message ID: ${messageId}`); // ✅ ADD DEBUG
    }

    // Get or create lock for this phone number
    if (!this.locks.has(normalizedPhone)) {
      this.locks.set(normalizedPhone, {
        isLocked: false,
        queue: [],
      });
    }

    const lock = this.locks.get(normalizedPhone)!;

    // Create queued message object
    const queuedMessage: QueuedMessage = {
      from,
      message,
      timestamp,
      retries: 0,
      phoneNumberId,
      messageId, // ✅ ADD THIS
    };

    // If currently processing messages from this number, queue it
    if (lock.isLocked) {
      console.log(`⏳ Message queued (${lock.queue.length + 1} in queue) for ${normalizedPhone}`);
      lock.queue.push(queuedMessage);
      this.metrics.totalQueued++;
      return;
    }

    // Otherwise, lock and process immediately
    lock.isLocked = true;
    await this.processMessage(normalizedPhone, queuedMessage, processFunction);
  }

  /**
   * Process a single message and then process queued messages
   */
  private async processMessage(
    normalizedPhone: string,
    queuedMessage: QueuedMessage,
    processFunction: (
      from: string, 
      message: string, 
      timestamp: number, 
      phoneNumberId?: string,
      messageId?: string // ✅ ADD THIS
    ) => Promise<void>
  ): Promise<void> {
    const lock = this.locks.get(normalizedPhone)!;

    try {
      console.log(`🔄 Processing message from ${normalizedPhone}`);
      
      // Process the message
      await processFunction(
        queuedMessage.from,
        queuedMessage.message,
        queuedMessage.timestamp,
        queuedMessage.phoneNumberId,
        queuedMessage.messageId // ✅ ADD THIS
      );

      this.metrics.totalProcessed++;
      console.log(`✅ Message processed from ${normalizedPhone}`);

      // Check if there are more messages in queue
      if (lock.queue.length > 0) {
        const nextMessage = lock.queue.shift()!;
        console.log(`📤 Processing next queued message (${lock.queue.length} remaining)`);
        
        // Process next message (recursive)
        await this.processMessage(normalizedPhone, nextMessage, processFunction);
      } else {
        // No more messages, unlock
        lock.isLocked = false;
        console.log(`🔓 Queue empty, unlocked ${normalizedPhone}`);
      }
    } catch (error) {
      console.error(`❌ Error processing message from ${normalizedPhone}:`, error);

      // Retry logic
      if (queuedMessage.retries < 3) {
        queuedMessage.retries++;
        console.log(`🔁 Retrying message (attempt ${queuedMessage.retries}/3)`);
        
        // Re-queue for retry after delay
        setTimeout(() => {
          lock.queue.push(queuedMessage);
        }, 1000 * queuedMessage.retries); // Exponential backoff: 1s, 2s, 3s
      } else {
        console.error(`💀 Message failed after 3 retries, dropping`);
      }

      // Continue processing queue even if this message failed
      if (lock.queue.length > 0) {
        const nextMessage = lock.queue.shift()!;
        await this.processMessage(normalizedPhone, nextMessage, processFunction);
      } else {
        lock.isLocked = false;
      }
    }
  }

  /**
   * Normalize phone number for consistent lookup
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digits
    return phone.replace(/\D/g, '');
  }

  /**
   * Get queue status for a phone number
   */
  getQueueStatus(from: string): { isLocked: boolean; queueLength: number } {
    const normalizedPhone = this.normalizePhone(from);
    const lock = this.locks.get(normalizedPhone);

    if (!lock) {
      return { isLocked: false, queueLength: 0 };
    }

    return {
      isLocked: lock.isLocked,
      queueLength: lock.queue.length,
    };
  }

  /**
   * Get processing metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeQueues: this.locks.size,
      lockedQueues: Array.from(this.locks.values()).filter(l => l.isLocked).length,
    };
  }

  /**
   * Clear old locks (cleanup for phones that haven't sent messages in 1 hour)
   */
  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const entries = Array.from(this.locks.entries());

    for (const [phone, lock] of entries) {
      // Remove if not locked and queue is empty
      if (!lock.isLocked && lock.queue.length === 0) {
        this.locks.delete(phone);
      }
    }

    console.log(`🧹 Cleanup: ${this.locks.size} active queues remaining`);
  }
}

export const messageQueue = new MessageQueueService();

// Run cleanup every 30 minutes
setInterval(() => {
  messageQueue.cleanup();
}, 30 * 60 * 1000);
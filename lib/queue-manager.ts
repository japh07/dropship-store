import { auditLogger } from './audit-logger';
import type { QueueJob, JobOptions } from '@/types';

export class QueueManager {
  private queues = new Map<string, QueueJob[]>();
  private processing = new Set<string>();
  private workers = new Map<string, NodeJS.Timeout>();

  /**
   * Schedule a job for processing
   */
  async scheduleJob(
    queue: string,
    jobData: any,
    options: JobOptions = {}
  ): Promise<string> {
    const job: QueueJob = {
      id: this.generateJobId(),
      queue,
      data: jobData,
      createdAt: new Date(),
      status: 'pending',
      attempts: 0,
      maxAttempts: options.attempts || 3,
      delay: options.delay || 0,
      priority: options.priority || 5
    };

    if (job.delay > 0) {
      job.scheduledAt = new Date(Date.now() + job.delay);
    }

    // Add to queue
    if (!this.queues.has(queue)) {
      this.queues.set(queue, []);
    }
    this.queues.get(queue)!.push(job);

    // Sort by priority and schedule time
    this.queues.get(queue)!.sort((a, b) => {
      if (a.scheduledAt && b.scheduledAt) {
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      }
      return b.priority - a.priority;
    });

    // Start processing if not already running
    this.startProcessing(queue);

    // Log job scheduling
    await auditLogger.logQueueEvent('job_scheduled', {
      jobId: job.id,
      queue,
      delay: job.delay,
      priority: job.priority
    });

    return job.id;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): QueueJob | null {
    for (const queue of this.queues.values()) {
      const job = queue.find(j => j.id === jobId);
      if (job) return job;
    }
    return null;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(queue?: string): Record<string, any> {
    const stats: Record<string, any> = {};

    const queues = queue ? [queue] : Array.from(this.queues.keys());

    for (const q of queues) {
      const jobs = this.queues.get(q) || [];
      stats[q] = {
        pending: jobs.filter(j => j.status === 'pending').length,
        processing: jobs.filter(j => j.status === 'processing').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        total: jobs.length
      };
    }

    return queue ? stats[queue] : stats;
  }

  /**
   * Start processing a queue
   */
  private startProcessing(queue: string): void {
    if (this.processing.has(queue)) return;

    this.processing.add(queue);

    const worker = setInterval(() => {
      this.processQueue(queue).catch(console.error);
    }, 1000); // Process every second

    this.workers.set(queue, worker);
  }

  /**
   * Stop processing a queue
   */
  private stopProcessing(queue: string): void {
    this.processing.delete(queue);

    const worker = this.workers.get(queue);
    if (worker) {
      clearInterval(worker);
      this.workers.delete(queue);
    }
  }

  /**
   * Process jobs in a queue
   */
  private async processQueue(queue: string): Promise<void> {
    const jobs = this.queues.get(queue);
    if (!jobs || jobs.length === 0) return;

    const now = Date.now();
    const readyJobs = jobs.filter(job => {
      if (job.status !== 'pending') return false;
      if (job.scheduledAt && job.scheduledAt.getTime() > now) return false;
      return true;
    });

    if (readyJobs.length === 0) return;

    // Process the highest priority job
    const job = readyJobs[0];
    job.status = 'processing';
    job.processedAt = new Date();

    try {
      await this.executeJob(job);

      job.status = 'completed';
      job.completedAt = new Date();

      await auditLogger.logQueueEvent('job_completed', {
        jobId: job.id,
        queue,
        duration: job.completedAt.getTime() - job.processedAt!.getTime()
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;

      job.attempts++;
      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        const delay = Math.pow(2, job.attempts) * 1000;
        job.status = 'pending';
        job.scheduledAt = new Date(Date.now() + delay);

        await auditLogger.logQueueEvent('job_retry_scheduled', {
          jobId: job.id,
          queue,
          attempt: job.attempts,
          delay,
          error: error.message
        });
      } else {
        job.failedAt = new Date();

        await auditLogger.logQueueEvent('job_failed', {
          jobId: job.id,
          queue,
          attempts: job.attempts,
          error: error.message
        });
      }
    }

    // Remove completed/failed jobs after some time
    this.cleanupJobs();
  }

  /**
   * Execute a job
   */
  private async executeJob(job: QueueJob): Promise<void> {
    // Implementation would execute actual job logic
    console.log(`Executing job ${job.id} in queue ${job.queue}:`, job.data);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 900));

    // Randomly fail for testing
    if (Math.random() < 0.1) {
      throw new Error('Random job failure for testing');
    }
  }

  /**
   * Clean up old jobs
   */
  private cleanupJobs(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    for (const [queue, jobs] of this.queues) {
      const activeJobs = jobs.filter(job => {
        if (job.status === 'pending' || job.status === 'processing') return true;
        if (job.completedAt && job.completedAt.getTime() > cutoffTime) return true;
        if (job.failedAt && job.failedAt.getTime() > cutoffTime) return true;
        return false;
      });

      this.queues.set(queue, activeJobs);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const queueManager = new QueueManager();
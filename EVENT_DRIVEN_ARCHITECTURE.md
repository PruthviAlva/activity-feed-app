# Bonus: Event-Driven Architecture

## Overview
Redesigning the Activity Feed backend to use async processing with a message queue for improved scalability, resilience, and decoupling.

---

## 1. Current Architecture (Synchronous)

### Request Flow
```
POST /activities
       ↓
   Validate
       ↓
   Save to DB
       ↓
   Send to real-time clients
       ↓
   Return 201
   
Issues:
- Slow writes (wait for DB + WebSocket)
- API blocked during processing
- If real-time delivery fails, user gets error
- Hard to scale horizontally
```

---

## 2. Event-Driven Architecture (Async)

### Request Flow
```
POST /activities
       ↓
   Validate
       ↓
   Publish to Message Queue ← Returns immediately (10ms)
       ↓
   Return 202 Accepted
   
Background Workers (separate processes):
   - SaveActivityWorker → MongoDB
   - NotificationWorker → WebSocket/Email
   - AnalyticsWorker → Analytics DB
   - SearchIndexWorker → Elasticsearch
   
Benefits:
- API responds in <50ms
- Parallel processing
- Resilient to failures
- Easy horizontal scaling
```

---

## 3. Technology Choices

### Message Queue Options

| Technology | Throughput | Latency | Persistence | Best For |
|------------|-----------|---------|-------------|----------|
| Redis Queue | 100K msg/s | 1-10ms | Optional | High throughput, dev |
| RabbitMQ | 50K msg/s | 5-50ms | Yes | Reliability, routing |
| Apache Kafka | 1M msg/s | 10ms | Yes | Event streaming, logs |
| AWS SQS | 10K msg/s | 100ms | Yes | Cloud-native, managed |

### Recommended: **Redis Queue (BullMQ)**
- ✅ Fast (in-memory)
- ✅ Persistent (RDB snapshots)
- ✅ Simple API
- ✅ Built-in retries & exponential backoff
- ✅ Perfect for 50M activities/day

---

## 4. Implementation with BullMQ

### Step 1: Install Dependencies
```bash
npm install bullmq redis ioredis
```

### Step 2: Create Queue Definition
```javascript
// queues/activityQueue.js
import Queue from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

export const activityQueue = new Queue('activities', {
  connection,
  settings: {
    maxStalledCount: 3,
    lockDuration: 30000,
    lockRenewTime: 15000,
    retryProcessDelay: 5000,
  },
});

export default activityQueue;
```

---

### Step 3: Refactor API Endpoint

#### Before (Synchronous)
```javascript
export const createActivity = async (req, res) => {
  try {
    const activity = new Activity(req.body);
    await activity.save(); // ❌ Blocking
    
    // Broadcast to real-time clients
    io.to(`tenant:${activity.tenantId}`).emit('activity:new', activity); // ❌ Blocking
    
    res.status(201).json({ data: activity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

#### After (Asynchronous with Queue)
```javascript
import { activityQueue } from '../queues/activityQueue.js';

export const createActivity = async (req, res) => {
  try {
    const { error, value } = createActivitySchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    
    // ✅ Queue the activity for processing asynchronously
    const job = await activityQueue.add(
      'process-activity',
      value,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Remove after 1 hour
        },
      }
    );
    
    // Return immediately (< 50ms)
    res.status(202).json({
      success: true,
      message: 'Activity queued for processing',
      jobId: job.id,
      data: value,
    });
  } catch (error) {
    console.error('Error queuing activity:', error);
    res.status(500).json({ error: 'Failed to queue activity' });
  }
};
```

---

### Step 4: Create Worker Processors

```javascript
// workers/activityProcessor.js
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import Activity from '../models/Activity.js';
import { io } from '../server.js';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// ✅ Step 1: Save to MongoDB
export const saveActivityWorker = new Worker(
  'activities',
  async (job) => {
    console.log(`[Worker] Processing activity job ${job.id}`);
    
    try {
      const activity = new Activity(job.data);
      const savedActivity = await activity.save();
      
      // Store activity ID for next workers
      job.updateData({
        ...job.data,
        _id: savedActivity._id,
      });
      
      return { status: 'saved', activityId: savedActivity._id };
    } catch (error) {
      console.error(`[Worker] Failed to save activity:`, error);
      throw error; // Triggers retry
    }
  },
  { connection }
);

// ✅ Step 2: Broadcast to Real-Time Clients
export const realtimeNotificationWorker = new Worker(
  'activities',
  async (job) => {
    console.log(`[Worker] Broadcasting activity ${job.data._id}`);
    
    try {
      io.to(`tenant:${job.data.tenantId}`).emit('activity:new', job.data);
      return { status: 'notified' };
    } catch (error) {
      console.error('[Worker] Failed to broadcast:', error);
      throw error;
    }
  },
  { connection }
);

// ✅ Step 3: Send Notifications (Email, Slack)
export const notificationWorker = new Worker(
  'activities',
  async (job) => {
    console.log(`[Worker] Sending notifications for ${job.data._id}`);
    
    try {
      const { tenantId, actorName, type } = job.data;
      
      // Send email notification
      await emailService.send({
        to: getSubscribedUsers(tenantId),
        subject: `${actorName} performed a ${type} action`,
        template: 'activity-notification',
        data: job.data,
      });
      
      // Send Slack notification
      await slackService.notify({
        channel: `#activity-${tenantId}`,
        text: `${actorName} ${type}d entity ${job.data.entityId}`,
      });
      
      return { status: 'notified' };
    } catch (error) {
      console.error('[Worker] Failed to send notifications:', error);
      // Don't throw - notifications are not critical
      return { status: 'notification_failed', error: error.message };
    }
  },
  { connection }
);

// ✅ Step 4: Index for Search (Elasticsearch)
export const searchIndexWorker = new Worker(
  'activities',
  async (job) => {
    console.log(`[Worker] Indexing activity ${job.data._id}`);
    
    try {
      await elasticsearch.index({
        index: `activities-${job.data.tenantId}`,
        id: job.data._id,
        body: job.data,
      });
      
      return { status: 'indexed' };
    } catch (error) {
      console.error('[Worker] Failed to index:', error);
      throw error;
    }
  },
  { connection }
);

// Event listeners for monitoring
saveActivityWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

saveActivityWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed: ${err.message}`);
});

export default saveActivityWorker;
```

---

### Step 5: Setup Worker Pipeline

```javascript
// Start workers in separate processes or containers
// workers/index.js
import { saveActivityWorker, realtimeNotificationWorker } from './activityProcessor.js';

console.log('🚀 Starting activity workers...');

// Workers process jobs in parallel
saveActivityWorker.on('completed', (job) => {
  console.log(`Activity saved: ${job.id}`);
});

saveActivityWorker.on('failed', (job, err) => {
  console.error(`Activity save failed: ${err.message}`);
});

process.on('SIGTERM', async () => {
  await saveActivityWorker.close();
  process.exit(0);
});
```

---

## 5. Idempotency & Failure Handling

### Problem
What if a worker crashes after saving but before confirming?

```
Job starts → Save to DB ✓ → Crash → Restart → Save to DB again ❌ (Duplicate)
```

### Solution: Idempotent Keys
```javascript
// workers/activityProcessor.js
export const saveActivityWorker = new Worker(
  'activities',
  async (job) => {
    const idempotencyKey = job.data.idempotencyKey || generateUUID();
    
    // Check if already processed
    const existing = await Activity.findOne({ idempotencyKey });
    if (existing) {
      console.log(`Activity ${idempotencyKey} already processed, skipping`);
      return { status: 'skipped', reason: 'duplicate' };
    }
    
    try {
      const activity = new Activity({
        ...job.data,
        idempotencyKey,
      });
      await activity.save();
      
      return { status: 'saved', activityId: activity._id };
    } catch (error) {
      throw error;
    }
  },
  { connection }
);
```

### Enhanced API with Idempotency
```javascript
export const createActivity = async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || generateUUID();
  
  try {
    // Check idempotency cache
    const cached = await idempotencyCache.get(idempotencyKey);
    if (cached) {
      return res.status(202).json({
        success: true,
        message: 'Activity (cached)',
        data: cached,
      });
    }
    
    const job = await activityQueue.add(
      'process-activity',
      { ...req.body, idempotencyKey },
      { jobId: idempotencyKey } // Use same ID for duplicate prevention
    );
    
    const result = { jobId: job.id, ...req.body };
    await idempotencyCache.set(idempotencyKey, result, 3600);
    
    res.status(202).json({
      success: true,
      message: 'Activity queued',
      data: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Idempotency cache (Redis)
const idempotencyCache = {
  set: (key, value, ttl) => redis.setex(key, ttl, JSON.stringify(value)),
  get: async (key) => {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },
};
```

---

## 6. Dead Letter Queue (DLQ)

### Handling Permanent Failures
```javascript
// workers/dlqWorker.js
export const deadLetterQueueWorker = new Worker(
  'activities:dlq',
  async (job) => {
    console.error(`Processing DLQ job: ${job.id}`);
    
    // Log for manual review
    await LogService.log({
      type: 'ACTIVITY_FAILED',
      jobId: job.id,
      error: job.failedReason,
      data: job.data,
      timestamp: new Date(),
    });
    
    // Alert team
    await alertService.notify({
      channel: '#prod-alerts',
      message: `❌ Activity processing failed permanently: ${job.id}`,
      data: job.data,
    });
    
    return { status: 'logged' };
  },
  { connection }
);

// Move failed jobs to DLQ after max retries
saveActivityWorker.on('failed', async (job, err) => {
  if (job.attemptsMade >= 3) {
    const dlqJob = await dlqQueue.add('process-dlq', job.data);
    console.log(`Moved job ${job.id} to DLQ: ${dlqJob.id}`);
  }
});
```

---

## 7. Monitoring & Observability

```javascript
// middleware/queueMetrics.js
import { register } from 'prom-client';
import { Counter, Gauge, Histogram } from 'prom-client';

export const queueMetrics = {
  jobsProcessed: new Counter({
    name: 'activity_jobs_processed_total',
    help: 'Total jobs processed',
  }),
  
  jobsFailed: new Counter({
    name: 'activity_jobs_failed_total',
    help: 'Total jobs failed',
  }),
  
  activeJobs: new Gauge({
    name: 'activity_jobs_active',
    help: 'Number of active jobs',
  }),
  
  processingDuration: new Histogram({
    name: 'activity_job_duration_ms',
    help: 'Job processing duration',
    buckets: [10, 50, 100, 500, 1000, 5000],
  }),
};

// Register metrics with workers
saveActivityWorker.on('completed', (job) => {
  queueMetrics.jobsProcessed.inc();
  queueMetrics.processingDuration.observe(job.duration);
});

saveActivityWorker.on('failed', () => {
  queueMetrics.jobsFailed.inc();
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

---

## 8. Deployment Architecture

### Single Server (Development)
```
Node.js App → Redis → Workers (same process)
      ↓
    MongoDB
```

### Production (Distributed)
```
Load Balancer
    ↓
┌───┴────┬──────┬──────┐
↓        ↓      ↓      ↓
App-1   App-2  App-3  App-4
 ↓       ↓      ↓      ↓
 └───────┼──────┴──────┘
         ↓
    Redis Cluster
    (Shared Queue)
         ↓
┌────┬───┴────┬────┬────┐
↓    ↓        ↓    ↓    ↓
W1   W2       W3   W4   W5
(Save) (Notify) (Index) (Analytics) (Search)
↓    ↓        ↓    ↓    ↓
DB   Email    ES   DW   ES
```

### Docker Compose Example
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mongodb:
    image: mongo:5
    ports:
      - "27017:27017"

  app:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - redis
      - mongodb
    environment:
      - REDIS_URL=redis://redis:6379
      - MONGODB_URI=mongodb://mongodb:27017/activity-feed

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    depends_on:
      - redis
      - mongodb
    environment:
      - REDIS_URL=redis://redis:6379
      - MONGODB_URI=mongodb://mongodb:27017/activity-feed
    scale: 3  # Run 3 worker instances
```

---

## 9. Performance Improvements

### Before (Synchronous)
```javascript
POST /activities
→ Validate (1ms)
→ Save to DB (20ms)
→ Broadcast to WebSocket (30ms)
→ Send email (100ms) ← BLOCKING
→ Index to Elasticsearch (50ms) ← BLOCKING
───────────────────────────
Total: 201ms ⏱️
```

### After (Asynchronous with Queue)
```javascript
POST /activities
→ Validate (1ms)
→ Publish to Queue (10ms) ← IMMEDIATE
───────────────────────────
Total: 11ms ✅ (18x faster!)

Background (parallel):
→ Worker 1: Save to DB (20ms)
→ Worker 2: Broadcast WebSocket (30ms)
→ Worker 3: Send email (100ms)
→ Worker 4: Index to Elasticsearch (50ms)

All happen in parallel, no blocking!
```

---

## 10. Checklist

- ✅ Install BullMQ and Redis
- ✅ Create activity queue definition
- ✅ Refactor API to publish to queue
- ✅ Implement worker processors
- ✅ Add idempotency keys
- ✅ Setup Dead Letter Queue
- ✅ Configure retry strategy
- ✅ Add monitoring/metrics
- ✅ Test failure scenarios
- ✅ Deploy horizontally
- ✅ Setup alerting

---

## Conclusion

Event-driven architecture enables:
- 🚀 **18x faster API responses**
- 📈 **Horizontal scaling** (add more workers)
- 🛡️ **Resilience** (automatic retries, DLQ)
- 📊 **Better observability** (queue metrics)
- 🔄 **Decoupled services** (easy to add new workers)

Perfect for 50M+ activities per day! 🎯

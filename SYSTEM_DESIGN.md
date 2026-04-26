# System Design: Scaling to 50M Activities Per Tenant

## Executive Summary
This document outlines a comprehensive architecture for scaling the Activity Feed system to handle 50 million activities per tenant while maintaining sub-100ms latency for cursor-based pagination queries.

---

## 1. Indexing Strategy

### Primary Indexes
```javascript
// Compound index: Essential for tenant isolation + cursor pagination
db.activities.createIndex({ tenantId: 1, createdAt: -1 })

// Single tenant index (for alternative queries)
db.activities.createIndex({ tenantId: 1 })

// Reverse timestamp index (for recent activities)
db.activities.createIndex({ createdAt: -1 })
```

### Index Cardinality Analysis
- **tenantId**: Low cardinality (thousands of tenants)
- **createdAt**: High cardinality (unique per record)
- **Compound index ordering**: tenantId first (filter), createdAt second (sort)

### Why This Works
- MongoDB uses the compound index to efficiently filter by tenantId
- Then uses the index's sort order to return activities in descending date order
- Cursor pagination picks up from the last timestamp without re-scanning

---

## 2. Sharding Strategy

### Sharding Key: `{ tenantId: 1 }`

**Pros:**
- Perfect isolation between tenants
- Eliminates hot shard problem
- Enables per-tenant replication policies
- Simplifies compliance and data residency

**Cons:**
- Cross-tenant analytics requires scatter-gather
- Rebalancing can be complex with many tenants

### Shard Distribution
```
- Small tenants (< 100K activities) → Single shard server
- Medium tenants (100K - 10M) → Dedicated shard
- Large tenants (10M - 50M) → Distributed across 3+ shards with replication
```

### Automatic Balancing
```javascript
// Enable automatic chunk migration
sh.enableBalancer()
sh.setBalancerState(true)

// Monitor balancer status
sh.getBalancerStatus()
```

---

## 3. Hot Tenant Isolation

### Problem
One tenant might generate 10x more activities than others, creating a "hot shard"

### Solutions

#### A. Cache Layer (Redis)
```
Hot Tenant (Active) → Redis Cache → MongoDB (Background Sync)
                    ↓
                 Replicas

- Cache recent 24-hour activities (typically 10-50K)
- TTL: 24 hours
- Background job syncs to disk every 5 minutes
```

#### B. Read Preferences
```javascript
// Route hot tenant reads to secondary replicas
db.activities.find({ tenantId: "hot-tenant" })
  .readPreference("secondary")
  .cursor()
```

#### C. Dedicated Replica Set
```
Hot Tenant → Dedicated 5-node Replica Set
           (1 Primary + 4 Secondaries)

Other Tenants → Standard 3-node Replica Set
               (1 Primary + 2 Secondaries)
```

#### D. Write Throttling
```javascript
// Rate limit writes from hot tenants
const maxWritesPerSecond = 1000;
if (writeCountPerSecond[tenantId] > maxWritesPerSecond) {
  return 429 Too Many Requests;
}
```

---

## 4. Data Retention Policy

### Archival Strategy
```
Active Data (30 days) → Hot tier (SSD, MongoDB)
                      ↓
Archive Data (30-365 days) → Cold tier (Archive collection)
                            ↓
Old Data (365+ days) → AWS S3 / Glacier
```

### Implementation
```javascript
// Daily archival job
async function archiveOldActivities() {
  const archiveDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  await Activity.updateMany(
    { createdAt: { $lt: archiveDate }, archived: false },
    { archived: true },
    { upsert: false }
  );
  
  // Move to archive collection
  await ActivityArchive.insertMany(
    await Activity.find({ archived: true }).lean()
  );
  
  await Activity.deleteMany({ archived: true });
}

// Schedule daily at 2 AM
schedule.scheduleJob('0 2 * * *', archiveOldActivities);
```

### Index for Archived Data
```javascript
// Separate indexes for archived activities
db.activity_archive.createIndex({ tenantId: 1, createdAt: -1 })
```

---

## 5. Real-Time Delivery: WebSocket vs SSE

### Comparison Matrix

| Feature | WebSocket | SSE |
|---------|-----------|-----|
| Latency | 10-50ms | 50-200ms |
| Connection Overhead | Higher | Lower |
| Load Balancing | Requires sticky sessions | Native support |
| Browser Support | 95%+ | 90%+ |
| Unidirectional | ✗ | ✓ |
| Reconnection Logic | Manual | Automatic |

### Recommended Choice: **WebSocket for Premium, SSE for Standard**

#### WebSocket Implementation (Premium Tenants)
```javascript
// Backend
const io = require('socket.io')(5001, { cors: { origin: '*' } });
const redisAdapter = require('@socket.io/redis-adapter');

io.adapter(redisAdapter(pubClient, subClient));

io.on('connection', (socket) => {
  socket.on('join-tenant', (tenantId) => {
    socket.join(`tenant:${tenantId}`);
  });
  
  // Real-time activity broadcast
  subscribeToActivityStream(tenantId, (activity) => {
    io.to(`tenant:${tenantId}`).emit('activity:new', activity);
  });
});

// Publish activity through Redis pub/sub (scales horizontally)
async function publishActivity(activity) {
  pubClient.publish('activities', JSON.stringify(activity));
  io.to(`tenant:${activity.tenantId}`).emit('activity:new', activity);
}
```

#### SSE Implementation (Standard Tenants)
```javascript
// Backend
app.get('/api/activities/stream', (req, res) => {
  const { tenantId } = req.query;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  const subscription = subscribeToTenantActivities(tenantId, (activity) => {
    res.write(`data: ${JSON.stringify(activity)}\n\n`);
  });
  
  req.on('close', () => {
    subscription.unsubscribe();
    res.end();
  });
});

// Frontend
const eventSource = new EventSource(
  `/api/activities/stream?tenantId=${tenantId}`
);

eventSource.onmessage = (event) => {
  const newActivity = JSON.parse(event.data);
  setActivities(prev => [newActivity, ...prev]);
};
```

### Scaling Real-Time Delivery

#### Architecture
```
Activity Service → Redis Pub/Sub
                     ↓
           ┌─────────┼─────────┐
           ↓         ↓         ↓
      WebSocket  SSE Server  WebSocket
      Server 1   Server 1    Server 2
           ↓         ↓         ↓
      Clients 1-N  Clients  Clients
```

#### Redis Pub/Sub Scaling
```javascript
// Use Redis Streams for high-volume scenarios (50M+ activities)
async function publishActivity(activity) {
  await redisClient.xadd(
    `activities:${activity.tenantId}`,
    '*',
    'data',
    JSON.stringify(activity)
  );
  
  // Emit to connected clients
  io.to(`tenant:${activity.tenantId}`).emit('activity:new', activity);
}

// Consume from stream (survives server restarts)
async function streamActivities(tenantId) {
  const streamKey = `activities:${tenantId}`;
  let lastId = '0';
  
  while (true) {
    const messages = await redisClient.xrange(streamKey, lastId);
    
    for (const [id, data] of messages) {
      broadcastToClients(tenantId, JSON.parse(data.data));
      lastId = id;
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
}
```

---

## 6. Database Configuration for 50M Activities

### Hardware Requirements
```
Per Shard (10M activities):
- RAM: 64GB (40GB for cache, 24GB for queries)
- CPU: 16 cores (Intel Xeon)
- Storage: 2TB SSD (NVMe for hot tier)
- Network: 10Gbps connection

Replica Set: 1 Primary + 2 Secondaries
```

### Connection Pooling
```javascript
const mongoose = require('mongoose');

const dbConfig = {
  maxPoolSize: 200,
  minPoolSize: 100,
  maxIdleTimeMS: 45000,
  retryWrites: true,
  w: 'majority',
};

mongoose.connect(mongoUri, dbConfig);
```

### Query Optimization
```javascript
// Use projections to minimize data transfer
db.activities.find({ tenantId, createdAt: { $lt } })
  .project({
    tenantId: 1,
    actorId: 1,
    actorName: 1,
    type: 1,
    entityId: 1,
    metadata: 1,
    createdAt: 1,
  })
  .sort({ createdAt: -1 })
  .limit(20)
  .lean() // In Mongoose: returns plain objects, not documents
```

---

## 7. Monitoring & Metrics

### Key Performance Indicators
```
- P50 Query Latency: < 50ms
- P95 Query Latency: < 100ms
- P99 Query Latency: < 200ms
- Write Throughput: > 50K req/s
- Index Cache Hit Ratio: > 95%
- Replication Lag: < 1s
```

### MongoDB Metrics to Monitor
```javascript
// Query performance
db.activities.explain("executionStats").find({ tenantId, createdAt: { $lt } })

// Index size
db.activities.stats().indexSizes

// Replication lag
rs.status().members[i].optimeDate

// Memory usage
db.serverStatus().mem

// Connection count
db.serverStatus().connections
```

### Application Monitoring
```javascript
// Example: Track cursor pagination efficiency
const metrics = {
  queryExecutionTime: 25, // ms
  documentScanned: 25,
  documentReturned: 20,
  efficiency: (20 / 25) * 100, // 80%
};

// Log if efficiency drops below 90%
if (metrics.efficiency < 90) {
  console.warn('Query efficiency degraded', metrics);
}
```

---

## 8. Cost Optimization

### Storage
- **Active Data (30 days)**: 500GB @ $1/GB/month = $500
- **Archive (1 year)**: 5TB @ $0.05/GB/month = $250  
- **AWS S3 (3+ years)**: 5TB @ $0.023/GB/month = $115

### Compute
- Sharded cluster (5 shards × 3 nodes): 15 servers @ $5K/month = $75K
- Dedicated high-traffic shard: +$10K/month
- Load balancers & monitoring: $5K/month

### Optimization Strategies
- **Auto-scaling**: Scale down replicas during low traffic
- **Reserved instances**: 40% savings on on-premises at scale
- **Compression**: zstd compression reduces storage by 40%

---

## 9. Disaster Recovery

### Backup Strategy
```
Hourly Snapshots → Retention 7 days
Daily Snapshots → Retention 30 days
Weekly Snapshots → Retention 1 year

RTO (Recovery Time Objective): < 1 hour
RPO (Recovery Point Objective): < 5 minutes
```

### Implementation
```javascript
// Automated backup
const backup = require('mongodb-backup');

schedule.scheduleJob('0 * * * *', () => {
  backup({
    uri: mongoUri,
    root: './backups',
    archive: `./backups/backup-${Date.now()}.tar.gz`,
  });
});
```

---

## 10. Security Considerations

### Tenant Isolation
```javascript
// Every query must include tenantId
const query = {
  tenantId: authenticatedTenantId, // This is mandatory
  /* other filters */
};
```

### Authentication
```javascript
// Enable MongoDB authentication
db.createUser({
  user: 'service_user',
  pwd: 'strong_password',
  roles: ['readWrite'],
});
```

### Network Security
- Firewall: Allow only app servers to connect to MongoDB
- TLS: Encrypt all connections
- VPN: Private network between services

---

## Conclusion

This architecture supports **50M+ activities per tenant** with:
- ✅ Cursor-based pagination (no offset issues)
- ✅ Sub-100ms P95 latencies
- ✅ Horizontal scaling via sharding
- ✅ Hot tenant isolation
- ✅ Real-time delivery options
- ✅ Cost-effective data retention

Migration path:
1. Start with single shard (up to 100M activities)
2. Evaluate hot tenants, implement caching
3. Shard by tenantId when needed
4. Archive old data to S3
5. Implement WebSocket for premium tenants

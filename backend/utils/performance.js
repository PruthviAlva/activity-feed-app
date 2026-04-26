/**
 * Performance Debugging: Query Analysis
 * 
 * PROBLEM: Using skip() for pagination is O(n) complexity
 * - skip(1000000) must iterate through 1M documents
 * - Becomes exponentially slower with larger offsets
 * - Cannot use indexes efficiently
 * 
 * SOLUTION: Cursor-based pagination is O(log n) complexity
 * - Uses indexed range queries
 * - Consistent results despite concurrent modifications
 * - Can handle millions of records efficiently
 */

export const queryPerformanceAnalysis = {
  // SLOW APPROACH - DO NOT USE
  slowApproach: `
    db.activities.find({ tenantId }).sort({ createdAt: -1 }).skip(1000).limit(20)
    
    Performance issues:
    - skip(1000) scans 1000 documents without using index efficiently
    - O(n) complexity - linear with offset value
    - Becomes unusable at millions of records
    - Can't leverage compound index effectively
  `,

  // CORRECT APPROACH - USE THIS
  correctApproach: `
    const query = { tenantId, createdAt: { $lt: cursorDate } };
    db.activities.find(query).sort({ createdAt: -1 }).limit(20)
    
    Performance benefits:
    - Uses compound index (tenantId, createdAt) efficiently
    - O(log n) complexity using B-tree index
    - Constant time regardless of dataset size
    - Consistent even with concurrent writes
  `,

  // Required indexes
  requiredIndexes: `
    // Primary compound index for tenant isolation + cursor pagination
    db.activities.createIndex({ tenantId: 1, createdAt: -1 })
    
    // Additional index for filtering by tenant alone
    db.activities.createIndex({ tenantId: 1 })
    
    // Partial index for recent activities (optimization)
    db.activities.createIndex({ tenantId: 1, createdAt: -1 }, {
      partialFilterExpression: {
        createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
      }
    })
  `,

  // Metrics to monitor
  metricsToMonitor: [
    'Query execution time (ms)',
    'Number of documents scanned (executionStats.totalDocsExamined)',
    'Number of documents returned (executionStats.nReturned)',
    'Index usage (executionStats.executionStages.stage)',
    'Memory usage during query',
    'P95 and P99 latencies',
    'Throughput (requests per second)',
    'Index size on disk',
    'Cache efficiency',
  ],

  // Scaling strategies for 50M activities per tenant
  scalingStrategies: {
    indexing: 'Use compound index (tenantId, createdAt) with proper cardinality',
    sharding: 'Shard by tenantId to distribute load horizontally',
    archival: 'Move old activities (>90 days) to separate collection',
    caching: 'Cache recent activities (24h) in Redis for hot reads',
    read_replicas: 'Use read replicas for analytics queries',
  },
};

/**
 * MongoDB Query Monitoring
 */
export class QueryMonitor {
  static async analyzeQuery(collection, query, options = {}) {
    const startTime = Date.now();
    const result = await collection.find(query).explain('executionStats');
    const duration = Date.now() - startTime;

    return {
      duration,
      executionStats: result,
      docsScanned: result.executionStats.totalDocsExamined,
      docsReturned: result.executionStats.nReturned,
      efficiency: (result.executionStats.nReturned / result.executionStats.totalDocsExamined) * 100,
      indexUsed: result.executionStats.executionStages.stage === 'COLLSCAN' ? 'NONE' : result.executionStats.executionStages.stage,
    };
  }

  static getPerformanceMetrics() {
    return {
      avgQueryTime: 'Monitor via application logs',
      indexEfficiency: 'Track docsReturned / docsScanned ratio',
      slowQueryThreshold: '100ms',
    };
  }
}

/**
 * Cursor Pagination Helper
 */
export class CursorPaginator {
  static createCursor(lastItem) {
    return lastItem.createdAt.toISOString();
  }

  static decodeCursor(cursor) {
    return new Date(cursor);
  }

  static async paginate(collection, tenantId, cursor, limit = 20) {
    const query = { tenantId };
    
    if (cursor) {
      query.createdAt = { $lt: new CursorPaginator().decodeCursor(cursor) };
    }

    const items = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items,
      hasMore,
      nextCursor: items.length > 0 ? this.createCursor(items[items.length - 1]) : null,
    };
  }
}

export default queryPerformanceAnalysis;

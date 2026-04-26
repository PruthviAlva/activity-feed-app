import Activity from '../models/Activity.js';
import Joi from 'joi';

// Validation schema for creating activity
const createActivitySchema = Joi.object({
  tenantId: Joi.string().required(),
  actorId: Joi.string().required(),
  actorName: Joi.string().required(),
  type: Joi.string().valid('create', 'update', 'delete', 'like', 'comment', 'share').required(),
  entityId: Joi.string().required(),
  metadata: Joi.object().optional(),
});

/**
 * POST /activities
 * Create a new activity
 * Optimized for high write throughput
 */
export const createActivity = async (req, res) => {
  try {
    const { error, value } = createActivitySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const activity = new Activity({
      tenantId: value.tenantId,
      actorId: value.actorId,
      actorName: value.actorName,
      type: value.type,
      entityId: value.entityId,
      metadata: value.metadata || {},
      createdAt: new Date(),
    });

    const savedActivity = await activity.save();

    res.status(201).json({
      success: true,
      data: savedActivity,
      message: 'Activity created successfully',
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

/**
 * GET /activities
 * Cursor-based pagination with tenant isolation
 * 
 * Query parameters:
 * - tenantId (required): Tenant identifier for isolation
 * - cursor (optional): ISO date string for pagination (start point)
 * - limit (optional): Number of records to fetch (default: 20, max: 100)
 * 
 * Why cursor pagination?
 * - No skip() operations (which are slow for large datasets)
 * - Consistent results even when data changes
 * - Scalable for 50M+ activities per tenant
 */
export const getActivities = async (req, res) => {
  try {
    const { tenantId, cursor, limit } = req.query;

    // Validation
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const pageLimit = Math.min(parseInt(limit) || 20, 100); // Max 100 records
    const query = { tenantId };

    // Cursor-based pagination: if cursor provided, only fetch records before it
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate.getTime())) {
        return res.status(400).json({ error: 'Invalid cursor format. Use ISO 8601 date.' });
      }
      query.createdAt = { $lt: cursorDate };
    }

    // Fetch one extra record to determine if there are more results
    const activities = await Activity.find(query)
      .select('_id tenantId actorId actorName type entityId metadata createdAt')
      .sort({ createdAt: -1 })
      .limit(pageLimit + 1)
      .lean(); // Use lean() for better performance - returns plain JS objects, not Mongoose documents

    let hasMore = false;
    if (activities.length > pageLimit) {
      activities.pop(); // Remove the extra record
      hasMore = true;
    }

    // Determine next cursor (the timestamp of the last record)
    let nextCursor = null;
    if (activities.length > 0) {
      nextCursor = activities[activities.length - 1].createdAt.toISOString();
    }

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        limit: pageLimit,
        hasMore,
        nextCursor,
      },
      message: 'Activities fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

/**
 * Debug endpoint to understand query performance
 * Returns query execution time and index usage
 */
export const debugQuery = async (req, res) => {
  try {
    const { tenantId, cursor, limit } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const pageLimit = Math.min(parseInt(limit) || 20, 100);
    const query = { tenantId };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    // Use explain to see the query plan
    const explanation = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(pageLimit)
      .explain('executionStats');

    res.status(200).json({
      success: true,
      debug: {
        queryPlan: explanation,
        recommendation: 'Using compound index (tenantId, createdAt) for optimal performance',
      },
    });
  } catch (error) {
    console.error('Error in debug query:', error);
    res.status(500).json({ error: 'Debug query failed' });
  }
};

import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'like', 'comment', 'share'],
    },
    entityId: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // We only use createdAt for cursor pagination
    collection: 'activities',
  }
);

// CRITICAL: Compound index for tenant isolation + cursor-based pagination
// This is designed for high write throughput and efficient cursor pagination
activitySchema.index({ tenantId: 1, createdAt: -1 });
activitySchema.index({ tenantId: 1, _id: 1 });

// Projection: Only select necessary fields to optimize read performance
activitySchema.query.withProjection = function () {
  return this.select('_id tenantId actorId actorName type entityId metadata createdAt');
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;

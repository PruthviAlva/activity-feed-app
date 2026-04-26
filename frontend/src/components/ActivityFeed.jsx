import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useActivityFeed, useCreateActivity } from '../hooks/useActivityFeed';
import ActivityItem from './ActivityItem';
import './ActivityFeed.css';

/**
 * ActivityFeed Component
 * 
 * Features:
 * - Infinite scroll with cursor-based pagination
 * - Real-time updates
 * - Optimistic UI updates
 * - Filtering by activity type
 * - Empty and loading states
 * - Prevents unnecessary re-renders using useMemo and useCallback
 */
const ActivityFeed = ({ tenantId, title = 'Activity Feed' }) => {
  const [filter, setFilter] = useState('all');
  const [localActivities, setLocalActivities] = useState([]);
  const [rollbackQueue, setRollbackQueue] = useState([]);

  const { activities, loading, error, hasMore, loadMore } = useActivityFeed(tenantId);
  const { createActivity, submitting: creating, error: createError } = useCreateActivity();

  const observerTarget = useRef(null);

  /**
   * Sync external activities with local state
   */
  useEffect(() => {
    setLocalActivities(activities);
  }, [activities]);

  /**
   * Intersection Observer for infinite scroll
   * Triggers loadMore when user scrolls near bottom
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMore, hasMore, loading]);

  /**
   * Handle new activity creation with optimistic update
   */
  const handleCreateActivity = useCallback(
    async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);

      const newActivity = {
        tenantId,
        actorId: formData.get('actorId'),
        actorName: formData.get('actorName'),
        type: formData.get('type'),
        entityId: formData.get('entityId'),
        metadata: {
          description: formData.get('description'),
        },
      };

      // Optimistic add
      const optimisticActivity = {
        _id: `temp-${Date.now()}`,
        ...newActivity,
        createdAt: new Date().toISOString(),
      };

      setLocalActivities((prev) => [optimisticActivity, ...prev]);
      const rollbackId = optimisticActivity._id;
      setRollbackQueue((prev) => [...prev, rollbackId]);

      try {
        await createActivity(newActivity, () => {});
        event.target.reset();

        // Remove from rollback queue on success
        setRollbackQueue((prev) => prev.filter((id) => id !== rollbackId));
      } catch (err) {
        // Rollback: Remove the optimistic activity on error
        setLocalActivities((prev) =>
          prev.filter((activity) => activity._id !== rollbackId)
        );
        setRollbackQueue((prev) => prev.filter((id) => id !== rollbackId));
        alert(`Failed to create activity: ${err.message}`);
      }
    },
    [tenantId, createActivity]
  );

  /**
   * Filtered activities based on selected filter
   * Memoized to prevent unnecessary recalculations
   */
  const filteredActivities = useMemo(() => {
    if (filter === 'all') {
      return localActivities;
    }
    return localActivities.filter((activity) => activity.type === filter);
  }, [localActivities, filter]);

  // Extract unique activity types
  const activityTypes = useMemo(() => {
    const types = new Set(localActivities.map((a) => a.type));
    return Array.from(types).sort();
  }, [localActivities]);

  return (
    <div className="activity-feed-container">
      <div className="activity-feed-header">
        <h1>{title}</h1>
        <p className="tenant-info">Tenant ID: {tenantId}</p>
      </div>

      {/* Create Activity Form */}
      <form className="create-activity-form" onSubmit={handleCreateActivity}>
        <h2>Create Activity</h2>
        <div className="form-group">
          <input
            type="text"
            name="actorId"
            placeholder="Actor ID"
            required
            disabled={creating}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            name="actorName"
            placeholder="Actor Name"
            required
            disabled={creating}
          />
        </div>
        <div className="form-group">
          <select name="type" required disabled={creating}>
            <option value="">Select Type</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="like">Like</option>
            <option value="comment">Comment</option>
            <option value="share">Share</option>
          </select>
        </div>
        <div className="form-group">
          <input
            type="text"
            name="entityId"
            placeholder="Entity ID"
            required
            disabled={creating}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            name="description"
            placeholder="Description (optional)"
            disabled={creating}
          />
        </div>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create Activity'}
        </button>
      </form>

      {createError && <div className="error-message">{createError}</div>}

      {/* Error Display */}
      {error && <div className="error-message">{error}</div>}

      {/* Filter Controls */}
      <div className="filter-controls">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {activityTypes.map((type) => (
          <button
            key={type}
            className={filter === type ? 'active' : ''}
            onClick={() => setFilter(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Activities List */}
      <div className="activities-list">
        {filteredActivities.length === 0 ? (
          <div className="empty-state">
            {loading ? (
              <>
                <p>Loading activities...</p>
                <div className="spinner"></div>
              </>
            ) : (
              <p>No activities yet. Create one to get started!</p>
            )}
          </div>
        ) : (
          <>
            {filteredActivities.map((activity) => (
              <ActivityItem
                key={activity._id}
                activity={activity}
                isOptimistic={activity._id.startsWith('temp-')}
              />
            ))}
            {loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading more activities...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Intersection Observer Target for infinite scroll */}
      {hasMore && <div ref={observerTarget} className="observer-target" />}

      {!hasMore && filteredActivities.length > 0 && (
        <div className="end-of-feed">
          <p>You've reached the end of the feed</p>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;

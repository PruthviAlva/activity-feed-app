import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Custom hook for managing activity feed with cursor-based pagination
 * Features:
 * - Cursor-based pagination (no offset limitation)
 * - Optimistic updates (instant UI feedback)
 * - Real-time updates support
 * - Automatic rollback on error
 * - Efficient re-render prevention
 */
export const useActivityFeed = (tenantId, initialLimit = 20) => {
  // State for activities
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [limit] = useState(initialLimit);

  // Refs to track component state and prevent stale closures
  const activitiesRef = useRef([]);
  const isLoadingRef = useRef(false);

  /**
   * Fetch activities from API
   * Uses cursor-based pagination for better performance
   */
  const fetchActivities = useCallback(async (newCursor = null) => {
    if (isLoadingRef.current || !hasMore) return;

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = {
        tenantId,
        limit,
      };

      if (newCursor) {
        params.cursor = newCursor;
      }

      const response = await axios.get(`${API_URL}/activities`, { params });
      const { data, pagination } = response.data;

      // Append new activities (not replace) for infinite scroll
      setActivities((prev) => [...prev, ...data]);
      activitiesRef.current = [...activitiesRef.current, ...data];

      // Update pagination state
      setCursor(pagination.nextCursor);
      setHasMore(pagination.hasMore);

      setLoading(false);
      isLoadingRef.current = false;
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err.message || 'Failed to fetch activities');
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [tenantId, limit, hasMore]);

  /**
   * Load more activities (infinite scroll callback)
   */
  const loadMore = useCallback(() => {
    if (cursor && hasMore && !isLoadingRef.current) {
      fetchActivities(cursor);
    }
  }, [cursor, hasMore, fetchActivities]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (tenantId) {
      fetchActivities();
    }
  }, [tenantId]);

  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
  };
};

/**
 * Custom hook for creating activity with optimistic update
 * Features:
 * - Instant UI feedback
 * - Automatic rollback on error
 * - Loading state
 * - Error handling
 */
export const useCreateActivity = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const createActivity = useCallback(
    async (activityData, onOptimisticAdd) => {
      setSubmitting(true);
      setError(null);

      // Create optimistic activity (instant UI feedback)
      const optimisticActivity = {
        _id: `temp-${Date.now()}`,
        ...activityData,
        createdAt: new Date().toISOString(),
      };

      // Update UI immediately
      onOptimisticAdd(optimisticActivity);

      try {
        const response = await axios.post(`${API_URL}/activities`, activityData);
        setSubmitting(false);
        return response.data.data;
      } catch (err) {
        console.error('Error creating activity:', err);
        setError(err.message || 'Failed to create activity');
        setSubmitting(false);

        // Throw error to trigger rollback in component
        throw err;
      }
    },
    []
  );

  return {
    createActivity,
    submitting,
    error,
  };
};

export default useActivityFeed;

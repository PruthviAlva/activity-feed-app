import React, { memo } from 'react';
import './ActivityItem.css';

/**
 * ActivityItem Component
 * 
 * Memoized to prevent unnecessary re-renders
 * Only re-renders if the activity prop changes
 */
const ActivityItem = memo(({ activity, isOptimistic }) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    const icons = {
      create: '✨',
      update: '✏️',
      delete: '🗑️',
      like: '❤️',
      comment: '💬',
      share: '🔄',
    };
    return icons[type] || '📝';
  };

  return (
    <div className={`activity-item ${isOptimistic ? 'optimistic' : ''}`}>
      <div className="activity-icon">{getActivityIcon(activity.type)}</div>
      <div className="activity-content">
        <div className="activity-header">
          <strong className="actor-name">{activity.actorName}</strong>
          <span className="activity-type">{activity.type}</span>
        </div>
        <p className="activity-description">
          {activity.metadata?.description || `${activity.type}d entity ${activity.entityId}`}
        </p>
        <div className="activity-meta">
          <span className="timestamp">{formatDate(activity.createdAt)}</span>
          <span className="entity-id">Entity: {activity.entityId}</span>
          {isOptimistic && <span className="optimistic-badge">Pending...</span>}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - return true if props are equal (skip re-render)
  return (
    prevProps.activity._id === nextProps.activity._id &&
    prevProps.activity.type === nextProps.activity.type &&
    prevProps.isOptimistic === nextProps.isOptimistic
  );
});

ActivityItem.displayName = 'ActivityItem';

export default ActivityItem;

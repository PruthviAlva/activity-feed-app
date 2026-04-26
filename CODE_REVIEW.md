# Task 6: Code Review - React Hook Debugging

## Problem: Analyzing Broken useEffect Hook

### The Buggy Code
```javascript
useEffect(() => {
  fetchActivities().then(setActivities);
}, [activities]);  // ❌ WRONG DEPENDENCY
```

---

## 1. 🐛 The Bug Explained

### What's Wrong?
The `fetchActivities` function depends on the data it's fetching itself!

```
Sequence of events:
1. Component mounts
2. useEffect runs → fetchActivities() → updates activities state
3. activities state changes → dependency array [activities] triggers re-run
4. Effect runs again → fetchActivities() → updates activities again
5. INFINITE LOOP! 🔄
```

### Why This Happens
```javascript
// The dependency array [activities] means:
// "Run this effect whenever 'activities' changes"

// But the effect itself updates 'activities'
useEffect(() => {
  setActivities(newData);  // This changes 'activities'
}, [activities]);          // Which triggers this effect again
                           // Which changes 'activities' again...
```

---

## 2. 💥 Impact Analysis

### Symptoms Users Experience
- ✗ **Infinite API calls** - Network tab shows 1000s of requests
- ✗ **Browser freezes** - React reconciliation loop consumes 100% CPU
- ✗ **Memory leak** - Event listeners never cleaned up
- ✗ **API rate limiting** - Backend blocks the client
- ✗ **Rapid flickering** - UI in constant re-render loop

### Performance Metrics
```
Healthy component:
- API calls: 1 on mount
- Re-renders: 1 on mount
- Memory: stable ~5MB

Buggy component:
- API calls: 1000+ in 10 seconds ⚠️
- Re-renders: 1000+ in 10 seconds ⚠️
- Memory: grows to 100MB+ ⚠️
```

### Network Impact
```
Healthy: GET /api/activities → 50ms response
         ↓
         Complete

Buggy:   GET /api/activities → 50ms
         ↓
         Response received → activities updated
         ↓
         Effect re-runs (dependency) → GET /api/activities
         ↓
         Response received → activities updated
         ↓
         Effect re-runs → GET /api/activities
         ↓
         ... [1000x repetition] ...
         ↓
         API rate limit (429 Too Many Requests)
```

---

## 3. ✅ The Correct Fix

### Fix 1: Empty Dependency Array (Preferred)
```javascript
// ✅ CORRECT
useEffect(() => {
  fetchActivities().then(setActivities);
}, []);  // Empty array = run once on mount only
```

**Why this works:**
- Effect runs ONCE when component mounts
- No dependencies to track
- No re-triggers from state changes
- Perfect for initial data fetch

#### When to Use
```javascript
// ✅ Load initial data
useEffect(() => {
  fetchUserProfile().then(setUser);
}, []);

// ✅ Setup subscriptions
useEffect(() => {
  const subscription = emailService.subscribe();
  return () => subscription.unsubscribe();
}, []);

// ✅ Initialize analytics
useEffect(() => {
  analytics.init();
}, []);
```

---

### Fix 2: With Parameters (Advanced)
```javascript
// If you need to refetch when certain props change:
useEffect(() => {
  fetchActivities(tenantId).then(setActivities);
}, [tenantId]);  // ✅ Re-fetch only when tenantId changes
```

**Why this works:**
- Dependency is `tenantId` (a prop), not `activities` (state being updated)
- When prop changes, effect re-runs
- Fetching new data doesn't trigger the effect again
- No infinite loop

---

### Fix 3: With useCallback (Safe & Optimized)
```javascript
// Prevent unnecessary re-renders
const fetchActivities = useCallback(async () => {
  const response = await fetch('/api/activities');
  const data = await response.json();
  setActivities(data);
}, []);  // No dependencies = function is stable

useEffect(() => {
  fetchActivities();
}, [fetchActivities]);  // ✅ Safe dependency
```

**Why this works:**
- useCallback wraps the fetch function
- Function reference doesn't change (unless dependencies change)
- useEffect sees stable dependency
- Prevents infinite loops while allowing proper re-fetching

---

## 4. 🔧 Implementation Strategy

### Step 1: Diagnose the Issue
```javascript
// Add console logs to see the loop
useEffect(() => {
  console.log('Effect running, activities:', activities.length);
  fetchActivities().then(setActivities);
}, [activities]);  // Still buggy, but now we can verify
```

**Output:**
```
Effect running, activities: 0
Effect running, activities: 20
Effect running, activities: 20
Effect running, activities: 20
... [infinite] ...
```

### Step 2: Fix the Dependency
```javascript
useEffect(() => {
  console.log('Effect running once on mount');
  fetchActivities().then(setActivities);
}, []);  // ✅ Fixed!
```

**Output:**
```
Effect running once on mount
```

### Step 3: Verify with useEffect Hook
```javascript
// Verify dependency analysis with eslint
// Add this rule to .eslintrc.json:
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

## 5. 🛡️ Prevention Strategy

### 1. Enable ESLint Plugin
```json
// .eslintrc.json
{
  "extends": ["plugin:react-hooks/recommended"],
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

**This catches the issue immediately in your IDE!**
```
❌ Line 5: Missing dependency in useEffect
   > [activities]
   
   Did you mean [tenantId] or []?
```

---

### 2. Understand Dependency Rules

```javascript
// ✅ GOOD: Empty dependencies for initial fetch
useEffect(() => { fetchData(); }, [])

// ✅ GOOD: External dependency (prop)
useEffect(() => { fetchData(tenantId); }, [tenantId])

// ✅ GOOD: State setter (stable reference)
useEffect(() => { setData(...); }, [setData]) // Safe - setData never changes

// ❌ BAD: Depends on state it updates
useEffect(() => { setData(...); }, [data])

// ❌ BAD: Depends on derived state
useEffect(() => { setFiltered(...); }, [filtered])

// ⚠️ RISKY: Multiple unrelated dependencies
useEffect(() => { 
  fetchData(tenantId, filterId); 
}, [tenantId, filterId]) // OK if intentional, risky if added carelessly
```

---

### 3. Dependency Analysis Checklist

Before writing your dependency array, ask:
```
1. What triggers should cause this effect to run?
   → Put those in the dependency array

2. What values does this effect use?
   → If from outside scope, check if they should be dependencies

3. Could this create a loop?
   → Does the effect update any of its own dependencies?
   
4. What's the minimum dependency set?
   → Only include what's truly necessary
```

---

### 4. Common Patterns

#### Pattern A: Fetch on Mount
```javascript
useEffect(() => {
  // Fetch once when component loads
  loadInitialData();
}, []); // ✅ Empty = onceonly
```

#### Pattern B: Fetch When Prop Changes
```javascript
useEffect(() => {
  // Refetch when user ID changes
  loadUserData(userId);
}, [userId]); // ✅ userId is a prop
```

#### Pattern C: Filter Local Data
```javascript
const [items, setItems] = useState([]);
const [filtered, setFiltered] = useState([]);

useEffect(() => {
  // Update filtered when search changes, NOT when filtered changes
  const newFiltered = items.filter(i => i.name.includes(search));
  setFiltered(newFiltered);
}, [items, search]); // ✅ Correct: items and search
```

#### Pattern D: Setup & Cleanup
```javascript
useEffect(() => {
  const timer = setTimeout(() => refresh(), 5000);
  
  return () => clearTimeout(timer); // Cleanup
}, []); // ✅ Once on mount, cleanup on unmount
```

---

## 6. 📋 Complete Refactored Component

### Before (Buggy)
```javascript
import React, { useState, useEffect } from 'react';

function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  
  useEffect(() => {
    // ❌ INFINITE LOOP!
    fetchActivities().then(setActivities);
  }, [activities]); // ❌ WRONG: depends on state it updates
  
  return (
    <div>
      {activities.map(a => <div key={a.id}>{a.type}</div>)}
    </div>
  );
}

export default ActivityFeed;
```

### After (Fixed)
```javascript
import React, { useState, useEffect, useCallback } from 'react';

function ActivityFeed({ tenantId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Wrap fetch in useCallback for memoization
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/activities?tenantId=${tenantId}`);
      const data = await response.json();
      setActivities(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);
  
  // Effect: Run only on mount or when tenantId changes
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities, tenantId]); // ✅ Correct dependencies
  
  // Add cleanup for potential subscriptions
  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {activities.map(a => (
        <div key={a._id}>{a.type}</div>
      ))}
    </div>
  );
}

export default ActivityFeed;
```

---

## 7. 🧪 Testing the Fix

### Unit Test
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import ActivityFeed from './ActivityFeed';

test('should fetch activities only once on mount', async () => {
  const fetchSpy = jest.fn();
  global.fetch = fetchSpy.mockResolvedValue({
    json: async () => [{ _id: '1', type: 'create' }],
  });
  
  render(<ActivityFeed tenantId="tenant-1" />);
  
  await waitFor(() => {
    // Should be called exactly once
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
  
  expect(screen.getByText('create')).toBeInTheDocument();
});

test('should refetch when tenantId changes', async () => {
  const fetchSpy = jest.fn();
  global.fetch = fetchSpy.mockResolvedValue({
    json: async () => [{ _id: '1', type: 'create' }],
  });
  
  const { rerender } = render(<ActivityFeed tenantId="tenant-1" />);
  
  await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
  
  // Change prop
  rerender(<ActivityFeed tenantId="tenant-2" />);
  
  await waitFor(() => {
    // Should be called again (total: 2)
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
```

---

## 8. 📊 Monitoring Dashboard

```javascript
// Monitor for useEffect issues
class EffectMonitor {
  static setupWatcher() {
    let effectCount = 0;
    
    // Patch React's useEffect globally
    const originalUseEffect = React.useEffect;
    React.useEffect = (callback, deps) => {
      effectCount++;
      
      if (effectCount > 100) {
        console.warn('⚠️ Too many effect runs - possible infinite loop!');
      }
      
      console.log(`[Effect] #${effectCount}, deps:`, deps);
      
      return originalUseEffect(callback, deps);
    };
  }
}
```

---

## Key Takeaways

| Aspect | Buggy | Fixed |
|--------|-------|-------|
| Dependency Array | `[activities]` | `[]` |
| Effect Runs | Infinite ∞ | Once ✓ |
| API Calls | 1000s ❌ | 1 ✓ |
| CPU Usage | 100% 📈 | ~5% ✓ |
| Error | Infinite loop | None ✓ |
| Fix Difficulty | 1´ | ~1 minute |

**This is one of the most common React bugs!** 🎯

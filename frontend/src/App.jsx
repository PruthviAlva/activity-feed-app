import React, { useState } from 'react';
import ActivityFeed from './components/ActivityFeed';
import './App.css';

function App() {
  const [tenantId, setTenantId] = useState('tenant-1');
  const [showTenantInput, setShowTenantInput] = useState(false);

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-content">
          <h1>Activity Feed System</h1>
          <p>Real-time activity tracking with cursor-based pagination</p>
        </div>
        <button
          className="tenant-toggle"
          onClick={() => setShowTenantInput(!showTenantInput)}
        >
          Switch Tenant
        </button>
      </div>

      {showTenantInput && (
        <div className="tenant-input-modal">
          <div className="modal-content">
            <label>Enter Tenant ID:</label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="e.g., tenant-1, tenant-2"
            />
            <button onClick={() => setShowTenantInput(false)}>Done</button>
          </div>
        </div>
      )}

      <ActivityFeed tenantId={tenantId} />
    </div>
  );
}

export default App;

import React from 'react';
import { Bell, Trash2, Zap, BarChart2 } from 'lucide-react';

export default function AlertFeed({ alerts = [], onClearAlerts }) {
  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex-between" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-normal)' }}>
        <div className="flex-gap-2">
          <Bell size={18} className="text-glow-blue" style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Anomaly Alerts</h2>
          <span className="brand-badge" style={{ margin: 0 }}>{alerts.length}</span>
        </div>
        {alerts.length > 0 && (
          <button 
            className="btn-secondary" 
            onClick={onClearAlerts}
            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
        {alerts.length === 0 ? (
          <div className="empty-placeholder" style={{ height: '250px' }}>
            <Bell size={40} className="empty-icon" />
            <p style={{ fontSize: '0.85rem' }}>No anomalies detected yet</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Live feed alerts will stream here in real time.
            </p>
          </div>
        ) : (
          <div className="alerts-container">
            {alerts.map((alert) => (
              <div 
                key={alert.alertRef} 
                className={`alert-card alert-${alert.strategy}`}
              >
                <div className="alert-header">
                  <div className="flex-gap-2">
                    <span className="alert-symbol-tag">{alert.symbol}</span>
                    <span className={`alert-badge ${alert.strategy}`}>
                      {alert.strategy === 'spike' ? (
                        <span className="flex-gap-2" style={{ gap: '2px' }}><Zap size={10} /> Spike/Drop</span>
                      ) : (
                        <span className="flex-gap-2" style={{ gap: '2px' }}><BarChart2 size={10} /> MA Dev</span>
                      )}
                    </span>
                  </div>
                  <span className="alert-ref">{alert.alertRef}</span>
                </div>

                <p className="alert-reason">{alert.reason}</p>

                <div className="flex-between" style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Price: <span style={{ fontFamily: 'var(--font-mono)' }}>₹{alert.price.toFixed(2)}</span>
                  </span>
                  <span className="alert-time">{alert.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

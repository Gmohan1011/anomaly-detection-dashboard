import React from 'react';
import { Clock, Activity, Cpu, Wifi, WifiOff, ShieldAlert, RefreshCw } from 'lucide-react';

export default function StatsPanel({ 
  isConnected, 
  simulatedTime, 
  ticksCount, 
  alertsCount,
  isScaleTesting,
  onToggleScaleTest,
  scaleTestStats
}) {
  return (
    <div className="top-stats-row">
      
      {/* Connection Status Card */}
      <div className="glass-panel stat-card">
        <div className="stat-icon" style={{ 
          borderColor: isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'
        }}>
          {isConnected ? (
            <Wifi className="change-up" style={{ filter: 'drop-shadow(0 0 4px var(--color-success))' }} size={20} />
          ) : (
            <WifiOff className="change-down" style={{ filter: 'drop-shadow(0 0 4px var(--color-spike))' }} size={20} />
          )}
        </div>
        <div className="stat-info">
          <span className="stat-label">Feed Connection</span>
          <span className="stat-value" style={{ 
            color: isConnected ? 'var(--color-success)' : 'var(--color-spike)',
            fontSize: '1rem',
            textTransform: 'uppercase'
          }}>
            {isConnected ? 'LIVE Ticker' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Simulated Time Card */}
      <div className="glass-panel stat-card">
        <div className="stat-icon">
          <Clock size={20} className="text-glow-blue" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Simulated IST Time</span>
          <span className="stat-value" style={{ fontSize: '0.95rem' }}>
            {simulatedTime ? simulatedTime.split('+')[0] : '--:--:--'}
          </span>
        </div>
      </div>

      {/* Ticks Processed Card */}
      <div className="glass-panel stat-card">
        <div className="stat-icon">
          <Activity size={20} className="text-glow-blue" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Ticks Ingested</span>
          <span className="stat-value">
            {ticksCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Anomaly scale testing panel / metrics */}
      <div className="glass-panel stat-card" style={{ gridColumn: 'span 2', minWidth: '350px' }}>
        <div className="stat-icon" style={{ 
          borderColor: isScaleTesting ? 'rgba(168, 85, 247, 0.3)' : 'var(--border-normal)'
        }}>
          <Cpu size={20} style={{ 
            color: isScaleTesting ? 'var(--color-secondary)' : 'var(--text-secondary)',
            filter: isScaleTesting ? 'drop-shadow(0 0 4px var(--color-secondary))' : 'none'
          }} />
        </div>
        
        <div className="stat-info" style={{ flex: 1, marginRight: '1rem' }}>
          <span className="stat-label">Scale Telemetry (1,000+ Symbols)</span>
          {isScaleTesting ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
              <span className="stat-value" style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>
                {scaleTestStats.ticksPerSec.toLocaleString()} ticks/sec
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Latency: {scaleTestStats.avgLatencyUs.toFixed(1)}μs | Active: 1,000 sym
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
              <span className="stat-value" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Scale Test Idle
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                Stress test the detection engine with simulated data streams.
              </span>
            </div>
          )}
        </div>

        <button 
          onClick={onToggleScaleTest}
          className={`btn-secondary ${isScaleTesting ? 'active' : ''}`}
          style={{ 
            padding: '6px 12px', 
            fontSize: '0.75rem',
            border: isScaleTesting ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border-normal)',
            background: isScaleTesting ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.03)',
            color: isScaleTesting ? 'var(--color-secondary)' : 'var(--text-primary)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isScaleTesting ? (
            <>
              <RefreshCw size={12} className="spinning" style={{ animation: 'spin 1.5s linear infinite' }} />
              Stop Test
            </>
          ) : (
            'Run Scale Test'
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}

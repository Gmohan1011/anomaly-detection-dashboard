import React, { useState, useEffect } from 'react';
import { Settings, Sliders, Plus, X, RefreshCw } from 'lucide-react';
import { STRATEGY_OPTIONS } from '../config/defaultConfig';

export default function SettingsPanel({ 
  selectedSymbol, 
  config, 
  onUpdateConfig, 
  activeSymbols, 
  allSymbols = [], 
  onSubscribeSymbol, 
  onUnsubscribeSymbol 
}) {
  const [strategy, setStrategy] = useState('spike');
  const [thresholdPercent, setThresholdPercent] = useState(0.5);
  const [windowSec, setWindowSec] = useState(60);
  const [deviationPercent, setDeviationPercent] = useState(1.0);
  const [sampleSize, setSampleSize] = useState(20);
  const [newSymbolSelect, setNewSymbolSelect] = useState('');

  // Sync state with selected symbol's current configuration
  useEffect(() => {
    const symbolConfig = config[selectedSymbol];
    if (symbolConfig) {
      setStrategy(symbolConfig.strategy || 'spike');
      setThresholdPercent(symbolConfig.thresholdPercent ?? 0.5);
      setWindowSec(symbolConfig.windowSec ?? 60);
      setDeviationPercent(symbolConfig.deviationPercent ?? 1.0);
      setSampleSize(symbolConfig.sampleSize ?? 20);
    }
  }, [selectedSymbol, config]);

  const handleSave = (e) => {
    e.preventDefault();
    const updatedSymbolConfig = {
      strategy,
      ...(strategy === 'spike' 
        ? { thresholdPercent: parseFloat(thresholdPercent), windowSec: parseInt(windowSec, 10) }
        : { deviationPercent: parseFloat(deviationPercent), sampleSize: parseInt(sampleSize, 10) }
      )
    };

    onUpdateConfig(selectedSymbol, updatedSymbolConfig);
  };

  // Filter out already subscribed symbols
  const availableSymbols = allSymbols.filter(
    (sym) => sym.isActive && !activeSymbols.includes(sym.symbol)
  );

  const handleAddSymbol = (e) => {
    e.preventDefault();
    if (newSymbolSelect) {
      onSubscribeSymbol(newSymbolSelect);
      setNewSymbolSelect('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Active Subscriptions panel */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div className="flex-gap-2" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-normal)', paddingBottom: '0.75rem' }}>
          <Settings size={18} className="text-glow-blue" style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Symbol Subscriptions</h2>
        </div>

        {/* Subscribe form */}
        <form onSubmit={handleAddSymbol} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <select
            className="select-custom"
            value={newSymbolSelect}
            onChange={(e) => setNewSymbolSelect(e.target.value)}
            style={{ flex: 1,width: '50%' }}
          >
            <option value="">Select stock to subscribe...</option>
            {availableSymbols.map((sym) => (
              <option key={sym.symbol} value={sym.symbol}>
                {sym.symbol} - {sym.name}
              </option>
            ))}
          </select>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!newSymbolSelect}
            style={{ padding: '0 12px', minWidth: '40px' }}
          >
            <Plus size={16} />
          </button>
        </form>

        {/* List of active symbols */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {activeSymbols.map((sym) => (
            <div 
              key={sym} 
              className="flex-gap-2"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-normal)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)'
              }}
            >
              <span>{sym}</span>
              {activeSymbols.length > 1 && (
                <button
                  onClick={() => onUnsubscribeSymbol(sym)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--color-spike)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Threshold and detection strategies editor */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div className="flex-gap-2" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-normal)', paddingBottom: '0.75rem' }}>
          <Sliders size={18} className="text-glow-blue" style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
            Configure: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>{selectedSymbol}</span>
          </h2>
        </div>

        <form onSubmit={handleSave} className="settings-group">
          <div className="input-container">
            <label>Detection Strategy</label>
            <select
              className="select-custom"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              {STRATEGY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {strategy === 'spike' ? (
            <>
              <div className="input-container">
                <label>Spike / Drop Threshold (%)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="10"
                  className="input-custom"
                  value={thresholdPercent}
                  onChange={(e) => setThresholdPercent(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  Trigger alert if price moves by X% relative to start of window.
                </span>
              </div>
              <div className="input-container">
                <label>Rolling Window Size (Simulated Sec)</label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  className="input-custom"
                  value={windowSec}
                  onChange={(e) => setWindowSec(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  Duration in seconds (simulated trading clock).
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="input-container">
                <label>MA Deviation Threshold (%)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="10"
                  className="input-custom"
                  value={deviationPercent}
                  onChange={(e) => setDeviationPercent(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  Trigger alert if price deviates from SMA by Z%.
                </span>
              </div>
              <div className="input-container">
                <label>Rolling Sample Size (N Ticks)</label>
                <input
                  type="number"
                  min="3"
                  max="100"
                  className="input-custom"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  Number of recent tick samples to calculate SMA.
                </span>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
            <RefreshCw size={14} /> Save & Apply Thresholds
          </button>
        </form>
      </div>
      
    </div>
  );
}

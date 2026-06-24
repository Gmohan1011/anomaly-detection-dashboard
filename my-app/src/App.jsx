import React, { useState, useEffect, useRef } from 'react';
import { Shield, TrendingUp, TrendingDown, Bell, Settings, HelpCircle, Activity } from 'lucide-react';
import { DEFAULT_CONFIG, INITIAL_ACTIVE_SYMBOLS } from './config/defaultConfig';


// import SettingsPanel from './components/SettingsPanel';
import StatsPanel from './components/StatsPanel';

function App() {
  const [allSymbols, setAllSymbols] = useState([]);
  const [activeSymbols, setActiveSymbols] = useState(INITIAL_ACTIVE_SYMBOLS);
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [ticks, setTicks] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState('');
  const [ticksCount, setTicksCount] = useState(0);

  // Scale Testing State
  const [isScaleTesting, setIsScaleTesting] = useState(false);
  const [scaleTestStats, setScaleTestStats] = useState({ ticksPerSec: 0, avgLatencyUs: 0 });

  // Refs
  const socketRef = useRef(null);
  const detectorRef = useRef(new AnomalyDetector(DEFAULT_CONFIG));

  // Refs for scale testing metrics
  const scaleIntervalRef = useRef(null);
  const scaleMetricsRef = useRef({ ticksThisSecond: 0, latencySumMs: 0 });
  const scaleStatsIntervalRef = useRef(null);

  // 1. Fetch Symbol Catalog on Mount
  useEffect(() => {
    fetch('https://mock-data.tealvue.in/api/v1/symbols')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setAllSymbols(data.data);
        }
      })
      .catch((err) => console.error('Failed to load symbols catalog:', err));
  }, []);

 return(
  <div>
     <div className="header-container">
        <div className="brand">
          <div className="brand-logo">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="brand-name">TEALVUE</h1>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)' }}>
              Anomaly Detection Terminal
            </span>
          </div>
          <span className="brand-badge">v1.2.0</span>
        </div>

        <div className="flex-gap-2">
          <Activity size={16} style={{ color: 'var(--color-primary)' }} className="text-glow-blue" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Market Feed Status
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Sidebar */}
        <div className="sidebar">
          <div>
            <h3 className="section-title">Subscribed Stocks</h3>
            <div className="symbol-list">
              {activeSymbols.map((sym) => {
                const stats = getSidebarSymbolStats(sym);
                const isActiveChart = selectedSymbol === sym;
                const hasAlert = alerts.some((a) => a.symbol === sym);

                return (
                  <div
                    key={sym}
                    className={`symbol-item ${isActiveChart ? 'active' : ''}`}
                    onClick={() => setSelectedSymbol(sym)}
                  >
                    <div className="symbol-details">
                      <span className="symbol-code flex-gap-2">
                        {sym}
                        {hasAlert && (
                          <span
                            className="chart-indicator-red"
                            style={{ width: '6px', height: '6px', margin: 0 }}
                            title="Active Alerts Detected"
                          />
                        )}
                      </span>
                      <span className="symbol-name">
                        {allSymbols.find((s) => s.symbol === sym)?.name || 'Loading Stock...'}
                      </span>
                    </div>

                    <div className="symbol-price-info">
                      <span className="symbol-ltp">
                        {stats.price > 0 ? `₹${stats.price.toFixed(2)}` : '--'}
                      </span>
                      {stats.price > 0 && (
                        <span className={`symbol-change ${stats.direction === 'up' ? 'change-up' : stats.direction === 'down' ? 'change-down' : ''}`}>
                          {stats.direction === 'up' ? '+' : ''}
                          {stats.change.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-normal)', paddingTop: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <div className="flex-gap-2" style={{ marginBottom: '4px' }}>
              <HelpCircle size={12} />
              <span>Simulated Speed: 20x accelerated</span>
            </div>
            <p>1 simulated trading clock loop spans May 04 – May 07, 09:15 - 15:30 IST.</p>
          </div>
        </div>

        {/* Main Content Pane */}
        <div className="main-content">
          {/* Top telemetry panel */}
          <StatsPanel
            isConnected={isConnected}
            simulatedTime={simulatedTime}
            ticksCount={ticksCount}
            alertsCount={alerts.length}
            isScaleTesting={isScaleTesting}
            // onToggleScaleTest={handleToggleScaleTest}
            scaleTestStats={scaleTestStats}
          />

          <div className="dashboard-grid-content">

            {/* Chart Column */}
            <div className="chart-section">
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div className="chart-header">
                  <div className="chart-title-info">
                    <span className={isConnected ? "chart-indicator-green" : "chart-indicator-red"} />
                    <div>
                      <h2 className="chart-title">{selectedSymbol} Live Feed</h2>
                      <span className="chart-subtitle">
                        {allSymbols.find((s) => s.symbol === selectedSymbol)?.name || 'Loading...'} | NSE Equity
                      </span>
                    </div>
                  </div>

                  <div className="flex-gap-2">
                    <span className="badge badge-blue">
                      {config[selectedSymbol]?.strategy === 'spike' ? 'Spike Detection' : 'MA Deviation'}
                    </span>
                  </div>
                </div>

                {/* <div style={{ padding: '1rem 0' }}>
                  <StockChart
                    symbol={selectedSymbol}
                    ticks={ticks[selectedSymbol] || []}
                    alerts={alerts}
                  />
                </div> */}
              </div>
            </div>

            {/* Sidebar Columns (Settings + Alerts Feed) */}
            {/* <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <SettingsPanel
                selectedSymbol={selectedSymbol}
                config={config}
                // onUpdateConfig={handleUpdateConfig}
                activeSymbols={activeSymbols}
                allSymbols={allSymbols}
                // onSubscribeSymbol={handleSubscribeSymbol}
                // onUnsubscribeSymbol={handleUnsubscribeSymbol}
              />

              <AlertFeed
                alerts={alerts}
                onClearAlerts={() => setAlerts([])}
              />
            </div> */}

          </div>
        </div>
      </div>

  </div>
 )
}

export default App

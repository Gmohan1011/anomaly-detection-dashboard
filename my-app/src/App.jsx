import React, { useState, useEffect, useRef } from 'react';
import { Shield, TrendingUp, TrendingDown, Bell, Settings, HelpCircle, Activity } from 'lucide-react';
import { DEFAULT_CONFIG, INITIAL_ACTIVE_SYMBOLS } from './config/defaultConfig';
import io from 'socket.io-client';
import { AnomalyDetector } from './services/anomalyDetector';


import SettingsPanel from './components/SettingsPanel';
import StatsPanel from './components/StatsPanel';
import StockChart from './components/StockChart';
import AlertFeed from './components/AlertFeed';

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

   useEffect(() => {
    const socket = io('https://mock-data.tealvue.in', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Subscribe to initial symbol set
      socket.emit('subscribe', activeSymbols);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('ticker', (tick) => {
      if (!tick || !tick.SYMBOL) return;
      const symbol = tick.SYMBOL;

      // Update ticks buffer in state
      setTicks((prev) => {
        const symTicks = prev[symbol] || [];

        // Simulated day rollover detection
        if (symTicks.length > 0) {
          const prevTick = symTicks[symTicks.length - 1];
          const prevDate = prevTick.TS.split(' ')[0];
          const currDate = tick.TS.split(' ')[0];

          if (prevDate !== currDate) {
            // Simulated date changed (day rolled over), clear historical buffers
            detectorRef.current.clearHistory(symbol);
            return { ...prev, [symbol]: [tick] };
          }
        }

        // Limit tick history size (1,500 is more than enough for a full simulated day)
        return {
          ...prev,
          [symbol]: [...symTicks, tick].slice(-1500),
        };
      });

      // Update telemetry
      setTicksCount((c) => c + 1);
      setSimulatedTime(tick.TS);

      // Run anomaly detector
      const alert = detectorRef.current.processTick(tick);
      if (alert) {
        setAlerts((prev) => [alert, ...prev].slice(0, 200));
      }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, []);

   useEffect(() => {
    if (detectorRef.current) {
      detectorRef.current.updateConfig(config);
    }
  }, [config]);

   const handleSubscribeSymbol = (symbol) => {
    if (!activeSymbols.includes(symbol)) {
      const updatedList = [...activeSymbols, symbol];
      setActiveSymbols(updatedList);

      // Socket.io subscription update
      if (socketRef.current && isConnected) {
        socketRef.current.emit('subscribe', updatedList);
      }
    }
  };


   const handleUnsubscribeSymbol = (symbol) => {
    if (activeSymbols.includes(symbol) && activeSymbols.length > 1) {
      const updatedList = activeSymbols.filter((s) => s !== symbol);
      setActiveSymbols(updatedList);

      // Clean up buffers & state for the unsubscribed symbol
      detectorRef.current.clearHistory(symbol);
      setTicks((prev) => {
        const next = { ...prev };
        delete next[symbol];
        return next;
      });

      // Select another active symbol if the deleted one was viewed
      if (selectedSymbol === symbol) {
        setSelectedSymbol(updatedList[0]);
      }

      // Socket.io subscription update
      if (socketRef.current && isConnected) {
        socketRef.current.emit('subscribe', updatedList);
      }
    }
  };

   const handleUpdateConfig = (symbol, symbolConfig) => {
    // If a new strategy is configured, clear tick history to avoid mixing strategies incorrectly
    detectorRef.current.clearHistory(symbol);
    setTicks((prev) => ({ ...prev, [symbol]: [] }));

    setConfig((prev) => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        ...symbolConfig,
      },
    }));

    // If strategy was changed, it requires re-running config
    const updatedConfig = {
      ...config,
      [symbol]: {
        ...config[symbol],
        ...symbolConfig,
      }
    };
    detectorRef.current.updateConfig(updatedConfig);
  };

   const handleToggleScaleTest = () => {
    if (isScaleTesting) {
      // Stop scale test
      clearInterval(scaleIntervalRef.current);
      clearInterval(scaleStatsIntervalRef.current);
      scaleIntervalRef.current = null;
      scaleStatsIntervalRef.current = null;
      setIsScaleTesting(false);
      setScaleTestStats({ ticksPerSec: 0, avgLatencyUs: 0 });

      // Clean up scale test mock symbols from detector
      for (let i = 0; i < 1000; i++) {
        detectorRef.current.clearHistory(`SYM-${String(i).padStart(3, '0')}`);
      }
    } else {
      // Start scale test (Simulate 1,000 active concurrent stock symbols)
      setIsScaleTesting(true);

      // Initialize configurations in detector for SYM-000 to SYM-999
      const scaleConfig = { ...config };
      for (let i = 0; i < 1000; i++) {
        const symCode = `SYM-${String(i).padStart(3, '0')}`;
        scaleConfig[symCode] = {
          strategy: i % 2 === 0 ? 'spike' : 'movingAverage',
          thresholdPercent: 0.8,
          windowSec: 30,
          deviationPercent: 1.5,
          sampleSize: 10
        };
      }
      detectorRef.current.updateConfig(scaleConfig);

      let mockTickIndex = 0;
      scaleMetricsRef.current = { ticksThisSecond: 0, latencySumMs: 0 };

      // Telemetry statistics calculator (every 1 second)
      scaleStatsIntervalRef.current = setInterval(() => {
        const { ticksThisSecond, latencySumMs } = scaleMetricsRef.current;
        const avgLatencyMs = ticksThisSecond > 0 ? (latencySumMs / ticksThisSecond) : 0;
        const avgLatencyUs = avgLatencyMs * 1000; // Convert to microseconds

        setScaleTestStats({
          ticksPerSec: ticksThisSecond,
          avgLatencyUs: avgLatencyUs
        });

        // Reset metrics for next interval
        scaleMetricsRef.current = { ticksThisSecond: 0, latencySumMs: 0 };
      }, 1000);

      // Simulation feed loop (emits 100 mock ticks every 100ms = 1,000 ticks/sec)
      scaleIntervalRef.current = setInterval(() => {
        const baseDate = new Date();
        const batchSize = 100;

        for (let j = 0; j < batchSize; j++) {
          const symId = mockTickIndex % 1000;
          const symName = `SYM-${String(symId).padStart(3, '0')}`;
          mockTickIndex++;

          // Synthesize tick variables
          const baseLtp = 100 + (symId % 20) * 15;
          const ltp = baseLtp + (Math.random() - 0.5) * 5;

          // Timestamp matches current system date
          const date = new Date(baseDate.getTime() + mockTickIndex * 10);
          const formattedTS = date.toISOString().replace('T', ' ').substring(0, 19) + '+05:30';

          const tickPayload = {
            SYMBOL: symName,
            LTP: ltp,
            TS: formattedTS,
            PREV_CLOSE: baseLtp,
          };

          // Benchmark anomaly processing execution
          const t0 = performance.now();
          const alert = detectorRef.current.processTick(tickPayload);
          const t1 = performance.now();

          // Increment metrics
          scaleMetricsRef.current.ticksThisSecond++;
          scaleMetricsRef.current.latencySumMs += (t1 - t0);

          if (alert) {
            setAlerts((prev) => [alert, ...prev].slice(0, 200));
          }
        }

        setTicksCount((c) => c + batchSize);
      }, 100);
    }
  };

  const getSidebarSymbolStats = (sym) => {
    const symTicks = ticks[sym] || [];
    if (symTicks.length === 0) return { price: 0, change: 0, direction: 'neutral' };

    const lastTick = symTicks[symTicks.length - 1];
    const price = lastTick.LTP !== undefined ? lastTick.LTP : lastTick.CLOSE;
    const prevClose = lastTick.PREV_CLOSE || price;
    const diff = price - prevClose;
    const change = (diff / prevClose) * 100;

    return {
      price,
      change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

 return (
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
            onToggleScaleTest={handleToggleScaleTest}
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

                <div style={{ padding: '1rem 0' }}>
                  <StockChart
                    symbol={selectedSymbol}
                    ticks={ticks[selectedSymbol] || []}
                    alerts={alerts}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar Columns (Settings + Alerts Feed) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <SettingsPanel
                selectedSymbol={selectedSymbol}
                config={config}
                onUpdateConfig={handleUpdateConfig}
                activeSymbols={activeSymbols}
                allSymbols={allSymbols}
                onSubscribeSymbol={handleSubscribeSymbol}
                onUnsubscribeSymbol={handleUnsubscribeSymbol}
              />

              <AlertFeed
                alerts={alerts}
                onClearAlerts={() => setAlerts([])}
              />
            </div>

          </div>
        </div>
      </div>

  </div>
 );
}

export default App

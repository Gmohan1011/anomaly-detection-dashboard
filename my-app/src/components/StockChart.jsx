import React, { useEffect, useRef } from 'react';
import { createChart, AreaSeries, createSeriesMarkers } from 'lightweight-charts';

export default function StockChart({ symbol, ticks = [], alerts = [] }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  
  // Refs to track state and support incremental updates
  const prevSymbolRef = useRef('');
  const prevTicksLengthRef = useRef(0);
  const lastTimeRef = useRef(0);
  const ticksMapRef = useRef(new Map()); // maps raw timestamp to adjusted chart timestamp
  const markersApiRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize the TradingView Lightweight Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: 'rgba(56, 189, 248, 0.4)',
          width: 1,
          style: 3, // Dashed
          labelBackgroundColor: '#0c1225',
        },
        horzLine: {
          color: 'rgba(56, 189, 248, 0.4)',
          width: 1,
          style: 3, // Dashed
          labelBackgroundColor: '#0c1225',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        autoScale: true,
        alignLabels: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    // Add Area Series for price visualization
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#38bdf8',
      topColor: 'rgba(56, 189, 248, 0.22)',
      bottomColor: 'rgba(56, 189, 248, 0.01)',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.05,
      },
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    // Handle container resizing responsively
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
      }
      chartRef.current = null;
      seriesRef.current = null;
      ticksMapRef.current.clear();
      markersApiRef.current = null;
    };
  }, []);

  // Update chart data (with incremental rendering logic)
  useEffect(() => {
    if (!seriesRef.current || !ticks) return;

    const currentLength = ticks.length;
    const prevLength = prevTicksLengthRef.current;
    const symbolChanged = prevSymbolRef.current !== symbol;

    // If symbol changed, reset the chart state
    if (symbolChanged || currentLength === 0) {
      seriesRef.current.setData([]);
      lastTimeRef.current = 0;
      ticksMapRef.current.clear();
      prevTicksLengthRef.current = 0;
      prevSymbolRef.current = symbol;
      markersApiRef.current = null;

      if (currentLength === 0) return;
    }

    // Determine if we should perform a full redraw (setData) or an incremental update
    const isIncremental = !symbolChanged && currentLength === prevLength + 1 && prevLength > 0;

    if (isIncremental) {
      // Incremental Update (efficiently append only the single newest tick)
      const lastTick = ticks[currentLength - 1];
      let timeSec = new Date(lastTick.TS.replace(' ', 'T')).getTime() / 1000;
      
      // Ensure strictly increasing time scale
      if (timeSec <= lastTimeRef.current) {
        timeSec = lastTimeRef.current + 1;
      }

      seriesRef.current.update({
        time: timeSec,
        value: lastTick.LTP !== undefined ? lastTick.LTP : lastTick.CLOSE,
      });

      ticksMapRef.current.set(lastTick.TS, timeSec);
      lastTimeRef.current = timeSec;
      prevTicksLengthRef.current = currentLength;
    } else {
      // Full Load / Data Burst (scaffold the entire day so far)
      let lastTime = 0;
      const formattedData = [];
      ticksMapRef.current.clear();

      ticks.forEach(tick => {
        let timeSec = new Date(tick.TS.replace(' ', 'T')).getTime() / 1000;
        
        if (timeSec <= lastTime) {
          timeSec = lastTime + 1;
        }

        formattedData.push({
          time: timeSec,
          value: tick.LTP !== undefined ? tick.LTP : tick.CLOSE,
        });

        ticksMapRef.current.set(tick.TS, timeSec);
        lastTime = timeSec;
      });

      seriesRef.current.setData(formattedData);
      lastTimeRef.current = lastTime;
      prevTicksLengthRef.current = currentLength;

      // Fit chart view to show the full day
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }

    // Handle Anomaly Alert Markers Overlay
    const symbolAlerts = alerts.filter(a => a.symbol === symbol);
    const markers = [];

    symbolAlerts.forEach(alert => {
      // Match the alert with the mapped timestamp in our series
      let markerTime = ticksMapRef.current.get(alert.timestamp);
      
      // Fallback: Parse directly if tick was not indexed yet
      if (!markerTime) {
        markerTime = new Date(alert.timestamp.replace(' ', 'T')).getTime() / 1000;
      }

      const isSpike = alert.strategy === 'spike';
      
      markers.push({
        time: markerTime,
        position: 'aboveBar',
        color: isSpike ? '#f43f5e' : '#f59e0b',
        shape: isSpike ? 'arrowDown' : 'circle',
        text: isSpike ? 'SPIKE' : 'DEV',
        size: 1,
      });
    });

    // Ensure markers are sorted chronologically
    markers.sort((a, b) => a.time - b.time);
    
    // Deduplicate markers on identical times to prevent lightweight-charts rendering logs warning
    const uniqueMarkers = [];
    let prevMarkerTime = 0;
    markers.forEach(m => {
      if (m.time > prevMarkerTime) {
        uniqueMarkers.push(m);
        prevMarkerTime = m.time;
      }
    });

    if (!markersApiRef.current) {
      markersApiRef.current = createSeriesMarkers(seriesRef.current, uniqueMarkers);
    } else {
      markersApiRef.current.setMarkers(uniqueMarkers);
    }
  }, [ticks, alerts, symbol]);

  return (
    <div className="chart-container-wrapper">
      <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
}

function generateAlertRef() {
  const chars = '0123456789ABCDEF';
  let ref = 'TV-';
  for (let i = 0; i < 5; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

export class AnomalyDetector {
  constructor(config = {}) {
    this.config = config; // config maps symbol -> { strategy, thresholdPercent, windowSec, deviationPercent, sampleSize }
    this.tickHistory = {}; // symbol -> array of ticks
    this.lastAlertTimes = {}; // symbol -> { strategyName -> lastAlertSimulatedTimeSec }
    this.cooldownSeconds = 30; // simulated seconds cooldown to prevent duplicate storms
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  // Parse simulated time from tick.TS
  // Expected tick.TS format: "2026-05-04 09:15:01+05:30"
  getTimestampSec(tick) {
    if (!tick || !tick.TS) return 0;
    return new Date(tick.TS.replace(' ', 'T')).getTime() / 1000;
  }

  processTick(tick) {
    const symbol = tick.SYMBOL;
    const symbolConfig = this.config[symbol];
    if (!symbolConfig) return null; // No config, no detection

    const currentTS = this.getTimestampSec(tick);
    if (!currentTS) return null;

    // Initialize state if needed
    if (!this.tickHistory[symbol]) {
      this.tickHistory[symbol] = [];
    }
    if (!this.lastAlertTimes[symbol]) {
      this.lastAlertTimes[symbol] = {};
    }

    // Add tick to history
    this.tickHistory[symbol].push({
      ltp: tick.LTP !== undefined ? tick.LTP : tick.CLOSE,
      ts: currentTS,
      rawTS: tick.TS
    });

    const strategy = symbolConfig.strategy;
    let alert = null;

    if (strategy === 'spike') {
      alert = this.detectSpike(symbol, tick, symbolConfig, currentTS);
    } else if (strategy === 'movingAverage') {
      alert = this.detectMADeviation(symbol, tick, symbolConfig, currentTS);
    }

    return alert;
  }

  detectSpike(symbol, tick, config, currentTS) {
    const windowSec = Number(config.windowSec) || 30;
    const thresholdPercent = Number(config.thresholdPercent) || 3;
    const history = this.tickHistory[symbol];

    // Clean up older ticks outside simulated time window
    const windowLimit = currentTS - windowSec;
    let oldestIndex = 0;
    while (oldestIndex < history.length && history[oldestIndex].ts < windowLimit) {
      oldestIndex++;
    }
    
    // Slice history to only keep window
    if (oldestIndex > 0) {
      this.tickHistory[symbol] = history.slice(oldestIndex);
    }

    const currentHistory = this.tickHistory[symbol];
    if (currentHistory.length < 2) return null;

    const oldestTick = currentHistory[0];
    const currentTick = currentHistory[currentHistory.length - 1];
    const oldestPrice = oldestTick.ltp;
    const currentPrice = currentTick.ltp;

    const priceDiffPercent = ((currentPrice - oldestPrice) / oldestPrice) * 100;

    if (Math.abs(priceDiffPercent) >= thresholdPercent) {
      // Check cooldown using simulated time
      const lastAlertTS = this.lastAlertTimes[symbol]['spike'];
      if (lastAlertTS === undefined || (currentTS - lastAlertTS) >= this.cooldownSeconds) {
        this.lastAlertTimes[symbol]['spike'] = currentTS;
        
        const direction = priceDiffPercent > 0 ? 'Spike' : 'Drop';
        return {
          symbol,
          timestamp: tick.TS,
          simulatedTS: currentTS,
          price: currentPrice,
          strategy: 'spike',
          reason: `${direction} detected: price moved ${priceDiffPercent > 0 ? '+' : ''}${priceDiffPercent.toFixed(2)}% (from ${oldestPrice.toFixed(2)} to ${currentPrice.toFixed(2)}) within ${windowSec} simulated seconds.`,
          alertRef: generateAlertRef()
        };
      }
    }

    return null;
  }

  detectMADeviation(symbol, tick, config, currentTS) {
    const sampleSize = Number(config.sampleSize) || 10;
    const deviationPercent = Number(config.deviationPercent) || 5;
    const history = this.tickHistory[symbol];

    // Keep only last N ticks for SMA computation
    if (history.length > sampleSize) {
      this.tickHistory[symbol] = history.slice(-sampleSize);
    }

    const currentHistory = this.tickHistory[symbol];
    // Wait until we have enough ticks to build a representative average
    const minRequired = Math.min(sampleSize, 5);
    if (currentHistory.length < minRequired) return null;

    // Calculate SMA
    const sum = currentHistory.reduce((acc, t) => acc + t.ltp, 0);
    const sma = sum / currentHistory.length;

    const currentPrice = tick.LTP !== undefined ? tick.LTP : tick.CLOSE;
    const deviation = ((currentPrice - sma) / sma) * 100;

    if (Math.abs(deviation) >= deviationPercent) {
      // Check cooldown using simulated time
      const lastAlertTS = this.lastAlertTimes[symbol]['movingAverage'];
      if (lastAlertTS === undefined || (currentTS - lastAlertTS) >= this.cooldownSeconds) {
        this.lastAlertTimes[symbol]['movingAverage'] = currentTS;

        const direction = deviation > 0 ? 'above' : 'below';
        return {
          symbol,
          timestamp: tick.TS,
          simulatedTS: currentTS,
          price: currentPrice,
          strategy: 'movingAverage',
          reason: `Moving average deviation detected: price is ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}% ${direction} rolling average of ${sma.toFixed(2)} over the last ${currentHistory.length} samples.`,
          alertRef: generateAlertRef()
        };
      }
    }

    return null;
  }

  clearHistory(symbol) {
    if (symbol) {
      delete this.tickHistory[symbol];
      delete this.lastAlertTimes[symbol];
    } else {
      this.tickHistory = {};
      this.lastAlertTimes = {};
    }
  }
}

export const DEFAULT_CONFIG = {
  "RELIANCE": {
    "strategy": "spike",
    "thresholdPercent": 0.3,
    "windowSec": 60
  },
  "TCS": {
    "strategy": "movingAverage",
    "deviationPercent": 0.5,
    "sampleSize": 15
  },
  "INFY": {
    "strategy": "spike",
    "thresholdPercent": 0.4,
    "windowSec": 45
  }
};

export const INITIAL_ACTIVE_SYMBOLS = ["RELIANCE", "TCS", "INFY"];

export const STRATEGY_OPTIONS = [
  { value: "spike", label: "Spike / Drop" },
  { value: "movingAverage", label: "Moving Average Deviation" }
];

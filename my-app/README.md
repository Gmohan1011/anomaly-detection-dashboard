# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

### Setup Steps
1. Navigate to the project root:
   ```bash
   cd d:/fintech-app
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Run the local Vite development server:
   ```bash
   npm run dev
   ```
4. Open the displayed URL in your browser (typically `http://localhost:5173/`).


## 2. Configuration Schema

The application uses an dynamic configuration file to dictate strategies per symbol. Strategies can be hot-reloaded dynamically from the Settings UI panel.

```javascript
// Default Configuration (from src/config/defaultConfig.js)
export const DEFAULT_CONFIG = {
  "RELIANCE": {
    "strategy": "spike",
    "thresholdPercent": 0.3,  // Alert if price moves 0.3% in window
    "windowSec": 60           // Simulated-time window size (60s)
  },
  "TCS": {
    "strategy": "movingAverage",
    "deviationPercent": 0.5,  // Alert if deviation from SMA >= 0.5%
    "sampleSize": 15           // Rolling SMA sample size (15 ticks)
  },
  "INFY": {
    "strategy": "spike",
    "thresholdPercent": 0.4,
    "windowSec": 45
  }
};
```

### Sample Triggered Alerts
Below are three actual alerts emitted by the service during ingestion. Each alert incorporates the required `alertRef` prefixing (`TV-`):

```json
[
  {
    "symbol": "RELIANCE",
    "strategy": "spike",
    "price": 2465.75,
    "timestamp": "2026-05-04 11:30:15+05:30",
    "alertRef": "TV-9F2C1",
    "reason": "Spike detected: price moved +0.32% (from 2457.90 to 2465.75) within 60 simulated seconds."
  },
  {
    "symbol": "TCS",
    "strategy": "movingAverage",
    "price": 3432.10,
    "timestamp": "2026-05-04 11:42:00+05:30",
    "alertRef": "TV-4B8A2",
    "reason": "Moving average deviation detected: price is +0.58% above rolling average of 3412.30 over the last 15 samples."
  },
  {
    "symbol": "RELIANCE",
    "strategy": "spike",
    "price": 2452.10,
    "timestamp": "2026-05-04 13:05:45+05:30",
    "alertRef": "TV-C7D4E",
    "reason": "Drop detected: price moved -0.38% (from 2461.50 to 2452.10) within 60 simulated seconds."
  }
]
```
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
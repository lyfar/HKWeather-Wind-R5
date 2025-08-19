
# HKWeather Wind R5

An educational p5.js + TypeScript sketch that visualizes Hong Kong wind as a flowing particle field with real-time direction and force. Temperature is shown minimally in the top-right.

- Visual: noise-driven flow field biased by wind direction; step size scales with wind speed (km/h)
- Data: Hong Kong Observatory (HKO) real-time weather (`rhrread`) for mean wind direction/speed and temperature
- Purpose: Vibe Coding and Digital Art Meetup example (for learning creative coding with live data)

## Run locally

```
npm install
npm start
```

Then open `http://localhost:3000`.

## How it works (quick)

- Each frame, 5,000 particles sample Perlin noise to get a local flow angle. We bias that angle toward the current wind heading and move particles with a physical step proportional to wind speed. Motion is frame-rate independent.
- Temperature is fetched and rendered as a single number in the top-right.
- Inspired by Barney Codes’ flow-field demo; tuned for real wind data.

## Data sources

- HKO Open Data (real-time weather `rhrread`): direction, speed, temperature — updated every few minutes. See `WeatherService.fetchCurrent()` in `sketch/WeatherService.ts`.
- Regional wind (10‑minute mean/gust) FeatureServer is available for exploration: `https://portal.csdi.gov.hk/server/rest/services/common/hko_rcd_1634953844424_88011/FeatureServer`.

Notes: Data is provisional and may fluctuate. This repo is for educational use only.

## On-screen info (tooltip)

Hover the “i” icon in the bottom-right to see:

- What you’re seeing: a wind flow field where streaks represent the motion of air parcels.
- Where the data comes from: HKO real-time weather (`rhrread`).
- How direction is computed: meteorological “from” degrees are converted to a “to” heading for motion (e.g., from 90° → to 270°).
- How speed is mapped: step = map(km/h, 0..60 → 0.3..3.0) × (deltaTime/16.7) so 8 km/h appears consistently across machines.

## License

MIT — see `LICENSE`.

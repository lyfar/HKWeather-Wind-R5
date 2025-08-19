
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

- Each frame, 5,000 particles sample Perlin noise to get an angle. We add a bias equal to current wind direction; particles move step = map(speed, 0..60 km/h → 0.4..3.5 px/frame).
- Temperature is fetched and rendered as a single number in the top-right.
- Direction flips occasionally (noise reseed) to keep motion lively, inspired by Barney Codes’ flow-field demo.

## Data sources

- HKO Open Data (real-time weather `rhrread`): direction, speed, temperature — updated every few minutes. See `WeatherService.fetchCurrent()` in `sketch/WeatherService.ts`.
- Regional wind (10‑minute mean/gust) FeatureServer is available for exploration: `https://portal.csdi.gov.hk/server/rest/services/common/hko_rcd_1634953844424_88011/FeatureServer`.

Notes: Data is provisional and may fluctuate. This repo is for educational use only.

## License

MIT — see `LICENSE`.

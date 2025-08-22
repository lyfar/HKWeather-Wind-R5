
# HKWeather Wind R5

An educational p5.js + TypeScript sketch that visualizes Hong Kong wind as a flowing particle field with real-time direction and force. Temperature is shown minimally in the top-right.

- Visual: noise-driven flow field biased by wind direction; step size scales with wind speed (km/h)
- Data: Hong Kong Observatory (HKO) real-time weather (`rhrread`) for mean wind direction/speed and temperature
- Purpose: Vibe Coding and Digital Art Meetup example (for learning creative coding with live data)

## Run locally

```bash
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

- Live Hong Kong wind (HKO).
- Flowing lines show air movement; faster wind → longer, quicker streaks.
- Direction shown as FROM → TO (e.g., 90° from = 270° to).
- Temperature: top‑right.

## License

MIT — see `LICENSE`.

## Services (what they do)

- `sketch/WeatherService.ts`: Minimal client for HKO real-time weather (`rhrread`). It normalizes:
  - **Temperature**: prefers the "Hong Kong Observatory" station; otherwise averages all available stations.
  - **Humidity/UV/Visibility**: reads if present.
  - **Wind**: extracts the first available station's mean wind speed (km/h) and direction (degrees, meteorological FROM). Returns a consistent `NormalizedWeatherData` object.

- `sketch/WindStationsService.ts`: Lightweight CSV client for HKO station-level 10‑minute wind. It:
  - Loads station metadata from `latest_10min_wind.json` (name, CSV URL, lon/lat).
  - Fetches live CSVs via CORS-friendly proxies (`allorigins`, `codetabs`) with short timeouts and a 10‑minute localStorage cache.
  - Parses headers robustly and extracts: station name, 10‑minute mean speed (km/h), 10‑minute mean direction as compass text (e.g., `NNE`), gust (km/h) when available.
  - Converts compass text to degrees (FROM) using a fixed mapping: `N=0°`, `E=90°`, `S=180°`, `W=270°`, 16‑point rose at 22.5° increments.
  - Provides helpers: `fetchPreferredSample` (tries Central Pier → Star Ferry → King's Park → Kai Tak first) and `fetchByUrl` for a specific station.

- `sketch/BuildingService.ts`: CSV helper for Buildings Department occupation permit data (not used in the wind visualization pipeline).

## Wind math (technical)

- **Meteorological direction (FROM) to motion heading (TO):**
  - θ_from: meteorological wind direction in degrees (0° = from North, 90° = from East)
  - θ_to = (θ_from + 180) mod 360

- **Screen-space unit vector with y-down coordinates:**
  - Convert θ_to to radians: θ = radians(θ_to)
  - The angle used for drawing (bias) aligns with p5's y-down system:
    - φ = atan2(−cos θ, sin θ)
  - Unit vector u = (cos φ, sin φ)

- **Particle step length from wind speed:**
  - Speed is in km/h. We map to pixels per frame, normalized by frame time:
    - dt = deltaTime / 16.6667
    - step = map(speed_kmh, 0..60 → 1.2..4.8) × dt

- **Turbulence (angle noise):**
  - Per-pixel Perlin noise n in [0,1] introduces small angular jitter:
    - angle = φ + (n − 0.5) × maxTurb, with maxTurb ≈ 6° (radians in code)

- **Temporal smoothing toward latest measurements:**
  - Speed: either snap if |Δ| > 3 km/h, else ease: `speed += (target − speed) × k`
  - Direction: shortest-arc difference d = angleDiffDeg(current, target); snap if |d| > 20°, else `dir = normalizeDeg(dir + d × k)`
  - k = 0.25 × dt

## Composite multi-station flow (Hong Kong mode)

When `Hong Kong` mode is active (no single station selected), multiple station samples are blended to form a composite field:

- **Screen-space Gaussian weighting:** For a screen point (x,y) and each station i at (sxi, syi) with unit vector ui and speed vi,
  - wi = exp(−((x − sxi)² + (y − syi)²) / σ²), with σ chosen from viewport size
  - Vector sum: S = Σ(wi ui), Speed sum: V = Σ(wi vi), Weight sum: W = Σ wi
  - Composite angle: α = atan2(Sy, Sx)
  - Composite speed: v = V / W
  - Consensus metric (alignment): c = ||S|| / W in [0,1]

- **Conflict handling:** If c < 0.25, the field follows the closest station instead of the ambiguous average.

- **Grid + bilinear sampling:** A low-res grid stores ux, uy, speed, and consensus per cell. At render time:
  - Bilinear interpolation is used for speed and consensus.
  - Angles are interpolated with wrap-aware interpolation to avoid seam sinkholes.

## Rendering pipeline

- Initialize N particles and ramp `activePoints` up smoothly over ~4.5s.
- Each frame:
  - Retrieve a local flow angle and speed (global bias or composite grid) and apply small turbulence.
  - Move particles by step; draw short line segments colored by heading and thickened by local speed.
  - Wrap particles toroidally with a margin; emit from edges only when local flow points into the viewport.
  - Maintain a decaying density grid and relocate a small number of particles to the sparsest cells (avoids empty patches).
  - Draw minimal Hong Kong silhouette (if available) and station dots; station airflow is illustrated with subtle smoke puffs.
  - Temperature is displayed in the top-right; an info bubble summarizes the current wind and data sources.

## Update and runtime behavior

- Fetch occurs on page load/reload only (no periodic polling).
- Station CSVs are fetched progressively in small batches to avoid rate limiting, with short delays.
- CORS is handled via public proxies; transient failures fall back gracefully.
- If Leaflet is present on the page, station markers are added directly to the map and screen projection uses the map’s transform for accuracy.
- Hong Kong mode uses a single map view; pan/zoom freely.
- Tap a station marker to see its speed/direction; use map controls to zoom to a station.

## Key formulas (reference)

- θ_to = (θ_from + 180) mod 360
- φ = atan2(−cos(radians(θ_to)), sin(radians(θ_to)))
- u = (cos φ, sin φ)
- dt = deltaTime / 16.6667
- step = map(speed_kmh, 0..60 → 1.2..4.8) × dt
- wi = exp(−((x − sxi)² + (y − syi)²) / σ²)
- α = atan2(Σ(wi uyi), Σ(wi uxi))
- v = (Σ(wi vi)) / (Σ wi)
- c = ||Σ(wi ui)|| / (Σ wi)

## Additional data sources

- Station list and live CSV URLs: `latest_10min_wind.json` (in this repo), fed by HKO’s CSDI FeatureServer. Individual station CSVs are retrieved via proxies.

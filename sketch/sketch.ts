// Minimal wind visualization based on Barney Codes flow field
// Wind direction/force from HKO; temperature displayed top-right

let points: p5.Vector[] = [];
let totalPoints = 5000;
let activePoints = 0; // gradually ramps up to totalPoints
let rampStartMs = 0;
const RAMP_DURATION_MS = 4500;

let noiseMultiplier = 0.01;
// flow always follows real wind; no random direction flips

let currentTempC: number | null = null;
// Wind state: target (from API) and smoothed current values for rendering
let windSpeedKmhTarget: number = NaN;
let windDirectionDegTarget: number = NaN; // FROM degrees
let windSpeedKmhCurrent: number = NaN;
let windDirectionDegCurrent: number = NaN; // FROM degrees
let lastWeatherUpdateMs: number = 0;
let currentStationName: string | null = 'Hong Kong';
let stationList: Array<{ name: string; url: string; lat: number; lon: number }> = [];
let stationIdx: number = -1; // -1 means "Hong Kong" global view
let switcherRect: { x: number; y: number; w: number; h: number } | null = null;
let locateRect: { x: number; y: number; r: number } | null = null;
let multiStationSamples: Array<{ lat: number; lon: number; speed: number; dirDeg: number; name: string }> = [];
const STATION_SAMPLES_LIMIT = 30; // fetch up to this many stations for HK composite
const STATION_FETCH_DELAY_MS = 120; // spacing to avoid 429
// Lightweight smoke emitters per station (no external textures)
type StationEmitter = { x: number; y: number; particles: SmokeParticle[] };
let stationEmitters: Map<string, StationEmitter> = new Map();
// Cached minimalist HK silhouette
let hkGeojson: any = null;
let hkPolygonsScreen: Array<Array<{ x: number; y: number }>> = [];
let hullDirty = true; // reused as map dirty flag
// Cache minimal map in offscreen buffer
let mapLayer: p5.Graphics | null = null;
let mapLayerDirty = true;
// Cache station screen positions and unit vectors for composite flow
type StationScreenCache = { sx: number; sy: number; ux: number; uy: number; speed: number; name: string }[];
let stationScreenCache: StationScreenCache = [];
let stationCacheDirty = true;
// Low-res composite flow grid (bilinear sampled per particle)
let flowGridDirty = true;
let flowGrid: {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  ux: Float32Array; // heading x-component
  uy: Float32Array; // heading y-component
  speed: Float32Array; // km/h
  cons: Float32Array; // 0..1 alignment
} | null = null;
// Low-res density grid (updated each frame, decays over time)
let densityGrid: { cols: number; rows: number; values: Float32Array } | null = null;
const DENSITY_DECAY = 0.92; // keep some history so sparse areas are detected
const MAX_DENSIFY_PER_FRAME = 28;
// Expose a way to clear emitters when map zoom level changes
function clearStationEmitters() { stationEmitters.forEach(e => e.particles = []); }

// Add station markers directly to Leaflet map with actual coordinates
function addStationToMap(lat: number, lon: number, name: string, speed: number, dirDeg: number) {
  try {
    const anyWin: any = window as any;
    if (!anyWin?.leafletMap || !anyWin?.stationMarkers) return;
    
    // Create minimal dark marker (larger and tap-friendly on touch devices)
    const isTouch = (('ontouchstart' in window) || (navigator as any).maxTouchPoints > 0);
    const compassDir = degToCompass(dirDeg);
    const r = isTouch ? 9 : 4;
    const marker = (window as any).L.circleMarker([lat, lon], {
      radius: r,
      fillColor: '#333',
      color: '#666',
      weight: isTouch ? 2 : 1,
      opacity: 0.9,
      fillOpacity: 0.75,
      bubblingMouseEvents: true
    });

    const html = `${name}<br/>${Math.round(speed)} km/h • ${compassDir} (${Math.round(dirDeg)}°)`;
    marker.bindTooltip(html, {
      permanent: false,
      direction: 'top',
      className: 'station-tooltip',
      sticky: true
    });
    marker.bindPopup(html, { closeButton: true });
    marker.on('click', () => marker.openPopup());

    anyWin.stationMarkers.addLayer(marker);
  } catch (e) {
    console.error('Failed to add station marker:', e);
  }
}

// Project lon/lat to current screen coordinates. If Leaflet is present, use its
// map projection; otherwise fall back to linear mapping within HK bounds.
function lonLatToScreen(lon: number, lat: number): { x: number; y: number } {
  try {
    const anyWin: any = window as any;
    if (anyWin && anyWin.leafletMap && typeof anyWin.leafletMap.latLngToContainerPoint === 'function') {
      const pt = anyWin.leafletMap.latLngToContainerPoint({ lat, lng: lon });
      const container = anyWin.leafletMap.getContainer ? anyWin.leafletMap.getContainer() : null;
      if (container && container.getBoundingClientRect) {
        const rect = container.getBoundingClientRect();
        return { x: pt.x + rect.left, y: pt.y + rect.top };
      }
      return { x: pt.x, y: pt.y };
    }
  } catch {}
  return {
    x: map(lon, 113.85, 114.36, 40, width - 40),
    y: map(lat, 22.17, 22.56, height - 80, 80)
  };
}

class SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  constructor(x: number, y: number, vx: number, vy: number, size: number, life: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.size = size;
  }
  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // gentle dispersion and slight drag
    this.vx *= 0.992;
    this.vy *= 0.992;
    this.life -= 1.6 * dt;
  }
  draw() {
    // soft grey puff
    noStroke();
    const alpha = constrain(this.life, 0, 60);
    fill(0, 0, 85, alpha);
    circle(this.x, this.y, this.size);
  }
  dead(): boolean { return this.life <= 0; }
}

// Polling disabled per request; we now fetch only on load/reload
const REFRESH_INTERVAL_MS = 30 * 1000; // retained for reference, unused

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1); // keep p5 coordinates in CSS pixels to match Leaflet container points
  colorMode(HSB, 360, 100, 100, 100);
  // Slightly higher density for better visibility while keeping performance reasonable
  totalPoints = constrain(Math.floor(windowWidth * windowHeight * 0.0032), 5000, 12000);
  // Offscreen layer for minimal map
  mapLayer = createGraphics(windowWidth, windowHeight);
  mapLayer.pixelDensity(1);
  rampStartMs = millis();
  activePoints = Math.min(totalPoints, Math.max(800, Math.floor(totalPoints * 0.12)));
  // If Leaflet is present, keep canvas above it
  try {
    (document.querySelector('canvas') as any)?.style && ((document.querySelector('canvas') as any).style.zIndex = '10');
    // Allow interactions to pass through to underlying Leaflet map (mobile tapping)
    try { ((document.querySelector('canvas') as any).style.pointerEvents = 'none'); } catch {}
    // Capture global mouse position for hover when canvas has pointer-events:none
    document.addEventListener('mousemove', (e) => {
      (window as any).__mouseClient = { x: e.clientX, y: e.clientY };
    }, { passive: true });
    // Expose clear function to window for Leaflet hooks
    (window as any).clearStationEmitters = clearStationEmitters;
  } catch {}
  for (let i = 0; i < totalPoints; i++) {
    const v = createVector(random(width), random(height));
    (v as any).vx = cos(random(TWO_PI));
    (v as any).vy = sin(random(TWO_PI));
    points.push(v);
  }
  // Fetch once on load (no periodic polling)
  fetchWeather();
  // Load stations, set default to Central Pier if present
  loadStationList().then(() => {
    const def = stationList.findIndex(s => (s.name || '').toLowerCase() === 'central pier');
    stationIdx = -1; // default to Hong Kong
    fetchStationWind();
    fetchStationsProgressive();
    loadMinimalMapGeo();
  });
  // Station CSV fetched once through progressive loader; no periodic polling
  // Keep canvas transparent so Leaflet basemap remains visible beneath
  clear();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  hullDirty = true;
  mapLayer = createGraphics(windowWidth, windowHeight);
  mapLayer.pixelDensity(1);
  mapLayerDirty = true;
  stationCacheDirty = true;
  flowGridDirty = true;
}

async function fetchStationWind() {
  try {
    // In Hong Kong (global) mode, don't lock to a single station
    if (stationIdx === -1) {
      currentStationName = 'Hong Kong';
      return;
    }
    let sample: any = null;
    if (stationIdx >= 0 && stationIdx < stationList.length) {
      const st = stationList[stationIdx];
      currentStationName = st.name;
      sample = await WindStationsService.fetchByUrl(st.url, st.name);
    }
    if (!sample) sample = await WindStationsService.fetchPreferredSample();
    if (sample && isFinite(sample.meanSpeedKmh) && isFinite(sample.meanDirDeg)) {
      currentStationName = sample.station || currentStationName;
      windSpeedKmhTarget = sample.meanSpeedKmh;
      windDirectionDegTarget = sample.meanDirDeg;
      if (isNaN(windSpeedKmhCurrent)) windSpeedKmhCurrent = windSpeedKmhTarget;
      if (isNaN(windDirectionDegCurrent)) windDirectionDegCurrent = windDirectionDegTarget;
      stationCacheDirty = true;
      flowGridDirty = true;
    }
  } catch (e) {
    // ignore, fallback to rhrread
  }
}

async function fetchStationsProgressive() {
  try {
    if (!stationList.length) return;
    // Progressive: push as they arrive; prefer Central Pier, Star Ferry, King's Park, Kai Tak first
    const preferred = ['central pier', 'star ferry', "king's park", 'kai tak'];
    const sorted = [...stationList].sort((a, b) => {
      const ai = preferred.indexOf((a.name || '').toLowerCase());
      const bi = preferred.indexOf((b.name || '').toLowerCase());
      const aw = ai === -1 ? 999 : ai;
      const bw = bi === -1 ? 999 : bi;
      return aw - bw;
    });
    multiStationSamples = [];
    // Clear existing station markers
    try {
      const anyWin: any = window as any;
      if (anyWin?.stationMarkers) anyWin.stationMarkers.clearLayers();
    } catch {}
    const limit = Math.min(STATION_SAMPLES_LIMIT, stationList.length);
    let added = 0;
    // Fetch in small parallel batches to speed up without hammering proxies
    const BATCH = 5;
    for (let i = 0; i < sorted.length && added < limit; i += BATCH) {
      const chunk = sorted.slice(i, i + BATCH);
      const results = await Promise.all(chunk.map(async (m) => {
        try { return await WindStationsService.fetchByUrl(m.url, m.name); } catch { return null; }
      }));
      for (let j = 0; j < results.length && added < limit; j++) {
        const sample = results[j];
        const m = chunk[j];
        if (sample && isFinite(sample.meanSpeedKmh) && isFinite(sample.meanDirDeg)) {
          multiStationSamples.push({ lat: m.lat, lon: m.lon, speed: sample.meanSpeedKmh, dirDeg: sample.meanDirDeg, name: sample.station });
          addStationToMap(m.lat, m.lon, sample.station, sample.meanSpeedKmh, sample.meanDirDeg);
          added++;
          stationCacheDirty = true;
          flowGridDirty = true;
        }
      }
      await new Promise(r => setTimeout(r, STATION_FETCH_DELAY_MS));
      if (added >= limit) break;
    }
  } catch {}
}

async function loadStationList() {
  try {
    const res = await fetch('./latest_10min_wind.json', { cache: 'no-store' });
    const data = await res.json();
    const features: any[] = data?.features || [];
    stationList = features
      .map(f => ({
        name: f?.properties?.AutomaticWeatherStation_en as string,
        url: f?.properties?.Data_url as string,
        lon: Array.isArray(f?.geometry?.coordinates) ? Number(f.geometry.coordinates[0]) : NaN,
        lat: Array.isArray(f?.geometry?.coordinates) ? Number(f.geometry.coordinates[1]) : NaN
      }))
      .filter(s => s.name && s.url && isFinite(s.lat) && isFinite(s.lon));
  } catch {}
  hullDirty = true;
}

async function fetchWeather() {
  try {
    const data = await WeatherService.fetchCurrent('en');
    currentTempC = data.temperatureC;
    if (typeof data.windSpeedKmh === 'number') windSpeedKmhTarget = data.windSpeedKmh;
    if (typeof data.windDirectionDeg === 'number') windDirectionDegTarget = data.windDirectionDeg as number;
    lastWeatherUpdateMs = millis();
    // reseed noise gently on data refresh to avoid visual stalling
    noiseSeed(Math.floor(Date.now() / 60000));
    // Initialize current toward target on first load
    if (frameCount < 2) {
      windSpeedKmhCurrent = windSpeedKmhTarget;
      windDirectionDegCurrent = windDirectionDegTarget;
    }
    stationCacheDirty = true;
    flowGridDirty = true;
  } catch (e) {
    console.error('Failed to fetch weather', e);
  }
}

function draw() {
  // Transparent frame; manually fade trails using alpha in stroke
  clear();
  const dt = deltaTime / 16.6667; // normalize to ~60fps
  // Gradual ramp: ease-out to full particle count over a few seconds
  const tRamp = constrain((millis() - rampStartMs) / RAMP_DURATION_MS, 0, 1);
  const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
  const targetCount = Math.floor(totalPoints * easeOutCubic(tRamp));
  if (targetCount > activePoints) activePoints = targetCount;
  // Initialize current on first valid target
  if (isNaN(windSpeedKmhCurrent) && !isNaN(windSpeedKmhTarget)) windSpeedKmhCurrent = windSpeedKmhTarget;
  if (isNaN(windDirectionDegCurrent) && !isNaN(windDirectionDegTarget)) windDirectionDegCurrent = windDirectionDegTarget;
  // Smooth wind toward latest target values
  const k = 0.25 * dt; // snappier easing toward target
  if (!isNaN(windSpeedKmhTarget) && !isNaN(windSpeedKmhCurrent)) {
    if (abs(windSpeedKmhTarget - windSpeedKmhCurrent) > 3) {
      windSpeedKmhCurrent = windSpeedKmhTarget;
    } else {
      windSpeedKmhCurrent += (windSpeedKmhTarget - windSpeedKmhCurrent) * k;
    }
  }
  if (!isNaN(windDirectionDegTarget) && !isNaN(windDirectionDegCurrent)) {
    const d = angleDiffDeg(windDirectionDegCurrent, windDirectionDegTarget);
    if (abs(d) > 20) {
      windDirectionDegCurrent = windDirectionDegTarget;
    } else {
      windDirectionDegCurrent = normalizeDeg(windDirectionDegCurrent + d * k);
    }
  }
  const step = (!isNaN(windSpeedKmhCurrent) ? map(windSpeedKmhCurrent, 0, 60, 1.2, 4.8) : 0) * dt;
  // Convert met direction (FROM) → screen heading (TO) with y-down
  const toDeg = (!isNaN(windDirectionDegCurrent) ? (windDirectionDegCurrent + 180) % 360 : 0);
  const toRad = radians(toDeg);
  const bias = atan2(-cos(toRad), sin(toRad));
  // Keep flow aligned with wind rose: small angular turbulence around bias
  const maxTurb = radians(6); // tighter alignment to heading for clarity
  // Minimal map (disabled when Leaflet basemap is present)
  drawMinimalMap();
  // Keep smoke emitters for visual effect - stations are now Leaflet markers
  drawStationsBackground();
  // Prepare composite field caches if using multi-station mode
  const useComposite = (stationIdx === -1 && multiStationSamples.length > 0);
  if (useComposite) {
    updateStationScreenCache();
    rebuildFlowGridIfNeeded();
  }
  decayDensityGrid();
  for (let i = 0; i < activePoints; i++) {
    const p = points[i];
    const t = millis() * 0.00008; // slow temporal drift to avoid banding
    const n = noise(p.x * noiseMultiplier + t, p.y * noiseMultiplier - t);
    let angle: number;
    let stepLocal: number;
    let hueLocal: number;
    let flowSpeedKmhLocal = windSpeedKmhCurrent;
    if (useComposite) {
      const flow = sampleFlowFromGrid(p.x, p.y);
      angle = flow.angle + (n - 0.5) * radians(6);
      stepLocal = map(flow.speedKmh, 0, 60, 1.2, 4.8) * dt;
      hueLocal = (degrees(flow.angle) + 360) % 360;
      flowSpeedKmhLocal = flow.speedKmh;
    } else {
      angle = bias + (n - 0.5) * maxTurb;
      stepLocal = step;
      hueLocal = (toDeg + n * 60) % 360;
    }
    // Blend with a tiny inertial drift to avoid tight orbiting
    const inertial = 0.08;
    const vx = cos(angle) * stepLocal * (1 - inertial) + ((p as any).vx || 0) * inertial;
    const vy = sin(angle) * stepLocal * (1 - inertial) + ((p as any).vy || 0) * inertial;
    const speedNorm = (!isNaN(flowSpeedKmhLocal) ? map(flowSpeedKmhLocal, 0, 60, 0.3, 3.0) / 3.0 : 0);
    // Softer color; make particle thickness respond to local wind speed
    let alpha = 50;
    if (useComposite) {
      const s = sampleFlowFromGrid(p.x, p.y);
      // Fade slightly when consensus is low to avoid bright clumping over conflicts
      const c = typeof s.consensus === 'number' ? s.consensus : 1;
      alpha = 20 + 40 * constrain(c, 0, 1);
    }
    stroke(hueLocal, 40 + 32 * speedNorm, 100, alpha);
    const sw = 0.9 + speedNorm * 1.6; // bigger in stronger wind
    strokeWeight(sw);
    line(p.x, p.y, p.x + vx, p.y + vy);
    p.x += vx;
    p.y += vy;
    (p as any).vx = vx;
    (p as any).vy = vy;
    p.z = (p.z || 0) + 0.02 * stepLocal;

    if (outOfCanvas(p)) {
      // reset trail length when particle wraps from outside
      p.z = 0;
    }
    accumulateDensityAt(p.x, p.y);
  }

  // Hide per-station guide lines; particles alone illustrate flow

  drawTemperatureTopRight();
  drawTopLeftClock();
  drawStationSwitcherBottomLeft();
  // continuously inject a few particles from all edges when flow enters
  emitFromEdges(48);
  densifySparseCells(MAX_DENSIFY_PER_FRAME);
  drawInfoUI();
}

// (guide lines removed)

function compositeFlowAt(x: number, y: number): { angle: number; speedKmh: number } {
  if (multiStationSamples.length === 0) {
    const toDeg = (!isNaN(windDirectionDegCurrent) ? (windDirectionDegCurrent + 180) % 360 : 0);
    const toRad = radians(toDeg);
    return { angle: atan2(-cos(toRad), sin(toRad)), speedKmh: isNaN(windSpeedKmhCurrent) ? 0 : windSpeedKmhCurrent };
  }
  // Weight in screen space (avoids mapping errors). Gaussian kernel around each station dot.
  let sumWx = 0, sumWy = 0, sumW = 0, sumSpeed = 0;
  const sigma = max(120, min(width, height) * 0.22);
  const invSigma2 = 1 / (sigma * sigma);
  for (const s of multiStationSamples) {
    const pxy = lonLatToScreen(s.lon, s.lat);
    // Convert absolute page coords to canvas coords
    let sx = pxy.x;
    let sy = pxy.y;
    try {
      const el = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        sx -= rect.left;
        sy -= rect.top;
      }
    } catch {}
    const dx = x - sx;
    const dy = y - sy;
    const w = Math.exp(-(dx * dx + dy * dy) * invSigma2);
    const toRadS = radians((s.dirDeg + 180) % 360);
    const ang = atan2(-cos(toRadS), sin(toRadS));
    sumWx += Math.cos(ang) * w;
    sumWy += Math.sin(ang) * w;
    sumSpeed += s.speed * w;
    sumW += w;
  }
  if (sumW <= 0) {
    const toDeg = (!isNaN(windDirectionDegCurrent) ? (windDirectionDegCurrent + 180) % 360 : 0);
    const toRad = radians(toDeg);
    return { angle: atan2(-cos(toRad), sin(toRad)), speedKmh: isNaN(windSpeedKmhCurrent) ? 0 : windSpeedKmhCurrent };
  }
  const angle = Math.atan2(sumWy, sumWx);
  const speedKmh = sumSpeed / sumW;
  return { angle, speedKmh };
}

// Very minimal map: soft coastline-like spline approximations in background hue.
// No landmarks, just a gentle suggestion so stations anchor in space.
function drawMinimalMap() {
  if (!hkGeojson) return;
  if (hullDirty) {
    hkPolygonsScreen = projectGeoToScreen(hkGeojson);
    hullDirty = false;
    mapLayerDirty = true;
  }
  if (!hkPolygonsScreen.length || !mapLayer) return;
  if (mapLayerDirty) {
    mapLayer.clear();
    mapLayer.push();
    mapLayer.noStroke();
    mapLayer.fill(230, 12, 25, 6);
    for (const poly of hkPolygonsScreen) {
      mapLayer.beginShape();
      for (const p of poly) mapLayer.vertex(p.x, p.y);
      mapLayer.endShape(CLOSE);
    }
    mapLayer.stroke(230, 16, 50, 10);
    mapLayer.strokeWeight(1);
    mapLayer.noFill();
    for (const poly of hkPolygonsScreen) {
      mapLayer.beginShape();
      for (const p of poly) mapLayer.vertex(p.x, p.y);
      mapLayer.endShape(CLOSE);
    }
    mapLayer.pop();
    mapLayerDirty = false;
  }
  image(mapLayer, 0, 0);
}

async function loadMinimalMapGeo() {
  try {
    // Expect a local GeoJSON file placed in project root or public dir
    // Keep it tiny: polygon(s) of Hong Kong outline without landmarks
    const res = await fetch('./hong_kong_min.geo.json', { cache: 'no-store' });
    if (!res.ok) return;
    hkGeojson = await res.json();
    hullDirty = true;
    mapLayerDirty = true;
  } catch {}
}

function projectGeoToScreen(geo: any): Array<Array<{ x: number; y: number }>> {
  const polys: Array<Array<{ x: number; y: number }>> = [];
  const toXY = (lon: number, lat: number) => lonLatToScreen(lon, lat);
  const addRing = (coords: number[][]) => {
    const ring: Array<{ x: number; y: number }> = coords.map(([lon, lat]) => toXY(lon, lat));
    polys.push(ring);
  };
  const feat = geo.type === 'FeatureCollection' ? geo.features : [geo];
  for (const f of feat) {
    const g = f.type === 'Feature' ? f.geometry : f;
    if (!g) continue;
    if (g.type === 'Polygon') {
      addRing(g.coordinates[0]);
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) addRing(poly[0]);
    }
  }
  return polys;
}

// Recycle a few particles each frame from just below the bottom edge whenever
// local flow points upward (into the screen). This prevents the scene from
// draining when composite winds push particles away.
function emitFromEdges(count: number) {
  if (count <= 0) return;
  const perSide = max(1, Math.floor(count / 4));
  const m = max(20, min(width, height) * 0.03);

  // bottom (emit when vy < 0)
  for (let i = 0; i < perSide; i++) {
    let attempts = 6;
    while (attempts-- > 0) {
      const x = random(width);
      const flow = compositeFlowAt(x, height - 1);
      if (sin(flow.angle) < 0) {
        const idx = (frameCount * 97 + i * 131 + attempts) % points.length;
        const p = points[idx];
        p.x = x;
        p.y = height + m - 1;
        (p as any).vx = 0;
        (p as any).vy = 0;
        p.z = 0;
        break;
      }
    }
  }

  // top (emit when vy > 0)
  for (let i = 0; i < perSide; i++) {
    let attempts = 6;
    while (attempts-- > 0) {
      const x = random(width);
      const flow = sampleFlowFromGrid(x, 1);
      if (sin(flow.angle) > 0) {
        const idx = (frameCount * 193 + i * 151 + attempts) % points.length;
        const p = points[idx];
        p.x = x;
        p.y = -m + 1;
        (p as any).vx = 0;
        (p as any).vy = 0;
        p.z = 0;
        break;
      }
    }
  }

  // left (emit when vx > 0)
  for (let i = 0; i < perSide; i++) {
    let attempts = 6;
    while (attempts-- > 0) {
      const y = random(height);
      const flow = sampleFlowFromGrid(1, y);
      if (cos(flow.angle) > 0) {
        const idx = (frameCount * 223 + i * 171 + attempts) % points.length;
        const p = points[idx];
        p.x = -m + 1;
        p.y = y;
        (p as any).vx = 0;
        (p as any).vy = 0;
        p.z = 0;
        break;
      }
    }
  }

  // right (emit when vx < 0)
  for (let i = 0; i < perSide; i++) {
    let attempts = 6;
    while (attempts-- > 0) {
      const y = random(height);
      const flow = sampleFlowFromGrid(width - 1, y);
      if (cos(flow.angle) < 0) {
        const idx = (frameCount * 251 + i * 191 + attempts) % points.length;
        const p = points[idx];
        p.x = width + m - 1;
        p.y = y;
        (p as any).vx = 0;
        (p as any).vy = 0;
        p.z = 0;
        break;
      }
    }
  }
}

function outOfCanvas(item: p5.Vector) {
  // Toroidal wrap with an off-screen margin so particles enter/exit smoothly
  // rather than sticking to the exact edge.
  const m = max(20, min(width, height) * 0.03);
  let wrapped = false;
  if (item.x < -m) { item.x = width + m; wrapped = true; }
  else if (item.x > width + m) { item.x = -m; wrapped = true; }
  if (item.y < -m) { item.y = height + m; wrapped = true; }
  else if (item.y > height + m) { item.y = -m; wrapped = true; }
  return wrapped;
}

function drawTemperatureTopRight() {
  push();
  const t = typeof currentTempC === 'number' ? `${currentTempC.toFixed(1)}°C` : '--°C';
  textAlign(RIGHT, TOP);
  textSize(min(width, height) * 0.06);
  fill(255);
  noStroke();
  text(t, width - 20, 20);
  pop();
}

function drawTopLeftClock() {
  push();
  textAlign(LEFT, TOP);
  textSize(min(width, height) * 0.04);
  fill(255);
  noStroke();
  const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  text(t, 20, 20);
  pop();
}

// Background pass: render faint smoke and dots behind the flow
function drawStationsBackground() {
  if (multiStationSamples.length === 0) return;
  const r = max(4, min(width, height) * 0.0045);
  updateStationScreenCache();
  for (let idx = 0; idx < stationScreenCache.length; idx++) {
    const s = stationScreenCache[idx];
    const sx = s.sx;
    const sy = s.sy;
    // subtle grey dot
    noStroke();
    fill(0, 0, 70, 50);
    circle(sx, sy, r * 2);
    // smoke emitter driven by local wind
    const key = s.name || `${sx},${sy}`;
    let em = stationEmitters.get(key);
    if (!em) {
      em = { x: sx, y: sy, particles: [] };
      stationEmitters.set(key, em);
    } else {
      em.x = sx;
      em.y = sy;
    }
    // spawn puffs along station wind; speed scales emission & velocity
    const dt = deltaTime / 16.6667;
    const ax = s.ux;
    const ay = s.uy;
    const speedNorm = constrain(s.speed, 0, 60) / 60;
    const baseV = lerp(0.4, 2.5, speedNorm);
    // Reduce smoke spawn rate for performance
    const spawn = frameCount % 3 === 0 ? 1 : 0; // spawn every 3rd frame
    for (let n = 0; n < spawn; n++) {
      const jx = random(-r * 0.6, r * 0.6);
      const jy = random(-r * 0.6, r * 0.6);
      const sp = new SmokeParticle(
        sx + jx,
        sy + jy,
        ax * baseV + randomGaussian(0, 1) * 0.1,
        ay * baseV + randomGaussian(0, 1) * 0.1,
        r * random(1.2, 1.9),
        38
      );
      em.particles.push(sp);
    }
    // update/draw particles, remove dead; limit max particles per emitter
    const arr = em.particles;
    if (arr.length > 15) arr.splice(0, arr.length - 15); // cap at 15 particles per station
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.update(dt);
      p.draw();
      if (p.dead()) arr.splice(i, 1);
    }
  }
}

// Foreground pass: capture hover and label without re-drawing smoke
function drawStationsHover() {
  if (multiStationSamples.length === 0) return;
  let hovered: { x: number; y: number; name: string } | null = null;
  const r = max(4, min(width, height) * 0.0045);
  updateStationScreenCache();
  for (const s of stationScreenCache) {
    const sx = s.sx;
    const sy = s.sy;
    let cx = mouseX, cy = mouseY;
    try {
      const el = document.querySelector('canvas') as HTMLCanvasElement | null;
      const m = (window as any).__mouseClient;
      if (el && m) {
        const rect = el.getBoundingClientRect();
        cx = m.x - rect.left;
        cy = m.y - rect.top;
      }
    } catch {}
    if (dist(cx, cy, sx, sy) <= r + 8) hovered = { x: sx, y: sy, name: s.name };
  }
  if (hovered) {
    // enrich tooltip with live wind data for this station if available
    const st = stationScreenCache.find(s => dist(s.sx, s.sy, hovered!.x, hovered!.y) < 4);
    const compass = st ? degToCompass((Math.atan2(st.uy, st.ux) * 180 / Math.PI + 360 + 90) % 360) : '';
    const degOut = st ? Math.round((Math.atan2(st.uy, st.ux) * 180 / Math.PI + 360 + 90) % 360) : 0;
    const label = (hovered.name || 'Station') + (st ? `  •  ${Math.round(st.speed)} km/h  •  ${compass} (${degOut}°)` : '');
    const fs = max(12, min(width, height) * 0.02);
    textSize(fs);
    const tw = textWidth(label);
    const pad = 8;
    const bx = hovered.x + 12;
    const by = hovered.y - fs - 16;
    push();
    rectMode(CORNER);
    noStroke();
    fill(0, 0, 0, 180);
    rect(bx, by, tw + pad * 2, fs + pad * 1.5, 8);
    fill(255);
    textAlign(LEFT, TOP);
    text(label, bx + pad, by + pad * 0.6);
    pop();
  }
}

function degToCompass(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const i = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[i < 0 ? i + 16 : i];
}


// Angle helpers for smoothing
function normalizeDeg(d: number): number {
  let a = d % 360;
  if (a < 0) a += 360;
  return a;
}

function angleDiffDeg(fromDeg: number, toDeg: number): number {
  const a = normalizeDeg(fromDeg);
  const b = normalizeDeg(toDeg);
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}


// Bottom-right info icon with hover tooltip
function drawInfoUI() {
  const r = 14;
  const pad = 18;
  const x = width - pad;
  const y = height - pad;
  // icon
  push();
  noStroke();
  fill(0, 0, 0, 140);
  circle(x, y, r * 2);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(r);
  text('i', x, y + 1);
  pop();

  // hover
  if (dist(mouseX, mouseY, x, y) <= r + 4) {
    const hasSpeed = !isNaN(windSpeedKmhCurrent);
    const hasDir = !isNaN(windDirectionDegCurrent);
    const speedNum = hasSpeed ? Math.round(windSpeedKmhCurrent) : null;
    const toDeg = hasDir ? (windDirectionDegCurrent + 180 + 360) % 360 : null;
    const fromTxt = hasDir ? `${degToCompass(windDirectionDegCurrent)} (${Math.round(windDirectionDegCurrent)}°)` : null;
    const toTxt = hasDir && toDeg != null ? `${degToCompass(toDeg)} (${Math.round(toDeg)}°)` : null;
    const nowLine = hasSpeed && hasDir
      ? `Now: ${speedNum} km/h • from ${fromTxt} → to ${toTxt}`
      : hasSpeed
        ? `Now: ${speedNum} km/h`
        : hasDir
          ? `Now: from ${fromTxt} → to ${toTxt}`
          : 'Now: —';
    const stationLine = (typeof stationIdx === 'number' && stationIdx === -1)
      ? 'Mode: Hong Kong (composite of stations)'
      : (currentStationName ? `Station: ${currentStationName}` : 'Station: auto');
    const lines = [
      'Hong Kong wind (live)',
      nowLine,
      stationLine,
      'Flowing lines show air movement; faster wind → longer, quicker streaks.',
      'Direction: FROM → TO (e.g., 90° from = 270° to).',
      'Temperature: top‑right.',
      'Pan/zoom map; tap station markers for details.'
    ];
    const fs = max(12, min(width, height) * 0.02);
    textSize(fs);
    let tw = 0;
    for (const s of lines) tw = max(tw, textWidth(s));
    const lh = fs * 1.25;
    const th = lh * lines.length + 16;
    // Reserve a square at left for a direction arrow that matches particle heading
    const arrowBox = fs * 2.4;
    const bx = x - (tw + arrowBox) - 32; // left of icon
    const by = y - th - 32; // above icon
    push();
    rectMode(CORNER);
    noStroke();
    fill(0, 0, 0, 180);
    rect(bx, by, tw + arrowBox + 32, th + 20, 12);
    // Draw heading arrow box
    const cx = bx + 14 + arrowBox / 2;
    const cy = by + 12 + arrowBox / 2;
    fill(0, 0, 0, 160);
    rectMode(CENTER);
    rect(cx, cy, arrowBox, arrowBox, 10);
    // Compute same bias angle used by particles
    const toRad = radians(toDeg);
    const arrowAngle = atan2(-cos(toRad), sin(toRad));
    // Compass ring and North marker
    noFill();
    stroke(255, 70);
    strokeWeight(1);
    circle(cx, cy, arrowBox * 0.9);
    fill(255, 160);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(max(10, arrowBox * 0.22));
    text('N', cx, cy - arrowBox * 0.5 + 8);
    // Arrow: filled triangle pointing to heading ("to" direction)
    push();
      translate(cx, cy);
      rotate(arrowAngle);
      noStroke();
      fill(255);
      const L = arrowBox * 0.34;
      const W = arrowBox * 0.16;
      beginShape();
        vertex(-L * 0.35, -W * 0.45);
        vertex(-L * 0.35, W * 0.45);
        vertex(L * 0.55, 0);
      endShape(CLOSE);
    pop();
    fill(255);
    textAlign(LEFT, TOP);
    let ty = by + 10;
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i];
      if (i === 0) {
        textStyle(BOLD);
      } else {
        textStyle(NORMAL);
      }
      text(s, bx + 12 + arrowBox + 12, ty);
      ty += lh;
    }
    pop();
  }
}

// -------------- Performance helpers --------------

function updateStationScreenCache() {
  if (multiStationSamples.length === 0) { stationScreenCache = []; return; }
  if (!stationCacheDirty && stationScreenCache.length === multiStationSamples.length) return;
  const el = document.querySelector('canvas') as HTMLCanvasElement | null;
  let left = 0, top = 0;
  try {
    if (el) { const rect = el.getBoundingClientRect(); left = rect.left; top = rect.top; }
  } catch {}
  const out: StationScreenCache = [];
  for (const s of multiStationSamples) {
    const pxy = lonLatToScreen(s.lon, s.lat);
    const sx = pxy.x - left;
    const sy = pxy.y - top;
    const toRadS = radians((s.dirDeg + 180) % 360);
    const ang = atan2(-cos(toRadS), sin(toRadS));
    out.push({ sx, sy, ux: cos(ang), uy: sin(ang), speed: s.speed, name: s.name });
  }
  stationScreenCache = out;
  stationCacheDirty = false;
  flowGridDirty = true; // station positions changed => recompute grid
}

function rebuildFlowGridIfNeeded() {
  if (!flowGridDirty || stationScreenCache.length === 0) return;
  const targetCell = max(28, min(width, height) * 0.04); // adaptive resolution
  const cols = max(2, Math.floor(width / targetCell));
  const rows = max(2, Math.floor(height / targetCell));
  const cellW = width / cols;
  const cellH = height / rows;
  const ux = new Float32Array(cols * rows);
  const uy = new Float32Array(cols * rows);
  const speed = new Float32Array(cols * rows);
  const cons = new Float32Array(cols * rows);
  const sigma = max(120, min(width, height) * 0.22);
  const invSigma2 = 1 / (sigma * sigma);
  for (let gy = 0; gy < rows; gy++) {
    const y = (gy + 0.5) * cellH;
    for (let gx = 0; gx < cols; gx++) {
      const x = (gx + 0.5) * cellW;
      let sumUx = 0, sumUy = 0, sumSpeed = 0, sumW = 0;
      let bestW = -1, bestUx = 1, bestUy = 0, bestSpeed = 0;
      for (const s of stationScreenCache) {
        const dx = x - s.sx;
        const dy = y - s.sy;
        const w = Math.exp(-(dx * dx + dy * dy) * invSigma2);
        sumUx += s.ux * w;
        sumUy += s.uy * w;
        sumSpeed += s.speed * w;
        sumW += w;
        if (w > bestW) { bestW = w; bestUx = s.ux; bestUy = s.uy; bestSpeed = s.speed; }
      }
      const idx = gy * cols + gx;
      if (sumW > 0) {
        const len = Math.hypot(sumUx, sumUy);
        const consensus = len / sumW; // 0..1 (1 = perfect alignment)
        if (consensus < 0.25 && bestW > 0) {
          // Opposing directions cancel out; follow the closest station instead
          ux[idx] = bestUx;
          uy[idx] = bestUy;
          speed[idx] = bestSpeed;
          cons[idx] = 0;
        } else {
          const denom = len || 1;
          ux[idx] = sumUx / denom;
          uy[idx] = sumUy / denom;
          speed[idx] = sumSpeed / sumW;
          cons[idx] = consensus;
        }
      } else {
        // fallback to global wind
        const toDeg = (!isNaN(windDirectionDegCurrent) ? (windDirectionDegCurrent + 180) % 360 : 0);
        const toRad = radians(toDeg);
        const ang = atan2(-cos(toRad), sin(toRad));
        ux[idx] = cos(ang);
        uy[idx] = sin(ang);
        speed[idx] = isNaN(windSpeedKmhCurrent) ? 0 : windSpeedKmhCurrent;
      }
    }
  }
  flowGrid = { cols, rows, cellW, cellH, ux, uy, speed, cons };
  flowGridDirty = false;
  // Ensure density grid matches new resolution
  densityGrid = { cols, rows, values: new Float32Array(cols * rows) };
}

function sampleFlowFromGrid(x: number, y: number): { angle: number; speedKmh: number; consensus?: number } {
  if (!flowGrid) return compositeFlowAt(x, y);
  const { cols, rows, cellW, cellH, ux, uy, speed, cons } = flowGrid;
  const gx = constrain(x / cellW - 0.5, 0, cols - 1);
  const gy = constrain(y / cellH - 0.5, 0, rows - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, cols - 1);
  const y1 = Math.min(y0 + 1, rows - 1);
  const tx = gx - x0;
  const ty = gy - y0;
  const idx = (ix: number, iy: number) => iy * cols + ix;
  const bilerp = (a: number, b: number, c: number, d: number) =>
    lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
  // Angle-aware bilerp to avoid cancellation/sinks at seams
  const ang = (ix: number, iy: number) => Math.atan2(uy[idx(ix, iy)], ux[idx(ix, iy)]);
  const angleLerp = (a: number, b: number, t: number) => {
    let d = b - a;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return a + d * t;
  };
  const a00 = ang(x0, y0), a10 = ang(x1, y0), a01 = ang(x0, y1), a11 = ang(x1, y1);
  const ax0 = angleLerp(a00, a10, tx);
  const ax1 = angleLerp(a01, a11, tx);
  const axy = angleLerp(ax0, ax1, ty);
  const sp = bilerp(speed[idx(x0, y0)], speed[idx(x1, y0)], speed[idx(x0, y1)], speed[idx(x1, y1)]);
  const cs = bilerp(cons[idx(x0, y0)], cons[idx(x1, y0)], cons[idx(x0, y1)], cons[idx(x1, y1)]);
  return { angle: axy, speedKmh: sp, consensus: cs };
}

function decayDensityGrid() {
  if (!densityGrid && flowGrid) {
    densityGrid = { cols: flowGrid.cols, rows: flowGrid.rows, values: new Float32Array(flowGrid.cols * flowGrid.rows) };
  }
  if (!densityGrid) return;
  const v = densityGrid.values;
  for (let i = 0; i < v.length; i++) v[i] *= DENSITY_DECAY;
}

function accumulateDensityAt(x: number, y: number) {
  if (!densityGrid || !flowGrid) return;
  const { cols, rows } = densityGrid;
  const { cellW, cellH } = flowGrid;
  const gx = Math.floor(constrain(x / cellW, 0, cols - 1));
  const gy = Math.floor(constrain(y / cellH, 0, rows - 1));
  const idx = gy * cols + gx;
  densityGrid.values[idx] += 1;
}

function densifySparseCells(maxMoves: number) {
  if (!densityGrid || !flowGrid || points.length === 0) return;
  const { cols, rows, values } = densityGrid;
  // Find sparse cells by score = expected - current
  const targetPerCell = Math.max(4, Math.floor(points.length / (cols * rows) * 0.8));
  const indices: number[] = [];
  for (let i = 0; i < values.length; i++) indices.push(i);
  indices.sort((a, b) => (values[a] - values[b]));
  const moves = Math.min(maxMoves, Math.floor(indices.length * 0.25));
  for (let k = 0; k < moves; k++) {
    const cell = indices[k];
    // Avoid relocating into low-consensus conflict cells
    if (flowGrid && flowGrid.cons[cell] < 0.2) continue;
    if (values[cell] >= targetPerCell) break;
    const cx = (cell % cols) + Math.random();
    const cy = Math.floor(cell / cols) + Math.random();
    const x = (cx) * flowGrid.cellW;
    const y = (cy) * flowGrid.cellH;
    const idxPoint = (frameCount * 911 + k * 577) % points.length;
    const p = points[idxPoint];
    p.x = constrain(x, -1, width + 1);
    p.y = constrain(y, -1, height + 1);
    (p as any).vx = 0;
    (p as any).vy = 0;
    p.z = 0;
    values[cell] += 1; // mark as filled a bit to avoid multiple relocations this frame
  }
}

function drawStationSwitcherBottomLeft() {
  return; // remove old switcher UI per request
  /*
  const pad = 18;
  const name = stationIdx === -1 ? 'Hong Kong' : (currentStationName || (stationIdx >= 0 && stationIdx < stationList.length ? stationList[stationIdx].name : 'Station'));
  const label = stationIdx === -1 ? `${name}` : `‹ ${name} ›`;
  push();
  textSize(max(12, min(width, height) * 0.02));
  const tw = textWidth(label);
  const th = textAscent() + textDescent();
  const w = tw + 24;
  const h = th + 12;
  const x = pad + w / 2;
  const y = height - pad - h / 2;
  noStroke();
  fill(0, 0, 0, 140);
  rectMode(CENTER);
  rect(x, y, w, h, 10);
  fill(255);
  textAlign(CENTER, CENTER);
  text(label, x, y + 1);
  pop();
  switcherRect = { x: x - w / 2, y: y - h / 2, w, h };

  // Locate button (target icon) to the right of switcher
  const r = h * 0.5;
  const lx = switcherRect.x + switcherRect.w + 10 + r;
  const ly = y;
  push();
  noStroke();
  fill(0, 0, 0, 140);
  circle(lx, ly, r * 2);
  stroke(255);
  strokeWeight(2);
  noFill();
  circle(lx, ly, r * 1.2);
  line(lx, ly - r * 0.8, lx, ly - r * 1.2);
  pop();
  locateRect = { x: lx, y: ly, r };
  */
}

function mousePressed() {
  if (switcherRect) {
    const { x, y, w, h } = switcherRect;
    if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
      if (stationList.length > 0) {
        if (stationIdx === -1) {
          // From HK label, jump to default (Central Pier or first)
          const def = stationList.findIndex(s => (s.name || '').toLowerCase() === 'central pier');
          stationIdx = def >= 0 ? def : 0;
        } else {
          const left = mouseX < x + w / 2;
          stationIdx = left ? (stationIdx - 1 + stationList.length) % stationList.length : (stationIdx + 1) % stationList.length;
        }
        fetchStationWind();
      }
      return false;
    }
  }
  if (locateRect) {
    const d = dist(mouseX, mouseY, locateRect.x, locateRect.y);
    if (d <= locateRect.r) {
      requestUserLocation();
      return false;
    }
  }
}

function requestUserLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const idx = findNearestStation(lat, lon);
      if (idx >= 0) {
        stationIdx = idx;
        currentStationName = stationList[idx].name;
        fetchStationWind();
      }
    },
    () => {},
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
  );
}

function findNearestStation(lat: number, lon: number): number {
  if (!stationList.length) return -1;
  let best = -1;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < stationList.length; i++) {
    const s = stationList[i];
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


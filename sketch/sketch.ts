// Minimal wind visualization based on Barney Codes flow field
// Wind direction/force from HKO; temperature displayed top-right

let points: p5.Vector[] = [];
const totalPoints = 5000;

let noiseMultiplier = 0.01;
// flow always follows real wind; no random direction flips

let currentTempC: number | null = null;
let windSpeedKmh: number = 8;
let windDirectionDeg: number = 90;

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < totalPoints; i++) {
    points.push(createVector(random(width), random(height)));
  }
  fetchWeather();
  setInterval(fetchWeather, REFRESH_INTERVAL_MS);
  background(10, 10, 50);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

async function fetchWeather() {
  try {
    const data = await WeatherService.fetchCurrent('en');
    currentTempC = data.temperatureC;
    if (typeof data.windSpeedKmh === 'number') windSpeedKmh = data.windSpeedKmh;
    if (typeof data.windDirectionDeg === 'number') windDirectionDeg = data.windDirectionDeg as number;
    // reseed noise gently on data refresh to avoid visual stalling
    noiseSeed(Math.floor(Date.now() / 60000));
  } catch (e) {
    console.error('Failed to fetch weather', e);
  }
}

function draw() {
  background(230, 60, 12, 7); // HSB: deep blue-ish with slight fade for trails
  const dt = deltaTime / 16.6667; // normalize to ~60fps
  const step = map(windSpeedKmh, 0, 60, 0.3, 3.0) * dt;
  // Convert met direction (FROM) → screen heading (TO) with y-down
  const toDeg = (windDirectionDeg + 180) % 360;
  const toRad = radians(toDeg);
  const bias = atan2(-cos(toRad), sin(toRad));
  // Keep flow aligned with wind rose: small angular turbulence around bias
  const maxTurb = map(windSpeedKmh, 0, 60, PI / 2, PI / 12);
  for (let i = 0; i < totalPoints; i++) {
    const p = points[i];
    const t = millis() * 0.00008; // slow temporal drift to avoid banding
    const n = noise(p.x * noiseMultiplier + t, p.y * noiseMultiplier - t);
    const angle = bias + (n - 0.5) * maxTurb;
    const vx = cos(angle) * step;
    const vy = sin(angle) * step;
    stroke((toDeg + n * 60) % 360, 50 + 40 * (map(windSpeedKmh,0,60,0.3,3.0)/3.0), 100, 35);
    strokeWeight(1.2);
    line(p.x, p.y, p.x + vx, p.y + vy);
    p.x += vx;
    p.y += vy;
    p.z = (p.z || 0) + 0.02 * step;

    if (outOfCanvas(p)) {
      p.x = random(width);
      p.y = random(height);
      p.z = 0;
    }
  }

  drawTemperatureTopRight();
  drawInfoUI();
}

function outOfCanvas(item: p5.Vector) {
  // seamless toroidal wrap to avoid square tiling seams
  if (item.x < 0) item.x += width;
  if (item.x > width) item.x -= width;
  if (item.y < 0) item.y += height;
  if (item.y > height) item.y -= height;
  return false;
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

function degToCompass(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const i = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[i < 0 ? i + 16 : i];
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
    const speed = Math.round(windSpeedKmh);
    const toDeg = (windDirectionDeg + 180 + 360) % 360;
    const fromTxt = `${degToCompass(windDirectionDeg)} (${Math.round(windDirectionDeg)}°)`;
    const toTxt = `${degToCompass(toDeg)} (${Math.round(toDeg)}°)`;
    const lines = [
      'Hong Kong wind (live)',
      `Now: ${speed} km/h • from ${fromTxt} → to ${toTxt}`,
      'What you see: flowing lines show air moving across the city.',
      'Faster wind = quicker, longer streaks.',
      'Temperature is the number in the top‑right.',
      'Source: Hong Kong Observatory (real‑time weather)'
    ];
    const fs = max(12, min(width, height) * 0.02);
    textSize(fs);
    let tw = 0;
    for (const s of lines) tw = max(tw, textWidth(s));
    const lh = fs * 1.25;
    const th = lh * lines.length + 16;
    const bx = x - tw - 28; // left of icon
    const by = y - th - 28; // above icon
    push();
    rectMode(CORNER);
    noStroke();
    fill(0, 0, 0, 180);
    rect(bx, by, tw + 28, th + 16, 12);
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
      text(s, bx + 12, ty);
      ty += lh;
    }
    pop();
  }
}


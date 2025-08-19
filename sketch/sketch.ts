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
  const step = map(windSpeedKmh, 0, 60, 0.4, 3.5);
  // Convert met direction (FROM) → screen heading (TO) with y-down
  const toDeg = (windDirectionDeg + 180) % 360;
  const toRad = radians(toDeg);
  const bias = atan2(-cos(toRad), sin(toRad));
  // Keep flow aligned with wind rose: small angular turbulence around bias
  const maxTurb = map(windSpeedKmh, 0, 60, PI / 2, PI / 12);
  for (let i = 0; i < totalPoints; i++) {
    const p = points[i];
    const n = noise(p.x * noiseMultiplier, p.y * noiseMultiplier);
    const angle = bias + (n - 0.5) * maxTurb;
    const vx = cos(angle) * step;
    const vy = sin(angle) * step;
    stroke((toDeg + n * 60) % 360, 50 + 40 * (step / 3.5), 100, 35);
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
  drawWindBottomInfo();
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

function drawWindBottomInfo() {
  const dirCompassFrom = degToCompass(windDirectionDeg);
  const toDeg = (windDirectionDeg + 180 + 360) % 360;
  const dirCompassTo = degToCompass(toDeg);
  const speed = Math.round(windSpeedKmh);
  // Arrow direction mirrors flow: if wind is to the left (W), draw ←
  const arrow = (toDeg > 225 && toDeg < 315) ? '←' :
                (toDeg > 45 && toDeg < 135) ? '→' :
                (toDeg >= 135 && toDeg <= 225) ? '↓' : '↑';
  const label = `${arrow} Wind: from ${dirCompassFrom} (${Math.round(windDirectionDeg)}°) to ${dirCompassTo} (${Math.round(toDeg)}°) • Mean ${speed} km/h`;
  push();
  noStroke();
  const pad = 16;
  textSize(min(width, height) * 0.028);
  const tw = textWidth(label);
  const th = textAscent() + textDescent();
  fill(0, 0, 0, 120);
  rectMode(CENTER);
  rect(width / 2, height - (th + pad * 1.2), tw + pad * 2, th + pad, 12);
  fill(255);
  textAlign(CENTER, CENTER);
  text(label, width / 2, height - (th + pad * 1.2));
  pop();
}

function degToCompass(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const i = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[i < 0 ? i + 16 : i];
}



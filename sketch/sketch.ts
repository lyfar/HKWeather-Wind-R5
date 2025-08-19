// Minimal wind visualization based on Barney Codes flow field
// Wind direction/force from HKO; temperature displayed top-right

let points: p5.Vector[] = [];
const totalPoints = 5000;

let noiseMultiplier = 0.01;
let direction: 'left' | 'right' = 'left';
let noiseSeedCount = 0;

let currentTempC: number | null = null;
let windSpeedKmh: number = 8;
let windDirectionDeg: number = 90;

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < totalPoints; i++) {
    points.push(createVector(random(width), random(height)));
  }
  scheduleDirectionToggle();
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
  } catch (e) {
    console.error('Failed to fetch weather', e);
  }
}

function draw() {
  stroke(255);
  background(10, 10, 50, 5);
  const step = map(windSpeedKmh, 0, 60, 0.4, 3.5);
  const bias = radians(windDirectionDeg);
  for (let i = 0; i < totalPoints; i++) {
    const p = points[i];
    stroke(255);
    point(p.x, p.y);
    noStroke();
    fill(p.x % 255, p.y % 255, (p.z || 0) * 55, 40);
    circle(p.x, p.y, (p.z || 0));
    const n = noise(p.x * noiseMultiplier, p.y * noiseMultiplier);
    const angle = TWO_PI * n + bias;
    if (direction === 'left') {
      p.x += cos(angle) * step;
      p.y += sin(angle) * step;
      p.z = (p.z || 0) + 0.02 * step;
    } else {
      p.x -= cos(angle) * step;
      p.y += sin(angle) * step;
      p.z = (p.z || 0) - 0.02 * step;
    }

    if (outOfCanvas(p)) {
      p.x = random(width);
      p.y = random(height);
      p.z = 0;
    }
  }

  drawTemperatureTopRight();
  drawWindBottomInfo();
}

function scheduleDirectionToggle() {
  const delay = random(5000, 15000);
  setTimeout(() => {
    direction = direction === 'left' ? 'right' : 'left';
    noiseSeedCount += 1;
    noiseSeed(noiseSeedCount);
    scheduleDirectionToggle();
  }, delay);
}

function outOfCanvas(item: p5.Vector) {
  return item.x < 0 || item.y < 0 || item.y > height || item.x > width;
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
  const dirCompass = degToCompass(windDirectionDeg);
  const speed = Math.round(windSpeedKmh);
  const label = `Wind: ${dirCompass} (${Math.round(windDirectionDeg)}°) • Mean ${speed} km/h`;
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



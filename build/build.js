var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var BuildingService = (function () {
    function BuildingService() {
    }
    BuildingService.fetchBuildingsByMonthDay = function (month, day, csvUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var url, res, text, rows, header, idxDate, idxName, idxAddress, idxUsage, out, i, row, dateStr, d, mm, dd;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = BuildingService.wrapCors(csvUrl);
                        return [4, fetch(url, { cache: 'no-store' })];
                    case 1:
                        res = _a.sent();
                        return [4, res.text()];
                    case 2:
                        text = _a.sent();
                        rows = BuildingService.parseCsv(text);
                        if (rows.length === 0)
                            return [2, []];
                        header = rows[0].map(function (h) { return BuildingService.norm(h); });
                        idxDate = BuildingService.findFirst(header, [
                            'occupationpermitdate', 'opdate', 'op_date', 'occupation_permit_date', 'bop_date'
                        ]);
                        idxName = BuildingService.findFirst(header, [
                            'buildingname', 'name', 'bldgname', 'bldg_name'
                        ]);
                        idxAddress = BuildingService.findFirst(header, [
                            'address', 'fulladdress', 'buildingaddress', 'lot', 'siteaddress'
                        ]);
                        idxUsage = BuildingService.findFirst(header, [
                            'usage', 'buildingusage', 'bldgusage', 'purposes', 'type'
                        ]);
                        out = [];
                        for (i = 1; i < rows.length; i++) {
                            row = rows[i];
                            if (!row || row.length === 0)
                                continue;
                            dateStr = idxDate >= 0 ? (row[idxDate] || '') : '';
                            d = BuildingService.parseDateFlexible(dateStr);
                            if (!d)
                                continue;
                            mm = d.getMonth() + 1;
                            dd = d.getDate();
                            if (mm === month && dd === day) {
                                out.push({
                                    name: idxName >= 0 ? row[idxName] : undefined,
                                    address: idxAddress >= 0 ? row[idxAddress] : undefined,
                                    usage: idxUsage >= 0 ? row[idxUsage] : undefined,
                                    opDate: dateStr,
                                    year: d.getFullYear(),
                                    month: mm,
                                    day: dd,
                                });
                            }
                        }
                        return [2, out];
                }
            });
        });
    };
    BuildingService.wrapCors = function (url) {
        if (url.includes('api.allorigins.win'))
            return url;
        return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
    };
    BuildingService.parseCsv = function (text) {
        var lines = text.split(/\r?\n/).filter(function (l) { return l.length > 0; });
        var rows = [];
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line_1 = lines_1[_i];
            rows.push(BuildingService.splitCsvLine(line_1));
        }
        return rows;
    };
    BuildingService.splitCsvLine = function (line) {
        var result = [];
        var cur = '';
        var inQuotes = false;
        for (var i = 0; i < line.length; i++) {
            var ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        cur += '"';
                        i++;
                    }
                    else {
                        inQuotes = false;
                    }
                }
                else {
                    cur += ch;
                }
            }
            else {
                if (ch === '"') {
                    inQuotes = true;
                }
                else if (ch === ',') {
                    result.push(cur);
                    cur = '';
                }
                else {
                    cur += ch;
                }
            }
        }
        result.push(cur);
        return result.map(function (s) { return s.trim(); });
    };
    BuildingService.norm = function (s) {
        return (s || '').toLowerCase().replace(/\s+/g, '').replace(/[_-]/g, '');
    };
    BuildingService.findFirst = function (arr, keys) {
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var k = keys_1[_i];
            var idx = arr.indexOf(k);
            if (idx >= 0)
                return idx;
        }
        return -1;
    };
    BuildingService.parseDateFlexible = function (s) {
        if (!s)
            return null;
        var iso = new Date(s);
        if (!isNaN(iso.getTime()))
            return iso;
        var m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m1) {
            var d = parseInt(m1[1], 10);
            var m = parseInt(m1[2], 10) - 1;
            var y = parseInt(m1[3], 10);
            var dt = new Date(y, m, d);
            if (!isNaN(dt.getTime()))
                return dt;
        }
        var m2 = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (m2) {
            var y = parseInt(m2[1], 10);
            var m = parseInt(m2[2], 10) - 1;
            var d = parseInt(m2[3], 10);
            var dt = new Date(y, m, d);
            if (!isNaN(dt.getTime()))
                return dt;
        }
        return null;
    };
    return BuildingService;
}());
var ColorHelper = (function () {
    function ColorHelper() {
    }
    ColorHelper.getColorVector = function (c) {
        return createVector(red(c), green(c), blue(c));
    };
    ColorHelper.rainbowColorBase = function () {
        return [
            color('red'),
            color('orange'),
            color('yellow'),
            color('green'),
            color(38, 58, 150),
            color('indigo'),
            color('violet')
        ];
    };
    ColorHelper.getColorsArray = function (total, baseColorArray) {
        var _this = this;
        if (baseColorArray === void 0) { baseColorArray = null; }
        if (baseColorArray == null) {
            baseColorArray = ColorHelper.rainbowColorBase();
        }
        var rainbowColors = baseColorArray.map(function (x) { return _this.getColorVector(x); });
        ;
        var colours = new Array();
        for (var i = 0; i < total; i++) {
            var colorPosition = i / total;
            var scaledColorPosition = colorPosition * (rainbowColors.length - 1);
            var colorIndex = Math.floor(scaledColorPosition);
            var colorPercentage = scaledColorPosition - colorIndex;
            var nameColor = this.getColorByPercentage(rainbowColors[colorIndex], rainbowColors[colorIndex + 1], colorPercentage);
            colours.push(color(nameColor.x, nameColor.y, nameColor.z));
        }
        return colours;
    };
    ColorHelper.getColorByPercentage = function (firstColor, secondColor, percentage) {
        var firstColorCopy = firstColor.copy();
        var secondColorCopy = secondColor.copy();
        var deltaColor = secondColorCopy.sub(firstColorCopy);
        var scaledDeltaColor = deltaColor.mult(percentage);
        return firstColorCopy.add(scaledDeltaColor);
    };
    return ColorHelper;
}());
var PolygonHelper = (function () {
    function PolygonHelper() {
    }
    PolygonHelper.draw = function (numberOfSides, width) {
        push();
        var angle = TWO_PI / numberOfSides;
        var radius = width / 2;
        beginShape();
        for (var a = 0; a < TWO_PI; a += angle) {
            var sx = cos(a) * radius;
            var sy = sin(a) * radius;
            vertex(sx, sy);
        }
        endShape(CLOSE);
        pop();
    };
    return PolygonHelper;
}());
var WeatherService = (function () {
    function WeatherService() {
    }
    WeatherService.fetchCurrent = function (lang) {
        if (lang === void 0) { lang = 'en'; }
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function () {
            var url, response, json, temperatureC, tempRecordTime, temperatureStations, _i, _g, item, place, value, hkoStation, values, relativeHumidity, humRecordTime, h, uvIndex, u, windSpeedKmh, windDirectionDeg, windBlock, w0, sp, dir, visibilityKm, visBlock, iconCodes;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        url = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=" + lang;
                        return [4, fetch(url, { cache: 'no-store' })];
                    case 1:
                        response = _h.sent();
                        return [4, response.json()];
                    case 2:
                        json = (_h.sent());
                        temperatureC = null;
                        tempRecordTime = null;
                        temperatureStations = [];
                        if (json.temperature && Array.isArray(json.temperature.data) && json.temperature.data.length > 0) {
                            tempRecordTime = json.temperature.recordTime || null;
                            for (_i = 0, _g = json.temperature.data; _i < _g.length; _i++) {
                                item = _g[_i];
                                place = item.place || '';
                                value = typeof item.value === 'number' ? item.value : NaN;
                                if (place && !isNaN(value)) {
                                    temperatureStations.push({ place: place, value: value });
                                }
                            }
                            hkoStation = json.temperature.data.find(function (x) { return (x.place || '').toLowerCase() === 'hong kong observatory'; });
                            if (hkoStation && typeof hkoStation.value === 'number') {
                                temperatureC = hkoStation.value;
                            }
                            else {
                                values = json.temperature.data.map(function (x) { return x.value; }).filter(function (v) { return typeof v === 'number'; });
                                if (values.length > 0) {
                                    temperatureC = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
                                }
                            }
                        }
                        relativeHumidity = null;
                        humRecordTime = null;
                        if (json.humidity && Array.isArray(json.humidity.data) && json.humidity.data.length > 0) {
                            humRecordTime = json.humidity.recordTime || null;
                            h = json.humidity.data[0];
                            if (typeof h.value === 'number') {
                                relativeHumidity = h.value;
                            }
                        }
                        uvIndex = null;
                        if (json.uvindex && Array.isArray(json.uvindex.data) && json.uvindex.data.length > 0) {
                            u = json.uvindex.data[0];
                            if (typeof u.value === 'number')
                                uvIndex = u.value;
                            if (typeof u.uvindex === 'number')
                                uvIndex = u.uvindex;
                        }
                        windSpeedKmh = null;
                        windDirectionDeg = null;
                        windBlock = json.wind;
                        if (windBlock && Array.isArray(windBlock.data) && windBlock.data.length > 0) {
                            w0 = windBlock.data[0];
                            sp = (_c = (_b = (_a = w0.speed) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : w0.speed) !== null && _c !== void 0 ? _c : null;
                            dir = (_f = (_e = (_d = w0.direction) === null || _d === void 0 ? void 0 : _d.value) !== null && _e !== void 0 ? _e : w0.direction) !== null && _f !== void 0 ? _f : null;
                            if (typeof sp === 'number')
                                windSpeedKmh = sp;
                            if (typeof dir === 'number')
                                windDirectionDeg = dir;
                        }
                        visibilityKm = null;
                        visBlock = json.visibility;
                        if (visBlock && typeof visBlock.value === 'number') {
                            visibilityKm = visBlock.value;
                        }
                        iconCodes = Array.isArray(json.icon) ? json.icon : [];
                        return [2, {
                                temperatureC: temperatureC,
                                relativeHumidity: relativeHumidity,
                                uvIndex: uvIndex,
                                iconCodes: iconCodes,
                                recordTime: tempRecordTime || humRecordTime,
                                updateTime: json.updateTime || null,
                                temperatureStations: temperatureStations,
                                windSpeedKmh: windSpeedKmh,
                                windDirectionDeg: windDirectionDeg,
                                visibilityKm: visibilityKm
                            }];
                }
            });
        });
    };
    WeatherService.fetchRadiationReport = function (dateYYYYMMDD, lang) {
        if (lang === void 0) { lang = 'en'; }
        return __awaiter(this, void 0, void 0, function () {
            var primaryDate, result, yesterday;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        primaryDate = dateYYYYMMDD || WeatherService.formatTodayYYYYMMDD();
                        return [4, WeatherService.fetchRadiationOnce(primaryDate, lang)];
                    case 1:
                        result = _a.sent();
                        if (!(!result || !result.locations || result.locations.length === 0)) return [3, 3];
                        yesterday = WeatherService.formatDaysAgoYYYYMMDD(1);
                        return [4, WeatherService.fetchRadiationOnce(yesterday, lang)];
                    case 2:
                        result = _a.sent();
                        _a.label = 3;
                    case 3: return [2, result];
                }
            });
        });
    };
    WeatherService.fetchRadiationOnce = function (dateYYYYMMDD, lang) {
        return __awaiter(this, void 0, void 0, function () {
            var url, response, json, locations, valueKeys, _i, valueKeys_1, k, base, nameKey, name_1, sv, numeric, min, max, avg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = "https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?dataType=RYES&lang=" + lang + "&date=" + dateYYYYMMDD;
                        return [4, fetch(url, { cache: 'no-store' })];
                    case 1:
                        response = _a.sent();
                        return [4, response.json()];
                    case 2:
                        json = _a.sent();
                        if (!json || typeof json !== 'object') {
                            return [2, { bulletinDate: null, bulletinTime: null, reportDate: null, desc: null, locations: [], min: null, max: null, avg: null }];
                        }
                        locations = [];
                        valueKeys = Object.keys(json).filter(function (k) { return /Microsieverts$/i.test(k); });
                        for (_i = 0, valueKeys_1 = valueKeys; _i < valueKeys_1.length; _i++) {
                            k = valueKeys_1[_i];
                            base = k.replace(/Microsieverts$/i, '');
                            nameKey = base + "LocationName";
                            name_1 = json[nameKey] || WeatherService.splitCamelCase(base);
                            sv = parseFloat(json[k]);
                            locations.push({ name: name_1, microsieverts: isNaN(sv) ? null : sv });
                        }
                        numeric = locations.map(function (l) { return l.microsieverts; }).filter(function (v) { return typeof v === 'number'; });
                        min = numeric.length ? Math.min.apply(Math, numeric) : null;
                        max = numeric.length ? Math.max.apply(Math, numeric) : null;
                        avg = numeric.length ? numeric.reduce(function (a, b) { return a + b; }, 0) / numeric.length : null;
                        return [2, {
                                bulletinDate: json['BulletinDate'] || null,
                                bulletinTime: json['BulletinTime'] || null,
                                reportDate: json['ReportTimeInfoDate'] || null,
                                desc: json['HongKongDesc'] || null,
                                locations: locations,
                                min: min,
                                max: max,
                                avg: avg
                            }];
                }
            });
        });
    };
    WeatherService.formatTodayYYYYMMDD = function () {
        var d = new Date();
        var y = d.getFullYear();
        var m = (d.getMonth() + 1).toString().padStart(2, '0');
        var day = d.getDate().toString().padStart(2, '0');
        return "" + y + m + day;
    };
    WeatherService.formatDaysAgoYYYYMMDD = function (days) {
        var d = new Date();
        d.setDate(d.getDate() - days);
        var y = d.getFullYear();
        var m = (d.getMonth() + 1).toString().padStart(2, '0');
        var day = d.getDate().toString().padStart(2, '0');
        return "" + y + m + day;
    };
    WeatherService.splitCamelCase = function (s) {
        return s.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    };
    return WeatherService;
}());
var points = [];
var totalPoints = 5000;
var noiseMultiplier = 0.01;
var direction = 'left';
var noiseSeedCount = 0;
var currentTempC = null;
var windSpeedKmh = 8;
var windDirectionDeg = 90;
var REFRESH_INTERVAL_MS = 5 * 60 * 1000;
function setup() {
    createCanvas(windowWidth, windowHeight);
    for (var i = 0; i < totalPoints; i++) {
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
function fetchWeather() {
    return __awaiter(this, void 0, void 0, function () {
        var data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4, WeatherService.fetchCurrent('en')];
                case 1:
                    data = _a.sent();
                    currentTempC = data.temperatureC;
                    if (typeof data.windSpeedKmh === 'number')
                        windSpeedKmh = data.windSpeedKmh;
                    if (typeof data.windDirectionDeg === 'number')
                        windDirectionDeg = data.windDirectionDeg;
                    return [3, 3];
                case 2:
                    e_1 = _a.sent();
                    console.error('Failed to fetch weather', e_1);
                    return [3, 3];
                case 3: return [2];
            }
        });
    });
}
function draw() {
    stroke(255);
    background(10, 10, 50, 5);
    var step = map(windSpeedKmh, 0, 60, 0.4, 3.5);
    var toDeg = (windDirectionDeg + 180) % 360;
    var toRad = radians(toDeg);
    var bias = atan2(-cos(toRad), sin(toRad));
    for (var i = 0; i < totalPoints; i++) {
        var p = points[i];
        stroke(255);
        point(p.x, p.y);
        noStroke();
        fill(p.x % 255, p.y % 255, (p.z || 0) * 55, 40);
        circle(p.x, p.y, (p.z || 0));
        var n = noise(p.x * noiseMultiplier, p.y * noiseMultiplier);
        var angle = TWO_PI * n + bias;
        if (direction === 'left') {
            p.x += cos(angle) * step;
            p.y += sin(angle) * step;
            p.z = (p.z || 0) + 0.02 * step;
        }
        else {
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
    var delay = random(5000, 15000);
    setTimeout(function () {
        direction = direction === 'left' ? 'right' : 'left';
        noiseSeedCount += 1;
        noiseSeed(noiseSeedCount);
        scheduleDirectionToggle();
    }, delay);
}
function outOfCanvas(item) {
    return item.x < 0 || item.y < 0 || item.y > height || item.x > width;
}
function drawTemperatureTopRight() {
    push();
    var t = typeof currentTempC === 'number' ? currentTempC.toFixed(1) + "\u00B0C" : '--°C';
    textAlign(RIGHT, TOP);
    textSize(min(width, height) * 0.06);
    fill(255);
    noStroke();
    text(t, width - 20, 20);
    pop();
}
function drawWindBottomInfo() {
    var dirCompassFrom = degToCompass(windDirectionDeg);
    var toDeg = (windDirectionDeg + 180 + 360) % 360;
    var dirCompassTo = degToCompass(toDeg);
    var speed = Math.round(windSpeedKmh);
    var label = "Wind: from " + dirCompassFrom + " (" + Math.round(windDirectionDeg) + "\u00B0) \u2192 to " + dirCompassTo + " (" + Math.round(toDeg) + "\u00B0) \u2022 Mean " + speed + " km/h";
    push();
    noStroke();
    var pad = 16;
    textSize(min(width, height) * 0.028);
    var tw = textWidth(label);
    var th = textAscent() + textDescent();
    fill(0, 0, 0, 120);
    rectMode(CENTER);
    rect(width / 2, height - (th + pad * 1.2), tw + pad * 2, th + pad, 12);
    fill(255);
    textAlign(CENTER, CENTER);
    text(label, width / 2, height - (th + pad * 1.2));
    pop();
}
function degToCompass(deg) {
    var dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    var i = Math.round(((deg % 360) / 22.5)) % 16;
    return dirs[i < 0 ? i + 16 : i];
}
//# sourceMappingURL=build.js.map
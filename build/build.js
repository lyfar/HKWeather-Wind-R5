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
(function () {
    var MapStyle = {
        config: {
            tileFilter: 'grayscale(1) brightness(0.70) contrast(1.10) saturate(0.20)',
            darkOverlayOpacity: 0.18,
            topoOpacity: 0.45,
            labelOpacity: 0.1,
            topoUrl: 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png',
            labelsUrl: 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/en/WGS84/{z}/{x}/{y}.png',
            updateWhenZooming: false,
            updateWhenIdle: true,
            maxZoom: 20,
        },
        applyCssFilters: function () {
            try {
                var id = 'map-style-override';
                var el = document.getElementById(id);
                if (!el) {
                    el = document.createElement('style');
                    el.id = id;
                    document.head.appendChild(el);
                }
                el.textContent = "#map .leaflet-tile { filter: " + MapStyle.config.tileFilter + " !important; }";
            }
            catch (_a) { }
            try {
                var overlay = document.getElementById('dark-overlay');
                if (overlay) {
                    overlay.style.background = "rgba(0,0,0," + MapStyle.config.darkOverlayOpacity + ")";
                }
            }
            catch (_b) { }
        },
        createBaseLayers: function () {
            var Lref = window.L;
            var optsBase = {
                maxZoom: MapStyle.config.maxZoom,
                crossOrigin: true,
                opacity: MapStyle.config.topoOpacity,
                updateWhenZooming: MapStyle.config.updateWhenZooming,
                updateWhenIdle: MapStyle.config.updateWhenIdle,
            };
            var topo = Lref.tileLayer(MapStyle.config.topoUrl, optsBase);
            var labels = Lref.tileLayer(MapStyle.config.labelsUrl, {
                maxZoom: MapStyle.config.maxZoom,
                crossOrigin: true,
                opacity: MapStyle.config.labelOpacity,
            });
            return { topo: topo, labels: labels };
        },
        setLayerOpacities: function (layers) {
            try {
                layers.topo.setOpacity(MapStyle.config.topoOpacity);
            }
            catch (_a) { }
            try {
                layers.labels.setOpacity(MapStyle.config.labelOpacity);
            }
            catch (_b) { }
        }
    };
    window.MapStyle = MapStyle;
})();
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var WindStationsService = (function () {
    function WindStationsService() {
    }
    WindStationsService.fetchPreferredSample = function (preferStations) {
        if (preferStations === void 0) { preferStations = [
            'Central Pier',
            'Star Ferry',
            "King's Park",
            'Kai Tak'
        ]; }
        return __awaiter(this, void 0, void 0, function () {
            var jsonRes, data, features, stationToUrl, _i, features_1, f, props, name_2, url, candidates, _a, candidates_1, station, csvUrl, sample, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 7, , 8]);
                        return [4, fetch('./latest_10min_wind.json', { cache: 'no-store' })];
                    case 1:
                        jsonRes = _c.sent();
                        return [4, jsonRes.json()];
                    case 2:
                        data = _c.sent();
                        features = (data === null || data === void 0 ? void 0 : data.features) || [];
                        if (!features.length)
                            return [2, null];
                        stationToUrl = new Map();
                        for (_i = 0, features_1 = features; _i < features_1.length; _i++) {
                            f = features_1[_i];
                            props = (f === null || f === void 0 ? void 0 : f.properties) || {};
                            name_2 = props['AutomaticWeatherStation_en'];
                            url = props['Data_url'];
                            if (name_2 && url)
                                stationToUrl.set(name_2, url);
                        }
                        candidates = __spreadArrays(preferStations, Array.from(stationToUrl.keys()).filter(function (s) { return !preferStations.includes(s); }));
                        _a = 0, candidates_1 = candidates;
                        _c.label = 3;
                    case 3:
                        if (!(_a < candidates_1.length)) return [3, 6];
                        station = candidates_1[_a];
                        csvUrl = stationToUrl.get(station);
                        if (!csvUrl)
                            return [3, 5];
                        return [4, WindStationsService.fetchStationCsv(csvUrl, station)];
                    case 4:
                        sample = _c.sent();
                        if (sample)
                            return [2, sample];
                        _c.label = 5;
                    case 5:
                        _a++;
                        return [3, 3];
                    case 6: return [2, null];
                    case 7:
                        _b = _c.sent();
                        return [2, null];
                    case 8: return [2];
                }
            });
        });
    };
    WindStationsService.fetchByUrl = function (csvUrl, stationName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, WindStationsService.fetchStationCsv(csvUrl, stationName)];
            });
        });
    };
    WindStationsService.fetchAllFromList = function (list, limit) {
        if (limit === void 0) { limit = 8; }
        return __awaiter(this, void 0, void 0, function () {
            var out, i, s, sample, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        out = [];
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < list.length)) return [3, 8];
                        s = list[i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4, WindStationsService.fetchStationCsv(s.url, s.name)];
                    case 3:
                        sample = _b.sent();
                        if (sample)
                            out.push(sample);
                        return [3, 5];
                    case 4:
                        _a = _b.sent();
                        return [3, 5];
                    case 5:
                        if (out.length >= limit)
                            return [3, 8];
                        return [4, new Promise(function (r) { return setTimeout(r, 150); })];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        i++;
                        return [3, 1];
                    case 8: return [2, out];
                }
            });
        });
    };
    WindStationsService.fetchStationCsv = function (csvUrl, station) {
        return __awaiter(this, void 0, void 0, function () {
            var text_1, proxyTemplates, cacheKey_1, now, cached, _loop_1, _i, proxyTemplates_1, fmt, state_1, lines, header, idxStation, idxDir, idxSpeed, idxGust, row, st, dirText, spText, gustText, meanSpeedKmh, meanDirDeg, gustKmh, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        text_1 = null;
                        proxyTemplates = [
                            function (u) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u); },
                            function (u) { return "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u); },
                        ];
                        cacheKey_1 = "ws_csv:" + csvUrl;
                        now = Date.now();
                        cached = (function () { try {
                            return JSON.parse(localStorage.getItem(cacheKey_1) || 'null');
                        }
                        catch (_a) {
                            return null;
                        } })();
                        if (cached && typeof cached.text === 'string' && typeof cached.t === 'number' && (now - cached.t) < 10 * 60 * 1000) {
                            text_1 = cached.text;
                        }
                        if (!(text_1 == null)) return [3, 4];
                        _loop_1 = function (fmt) {
                            var url, controller_1, timer, res, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        url = fmt(csvUrl);
                                        _b.label = 1;
                                    case 1:
                                        _b.trys.push([1, 4, , 5]);
                                        controller_1 = new AbortController();
                                        timer = setTimeout(function () { return controller_1.abort(); }, 4500);
                                        return [4, fetch(url, { cache: 'no-store', signal: controller_1.signal })];
                                    case 2:
                                        res = _b.sent();
                                        clearTimeout(timer);
                                        if (!res.ok)
                                            return [2, "continue"];
                                        return [4, res.text()];
                                    case 3:
                                        text_1 = _b.sent();
                                        try {
                                            localStorage.setItem(cacheKey_1, JSON.stringify({ t: now, text: text_1 }));
                                        }
                                        catch (_c) { }
                                        return [2, "break"];
                                    case 4:
                                        _a = _b.sent();
                                        return [3, 5];
                                    case 5: return [2];
                                }
                            });
                        };
                        _i = 0, proxyTemplates_1 = proxyTemplates;
                        _b.label = 1;
                    case 1:
                        if (!(_i < proxyTemplates_1.length)) return [3, 4];
                        fmt = proxyTemplates_1[_i];
                        return [5, _loop_1(fmt)];
                    case 2:
                        state_1 = _b.sent();
                        if (state_1 === "break")
                            return [3, 4];
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3, 1];
                    case 4:
                        if (text_1 == null)
                            return [2, null];
                        lines = text_1.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
                        if (lines.length < 2)
                            return [2, null];
                        header = WindStationsService.splitCsvLine(lines[0]).map(function (h) { return h.trim(); });
                        idxStation = WindStationsService.findIndex(header, 'Automatic Weather Station');
                        idxDir = WindStationsService.findIndex(header, '10-Minute Mean Wind Direction(Compass points)');
                        idxSpeed = WindStationsService.findIndex(header, '10-Minute Mean Speed(km/hour)');
                        idxGust = WindStationsService.findIndex(header, '10-Minute Maximum Gust(km/hour)');
                        row = WindStationsService.splitCsvLine(lines[1]);
                        st = idxStation >= 0 ? row[idxStation] : station;
                        dirText = idxDir >= 0 ? row[idxDir] : '';
                        spText = idxSpeed >= 0 ? row[idxSpeed] : '';
                        gustText = idxGust >= 0 ? row[idxGust] : '';
                        meanSpeedKmh = parseFloat(spText);
                        meanDirDeg = WindStationsService.directionTextToDeg(dirText);
                        gustKmh = parseFloat(gustText);
                        if (!isFinite(meanSpeedKmh) || !isFinite(meanDirDeg))
                            return [2, null];
                        return [2, { station: st || station, meanSpeedKmh: meanSpeedKmh, meanDirDeg: meanDirDeg, gustKmh: isFinite(gustKmh) ? gustKmh : undefined }];
                    case 5:
                        _a = _b.sent();
                        return [2, null];
                    case 6: return [2];
                }
            });
        });
    };
    WindStationsService.findIndex = function (header, name) {
        var norm = function (s) { return s.toLowerCase().replace(/\s+/g, ''); };
        var target = norm(name);
        for (var i = 0; i < header.length; i++) {
            if (norm(header[i]) === target)
                return i;
        }
        return -1;
    };
    WindStationsService.splitCsvLine = function (line) {
        var out = [];
        var cur = '';
        var q = false;
        for (var i = 0; i < line.length; i++) {
            var ch = line[i];
            if (q) {
                if (ch === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        cur += '"';
                        i++;
                    }
                    else {
                        q = false;
                    }
                }
                else
                    cur += ch;
            }
            else {
                if (ch === '"')
                    q = true;
                else if (ch === ',') {
                    out.push(cur);
                    cur = '';
                }
                else
                    cur += ch;
            }
        }
        out.push(cur);
        return out;
    };
    WindStationsService.directionTextToDeg = function (text) {
        var _a;
        if (!text)
            return NaN;
        var t = text.toLowerCase().replace(/\s+/g, '');
        var map = {
            n: 0, nne: 22.5, ne: 45, ene: 67.5, e: 90, ese: 112.5, se: 135, sse: 157.5,
            s: 180, ssw: 202.5, sw: 225, wsw: 247.5, w: 270, wnw: 292.5, nw: 315, nnw: 337.5,
            north: 0, northnortheast: 22.5, northeast: 45, eastnortheast: 67.5,
            east: 90, eastsoutheast: 112.5, southeast: 135, southsoutheast: 157.5,
            south: 180, southsouthwest: 202.5, southwest: 225, westsouthwest: 247.5,
            west: 270, westnorthwest: 292.5, northwest: 315, northnorthwest: 337.5,
            calm: NaN, variable: NaN, 'n/a': NaN
        };
        return (_a = map[t]) !== null && _a !== void 0 ? _a : NaN;
    };
    return WindStationsService;
}());
var points = [];
var totalPoints = 5000;
var activePoints = 0;
var rampStartMs = 0;
var RAMP_DURATION_MS = 4500;
var noiseMultiplier = 0.01;
var currentTempC = null;
var windSpeedKmhTarget = NaN;
var windDirectionDegTarget = NaN;
var windSpeedKmhCurrent = NaN;
var windDirectionDegCurrent = NaN;
var lastWeatherUpdateMs = 0;
var currentStationName = 'Hong Kong';
var stationList = [];
var stationIdx = -1;
var switcherRect = null;
var locateRect = null;
var multiStationSamples = [];
var STATION_SAMPLES_LIMIT = 30;
var STATION_FETCH_DELAY_MS = 120;
var stationEmitters = new Map();
var hkGeojson = null;
var hkPolygonsScreen = [];
var hullDirty = true;
var mapLayer = null;
var mapLayerDirty = true;
var stationScreenCache = [];
var stationCacheDirty = true;
var flowGridDirty = true;
var flowGrid = null;
var densityGrid = null;
var DENSITY_DECAY = 0.92;
var MAX_DENSIFY_PER_FRAME = 28;
function clearStationEmitters() { stationEmitters.forEach(function (e) { return e.particles = []; }); }
function addStationToMap(lat, lon, name, speed, dirDeg) {
    try {
        var anyWin = window;
        if (!(anyWin === null || anyWin === void 0 ? void 0 : anyWin.leafletMap) || !(anyWin === null || anyWin === void 0 ? void 0 : anyWin.stationMarkers))
            return;
        var isTouch = (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
        var compassDir = degToCompass(dirDeg);
        var r = isTouch ? 9 : 4;
        var marker_1 = window.L.circleMarker([lat, lon], {
            radius: r,
            fillColor: '#333',
            color: '#666',
            weight: isTouch ? 2 : 1,
            opacity: 0.9,
            fillOpacity: 0.75,
            bubblingMouseEvents: true
        });
        var html = name + "<br/>" + Math.round(speed) + " km/h \u2022 " + compassDir + " (" + Math.round(dirDeg) + "\u00B0)";
        marker_1.bindTooltip(html, {
            permanent: false,
            direction: 'top',
            className: 'station-tooltip',
            sticky: true
        });
        marker_1.bindPopup(html, { closeButton: true });
        marker_1.on('click', function () { return marker_1.openPopup(); });
        anyWin.stationMarkers.addLayer(marker_1);
    }
    catch (e) {
        console.error('Failed to add station marker:', e);
    }
}
function lonLatToScreen(lon, lat) {
    try {
        var anyWin = window;
        if (anyWin && anyWin.leafletMap && typeof anyWin.leafletMap.latLngToContainerPoint === 'function') {
            var pt = anyWin.leafletMap.latLngToContainerPoint({ lat: lat, lng: lon });
            var container = anyWin.leafletMap.getContainer ? anyWin.leafletMap.getContainer() : null;
            if (container && container.getBoundingClientRect) {
                var rect_1 = container.getBoundingClientRect();
                return { x: pt.x + rect_1.left, y: pt.y + rect_1.top };
            }
            return { x: pt.x, y: pt.y };
        }
    }
    catch (_a) { }
    return {
        x: map(lon, 113.85, 114.36, 40, width - 40),
        y: map(lat, 22.17, 22.56, height - 80, 80)
    };
}
var SmokeParticle = (function () {
    function SmokeParticle(x, y, vx, vy, size, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.size = size;
    }
    SmokeParticle.prototype.update = function (dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.992;
        this.vy *= 0.992;
        this.life -= 1.6 * dt;
    };
    SmokeParticle.prototype.draw = function () {
        noStroke();
        var alpha = constrain(this.life, 0, 60);
        fill(0, 0, 85, alpha);
        circle(this.x, this.y, this.size);
    };
    SmokeParticle.prototype.dead = function () { return this.life <= 0; };
    return SmokeParticle;
}());
var REFRESH_INTERVAL_MS = 30 * 1000;
function setup() {
    var _a;
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);
    colorMode(HSB, 360, 100, 100, 100);
    totalPoints = constrain(Math.floor(windowWidth * windowHeight * 0.0032), 5000, 12000);
    mapLayer = createGraphics(windowWidth, windowHeight);
    mapLayer.pixelDensity(1);
    rampStartMs = millis();
    activePoints = Math.min(totalPoints, Math.max(800, Math.floor(totalPoints * 0.12)));
    try {
        ((_a = document.querySelector('canvas')) === null || _a === void 0 ? void 0 : _a.style) && (document.querySelector('canvas').style.zIndex = '10');
        try {
            (document.querySelector('canvas').style.pointerEvents = 'none');
        }
        catch (_b) { }
        document.addEventListener('mousemove', function (e) {
            window.__mouseClient = { x: e.clientX, y: e.clientY };
        }, { passive: true });
        window.clearStationEmitters = clearStationEmitters;
    }
    catch (_c) { }
    for (var i = 0; i < totalPoints; i++) {
        var v = createVector(random(width), random(height));
        v.vx = cos(random(TWO_PI));
        v.vy = sin(random(TWO_PI));
        points.push(v);
    }
    fetchWeather();
    loadStationList().then(function () {
        var def = stationList.findIndex(function (s) { return (s.name || '').toLowerCase() === 'central pier'; });
        stationIdx = -1;
        fetchStationWind();
        fetchStationsProgressive();
        loadMinimalMapGeo();
    });
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
function fetchStationWind() {
    return __awaiter(this, void 0, void 0, function () {
        var sample, st, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    if (stationIdx === -1) {
                        currentStationName = 'Hong Kong';
                        return [2];
                    }
                    sample = null;
                    if (!(stationIdx >= 0 && stationIdx < stationList.length)) return [3, 2];
                    st = stationList[stationIdx];
                    currentStationName = st.name;
                    return [4, WindStationsService.fetchByUrl(st.url, st.name)];
                case 1:
                    sample = _a.sent();
                    _a.label = 2;
                case 2:
                    if (!!sample) return [3, 4];
                    return [4, WindStationsService.fetchPreferredSample()];
                case 3:
                    sample = _a.sent();
                    _a.label = 4;
                case 4:
                    if (sample && isFinite(sample.meanSpeedKmh) && isFinite(sample.meanDirDeg)) {
                        currentStationName = sample.station || currentStationName;
                        windSpeedKmhTarget = sample.meanSpeedKmh;
                        windDirectionDegTarget = sample.meanDirDeg;
                        if (isNaN(windSpeedKmhCurrent))
                            windSpeedKmhCurrent = windSpeedKmhTarget;
                        if (isNaN(windDirectionDegCurrent))
                            windDirectionDegCurrent = windDirectionDegTarget;
                        stationCacheDirty = true;
                        flowGridDirty = true;
                    }
                    return [3, 6];
                case 5:
                    e_1 = _a.sent();
                    return [3, 6];
                case 6: return [2];
            }
        });
    });
}
function fetchStationsProgressive() {
    return __awaiter(this, void 0, void 0, function () {
        var preferred_1, sorted, anyWin, limit, added, BATCH, i, chunk, results, j, sample, m, _a;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, , 7]);
                    if (!stationList.length)
                        return [2];
                    preferred_1 = ['central pier', 'star ferry', "king's park", 'kai tak'];
                    sorted = __spreadArrays(stationList).sort(function (a, b) {
                        var ai = preferred_1.indexOf((a.name || '').toLowerCase());
                        var bi = preferred_1.indexOf((b.name || '').toLowerCase());
                        var aw = ai === -1 ? 999 : ai;
                        var bw = bi === -1 ? 999 : bi;
                        return aw - bw;
                    });
                    multiStationSamples = [];
                    try {
                        anyWin = window;
                        if (anyWin === null || anyWin === void 0 ? void 0 : anyWin.stationMarkers)
                            anyWin.stationMarkers.clearLayers();
                    }
                    catch (_c) { }
                    limit = Math.min(STATION_SAMPLES_LIMIT, stationList.length);
                    added = 0;
                    BATCH = 5;
                    i = 0;
                    _b.label = 1;
                case 1:
                    if (!(i < sorted.length && added < limit)) return [3, 5];
                    chunk = sorted.slice(i, i + BATCH);
                    return [4, Promise.all(chunk.map(function (m) { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        return [4, WindStationsService.fetchByUrl(m.url, m.name)];
                                    case 1: return [2, _b.sent()];
                                    case 2:
                                        _a = _b.sent();
                                        return [2, null];
                                    case 3: return [2];
                                }
                            });
                        }); }))];
                case 2:
                    results = _b.sent();
                    for (j = 0; j < results.length && added < limit; j++) {
                        sample = results[j];
                        m = chunk[j];
                        if (sample && isFinite(sample.meanSpeedKmh) && isFinite(sample.meanDirDeg)) {
                            multiStationSamples.push({ lat: m.lat, lon: m.lon, speed: sample.meanSpeedKmh, dirDeg: sample.meanDirDeg, name: sample.station });
                            addStationToMap(m.lat, m.lon, sample.station, sample.meanSpeedKmh, sample.meanDirDeg);
                            added++;
                            stationCacheDirty = true;
                            flowGridDirty = true;
                        }
                    }
                    return [4, new Promise(function (r) { return setTimeout(r, STATION_FETCH_DELAY_MS); })];
                case 3:
                    _b.sent();
                    if (added >= limit)
                        return [3, 5];
                    _b.label = 4;
                case 4:
                    i += BATCH;
                    return [3, 1];
                case 5: return [3, 7];
                case 6:
                    _a = _b.sent();
                    return [3, 7];
                case 7: return [2];
            }
        });
    });
}
function loadStationList() {
    return __awaiter(this, void 0, void 0, function () {
        var res, data, features, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4, fetch('./latest_10min_wind.json', { cache: 'no-store' })];
                case 1:
                    res = _b.sent();
                    return [4, res.json()];
                case 2:
                    data = _b.sent();
                    features = (data === null || data === void 0 ? void 0 : data.features) || [];
                    stationList = features
                        .map(function (f) {
                        var _a, _b, _c, _d;
                        return ({
                            name: (_a = f === null || f === void 0 ? void 0 : f.properties) === null || _a === void 0 ? void 0 : _a.AutomaticWeatherStation_en,
                            url: (_b = f === null || f === void 0 ? void 0 : f.properties) === null || _b === void 0 ? void 0 : _b.Data_url,
                            lon: Array.isArray((_c = f === null || f === void 0 ? void 0 : f.geometry) === null || _c === void 0 ? void 0 : _c.coordinates) ? Number(f.geometry.coordinates[0]) : NaN,
                            lat: Array.isArray((_d = f === null || f === void 0 ? void 0 : f.geometry) === null || _d === void 0 ? void 0 : _d.coordinates) ? Number(f.geometry.coordinates[1]) : NaN
                        });
                    })
                        .filter(function (s) { return s.name && s.url && isFinite(s.lat) && isFinite(s.lon); });
                    return [3, 4];
                case 3:
                    _a = _b.sent();
                    return [3, 4];
                case 4:
                    hullDirty = true;
                    return [2];
            }
        });
    });
}
function fetchWeather() {
    return __awaiter(this, void 0, void 0, function () {
        var data, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4, WeatherService.fetchCurrent('en')];
                case 1:
                    data = _a.sent();
                    currentTempC = data.temperatureC;
                    if (typeof data.windSpeedKmh === 'number')
                        windSpeedKmhTarget = data.windSpeedKmh;
                    if (typeof data.windDirectionDeg === 'number')
                        windDirectionDegTarget = data.windDirectionDeg;
                    lastWeatherUpdateMs = millis();
                    noiseSeed(Math.floor(Date.now() / 60000));
                    if (frameCount < 2) {
                        windSpeedKmhCurrent = windSpeedKmhTarget;
                        windDirectionDegCurrent = windDirectionDegTarget;
                    }
                    stationCacheDirty = true;
                    flowGridDirty = true;
                    return [3, 3];
                case 2:
                    e_2 = _a.sent();
                    console.error('Failed to fetch weather', e_2);
                    return [3, 3];
                case 3: return [2];
            }
        });
    });
}
function draw() {
    clear();
    var dt = deltaTime / 16.6667;
    var tRamp = constrain((millis() - rampStartMs) / RAMP_DURATION_MS, 0, 1);
    var easeOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };
    var targetCount = Math.floor(totalPoints * easeOutCubic(tRamp));
    if (targetCount > activePoints)
        activePoints = targetCount;
    if (isNaN(windSpeedKmhCurrent) && !isNaN(windSpeedKmhTarget))
        windSpeedKmhCurrent = windSpeedKmhTarget;
    if (isNaN(windDirectionDegCurrent) && !isNaN(windDirectionDegTarget))
        windDirectionDegCurrent = windDirectionDegTarget;
    var k = 0.25 * dt;
    if (!isNaN(windSpeedKmhTarget) && !isNaN(windSpeedKmhCurrent)) {
        if (abs(windSpeedKmhTarget - windSpeedKmhCurrent) > 3) {
            windSpeedKmhCurrent = windSpeedKmhTarget;
        }
        else {
            windSpeedKmhCurrent += (windSpeedKmhTarget - windSpeedKmhCurrent) * k;
        }
    }
    if (!isNaN(windDirectionDegTarget) && !isNaN(windDirectionDegCurrent)) {
        var d = angleDiffDeg(windDirectionDegCurrent, windDirectionDegTarget);
        if (abs(d) > 20) {
            windDirectionDegCurrent = windDirectionDegTarget;
        }
        else {
            windDirectionDegCurrent = normalizeDeg(windDirectionDegCurrent + d * k);
        }
    }
    var step = (!isNaN(windSpeedKmhCurrent) ? map(windSpeedKmhCurrent, 0, 60, 1.2, 4.8) : 0) * dt;
    var toDeg = (!isNaN(windDirectionDegCurrent) ? (windDirectionDegCurrent + 180) % 360 : 0);
    var toRad = radians(toDeg);
    var bias = atan2(-cos(toRad), sin(toRad));
    var maxTurb = radians(6);
    drawMinimalMap();
    drawStationsBackground();
    var useComposite = (stationIdx === -1 && multiStationSamples.length > 0);
    if (useComposite) {
        updateStationScreenCache();
        rebuildFlowGridIfNeeded();
    }
    decayDensityGrid();
    for (var i = 0; i < activePoints; i++) {
        var p = points[i];
        var t = millis() * 0.00008;
        var n = noise(p.x * noiseMultiplier + t, p.y * noiseMultiplier - t);
        var angle = void 0;
        var stepLocal = void 0;
        var hueLocal = void 0;
        var flowSpeedKmhLocal = windSpeedKmhCurrent;
        if (useComposite) {
            var flow = sampleFlowFromGrid(p.x, p.y);
            angle = flow.angle + (n - 0.5) * radians(6);
            stepLocal = map(flow.speedKmh, 0, 60, 1.2, 4.8) * dt;
            hueLocal = (degrees(flow.angle) + 360) % 360;
            flowSpeedKmhLocal = flow.speedKmh;
        }
        else {
            angle = bias + (n - 0.5) * maxTurb;
            stepLocal = step;
            hueLocal = (toDeg + n * 60) % 360;
        }
        var inertial = 0.08;
        var vx = cos(angle) * stepLocal * (1 - inertial) + (p.vx || 0) * inertial;
        var vy = sin(angle) * stepLocal * (1 - inertial) + (p.vy || 0) * inertial;
        var speedNorm = (!isNaN(flowSpeedKmhLocal) ? map(flowSpeedKmhLocal, 0, 60, 0.3, 3.0) / 3.0 : 0);
        var alpha_1 = 50;
        if (useComposite) {
            var s = sampleFlowFromGrid(p.x, p.y);
            var c = typeof s.consensus === 'number' ? s.consensus : 1;
            alpha_1 = 20 + 40 * constrain(c, 0, 1);
        }
        stroke(hueLocal, 40 + 32 * speedNorm, 100, alpha_1);
        var sw = 0.9 + speedNorm * 1.6;
        strokeWeight(sw);
        line(p.x, p.y, p.x + vx, p.y + vy);
        p.x += vx;
        p.y += vy;
        p.vx = vx;
        p.vy = vy;
        p.z = (p.z || 0) + 0.02 * stepLocal;
        if (outOfCanvas(p)) {
            p.z = 0;
        }
        accumulateDensityAt(p.x, p.y);
    }
    drawTemperatureTopRight();
    drawTopLeftClock();
    drawStationSwitcherBottomLeft();
    emitFromEdges(48);
    densifySparseCells(MAX_DENSIFY_PER_FRAME);
    drawInfoUI();
}
function compositeFlowAt(x, y) {
    if (multiStationSamples.length === 0) {
        var toDeg = (!isNaN(windDirectionDegCurrent) ? (windDirectionDegCurrent + 180) % 360 : 0);
        var toRad = radians(toDeg);
        return { angle: atan2(-cos(toRad), sin(toRad)), speedKmh: isNaN(windSpeedKmhCurrent) ? 0 : windSpeedKmhCurrent };
    }
    var sumWx = 0, sumWy = 0, sumW = 0, sumSpeed = 0;
    var sigma = max(120, min(width, height) * 0.22);
    var invSigma2 = 1 / (sigma * sigma);
    for (var _i = 0, multiStationSamples_1 = multiStationSamples; _i < multiStationSamples_1.length; _i++) {
        var s = multiStationSamples_1[_i];
        var pxy = lonLatToScreen(s.lon, s.lat);
        var sx = pxy.x;
        var sy = pxy.y;
        try {
            var el = document.querySelector('canvas');
            if (el) {
                var rect_2 = el.getBoundingClientRect();
                sx -= rect_2.left;
                sy -= rect_2.top;
            }
        }
        catch (_a) { }
        var dx = x - sx;
        var dy = y - sy;
        var w = Math.exp(-(dx * dx + dy * dy) * invSigma2);
        var toRadS = radians((s.dirDeg + 180) % 360);
        var ang = atan2(-cos(toRadS), sin(toRadS));
        sumWx += Math.cos(ang) * w;
        sumWy += Math.sin(ang) * w;
        sumSpeed += s.speed * w;
        sumW += w;
    }
    if (sumW <= 0) {
        var toDeg = (!isNaN(windDirectionDegCurrent) ? (windDirectionDegCurrent + 180) % 360 : 0);
        var toRad = radians(toDeg);
        return { angle: atan2(-cos(toRad), sin(toRad)), speedKmh: isNaN(windSpeedKmhCurrent) ? 0 : windSpeedKmhCurrent };
    }
    var angle = Math.atan2(sumWy, sumWx);
    var speedKmh = sumSpeed / sumW;
    return { angle: angle, speedKmh: speedKmh };
}
function drawMinimalMap() {
    if (!hkGeojson)
        return;
    if (hullDirty) {
        hkPolygonsScreen = projectGeoToScreen(hkGeojson);
        hullDirty = false;
        mapLayerDirty = true;
    }
    if (!hkPolygonsScreen.length || !mapLayer)
        return;
    if (mapLayerDirty) {
        mapLayer.clear();
        mapLayer.push();
        mapLayer.noStroke();
        mapLayer.fill(230, 12, 25, 6);
        for (var _i = 0, hkPolygonsScreen_1 = hkPolygonsScreen; _i < hkPolygonsScreen_1.length; _i++) {
            var poly = hkPolygonsScreen_1[_i];
            mapLayer.beginShape();
            for (var _a = 0, poly_1 = poly; _a < poly_1.length; _a++) {
                var p = poly_1[_a];
                mapLayer.vertex(p.x, p.y);
            }
            mapLayer.endShape(CLOSE);
        }
        mapLayer.stroke(230, 16, 50, 10);
        mapLayer.strokeWeight(1);
        mapLayer.noFill();
        for (var _b = 0, hkPolygonsScreen_2 = hkPolygonsScreen; _b < hkPolygonsScreen_2.length; _b++) {
            var poly = hkPolygonsScreen_2[_b];
            mapLayer.beginShape();
            for (var _c = 0, poly_2 = poly; _c < poly_2.length; _c++) {
                var p = poly_2[_c];
                mapLayer.vertex(p.x, p.y);
            }
            mapLayer.endShape(CLOSE);
        }
        mapLayer.pop();
        mapLayerDirty = false;
    }
    image(mapLayer, 0, 0);
}
function loadMinimalMapGeo() {
    return __awaiter(this, void 0, void 0, function () {
        var res, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4, fetch('./hong_kong_min.geo.json', { cache: 'no-store' })];
                case 1:
                    res = _b.sent();
                    if (!res.ok)
                        return [2];
                    return [4, res.json()];
                case 2:
                    hkGeojson = _b.sent();
                    hullDirty = true;
                    mapLayerDirty = true;
                    return [3, 4];
                case 3:
                    _a = _b.sent();
                    return [3, 4];
                case 4: return [2];
            }
        });
    });
}
function projectGeoToScreen(geo) {
    var polys = [];
    var toXY = function (lon, lat) { return lonLatToScreen(lon, lat); };
    var addRing = function (coords) {
        var ring = coords.map(function (_a) {
            var lon = _a[0], lat = _a[1];
            return toXY(lon, lat);
        });
        polys.push(ring);
    };
    var feat = geo.type === 'FeatureCollection' ? geo.features : [geo];
    for (var _i = 0, feat_1 = feat; _i < feat_1.length; _i++) {
        var f = feat_1[_i];
        var g = f.type === 'Feature' ? f.geometry : f;
        if (!g)
            continue;
        if (g.type === 'Polygon') {
            addRing(g.coordinates[0]);
        }
        else if (g.type === 'MultiPolygon') {
            for (var _a = 0, _b = g.coordinates; _a < _b.length; _a++) {
                var poly = _b[_a];
                addRing(poly[0]);
            }
        }
    }
    return polys;
}
function emitFromEdges(count) {
    if (count <= 0)
        return;
    var perSide = max(1, Math.floor(count / 4));
    var m = max(20, min(width, height) * 0.03);
    for (var i = 0; i < perSide; i++) {
        var attempts = 6;
        while (attempts-- > 0) {
            var x = random(width);
            var flow = compositeFlowAt(x, height - 1);
            if (sin(flow.angle) < 0) {
                var idx = (frameCount * 97 + i * 131 + attempts) % points.length;
                var p = points[idx];
                p.x = x;
                p.y = height + m - 1;
                p.vx = 0;
                p.vy = 0;
                p.z = 0;
                break;
            }
        }
    }
    for (var i = 0; i < perSide; i++) {
        var attempts = 6;
        while (attempts-- > 0) {
            var x = random(width);
            var flow = sampleFlowFromGrid(x, 1);
            if (sin(flow.angle) > 0) {
                var idx = (frameCount * 193 + i * 151 + attempts) % points.length;
                var p = points[idx];
                p.x = x;
                p.y = -m + 1;
                p.vx = 0;
                p.vy = 0;
                p.z = 0;
                break;
            }
        }
    }
    for (var i = 0; i < perSide; i++) {
        var attempts = 6;
        while (attempts-- > 0) {
            var y = random(height);
            var flow = sampleFlowFromGrid(1, y);
            if (cos(flow.angle) > 0) {
                var idx = (frameCount * 223 + i * 171 + attempts) % points.length;
                var p = points[idx];
                p.x = -m + 1;
                p.y = y;
                p.vx = 0;
                p.vy = 0;
                p.z = 0;
                break;
            }
        }
    }
    for (var i = 0; i < perSide; i++) {
        var attempts = 6;
        while (attempts-- > 0) {
            var y = random(height);
            var flow = sampleFlowFromGrid(width - 1, y);
            if (cos(flow.angle) < 0) {
                var idx = (frameCount * 251 + i * 191 + attempts) % points.length;
                var p = points[idx];
                p.x = width + m - 1;
                p.y = y;
                p.vx = 0;
                p.vy = 0;
                p.z = 0;
                break;
            }
        }
    }
}
function outOfCanvas(item) {
    var m = max(20, min(width, height) * 0.03);
    var wrapped = false;
    if (item.x < -m) {
        item.x = width + m;
        wrapped = true;
    }
    else if (item.x > width + m) {
        item.x = -m;
        wrapped = true;
    }
    if (item.y < -m) {
        item.y = height + m;
        wrapped = true;
    }
    else if (item.y > height + m) {
        item.y = -m;
        wrapped = true;
    }
    return wrapped;
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
function drawTopLeftClock() {
    push();
    textAlign(LEFT, TOP);
    textSize(min(width, height) * 0.04);
    fill(255);
    noStroke();
    var t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    text(t, 20, 20);
    pop();
}
function drawStationsBackground() {
    if (multiStationSamples.length === 0)
        return;
    var r = max(4, min(width, height) * 0.0045);
    updateStationScreenCache();
    for (var idx = 0; idx < stationScreenCache.length; idx++) {
        var s = stationScreenCache[idx];
        var sx = s.sx;
        var sy = s.sy;
        noStroke();
        fill(0, 0, 70, 50);
        circle(sx, sy, r * 2);
        var key_1 = s.name || sx + "," + sy;
        var em = stationEmitters.get(key_1);
        if (!em) {
            em = { x: sx, y: sy, particles: [] };
            stationEmitters.set(key_1, em);
        }
        else {
            em.x = sx;
            em.y = sy;
        }
        var dt = deltaTime / 16.6667;
        var ax = s.ux;
        var ay = s.uy;
        var speedNorm = constrain(s.speed, 0, 60) / 60;
        var baseV = lerp(0.4, 2.5, speedNorm);
        var spawn = frameCount % 3 === 0 ? 1 : 0;
        for (var n = 0; n < spawn; n++) {
            var jx = random(-r * 0.6, r * 0.6);
            var jy = random(-r * 0.6, r * 0.6);
            var sp = new SmokeParticle(sx + jx, sy + jy, ax * baseV + randomGaussian(0, 1) * 0.1, ay * baseV + randomGaussian(0, 1) * 0.1, r * random(1.2, 1.9), 38);
            em.particles.push(sp);
        }
        var arr = em.particles;
        if (arr.length > 15)
            arr.splice(0, arr.length - 15);
        for (var i = arr.length - 1; i >= 0; i--) {
            var p = arr[i];
            p.update(dt);
            p.draw();
            if (p.dead())
                arr.splice(i, 1);
        }
    }
}
function drawStationsHover() {
    if (multiStationSamples.length === 0)
        return;
    var hovered = null;
    var r = max(4, min(width, height) * 0.0045);
    updateStationScreenCache();
    for (var _i = 0, stationScreenCache_1 = stationScreenCache; _i < stationScreenCache_1.length; _i++) {
        var s = stationScreenCache_1[_i];
        var sx = s.sx;
        var sy = s.sy;
        var cx = mouseX, cy = mouseY;
        try {
            var el = document.querySelector('canvas');
            var m = window.__mouseClient;
            if (el && m) {
                var rect_3 = el.getBoundingClientRect();
                cx = m.x - rect_3.left;
                cy = m.y - rect_3.top;
            }
        }
        catch (_a) { }
        if (dist(cx, cy, sx, sy) <= r + 8)
            hovered = { x: sx, y: sy, name: s.name };
    }
    if (hovered) {
        var st = stationScreenCache.find(function (s) { return dist(s.sx, s.sy, hovered.x, hovered.y) < 4; });
        var compass = st ? degToCompass((Math.atan2(st.uy, st.ux) * 180 / Math.PI + 360 + 90) % 360) : '';
        var degOut = st ? Math.round((Math.atan2(st.uy, st.ux) * 180 / Math.PI + 360 + 90) % 360) : 0;
        var label = (hovered.name || 'Station') + (st ? "  \u2022  " + Math.round(st.speed) + " km/h  \u2022  " + compass + " (" + degOut + "\u00B0)" : '');
        var fs = max(12, min(width, height) * 0.02);
        textSize(fs);
        var tw = textWidth(label);
        var pad = 8;
        var bx = hovered.x + 12;
        var by = hovered.y - fs - 16;
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
function degToCompass(deg) {
    var dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    var i = Math.round(((deg % 360) / 22.5)) % 16;
    return dirs[i < 0 ? i + 16 : i];
}
function normalizeDeg(d) {
    var a = d % 360;
    if (a < 0)
        a += 360;
    return a;
}
function angleDiffDeg(fromDeg, toDeg) {
    var a = normalizeDeg(fromDeg);
    var b = normalizeDeg(toDeg);
    var diff = b - a;
    if (diff > 180)
        diff -= 360;
    if (diff < -180)
        diff += 360;
    return diff;
}
function drawInfoUI() {
    var r = 14;
    var pad = 18;
    var x = width - pad;
    var y = height - pad;
    push();
    noStroke();
    fill(0, 0, 0, 140);
    circle(x, y, r * 2);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(r);
    text('i', x, y + 1);
    pop();
    if (dist(mouseX, mouseY, x, y) <= r + 4) {
        var hasSpeed = !isNaN(windSpeedKmhCurrent);
        var hasDir = !isNaN(windDirectionDegCurrent);
        var speedNum = hasSpeed ? Math.round(windSpeedKmhCurrent) : null;
        var toDeg = hasDir ? (windDirectionDegCurrent + 180 + 360) % 360 : null;
        var fromTxt = hasDir ? degToCompass(windDirectionDegCurrent) + " (" + Math.round(windDirectionDegCurrent) + "\u00B0)" : null;
        var toTxt = hasDir && toDeg != null ? degToCompass(toDeg) + " (" + Math.round(toDeg) + "\u00B0)" : null;
        var nowLine = hasSpeed && hasDir
            ? "Now: " + speedNum + " km/h \u2022 from " + fromTxt + " \u2192 to " + toTxt
            : hasSpeed
                ? "Now: " + speedNum + " km/h"
                : hasDir
                    ? "Now: from " + fromTxt + " \u2192 to " + toTxt
                    : 'Now: —';
        var stationLine = (typeof stationIdx === 'number' && stationIdx === -1)
            ? 'Mode: Hong Kong (composite of stations)'
            : (currentStationName ? "Station: " + currentStationName : 'Station: auto');
        var lines = [
            'Hong Kong wind (live)',
            nowLine,
            stationLine,
            'Flowing lines show air movement; faster wind → longer, quicker streaks.',
            'Direction: FROM → TO (e.g., 90° from = 270° to).',
            'Temperature: top‑right.',
            'Pan/zoom map; tap station markers for details.'
        ];
        var fs = max(12, min(width, height) * 0.02);
        textSize(fs);
        var tw = 0;
        for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
            var s = lines_2[_i];
            tw = max(tw, textWidth(s));
        }
        var lh = fs * 1.25;
        var th = lh * lines.length + 16;
        var arrowBox = fs * 2.4;
        var bx = x - (tw + arrowBox) - 32;
        var by = y - th - 32;
        push();
        rectMode(CORNER);
        noStroke();
        fill(0, 0, 0, 180);
        rect(bx, by, tw + arrowBox + 32, th + 20, 12);
        var cx = bx + 14 + arrowBox / 2;
        var cy = by + 12 + arrowBox / 2;
        fill(0, 0, 0, 160);
        rectMode(CENTER);
        rect(cx, cy, arrowBox, arrowBox, 10);
        var toRad = radians(toDeg);
        var arrowAngle = atan2(-cos(toRad), sin(toRad));
        noFill();
        stroke(255, 70);
        strokeWeight(1);
        circle(cx, cy, arrowBox * 0.9);
        fill(255, 160);
        noStroke();
        textAlign(CENTER, BOTTOM);
        textSize(max(10, arrowBox * 0.22));
        text('N', cx, cy - arrowBox * 0.5 + 8);
        push();
        translate(cx, cy);
        rotate(arrowAngle);
        noStroke();
        fill(255);
        var L_1 = arrowBox * 0.34;
        var W = arrowBox * 0.16;
        beginShape();
        vertex(-L_1 * 0.35, -W * 0.45);
        vertex(-L_1 * 0.35, W * 0.45);
        vertex(L_1 * 0.55, 0);
        endShape(CLOSE);
        pop();
        fill(255);
        textAlign(LEFT, TOP);
        var ty = by + 10;
        for (var i = 0; i < lines.length; i++) {
            var s = lines[i];
            if (i === 0) {
                textStyle(BOLD);
            }
            else {
                textStyle(NORMAL);
            }
            text(s, bx + 12 + arrowBox + 12, ty);
            ty += lh;
        }
        pop();
    }
}
function updateStationScreenCache() {
    if (multiStationSamples.length === 0) {
        stationScreenCache = [];
        return;
    }
    if (!stationCacheDirty && stationScreenCache.length === multiStationSamples.length)
        return;
    var el = document.querySelector('canvas');
    var left = 0, top = 0;
    try {
        if (el) {
            var rect_4 = el.getBoundingClientRect();
            left = rect_4.left;
            top = rect_4.top;
        }
    }
    catch (_a) { }
    var out = [];
    for (var _i = 0, multiStationSamples_2 = multiStationSamples; _i < multiStationSamples_2.length; _i++) {
        var s = multiStationSamples_2[_i];
        var pxy = lonLatToScreen(s.lon, s.lat);
        var sx = pxy.x - left;
        var sy = pxy.y - top;
        var toRadS = radians((s.dirDeg + 180) % 360);
        var ang = atan2(-cos(toRadS), sin(toRadS));
        out.push({ sx: sx, sy: sy, ux: cos(ang), uy: sin(ang), speed: s.speed, name: s.name });
    }
    stationScreenCache = out;
    stationCacheDirty = false;
    flowGridDirty = true;
}
function rebuildFlowGridIfNeeded() {
    if (!flowGridDirty || stationScreenCache.length === 0)
        return;
    var targetCell = max(28, min(width, height) * 0.04);
    var cols = max(2, Math.floor(width / targetCell));
    var rows = max(2, Math.floor(height / targetCell));
    var cellW = width / cols;
    var cellH = height / rows;
    var ux = new Float32Array(cols * rows);
    var uy = new Float32Array(cols * rows);
    var speed = new Float32Array(cols * rows);
    var cons = new Float32Array(cols * rows);
    var sigma = max(120, min(width, height) * 0.22);
    var invSigma2 = 1 / (sigma * sigma);
    for (var gy = 0; gy < rows; gy++) {
        var y = (gy + 0.5) * cellH;
        for (var gx = 0; gx < cols; gx++) {
            var x = (gx + 0.5) * cellW;
            var sumUx = 0, sumUy = 0, sumSpeed = 0, sumW = 0;
            var bestW = -1, bestUx = 1, bestUy = 0, bestSpeed = 0;
            for (var _i = 0, stationScreenCache_2 = stationScreenCache; _i < stationScreenCache_2.length; _i++) {
                var s = stationScreenCache_2[_i];
                var dx = x - s.sx;
                var dy = y - s.sy;
                var w = Math.exp(-(dx * dx + dy * dy) * invSigma2);
                sumUx += s.ux * w;
                sumUy += s.uy * w;
                sumSpeed += s.speed * w;
                sumW += w;
                if (w > bestW) {
                    bestW = w;
                    bestUx = s.ux;
                    bestUy = s.uy;
                    bestSpeed = s.speed;
                }
            }
            var idx = gy * cols + gx;
            if (sumW > 0) {
                var len = Math.hypot(sumUx, sumUy);
                var consensus = len / sumW;
                if (consensus < 0.25 && bestW > 0) {
                    ux[idx] = bestUx;
                    uy[idx] = bestUy;
                    speed[idx] = bestSpeed;
                    cons[idx] = 0;
                }
                else {
                    var denom = len || 1;
                    ux[idx] = sumUx / denom;
                    uy[idx] = sumUy / denom;
                    speed[idx] = sumSpeed / sumW;
                    cons[idx] = consensus;
                }
            }
            else {
                var toDeg = (!isNaN(windDirectionDegCurrent) ? (windDirectionDegCurrent + 180) % 360 : 0);
                var toRad = radians(toDeg);
                var ang = atan2(-cos(toRad), sin(toRad));
                ux[idx] = cos(ang);
                uy[idx] = sin(ang);
                speed[idx] = isNaN(windSpeedKmhCurrent) ? 0 : windSpeedKmhCurrent;
            }
        }
    }
    flowGrid = { cols: cols, rows: rows, cellW: cellW, cellH: cellH, ux: ux, uy: uy, speed: speed, cons: cons };
    flowGridDirty = false;
    densityGrid = { cols: cols, rows: rows, values: new Float32Array(cols * rows) };
}
function sampleFlowFromGrid(x, y) {
    if (!flowGrid)
        return compositeFlowAt(x, y);
    var cols = flowGrid.cols, rows = flowGrid.rows, cellW = flowGrid.cellW, cellH = flowGrid.cellH, ux = flowGrid.ux, uy = flowGrid.uy, speed = flowGrid.speed, cons = flowGrid.cons;
    var gx = constrain(x / cellW - 0.5, 0, cols - 1);
    var gy = constrain(y / cellH - 0.5, 0, rows - 1);
    var x0 = Math.floor(gx);
    var y0 = Math.floor(gy);
    var x1 = Math.min(x0 + 1, cols - 1);
    var y1 = Math.min(y0 + 1, rows - 1);
    var tx = gx - x0;
    var ty = gy - y0;
    var idx = function (ix, iy) { return iy * cols + ix; };
    var bilerp = function (a, b, c, d) {
        return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
    };
    var ang = function (ix, iy) { return Math.atan2(uy[idx(ix, iy)], ux[idx(ix, iy)]); };
    var angleLerp = function (a, b, t) {
        var d = b - a;
        if (d > Math.PI)
            d -= 2 * Math.PI;
        if (d < -Math.PI)
            d += 2 * Math.PI;
        return a + d * t;
    };
    var a00 = ang(x0, y0), a10 = ang(x1, y0), a01 = ang(x0, y1), a11 = ang(x1, y1);
    var ax0 = angleLerp(a00, a10, tx);
    var ax1 = angleLerp(a01, a11, tx);
    var axy = angleLerp(ax0, ax1, ty);
    var sp = bilerp(speed[idx(x0, y0)], speed[idx(x1, y0)], speed[idx(x0, y1)], speed[idx(x1, y1)]);
    var cs = bilerp(cons[idx(x0, y0)], cons[idx(x1, y0)], cons[idx(x0, y1)], cons[idx(x1, y1)]);
    return { angle: axy, speedKmh: sp, consensus: cs };
}
function decayDensityGrid() {
    if (!densityGrid && flowGrid) {
        densityGrid = { cols: flowGrid.cols, rows: flowGrid.rows, values: new Float32Array(flowGrid.cols * flowGrid.rows) };
    }
    if (!densityGrid)
        return;
    var v = densityGrid.values;
    for (var i = 0; i < v.length; i++)
        v[i] *= DENSITY_DECAY;
}
function accumulateDensityAt(x, y) {
    if (!densityGrid || !flowGrid)
        return;
    var cols = densityGrid.cols, rows = densityGrid.rows;
    var cellW = flowGrid.cellW, cellH = flowGrid.cellH;
    var gx = Math.floor(constrain(x / cellW, 0, cols - 1));
    var gy = Math.floor(constrain(y / cellH, 0, rows - 1));
    var idx = gy * cols + gx;
    densityGrid.values[idx] += 1;
}
function densifySparseCells(maxMoves) {
    if (!densityGrid || !flowGrid || points.length === 0)
        return;
    var cols = densityGrid.cols, rows = densityGrid.rows, values = densityGrid.values;
    var targetPerCell = Math.max(4, Math.floor(points.length / (cols * rows) * 0.8));
    var indices = [];
    for (var i = 0; i < values.length; i++)
        indices.push(i);
    indices.sort(function (a, b) { return (values[a] - values[b]); });
    var moves = Math.min(maxMoves, Math.floor(indices.length * 0.25));
    for (var k = 0; k < moves; k++) {
        var cell = indices[k];
        if (flowGrid && flowGrid.cons[cell] < 0.2)
            continue;
        if (values[cell] >= targetPerCell)
            break;
        var cx = (cell % cols) + Math.random();
        var cy = Math.floor(cell / cols) + Math.random();
        var x = (cx) * flowGrid.cellW;
        var y = (cy) * flowGrid.cellH;
        var idxPoint = (frameCount * 911 + k * 577) % points.length;
        var p = points[idxPoint];
        p.x = constrain(x, -1, width + 1);
        p.y = constrain(y, -1, height + 1);
        p.vx = 0;
        p.vy = 0;
        p.z = 0;
        values[cell] += 1;
    }
}
function drawStationSwitcherBottomLeft() {
    return;
}
function mousePressed() {
    if (switcherRect) {
        var x = switcherRect.x, y = switcherRect.y, w = switcherRect.w, h = switcherRect.h;
        if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
            if (stationList.length > 0) {
                if (stationIdx === -1) {
                    var def = stationList.findIndex(function (s) { return (s.name || '').toLowerCase() === 'central pier'; });
                    stationIdx = def >= 0 ? def : 0;
                }
                else {
                    var left = mouseX < x + w / 2;
                    stationIdx = left ? (stationIdx - 1 + stationList.length) % stationList.length : (stationIdx + 1) % stationList.length;
                }
                fetchStationWind();
            }
            return false;
        }
    }
    if (locateRect) {
        var d = dist(mouseX, mouseY, locateRect.x, locateRect.y);
        if (d <= locateRect.r) {
            requestUserLocation();
            return false;
        }
    }
}
function requestUserLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation)
        return;
    navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        var idx = findNearestStation(lat, lon);
        if (idx >= 0) {
            stationIdx = idx;
            currentStationName = stationList[idx].name;
            fetchStationWind();
        }
    }, function () { }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
}
function findNearestStation(lat, lon) {
    if (!stationList.length)
        return -1;
    var best = -1;
    var bestD = Number.POSITIVE_INFINITY;
    for (var i = 0; i < stationList.length; i++) {
        var s = stationList[i];
        var d = haversineKm(lat, lon, s.lat, s.lon);
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    }
    return best;
}
function haversineKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var toRad = function (x) { return x * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
//# sourceMappingURL=build.js.map
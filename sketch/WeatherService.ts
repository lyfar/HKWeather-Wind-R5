// Lightweight service to fetch and normalize Hong Kong Observatory real-time weather (rhrread)

type HkoRhrRead = {
  temperature?: {
    recordTime?: string;
    data?: Array<{ place?: string; unit?: string; value?: number }>;
  };
  humidity?: {
    recordTime?: string;
    data?: Array<{ unit?: string; value?: number }>;
  };
  uvindex?: {
    recordTime?: string;
    data?: Array<{ value?: number; uvindex?: number; desc?: string }>;
  };
  icon?: number[];
  updateTime?: string;
};

interface NormalizedWeatherData {
  temperatureC: number | null;
  relativeHumidity: number | null;
  uvIndex: number | null;
  iconCodes: number[];
  recordTime: string | null;
  updateTime: string | null;
  temperatureStations: Array<{ place: string; value: number }>; // station-level temps
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  visibilityKm?: number | null;
}

// Radiation daily report (RYES)
interface NormalizedRadiationData {
  bulletinDate: string | null;
  bulletinTime: string | null;
  reportDate: string | null;
  desc: string | null; // HongKongDesc
  locations: Array<{ name: string; microsieverts: number | null }>;
  min: number | null;
  max: number | null;
  avg: number | null;
}

class WeatherService {
  public static async fetchCurrent(lang: 'en' | 'tc' | 'sc' = 'en'): Promise<NormalizedWeatherData> {
    const url = `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=${lang}`;
    const response = await fetch(url, { cache: 'no-store' });
    const json = (await response.json()) as HkoRhrRead;

    // Temperature: prefer "Hong Kong Observatory" station, otherwise use average of all available
    let temperatureC: number | null = null;
    let tempRecordTime: string | null = null;
    const temperatureStations: Array<{ place: string; value: number }> = [];
    if (json.temperature && Array.isArray(json.temperature.data) && json.temperature.data.length > 0) {
      tempRecordTime = json.temperature.recordTime || null;
      // capture all stations
      for (const item of json.temperature.data) {
        const place = (item.place as string) || '';
        const value = typeof item.value === 'number' ? item.value : NaN;
        if (place && !isNaN(value)) {
          temperatureStations.push({ place, value });
        }
      }
      const hkoStation = json.temperature.data.find(x => (x.place || '').toLowerCase() === 'hong kong observatory');
      if (hkoStation && typeof hkoStation.value === 'number') {
        temperatureC = hkoStation.value;
      } else {
        const values = json.temperature.data.map(x => x.value).filter(v => typeof v === 'number') as number[];
        if (values.length > 0) {
          temperatureC = values.reduce((a, b) => a + b, 0) / values.length;
        }
      }
    }

    // Humidity: first entry
    let relativeHumidity: number | null = null;
    let humRecordTime: string | null = null;
    if (json.humidity && Array.isArray(json.humidity.data) && json.humidity.data.length > 0) {
      humRecordTime = json.humidity.recordTime || null;
      const h = json.humidity.data[0];
      if (typeof h.value === 'number') {
        relativeHumidity = h.value;
      }
    }

    // UV Index: schema might be { value } or { uvindex }
    let uvIndex: number | null = null;
    if (json.uvindex && Array.isArray(json.uvindex.data) && json.uvindex.data.length > 0) {
      const u = json.uvindex.data[0];
      if (typeof u.value === 'number') uvIndex = u.value;
      if (typeof (u as any).uvindex === 'number') uvIndex = (u as any).uvindex as number;
    }

    // Wind: prefer first available station
    let windSpeedKmh: number | null = null;
    let windDirectionDeg: number | null = null;
    const windBlock: any = (json as any).wind;
    if (windBlock && Array.isArray(windBlock.data) && windBlock.data.length > 0) {
      const w0 = windBlock.data[0];
      const sp = w0.speed?.value ?? w0.speed ?? null;
      const dir = w0.direction?.value ?? w0.direction ?? null;
      if (typeof sp === 'number') windSpeedKmh = sp;
      if (typeof dir === 'number') windDirectionDeg = dir;
    }

    // Visibility (optional, may not be present in rhrread)
    let visibilityKm: number | null = null;
    const visBlock: any = (json as any).visibility;
    if (visBlock && typeof visBlock.value === 'number') {
      visibilityKm = visBlock.value;
    }

    const iconCodes = Array.isArray(json.icon) ? json.icon : [];

    return {
      temperatureC,
      relativeHumidity,
      uvIndex,
      iconCodes,
      recordTime: tempRecordTime || humRecordTime,
      updateTime: json.updateTime || null,
      temperatureStations,
      windSpeedKmh,
      windDirectionDeg,
      visibilityKm
    };
  }

  public static async fetchRadiationReport(dateYYYYMMDD?: string, lang: 'en' | 'tc' | 'sc' = 'en'): Promise<NormalizedRadiationData> {
    // Default to today in local time if no date is provided. If empty, fallback to yesterday.
    const primaryDate = dateYYYYMMDD || WeatherService.formatTodayYYYYMMDD();
    let result = await WeatherService.fetchRadiationOnce(primaryDate, lang);
    if (!result || !result.locations || result.locations.length === 0) {
      const yesterday = WeatherService.formatDaysAgoYYYYMMDD(1);
      result = await WeatherService.fetchRadiationOnce(yesterday, lang);
    }
    return result;
  }

  private static async fetchRadiationOnce(dateYYYYMMDD: string, lang: 'en' | 'tc' | 'sc'): Promise<NormalizedRadiationData> {
    const url = `https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?dataType=RYES&lang=${lang}&date=${dateYYYYMMDD}`;
    const response = await fetch(url, { cache: 'no-store' });
    const json: any = await response.json();
    if (!json || typeof json !== 'object') {
      return { bulletinDate: null, bulletinTime: null, reportDate: null, desc: null, locations: [], min: null, max: null, avg: null };
    }
    const locations: Array<{ name: string; microsieverts: number | null }> = [];
    const valueKeys = Object.keys(json).filter(k => /Microsieverts$/i.test(k));
    for (const k of valueKeys) {
      const base = k.replace(/Microsieverts$/i, '');
      const nameKey = `${base}LocationName`;
      const name = (json[nameKey] as string) || WeatherService.splitCamelCase(base);
      const sv = parseFloat(json[k]);
      locations.push({ name, microsieverts: isNaN(sv) ? null : sv });
    }
    const numeric = locations.map(l => l.microsieverts).filter(v => typeof v === 'number') as number[];
    const min = numeric.length ? Math.min(...numeric) : null;
    const max = numeric.length ? Math.max(...numeric) : null;
    const avg = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : null;
    return {
      bulletinDate: (json['BulletinDate'] as string) || null,
      bulletinTime: (json['BulletinTime'] as string) || null,
      reportDate: (json['ReportTimeInfoDate'] as string) || null,
      desc: (json['HongKongDesc'] as string) || null,
      locations,
      min,
      max,
      avg
    };
  }

  private static formatTodayYYYYMMDD(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}${m}${day}`;
  }

  private static formatDaysAgoYYYYMMDD(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}${m}${day}`;
  }

  private static splitCamelCase(s: string): string {
    return s.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  }
}



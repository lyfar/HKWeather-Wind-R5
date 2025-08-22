// Fetch latest 10-minute wind from HKO CSDI station CSVs listed in latest_10min_wind.json

interface WindSample {
  station: string;
  meanSpeedKmh: number;
  meanDirDeg: number; // FROM degrees
  gustKmh?: number;
  isoTime?: string;
}

class WindStationsService {
  public static async fetchPreferredSample(preferStations: string[] = [
    'Central Pier',
    'Star Ferry',
    "King's Park",
    'Kai Tak'
  ]): Promise<WindSample | null> {
    try {
      const jsonRes = await fetch('./latest_10min_wind.json', { cache: 'no-store' });
      const data = await jsonRes.json();
      const features: any[] = data?.features || [];
      if (!features.length) return null;

      // Build map station -> CSV url
      const stationToUrl = new Map<string, string>();
      for (const f of features) {
        const props = f?.properties || {};
        const name = props['AutomaticWeatherStation_en'] as string;
        const url = props['Data_url'] as string;
        if (name && url) stationToUrl.set(name, url);
      }

      // Try preferred stations in order, then fall back to any
      const candidates: string[] = [...preferStations, ...Array.from(stationToUrl.keys()).filter(s => !preferStations.includes(s))];
      for (const station of candidates) {
        const csvUrl = stationToUrl.get(station);
        if (!csvUrl) continue;
        const sample = await WindStationsService.fetchStationCsv(csvUrl, station);
        if (sample) return sample;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static async fetchByUrl(csvUrl: string, stationName: string): Promise<WindSample | null> {
    return WindStationsService.fetchStationCsv(csvUrl, stationName);
  }

  public static async fetchAllFromList(
    list: Array<{ name: string; url: string }>,
    limit = 8
  ): Promise<WindSample[]> {
    const out: WindSample[] = [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      try {
        const sample = await WindStationsService.fetchStationCsv(s.url, s.name);
        if (sample) out.push(sample);
      } catch {}
      if (out.length >= limit) break; // avoid hitting proxy limits
      // brief delay to avoid 429
      await new Promise(r => setTimeout(r, 150));
    }
    return out;
  }

  private static async fetchStationCsv(csvUrl: string, station: string): Promise<WindSample | null> {
    try {
      let text: string | null = null;
      // Prefer stable proxies with Access-Control-Allow-Origin
      const proxyTemplates = [
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      ];
      // Lightweight local cache to reduce network errors/noise
      const cacheKey = `ws_csv:${csvUrl}`;
      const now = Date.now();
      const cached = (() => { try { return JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { return null; } })();
      if (cached && typeof cached.text === 'string' && typeof cached.t === 'number' && (now - cached.t) < 10 * 60 * 1000) {
        text = cached.text as string;
      }
      if (text == null) {
        // Try proxies sequentially (fewer console errors); short timeout per attempt
        for (const fmt of proxyTemplates) {
          const url = fmt(csvUrl);
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4500);
            const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) continue;
            text = await res.text();
            try { localStorage.setItem(cacheKey, JSON.stringify({ t: now, text })); } catch {}
            break;
          } catch {}
        }
      }
      if (text == null) return null;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) return null;
      const header = WindStationsService.splitCsvLine(lines[0]).map(h => h.trim());
      const idxStation = WindStationsService.findIndex(header, 'Automatic Weather Station');
      const idxDir = WindStationsService.findIndex(header, '10-Minute Mean Wind Direction(Compass points)');
      const idxSpeed = WindStationsService.findIndex(header, '10-Minute Mean Speed(km/hour)');
      const idxGust = WindStationsService.findIndex(header, '10-Minute Maximum Gust(km/hour)');
      // Some files may have BOM or different header; fallback to positions
      const row = WindStationsService.splitCsvLine(lines[1]);
      const st = idxStation >= 0 ? row[idxStation] : station;
      const dirText = idxDir >= 0 ? row[idxDir] : '';
      const spText = idxSpeed >= 0 ? row[idxSpeed] : '';
      const gustText = idxGust >= 0 ? row[idxGust] : '';

      const meanSpeedKmh = parseFloat(spText);
      const meanDirDeg = WindStationsService.directionTextToDeg(dirText);
      const gustKmh = parseFloat(gustText);
      if (!isFinite(meanSpeedKmh) || !isFinite(meanDirDeg)) return null;
      return { station: st || station, meanSpeedKmh, meanDirDeg, gustKmh: isFinite(gustKmh) ? gustKmh : undefined };
    } catch {
      return null;
    }
  }

  private static findIndex(header: string[], name: string): number {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    const target = norm(name);
    for (let i = 0; i < header.length; i++) {
      if (norm(header[i]) === target) return i;
    }
    return -1;
  }

  private static splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
          else { q = false; }
        } else cur += ch;
      } else {
        if (ch === '"') q = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  private static directionTextToDeg(text: string): number {
    if (!text) return NaN;
    const t = text.toLowerCase().replace(/\s+/g, '');
    const map: Record<string, number> = {
      n: 0, nne: 22.5, ne: 45, ene: 67.5, e: 90, ese: 112.5, se: 135, sse: 157.5,
      s: 180, ssw: 202.5, sw: 225, wsw: 247.5, w: 270, wnw: 292.5, nw: 315, nnw: 337.5,
      north: 0, northnortheast: 22.5, northeast: 45, eastnortheast: 67.5,
      east: 90, eastsoutheast: 112.5, southeast: 135, southsoutheast: 157.5,
      south: 180, southsouthwest: 202.5, southwest: 225, westsouthwest: 247.5,
      west: 270, westnorthwest: 292.5, northwest: 315, northnorthwest: 337.5,
      calm: NaN, variable: NaN, 'n/a': NaN
    };
    return map[t] ?? NaN;
  }
}



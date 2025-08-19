// Minimal CSV client for Buildings Department dataset (occupation permit dates)

interface BuildingRecord {
  name?: string;
  address?: string;
  usage?: string;
  opDate?: string;
  year?: number;
  month?: number;
  day?: number;
}

class BuildingService {
  public static async fetchBuildingsByMonthDay(month: number, day: number, csvUrl: string): Promise<BuildingRecord[]> {
    const url = BuildingService.wrapCors(csvUrl);
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    const rows = BuildingService.parseCsv(text);
    if (rows.length === 0) return [];

    // Header normalization
    const header = rows[0].map(h => BuildingService.norm(h));
    const idxDate = BuildingService.findFirst(header, [
      'occupationpermitdate', 'opdate', 'op_date', 'occupation_permit_date', 'bop_date'
    ]);
    const idxName = BuildingService.findFirst(header, [
      'buildingname', 'name', 'bldgname', 'bldg_name'
    ]);
    const idxAddress = BuildingService.findFirst(header, [
      'address', 'fulladdress', 'buildingaddress', 'lot', 'siteaddress'
    ]);
    const idxUsage = BuildingService.findFirst(header, [
      'usage', 'buildingusage', 'bldgusage', 'purposes', 'type'
    ]);

    const out: BuildingRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const dateStr = idxDate >= 0 ? (row[idxDate] || '') : '';
      const d = BuildingService.parseDateFlexible(dateStr);
      if (!d) continue;
      const mm = d.getMonth() + 1;
      const dd = d.getDate();
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
    return out;
  }

  private static wrapCors(url: string): string {
    // Simple CORS helper; if you host the CSV yourself, you can skip this.
    if (url.includes('api.allorigins.win')) return url;
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  }

  private static parseCsv(text: string): string[][] {
    const lines = text.split(/\r?\n/).filter(l => l.length > 0);
    const rows: string[][] = [];
    for (const line of lines) {
      rows.push(BuildingService.splitCsvLine(line));
    }
    return rows;
  }

  private static splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { // escaped quote
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    result.push(cur);
    return result.map(s => s.trim());
  }

  private static norm(s: string): string {
    return (s || '').toLowerCase().replace(/\s+/g, '').replace(/[_-]/g, '');
  }

  private static findFirst(arr: string[], keys: string[]): number {
    for (const k of keys) {
      const idx = arr.indexOf(k);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  private static parseDateFlexible(s: string): Date | null {
    if (!s) return null;
    // Try ISO
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
    // Try DD/MM/YYYY
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m1) {
      const d = parseInt(m1[1], 10);
      const m = parseInt(m1[2], 10) - 1;
      const y = parseInt(m1[3], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    // Try YYYY/MM/DD
    const m2 = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (m2) {
      const y = parseInt(m2[1], 10);
      const m = parseInt(m2[2], 10) - 1;
      const d = parseInt(m2[3], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    return null;
  }
}



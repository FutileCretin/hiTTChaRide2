// TTC Real-Time Vehicle Location Service
// Source: TTC public GTFS-Realtime feed (same data source as Transee)

const TTC_API_BASE = 'https://retro.umoiq.com/service/publicJSONFeed';
const AGENCY = 'ttc';

export interface VehicleLocation {
  id: string;         // Vehicle/bus number
  lat: number;
  lon: number;
  heading: number;    // Direction in degrees (0-359)
  speedKmH: number;
  routeTag: string;
  dirTag: string;
  secsSinceReport: number; // Seconds since last GPS ping
}

// Fetch the live location of a specific vehicle by bus number.
// Uses the single-vehicle lookup command which works for ALL vehicles
// including deadheads — not just in-service buses on a route.
export async function fetchVehicleLocation(busNumber: string): Promise<VehicleLocation | null> {
  try {
    const url = `${TTC_API_BASE}?command=vehicleLocation&a=${AGENCY}&v=${busNumber}`;
    const response = await fetch(url);
    const data = await response.json();

    const v = data?.vehicle;
    if (!v || !v.lat) return null;

    return {
      id:              String(v.id ?? busNumber),
      lat:             parseFloat(v.lat),
      lon:             parseFloat(v.lon),
      heading:         parseFloat(v.heading ?? 0),
      speedKmH:        parseFloat(v.speedKmHr ?? 0),
      routeTag:        String(v.routeTag ?? ''),
      dirTag:          String(v.dirTag ?? ''),
      secsSinceReport: parseInt(v.secsSinceReport ?? 0, 10),
    };
  } catch (error) {
    console.error('TTC API error:', error);
    return null;
  }
}

// Fetch locations for a list of bus numbers (for the Track Vehicle map)
// Uses individual lookups so deadhead buses are included
export async function fetchMultipleVehicles(busNumbers: string[]): Promise<VehicleLocation[]> {
  try {
    const results = await Promise.all(busNumbers.map(n => fetchVehicleLocation(n)));
    return results.filter((v): v is VehicleLocation => v !== null);
  } catch (error) {
    console.error('TTC API error (multi):', error);
    return [];
  }
}

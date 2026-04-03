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

// Fetch the live location of a specific vehicle by bus number
export async function fetchVehicleLocation(busNumber: string): Promise<VehicleLocation | null> {
  try {
    // Get all vehicles (TTC API doesn't support single-vehicle lookup)
    const url = `${TTC_API_BASE}?command=vehicleLocations&a=${AGENCY}&t=0`;
    const response = await fetch(url);
    const data = await response.json();

    // The API returns { vehicle: [...] } or { vehicle: {...} } for a single result
    let vehicles = data?.vehicle;
    if (!vehicles) return null;
    if (!Array.isArray(vehicles)) vehicles = [vehicles];

    // Find the specific bus by its ID (bus number)
    const match = vehicles.find(
      (v: any) => String(v.id) === String(busNumber)
    );

    if (!match) return null;

    return {
      id: String(match.id),
      lat: parseFloat(match.lat),
      lon: parseFloat(match.lon),
      heading: parseFloat(match.heading ?? 0),
      speedKmH: parseFloat(match.speedKmHr ?? 0),
      routeTag: String(match.routeTag ?? ''),
      dirTag: String(match.dirTag ?? ''),
      secsSinceReport: parseInt(match.secsSinceReport ?? 0, 10),
    };
  } catch (error) {
    console.error('TTC API error:', error);
    return null;
  }
}

// Fetch locations for a list of bus numbers (for the Track Vehicle map)
export async function fetchMultipleVehicles(busNumbers: string[]): Promise<VehicleLocation[]> {
  try {
    const url = `${TTC_API_BASE}?command=vehicleLocations&a=${AGENCY}&t=0`;
    const response = await fetch(url);
    const data = await response.json();

    let vehicles = data?.vehicle;
    if (!vehicles) return [];
    if (!Array.isArray(vehicles)) vehicles = [vehicles];

    const ids = new Set(busNumbers.map(String));

    return vehicles
      .filter((v: any) => ids.has(String(v.id)))
      .map((v: any) => ({
        id: String(v.id),
        lat: parseFloat(v.lat),
        lon: parseFloat(v.lon),
        heading: parseFloat(v.heading ?? 0),
        speedKmH: parseFloat(v.speedKmHr ?? 0),
        routeTag: String(v.routeTag ?? ''),
        dirTag: String(v.dirTag ?? ''),
        secsSinceReport: parseInt(v.secsSinceReport ?? 0, 10),
      }));
  } catch (error) {
    console.error('TTC API error (multi):', error);
    return [];
  }
}

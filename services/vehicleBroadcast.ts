// Vehicle broadcast service
// Uses the driver's phone GPS — works for ALL buses, in service or deadheading

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from './firebase';

export const BROADCAST_DURATION_MS = 60 * 60 * 1000; // 1 hour
export const POLL_INTERVAL_MS      = 5000;            // update map every 5 s

export type GarageCode = 'AGRA' | 'QSGA' | 'MDGA' | 'WLGA' | 'EGGA' | 'BRGA' | 'MLGA' | 'MNGA';

export interface BroadcastVehicle {
  busNumber:     string;
  badgeNumber:   string;
  operatorName:  string;
  avatarConfig:  AvatarConfig;
  garage:        GarageCode | null;
  lat:           number;
  lon:           number;
  heading:       number;
  speedKmH:      number;
  routeTag:      string;
  secsSinceReport: number;
  broadcastStarted: Timestamp;
  lastUpdated:   Timestamp;
}

export type AvatarStyle =
  | 'conductor'
  | 'baseball'
  | 'turban'
  | 'conical'
  | 'hair_blonde'
  | 'hair_black'
  | 'hair_brown';

export interface AvatarConfig {
  style:    AvatarStyle;
  skinTone: string;
}

// Request location permission — call this before startBroadcast
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;
  // Background permission keeps broadcasting when screen is off
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' || status === 'granted';
}

// Start broadcasting using the driver's phone GPS
// Returns a cleanup function to stop broadcasting
export function startBroadcast(
  busNumber:    string,
  badgeNumber:  string,
  operatorName: string,
  avatarConfig: AvatarConfig,
  garage:       GarageCode | null,
  onUpdate:     (lat: number, lon: number) => void,
  onExpire:     () => void
): () => void {
  const docRef           = doc(db, 'activeBroadcasts', busNumber);
  let   stopped          = false;
  const broadcastStartTime = Date.now();
  let   locationSub: Location.LocationSubscription | null = null;
  let   lastLat          = 0;
  let   lastLon          = 0;
  let   lastHeading      = 0;
  let   lastSpeedKmH     = 0;
  let   lastWriteTime    = 0;

  const writePosition = async (lat: number, lon: number, heading: number, speedKmH: number) => {
    if (stopped) return;

    const elapsed = Date.now() - broadcastStartTime;
    if (elapsed >= BROADCAST_DURATION_MS) {
      cleanup();
      onExpire();
      return;
    }

    const isFirstWrite = lastWriteTime === 0;
    lastLat       = lat;
    lastLon       = lon;
    lastHeading   = heading;
    lastSpeedKmH  = speedKmH;
    lastWriteTime = Date.now();

    const payload = {
      lat, lon, heading,
      speedKmH,
      routeTag:        '',
      secsSinceReport: 0,
      lastUpdated:     serverTimestamp(),
      ...(isFirstWrite ? {
        busNumber, badgeNumber, operatorName, avatarConfig,
        garage: garage ?? null,
        broadcastStarted: serverTimestamp(),
      } : {}),
    };

    await setDoc(docRef, payload, { merge: true });
    onUpdate(lat, lon);
  };

  const startWatching = async () => {
    locationSub = await Location.watchPositionAsync(
      {
        accuracy:         Location.Accuracy.BestForNavigation,
        timeInterval:     POLL_INTERVAL_MS,
        distanceInterval: 0,
      },
      (loc) => {
        const { latitude, longitude, heading, speed } = loc.coords;
        const speedKmH = Math.max(0, (speed ?? 0) * 3.6);
        writePosition(latitude, longitude, heading ?? 0, speedKmH);
      }
    );
  };

  startWatching();

  // Expiry safety net in case GPS stops firing
  const expiryTimer = setTimeout(() => {
    if (!stopped) { cleanup(); onExpire(); }
  }, BROADCAST_DURATION_MS + 5000);

  const cleanup = () => {
    stopped = true;
    clearTimeout(expiryTimer);
    locationSub?.remove();
    stopBroadcast(busNumber);
  };

  return cleanup;
}

// Remove vehicle from Firestore
export async function stopBroadcast(busNumber: string) {
  try {
    await deleteDoc(doc(db, 'activeBroadcasts', busNumber));
  } catch {
    // Already deleted — fine
  }
}

// Subscribe to all currently broadcasting vehicles
export function subscribeToActiveBroadcasts(
  callback: (vehicles: BroadcastVehicle[]) => void
): () => void {
  const unsubscribe = onSnapshot(collection(db, 'activeBroadcasts'), (snapshot) => {
    const now      = Date.now();
    const vehicles: BroadcastVehicle[] = [];

    snapshot.forEach((docSnap) => {
      const data    = docSnap.data() as BroadcastVehicle;
      const started = data.broadcastStarted?.toMillis?.() ?? 0;
      if (now - started < BROADCAST_DURATION_MS) {
        vehicles.push(data);
      } else {
        deleteDoc(docSnap.ref); // clean up expired
      }
    });

    callback(vehicles);
  });

  return unsubscribe;
}

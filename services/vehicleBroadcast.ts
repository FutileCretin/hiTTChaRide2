// Vehicle broadcast service
// Handles writing and reading live vehicle positions to/from Firebase

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { fetchVehicleLocation } from './ttcApi';

export const BROADCAST_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds
// Poll TTC feed every 5 seconds — catches GPS updates the moment they appear
export const POLL_INTERVAL_MS = 5000;

export type GarageCode = 'AGRA' | 'QSGA' | 'MDGA' | 'WLGA' | 'EGGA' | 'BRGA' | 'MLGA' | 'MNGA';

export interface BroadcastVehicle {
  busNumber: string;
  badgeNumber: string;
  operatorName: string;
  avatarConfig: AvatarConfig;
  garage: GarageCode | null;
  lat: number;
  lon: number;
  heading: number;
  speedKmH: number;
  routeTag: string;
  broadcastStarted: Timestamp;
  lastUpdated: Timestamp;
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
  style: AvatarStyle;
  skinTone: string;
}

// Start broadcasting: write vehicle position to Firestore on each poll
// Returns a cleanup function to stop broadcasting
export function startBroadcast(
  busNumber: string,
  badgeNumber: string,
  operatorName: string,
  avatarConfig: AvatarConfig,
  garage: GarageCode | null,
  onUpdate: (lat: number, lon: number) => void,
  onExpire: () => void,
  onNotFound?: () => void
): () => void {
  const docRef = doc(db, 'activeBroadcasts', busNumber);
  let stopped = false;

  const broadcastStartTime = Date.now();

  // Write initial record immediately
  const writePosition = async () => {
    const location = await fetchVehicleLocation(busNumber);
    if (stopped) return;
    if (!location) {
      stopped = true;
      onNotFound?.();
      return;
    }

    await setDoc(docRef, {
      busNumber,
      badgeNumber,
      operatorName,
      avatarConfig,
      garage: garage ?? null,
      lat: location.lat,
      lon: location.lon,
      heading: location.heading,
      speedKmH: location.speedKmH,
      routeTag: location.routeTag,
      broadcastStarted: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    } as any);

    onUpdate(location.lat, location.lon);
  };

  writePosition();

  // Poll on interval
  const interval = setInterval(async () => {
    if (stopped) return;

    const elapsed = Date.now() - broadcastStartTime;
    if (elapsed >= BROADCAST_DURATION_MS) {
      stopBroadcast(busNumber);
      stopped = true;
      clearInterval(interval);
      onExpire();
      return;
    }

    const location = await fetchVehicleLocation(busNumber);
    if (!location || stopped) return;

    await setDoc(
      docRef,
      {
        lat: location.lat,
        lon: location.lon,
        heading: location.heading,
        speedKmH: location.speedKmH,
        routeTag: location.routeTag,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );

    onUpdate(location.lat, location.lon);
  }, POLL_INTERVAL_MS);

  // Return cleanup function
  return () => {
    stopped = true;
    clearInterval(interval);
    stopBroadcast(busNumber);
  };
}

// Remove vehicle from Firestore (stops it appearing on the map)
export async function stopBroadcast(busNumber: string) {
  try {
    await deleteDoc(doc(db, 'activeBroadcasts', busNumber));
  } catch (e) {
    // Already deleted or not found — that's fine
  }
}

// Subscribe to all currently broadcasting vehicles (for Track Vehicle map)
// Automatically filters out any stale broadcasts older than 1 hour
export function subscribeToActiveBroadcasts(
  callback: (vehicles: BroadcastVehicle[]) => void
): () => void {
  const q = collection(db, 'activeBroadcasts');

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const vehicles: BroadcastVehicle[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as BroadcastVehicle;

      // Filter out stale broadcasts (older than 1 hour)
      const started = data.broadcastStarted?.toMillis?.() ?? 0;
      if (now - started < BROADCAST_DURATION_MS) {
        vehicles.push(data);
      } else {
        // Clean up stale entry
        deleteDoc(docSnap.ref);
      }
    });

    callback(vehicles);
  });

  return unsubscribe;
}

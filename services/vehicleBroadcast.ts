// Vehicle broadcast service
// Uses the TTC's public GPS feed — no personal location data from drivers

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { fetchVehicleLocation } from './ttcApi';

export const BROADCAST_DURATION_MS = 60 * 60 * 1000; // 1 hour
export const POLL_INTERVAL_MS      = 5000;            // poll TTC feed every 5 s

export type GarageCode = 'AGRA' | 'QSGA' | 'MDGA' | 'WLGA' | 'EGGA' | 'BRGA' | 'MLGA' | 'MNGA';

export interface BroadcastVehicle {
  busNumber:        string;
  badgeNumber:      string;
  operatorName:     string;
  avatarConfig:     AvatarConfig;
  garage:           GarageCode | null;
  lat:              number;
  lon:              number;
  heading:          number;
  speedKmH:         number;
  routeTag:         string;
  secsSinceReport:  number;
  broadcastStarted: Timestamp;
  lastUpdated:      Timestamp;
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

// Start broadcasting: pulls bus position from TTC public feed every 5 s
// No personal location data — only the bus transponder GPS is used
// Returns a cleanup function to stop broadcasting
export function startBroadcast(
  busNumber:    string,
  badgeNumber:  string,
  operatorName: string,
  avatarConfig: AvatarConfig,
  garage:       GarageCode | null,
  onUpdate:     (lat: number, lon: number) => void,
  onExpire:     () => void,
  onNotFound?:  () => void
): () => void {
  const docRef           = doc(db, 'activeBroadcasts', busNumber);
  let   stopped          = false;
  let   firstWriteDone   = false;
  const broadcastStartTime = Date.now();

  const writePosition = async () => {
    const location = await fetchVehicleLocation(busNumber);
    if (stopped) return;

    if (!location) {
      // Bus not in TTC feed yet — only give up on the very first attempt
      if (!firstWriteDone) {
        stopped = true;
        onNotFound?.();
      }
      return;
    }

    firstWriteDone = true;

    await setDoc(
      docRef,
      {
        busNumber,
        badgeNumber,
        operatorName,
        avatarConfig,
        garage: garage ?? null,
        lat:              location.lat,
        lon:              location.lon,
        heading:          location.heading,
        speedKmH:         location.speedKmH,
        routeTag:         location.routeTag,
        secsSinceReport:  location.secsSinceReport,
        lastUpdated:      serverTimestamp(),
        ...(firstWriteDone ? {} : { broadcastStarted: serverTimestamp() }),
      },
      { merge: true }
    );

    onUpdate(location.lat, location.lon);
  };

  // Write immediately, then on interval
  writePosition().then(() => {
    if (!stopped && !firstWriteDone) {
      // First write failed silently — set broadcastStarted on next success
    }
    if (firstWriteDone) {
      setDoc(docRef, { broadcastStarted: serverTimestamp() }, { merge: true });
    }
  });

  const interval = setInterval(async () => {
    if (stopped) return;

    const elapsed = Date.now() - broadcastStartTime;
    if (elapsed >= BROADCAST_DURATION_MS) {
      stopped = true;
      clearInterval(interval);
      stopBroadcast(busNumber);
      onExpire();
      return;
    }

    writePosition();
  }, POLL_INTERVAL_MS);

  return () => {
    stopped = true;
    clearInterval(interval);
    stopBroadcast(busNumber);
  };
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
        deleteDoc(docSnap.ref);
      }
    });

    callback(vehicles);
  });

  return unsubscribe;
}

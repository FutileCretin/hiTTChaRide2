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
import * as Notifications from 'expo-notifications';

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
  expoPushToken?:   string;
  broadcastStarted: Timestamp;
  lastUpdated:      Timestamp;
}

// Get this device's Expo push token (returns null if permission denied)
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'e1efd646-1fbb-465e-adb2-e1dbea4294fb',
    });
    return token.data;
  } catch {
    return null;
  }
}

// Send a ding notification to a broadcasting driver
export async function sendDing(
  expoPushToken: string,
  busNumber: string,
): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to:    expoPushToken,
      title: '🔔 Someone needs a ride!',
      body:  `A coworker near Bus #${busNumber} is requesting a pickup.`,
      sound: 'default',
      priority: 'high',
    }),
  });
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
  const docRef             = doc(db, 'activeBroadcasts', busNumber);
  let   stopped            = false;
  let   firstWriteDone     = false;
  const broadcastStartTime = Date.now();
  // Get push token once at start so riders can ding this driver
  let   pushToken: string | null = null;
  getExpoPushToken().then(t => { pushToken = t; });

  const writePosition = async () => {
    const location = await fetchVehicleLocation(busNumber);
    if (stopped) return;

    if (!location) {
      if (!firstWriteDone) { stopped = true; onNotFound?.(); }
      return;
    }

    const isFirst = !firstWriteDone;
    firstWriteDone = true;

    await setDoc(
      docRef,
      {
        busNumber,
        badgeNumber,
        operatorName,
        avatarConfig,
        garage:          garage ?? null,
        lat:             location.lat,
        lon:             location.lon,
        heading:         location.heading,
        speedKmH:        location.speedKmH,
        routeTag:        location.routeTag,
        secsSinceReport: location.secsSinceReport,
        lastUpdated:     serverTimestamp(),
        ...(isFirst ? { broadcastStarted: serverTimestamp() } : {}),
        ...(pushToken   ? { expoPushToken: pushToken }        : {}),
      },
      { merge: true }
    );

    onUpdate(location.lat, location.lon);
  };

  // Write immediately, then on interval
  writePosition();

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

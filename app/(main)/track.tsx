// Hitch a Ride — live map
// Markers are plain Views overlaid on top of MapView (no <Marker> component).
// GPS coords are converted to screen pixels at 10fps so circles track the map
// during both panning and vehicle movement with no native clipping issues.

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import {
  subscribeToActiveBroadcasts,
  BroadcastVehicle,
  POLL_INTERVAL_MS,
  sendDing,
} from '../../services/vehicleBroadcast';
import { Avatar } from '../../components/Avatar';

const TORONTO_REGION = {
  latitude: 43.6532,
  longitude: -79.3832,
  latitudeDelta: 0.12,
  longitudeDelta: 0.08,
};

interface DisplayVehicle extends BroadcastVehicle {
  displayLat: number;
  displayLon: number;
}

interface InterpState {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  startTime: number;
  // Dead reckoning — extrapolate forward after interpolation completes
  drLat: number;
  drLon: number;
  drHeading: number;
  drSpeedKmH: number;
  drStartTime: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(t, 1);

// Move a GPS coordinate forward using heading + speed (Transit-app style)
const deadReckon = (
  lat: number, lon: number,
  headingDeg: number, speedKmH: number,
  elapsedMs: number
): { lat: number; lon: number } => {
  if (speedKmH < 3) return { lat, lon }; // don't drift stationary buses
  const elapsedHours = elapsedMs / 3_600_000;
  const distKm       = speedKmH * elapsedHours;
  const R            = 6371;
  const hRad         = (headingDeg * Math.PI) / 180;
  const dLat         = (distKm * Math.cos(hRad) / R) * (180 / Math.PI);
  const dLon         = (distKm * Math.sin(hRad) / R) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
  return { lat: lat + dLat, lon: lon + dLon };
};

const CIRCLE = 40; // outer diameter in dp

export default function TrackScreen() {
  const [displayed, setDisplayed] = useState<DisplayVehicle[]>([]);
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DisplayVehicle | null>(null);
  const [dingSent, setDingSent] = useState(false);

  const mapRef    = useRef<MapView>(null);
  const interpRef = useRef<Map<string, InterpState>>(new Map());
  const regionRef = useRef(TORONTO_REGION); // updated on every map move, no setState
  const sizeRef   = useRef({ width: 1, height: 1 });

  // Convert GPS → absolute screen position using Web Mercator (same as Google Maps).
  // Longitude is linear; latitude must go through ln(tan(π/4 + lat·π/360)) or
  // positions drift vertically — noticeable at Toronto's ~43.6 °N latitude.
  const toScreen = (lat: number, lon: number) => {
    const r = regionRef.current;
    const { width, height } = sizeRef.current;

    const merc = (deg: number) =>
      Math.log(Math.tan(Math.PI / 4 + (deg * Math.PI) / 360));

    const mercTop = merc(r.latitude + r.latitudeDelta / 2);
    const mercBot = merc(r.latitude - r.latitudeDelta / 2);
    const mercPos = merc(lat);

    const x =
      ((lon - r.longitude + r.longitudeDelta / 2) / r.longitudeDelta) * width;
    const y = ((mercTop - mercPos) / (mercTop - mercBot)) * height;

    return { x, y };
  };

  // 10 fps ticker — interpolates between GPS pings, then dead-reckons forward
  // so buses keep moving smoothly even during GPS gaps (Transit-app style).
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setDisplayed((prev) => {
        let changed = false;
        const next = prev.map((v) => {
          const ip = interpRef.current.get(v.busNumber);
          if (!ip) return v;

          const t = (now - ip.startTime) / POLL_INTERVAL_MS;

          if (t < 1) {
            // Phase 1: interpolate toward new GPS fix
            changed = true;
            return {
              ...v,
              displayLat: lerp(ip.fromLat, ip.toLat, t),
              displayLon: lerp(ip.fromLon, ip.toLon, t),
            };
          }

          // Phase 2: dead reckon forward from last known position
          // Cap at 30 seconds so buses don't drift too far if GPS stops
          const drElapsed = Math.min(now - ip.drStartTime, 30_000);
          const dr = deadReckon(ip.drLat, ip.drLon, ip.drHeading, ip.drSpeedKmH, drElapsed);
          if (dr.lat === ip.drLat && dr.lon === ip.drLon) return v; // stationary
          changed = true;
          return { ...v, displayLat: dr.lat, displayLon: dr.lon };
        });
        return changed ? next : prev;
      });
      // Always bump tick so toScreen is recalculated with latest regionRef
      setTick((n) => n + 1);
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Firebase real-time subscription
  useEffect(() => {
    const unsub = subscribeToActiveBroadcasts((data) => {
      const now = Date.now();
      setDisplayed((prev) => {
        const prevMap = new Map(prev.map((v) => [v.busNumber, v]));
        return data.map((vehicle) => {
          const existing = prevMap.get(vehicle.busNumber);
          const fromLat = existing?.displayLat ?? vehicle.lat;
          const fromLon = existing?.displayLon ?? vehicle.lon;
          interpRef.current.set(vehicle.busNumber, {
            fromLat, fromLon,
            toLat: vehicle.lat, toLon: vehicle.lon,
            startTime: now,
            // Dead reckoning starts from the new GPS fix
            drLat: vehicle.lat, drLon: vehicle.lon,
            drHeading: vehicle.heading,
            drSpeedKmH: vehicle.speedKmH,
            drStartTime: now + POLL_INTERVAL_MS, // begins after interp finishes
          });
          return { ...vehicle, displayLat: fromLat, displayLon: fromLon };
        });
      });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDing = async () => {
    if (!selected?.expoPushToken || dingSent) return;
    setDingSent(true);
    await sendDing(selected.expoPushToken, selected.busNumber);
    setTimeout(() => setDingSent(false), 300000); // 5 min cooldown
  };

  const focusVehicle = (vehicle: DisplayVehicle) => {
    setDingSent(false);
    setSelected(vehicle);
    mapRef.current?.animateToRegion(
      {
        latitude: vehicle.displayLat,
        longitude: vehicle.displayLon,
        latitudeDelta: 0.008,
        longitudeDelta: 0.006,
      },
      600
    );
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        sizeRef.current = { width, height };
      }}
    >
      {/* Map — fills screen, touch events pass through to circles above */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={TORONTO_REGION}
        customMapStyle={darkMapStyle}
        showsUserLocation={false}
        showsTraffic={false}
        showsBuildings={false}
        onRegionChange={(r) => { regionRef.current = r; }}
      />

      {/* ── Overlay circles ─────────────────────────────────────────────── */}
      {displayed.map((vehicle) => {
        const { x, y } = toScreen(vehicle.displayLat, vehicle.displayLon);
        return (
          <TouchableOpacity
            key={vehicle.busNumber}
            style={[styles.circle, { left: x - CIRCLE / 2, top: y - CIRCLE / 2 }]}
            onPress={() => focusVehicle(vehicle)}
            activeOpacity={0.8}
          >
            <Text style={styles.busNum} numberOfLines={1} adjustsFontSizeToFit>#{vehicle.busNumber}</Text>
            {vehicle.garage ? (
              <Text style={styles.garageText} numberOfLines={1} adjustsFontSizeToFit>{vehicle.garage}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}

      {/* ── UI chrome ───────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {displayed.length}{' '}
          {displayed.length === 1 ? 'operator' : 'operators'} live
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading live operators...</Text>
        </View>
      )}

      {!loading && displayed.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No operators broadcasting</Text>
          <Text style={styles.emptyBody}>
            When an operator taps "Broadcast Location", they'll appear here.
          </Text>
        </View>
      )}

      {selected && (
        <TouchableOpacity
          style={styles.infoCard}
          onPress={() => setSelected(null)}
          activeOpacity={0.95}
        >
          <View style={styles.infoRow}>
            <Avatar config={selected.avatarConfig} size={52} />
            <View style={styles.infoText}>
              <Text style={styles.infoName}>{selected.operatorName}</Text>
              <Text style={styles.infoBadge}>Badge #{selected.badgeNumber}</Text>
              <Text style={styles.infoBus}>Bus #{selected.busNumber}</Text>
              {selected.garage ? (
                <Text style={styles.infoGarage}>{selected.garage}</Text>
              ) : null}
              {selected.routeTag ? (
                <Text style={styles.infoRoute}>Route {selected.routeTag}</Text>
              ) : null}
              <Text style={styles.infoSpeed}>
                {Math.round(selected.speedKmH)} km/h
              </Text>
              <Text style={[
                styles.infoFreshness,
                selected.secsSinceReport > 60 ? styles.infoStale : styles.infoFresh,
              ]}>
                GPS updated {selected.secsSinceReport}s ago
              </Text>
            </View>
          </View>
          {selected.expoPushToken && (
            <TouchableOpacity
              style={[styles.dingBtn, dingSent && styles.dingBtnSent]}
              onPress={handleDing}
              disabled={dingSent}
            >
              <Text style={styles.dingBtnText}>
                {dingSent ? '✓ Ding sent — wait 5 min' : '🔔 Ding Driver'}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.infoDismiss}>Tap card to dismiss</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Overlay bus circle ───────────────────────────────────────────────────
  circle: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: '#1565C0',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    overflow: 'hidden',
    paddingHorizontal: 3,
    // Shadow so circles stand out against pale map tiles
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 6,
  },
  busNum: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 11,
    textAlign: 'center',
  },
  garageText: {
    color: '#90CAF9',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 8,
    textAlign: 'center',
  },

  // ── Chrome ───────────────────────────────────────────────────────────────
  backBtn: {
    position: 'absolute', top: 56, left: 16, zIndex: 10,
    backgroundColor: Colors.surface, paddingHorizontal: 16,
    paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  backBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },

  countBadge: {
    position: 'absolute', top: 56, right: 16, zIndex: 10,
    backgroundColor: Colors.primary, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20,
  },
  countText: { color: Colors.white, fontWeight: '700', fontSize: 13 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.85)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },

  emptyCard: {
    position: 'absolute', bottom: 40, left: 24, right: 24,
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyBody:  { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },

  infoCard: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
    backgroundColor: Colors.surface, borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: Colors.border,
  },
  infoRow:    { flexDirection: 'row', gap: 16, alignItems: 'center' },
  infoText:   { flex: 1 },
  infoName:   { color: Colors.white, fontSize: 17, fontWeight: '700' },
  infoBadge:  { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  infoBus:    { color: Colors.primary, fontSize: 14, fontWeight: '600', marginTop: 4 },
  infoGarage: { color: Colors.accent, fontSize: 13, fontWeight: '700', marginTop: 2 },
  infoRoute:  { color: Colors.textSecondary, fontSize: 13 },
  infoSpeed:  { color: Colors.success, fontSize: 13, fontWeight: '600', marginTop: 2 },
  infoFreshness: { fontSize: 11, marginTop: 2 },
  infoFresh:     { color: Colors.success },
  infoStale:     { color: '#F59E0B' },
  dingBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  dingBtnSent: { backgroundColor: Colors.success },
  dingBtnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  infoDismiss: {
    color: Colors.grayDark, fontSize: 11, textAlign: 'center', marginTop: 10,
  },
});

const darkMapStyle = [
  { elementType: 'geometry',            stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#8EC3B0' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#1A3646' }] },
  { featureType: 'road', elementType: 'geometry',        stylers: [{ color: '#16213e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f3460' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#0f3460' }] },
  { featureType: 'transit',  elementType: 'geometry',    stylers: [{ color: '#2f3948' }] },
  { featureType: 'water',    elementType: 'geometry',    stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

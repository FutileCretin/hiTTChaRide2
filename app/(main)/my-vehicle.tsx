// Broadcast Location screen
// Operator enters their bus number + selects their garage → broadcasts live position for 1 hour

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { startBroadcast, stopBroadcast, BROADCAST_DURATION_MS, GarageCode } from '../../services/vehicleBroadcast';
import { getStoredBadge, getUserProfile, UserProfile } from '../../services/auth';
import { collection, query, where, getDocs, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const GARAGES: GarageCode[] = ['AGRA', 'QSGA', 'MDGA', 'WLGA', 'EGGA', 'BRGA', 'MLGA', 'MNGA'];
const SCHEDULE_DELAY_MS = 30 * 60 * 1000; // 30 minutes
const ADMIN_BADGE = ['82821', '69950'];

type ScreenMode = 'input' | 'scheduled' | 'broadcasting';

export default function FollowMyBusScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode]                     = useState<ScreenMode>('input');
  const [checking, setChecking]             = useState(true);
  const [busNumber, setBusNumber]           = useState('');
  const [selectedGarage, setSelectedGarage] = useState<GarageCode | null>(null);
  const [profile, setProfile]               = useState<UserProfile | null>(null);
  const [broadcastTimeLeft, setBroadcastTimeLeft] = useState(BROADCAST_DURATION_MS);
  const [scheduleTimeLeft, setScheduleTimeLeft]   = useState(SCHEDULE_DELAY_MS);
  const [currentLat, setCurrentLat]         = useState<number | null>(null);
  const [currentLon, setCurrentLon]         = useState<number | null>(null);

  const stopBroadcastFn   = useRef<(() => void) | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduleTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim         = useRef(new Animated.Value(1)).current;
  const busNumberRef      = useRef(busNumber);
  const profileRef        = useRef(profile);
  const garageRef         = useRef(selectedGarage);

  // Keep refs in sync with state so the schedule timer can access fresh values
  useEffect(() => { busNumberRef.current = busNumber; }, [busNumber]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { garageRef.current = selectedGarage; }, [selectedGarage]);

  // Re-check broadcast/scheduled state every time screen gains focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setChecking(true);

      getStoredBadge().then(async (badge) => {
        if (!badge || !active) return;
        const p = await getUserProfile(badge);
        if (!active) return;
        setProfile(p);

        if (p && !ADMIN_BADGE.includes(p.badgeNumber)) {
          // Check for active broadcast
          const snap = await getDocs(
            query(collection(db, 'activeBroadcasts'), where('badgeNumber', '==', badge))
          );
          if (!active) return;
          if (!snap.empty) {
            const data = snap.docs[0].data();
            setBusNumber(data.busNumber ?? '');
            setSelectedGarage(data.garageCode ?? null);
            const started = data.broadcastStarted?.toMillis?.() ?? Date.now();
            const elapsed = Date.now() - started;
            const remaining = Math.max(0, BROADCAST_DURATION_MS - elapsed);
            setBroadcastTimeLeft(remaining);
            setMode('broadcasting');
            setChecking(false);
            return;
          }

          // Check for scheduled broadcast
          const schedSnap = await getDocs(
            query(collection(db, 'scheduledBroadcasts'), where('badgeNumber', '==', badge))
          );
          if (!active) return;
          if (!schedSnap.empty) {
            const data = schedSnap.docs[0].data();
            const scheduledAt = data.scheduledAt?.toMillis?.() ?? Date.now();
            const elapsed = Date.now() - scheduledAt;
            const remaining = Math.max(0, SCHEDULE_DELAY_MS - elapsed);
            if (remaining > 0) {
              setBusNumber(data.busNumber ?? '');
              setSelectedGarage(data.garageCode ?? null);
              setScheduleTimeLeft(remaining);
              setMode('scheduled');
              setChecking(false);
              return;
            } else {
              // Scheduled time already passed while app was away — clean up
              await deleteDoc(doc(db, 'scheduledBroadcasts', badge));
            }
          }
        }

        setMode('input');
        setChecking(false);
      });

      return () => { active = false; };
    }, [])
  );

  // Pulsing animation
  useEffect(() => {
    if (mode === 'broadcasting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [mode]);

  // Broadcast countdown timer
  useEffect(() => {
    if (mode === 'broadcasting') {
      const startTime = Date.now();
      const initialLeft = broadcastTimeLeft;
      broadcastTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = initialLeft - elapsed;
        if (remaining <= 0) {
          clearInterval(broadcastTimerRef.current!);
          setBroadcastTimeLeft(0);
        } else {
          setBroadcastTimeLeft(remaining);
        }
      }, 1000);
    } else {
      if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current);
    }
    return () => { if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current); };
  }, [mode]);

  // Schedule countdown timer
  useEffect(() => {
    if (mode === 'scheduled') {
      const startTime = Date.now();
      const initialLeft = scheduleTimeLeft;
      scheduleTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = initialLeft - elapsed;
        if (remaining <= 0) {
          clearInterval(scheduleTimerRef.current!);
          setScheduleTimeLeft(0);
          // Clean up scheduled broadcast from Firestore
          const badge = profileRef.current?.badgeNumber;
          if (badge) deleteDoc(doc(db, 'scheduledBroadcasts', badge));
          // Use refs to avoid stale closure — access fresh busNumber/profile/garage
          const trimmed = busNumberRef.current.trim();
          const p = profileRef.current;
          if (!trimmed || !p) return;
          setBroadcastTimeLeft(BROADCAST_DURATION_MS);
          setMode('broadcasting');
          const stop = startBroadcast(
            trimmed, p.badgeNumber, p.name, p.avatarConfig, garageRef.current,
            (lat, lon) => { setCurrentLat(lat); setCurrentLon(lon); },
            () => { stopBroadcastFn.current = null; setMode('input'); Alert.alert('Broadcast Ended', 'Your 1-hour broadcast session has ended.', [{ text: 'OK', onPress: () => router.replace('/(main)/home') }]); },
            () => { stopBroadcastFn.current = null; setMode('input'); Alert.alert('Bus Not Found', `Bus #${trimmed} isn't showing up in the TTC system right now.`); }
          );
          stopBroadcastFn.current = stop;
        } else {
          setScheduleTimeLeft(remaining);
        }
      }, 1000);
    } else {
      if (scheduleTimerRef.current) clearInterval(scheduleTimerRef.current);
    }
    return () => { if (scheduleTimerRef.current) clearInterval(scheduleTimerRef.current); };
  }, [mode]);

  const handleStart = () => {
    const trimmed = busNumber.trim();
    if (!trimmed) {
      Alert.alert('Enter bus number', 'Please enter your bus number to start broadcasting.');
      return;
    }
    if (!profile) return;

    setBroadcastTimeLeft(BROADCAST_DURATION_MS);
    setMode('broadcasting');

    const stop = startBroadcast(
      trimmed,
      profile.badgeNumber,
      profile.name,
      profile.avatarConfig,
      selectedGarage,
      (lat, lon) => {
        setCurrentLat(lat);
        setCurrentLon(lon);
      },
      () => {
        stopBroadcastFn.current = null;
        setMode('input');
        Alert.alert(
          'Broadcast Ended',
          'Your 1-hour broadcast session has ended.',
          [{ text: 'OK', onPress: () => router.replace('/(main)/home') }]
        );
      },
      () => {
        stopBroadcastFn.current = null;
        setMode('input');
        Alert.alert(
          'Bus Not Found',
          `Bus #${trimmed} isn't showing up in the TTC system right now.\n\nThis can happen if the bus transponder is off or the vehicle is out of service. Try again in a moment, or check that you entered the vehicle number correctly.`
        );
      }
    );

    stopBroadcastFn.current = stop;
  };

  const handleSchedule = async () => {
    const trimmed = busNumber.trim();
    if (!trimmed) {
      Alert.alert('Enter bus number', 'Please enter your bus number first.');
      return;
    }
    if (!profile) return;

    // Persist scheduled state to Firestore so it survives navigation
    await setDoc(doc(db, 'scheduledBroadcasts', profile.badgeNumber), {
      badgeNumber: profile.badgeNumber,
      busNumber: trimmed,
      garageCode: selectedGarage,
      scheduledAt: serverTimestamp(),
    });

    setMode('scheduled');
  };

  const handleStop = () => {
    Alert.alert(
      'Stop Broadcasting',
      'Are you sure you want to stop broadcasting your location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            if (stopBroadcastFn.current) {
              stopBroadcastFn.current();
            } else {
              // Restored from Firestore after navigation — stop directly
              stopBroadcast(busNumber);
            }
            stopBroadcastFn.current = null;
            setMode('input');
            router.replace('/(main)/home');
          },
        },
      ]
    );
  };

  const handleCancelSchedule = () => {
    Alert.alert(
      'Cancel Scheduled Broadcast',
      'Are you sure you want to cancel the scheduled broadcast?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Broadcast',
          style: 'destructive',
          onPress: () => {
            // Remove scheduled broadcast from Firestore
            if (profile) deleteDoc(doc(db, 'scheduledBroadcasts', profile.badgeNumber));
            setMode('input');
          },
        },
      ]
    );
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Loading (checking broadcast state) ───────────────────
  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  // ── Scheduled (30-min countdown) view ────────────────────
  if (mode === 'scheduled') {
    return (
      <View style={[styles.broadcastContainer, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.pulseCircle, styles.pulseCircleScheduled]}>
          <View style={[styles.innerCircle, styles.innerCircleScheduled]}>
            <Text style={styles.broadcastIcon}>⏱</Text>
          </View>
        </Animated.View>

        <Text style={[styles.broadcastTitle, styles.scheduledTitle]}>Starting Soon</Text>
        <Text style={styles.broadcastBusNum}>Bus #{busNumber}</Text>

        {selectedGarage && (
          <View style={styles.garageBadgeLarge}>
            <Text style={styles.garageBadgeLargeText}>{selectedGarage}</Text>
          </View>
        )}

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Broadcast starts in</Text>
          <Text style={styles.timerValue}>{formatTime(scheduleTimeLeft)}</Text>
        </View>

        <Text style={styles.backgroundNote}>
          Keep the app open. Broadcasting will begin automatically when the timer ends.
        </Text>

        <TouchableOpacity style={styles.stopButton} onPress={handleCancelSchedule}>
          <Text style={styles.stopButtonText}>Cancel Scheduled Broadcast</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Broadcasting active view ──────────────────────────────
  if (mode === 'broadcasting') {
    return (
      <View style={[styles.broadcastContainer, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.innerCircle}>
            <Text style={styles.broadcastIcon}>📡</Text>
          </View>
        </Animated.View>

        <Text style={styles.broadcastTitle}>Broadcasting</Text>
        <Text style={styles.broadcastBusNum}>Bus #{busNumber}</Text>

        {selectedGarage && (
          <View style={styles.garageBadgeLarge}>
            <Text style={styles.garageBadgeLargeText}>{selectedGarage}</Text>
          </View>
        )}

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Time remaining</Text>
          <Text style={styles.timerValue}>{formatTime(broadcastTimeLeft)}</Text>
        </View>

        {currentLat !== null && (
          <View style={styles.coordContainer}>
            <Text style={styles.coordLabel}>Last known position</Text>
            <Text style={styles.coordValue}>
              {currentLat.toFixed(5)}, {currentLon?.toFixed(5)}
            </Text>
          </View>
        )}

        <Text style={styles.backgroundNote}>
          Broadcasting continues in the background even with your phone locked.
        </Text>

        <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
          <Text style={styles.stopButtonText}>Stop Broadcasting</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Entry view ────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Broadcast Location</Text>
      <Text style={styles.screenSub}>
        Enter your bus number and select your garage to start sharing your live location for 1 hour.
      </Text>

      {/* Bus number input */}
      <Text style={styles.inputLabel}>Bus Number</Text>
      <TextInput
        style={styles.input}
        value={busNumber}
        onChangeText={setBusNumber}
        placeholder="e.g. 1234"
        placeholderTextColor={Colors.grayDark}
        keyboardType="numeric"
        maxLength={6}
      />

      {/* Garage selector */}
      <Text style={styles.inputLabel}>Select Your Garage / Division</Text>
      <View style={styles.garageGrid}>
        {GARAGES.map((garage) => (
          <TouchableOpacity
            key={garage}
            style={[
              styles.garageBtn,
              selectedGarage === garage && styles.garageBtnSelected,
            ]}
            onPress={() => setSelectedGarage(selectedGarage === garage ? null : garage)}
          >
            <Text style={[
              styles.garageBtnText,
              selectedGarage === garage && styles.garageBtnTextSelected,
            ]}>
              {garage}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          • Location refreshes every 8 seconds{'\n'}
          • Broadcast lasts 1 hour then stops automatically{'\n'}
          • Your garage tag shows above your icon on the map{'\n'}
          • Works with your phone screen off
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.startButton, !busNumber.trim() && styles.startButtonDisabled]}
        onPress={handleStart}
        disabled={!busNumber.trim()}
      >
        <Text style={styles.startButtonText}>Start Broadcasting</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.scheduleButton, !busNumber.trim() && styles.startButtonDisabled]}
        onPress={handleSchedule}
        disabled={!busNumber.trim()}
      >
        <Text style={styles.scheduleButtonText}>⏱  Broadcast in 30 min</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    marginBottom: 24,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  screenTitle: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
  },
  screenSub: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  garageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  garageBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: '22%',
    alignItems: 'center',
  },
  garageBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  garageBtnText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  garageBtnTextSelected: {
    color: Colors.white,
  },
  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonDisabled: {
    opacity: 0.4,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  scheduleButton: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  scheduleButtonText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  // Broadcasting / Scheduled state
  broadcastContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  pulseCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(76,175,80,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    marginBottom: 8,
  },
  pulseCircleScheduled: {
    backgroundColor: 'rgba(21,101,192,0.2)',
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.broadcastingBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.broadcasting,
  },
  innerCircleScheduled: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(21,101,192,0.15)',
  },
  broadcastIcon: {
    fontSize: 40,
  },
  broadcastTitle: {
    color: Colors.broadcasting,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
  },
  scheduledTitle: {
    color: Colors.primary,
  },
  broadcastBusNum: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 12,
  },
  garageBadgeLarge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  garageBadgeLargeText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 1,
  },
  timerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timerLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  timerValue: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: '800',
  },
  coordContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coordLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  coordValue: {
    color: Colors.grayLight,
    fontSize: 12,
    fontWeight: '600',
  },
  backgroundNote: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 19,
  },
  stopButton: {
    backgroundColor: Colors.grayDark,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  stopButtonText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
});

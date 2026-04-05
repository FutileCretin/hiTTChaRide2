// Broadcast Location screen
// Operator enters their bus number + selects their garage → broadcasts live position for 1 hour

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { startBroadcast, stopBroadcast, BROADCAST_DURATION_MS, GarageCode } from '../../services/vehicleBroadcast';
import { getStoredBadge, getUserProfile, UserProfile } from '../../services/auth';

const GARAGES: GarageCode[] = ['AGRA', 'QSGA', 'MDGA', 'WLGA', 'EGGA', 'BRGA', 'MLGA', 'MNGA'];

export default function FollowMyBusScreen() {
  const [busNumber, setBusNumber] = useState('');
  const [selectedGarage, setSelectedGarage] = useState<GarageCode | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [timeLeft, setTimeLeft] = useState(BROADCAST_DURATION_MS);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);

  const stopBroadcastFn = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getStoredBadge().then((badge) => {
      if (badge) getUserProfile(badge).then(setProfile);
    });
  }, []);

  // Pulsing animation
  useEffect(() => {
    if (broadcasting) {
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
  }, [broadcasting]);

  // Countdown timer
  useEffect(() => {
    if (broadcasting) {
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = BROADCAST_DURATION_MS - elapsed;
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          setTimeLeft(0);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(BROADCAST_DURATION_MS);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [broadcasting]);

  const handleStart = () => {
    const trimmed = busNumber.trim();
    if (!trimmed) {
      Alert.alert('Enter bus number', 'Please enter your bus number to start broadcasting.');
      return;
    }
    if (!profile) return;

    setBroadcasting(true);

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
        setBroadcasting(false);
        stopBroadcastFn.current = null;
        Alert.alert(
          'Broadcast Ended',
          'Your 1-hour broadcast session has ended.',
          [{ text: 'OK', onPress: () => router.replace('/(main)/home') }]
        );
      },
      () => {
        // Bus number not found in TTC feed
        setBroadcasting(false);
        stopBroadcastFn.current = null;
        Alert.alert(
          'Bus Not Found',
          `Bus #${trimmed} isn't showing up in the TTC system right now.\n\nMake sure you entered your vehicle number (not route number) and that your bus is currently active.`
        );
      }
    );

    stopBroadcastFn.current = stop;
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
            stopBroadcastFn.current?.();
            stopBroadcastFn.current = null;
            setBroadcasting(false);
            router.replace('/(main)/home');
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

  // ── Broadcasting active view ──────────────────────────────
  if (broadcasting) {
    return (
      <View style={styles.broadcastContainer}>
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
          <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
  },
  startButtonDisabled: {
    opacity: 0.4,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  // Broadcasting state
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
  broadcastIcon: {
    fontSize: 40,
  },
  broadcastTitle: {
    color: Colors.broadcasting,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
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

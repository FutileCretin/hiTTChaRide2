// Home screen — the main hub with 2 action buttons (+ steward approvals for shop stewards)

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Colors } from '../../constants/colors';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { authenticateWithDevice, clearFirstLoginFlag } from '../../services/auth';
import { needsStewardConfirmation, recordStewardConfirmation } from '../../services/stewardCycle';
import { StewardRecord } from '../../services/stewardCycle';

export default function HomeScreen() {
  const { state, profile, unlock, reload } = useAuth();

  // Reload profile every time home screen comes into focus
  // so avatar changes made in profile/settings are reflected immediately
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [])
  );
  const [locked, setLocked] = useState(true);
  const [stewardPrompt, setStewardPrompt] = useState<StewardRecord | null>(null);
  const [showStewardWelcome, setShowStewardWelcome] = useState(false);

  // Unlock on mount
  useEffect(() => {
    handleUnlock();
  }, []);

  const handleUnlock = async () => {
    const success = await authenticateWithDevice();
    if (success) {
      setLocked(false);
      // Show one-time shop steward welcome if this is their first login
      if ((profile as any)?.firstLogin && profile?.isShopSteward) {
        setShowStewardWelcome(true);
        await clearFirstLoginFlag(profile.badgeNumber);
      } else {
        checkStewardCycle();
      }
    } else {
      Alert.alert('Authentication required', 'You must unlock your device to use hiTTChaRide.');
    }
  };

  const checkStewardCycle = async () => {
    if (!profile) return;
    const { needed, steward } = await needsStewardConfirmation(profile.badgeNumber);
    if (needed && steward) {
      setStewardPrompt(steward);
    }
  };

  const handleStewardResponse = async (confirmed: boolean) => {
    if (!profile || !stewardPrompt) return;
    await recordStewardConfirmation(stewardPrompt.badgeNumber, profile.badgeNumber, confirmed);
    setStewardPrompt(null);
  };

  if (locked) {
    return (
      <View style={styles.lockScreen}>
        <Avatar
          config={profile?.avatarConfig ?? { style: 'conductor', skinTone: Colors.skinTones.lightBrown }}
          size={100}
        />
        <Text style={styles.lockTitle}>hiTTChaRide</Text>
        <Text style={styles.lockSub}>Unlock your device to continue</Text>
        <TouchableOpacity style={styles.unlockBtn} onPress={handleUnlock}>
          <Text style={styles.unlockBtnText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
          <Avatar
            config={profile?.avatarConfig ?? { style: 'conductor', skinTone: Colors.skinTones.lightBrown }}
            size={56}
          />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.name}>{profile?.name ?? 'Operator'}</Text>
          <Text style={styles.badge}>Badge #{profile?.badgeNumber}</Text>
        </View>
        {/* Gear / Settings icon */}
        <TouchableOpacity
          style={styles.gearBtn}
          onPress={() => router.push('/(main)/profile')}
        >
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Main action buttons */}
      <View style={styles.buttonSection}>
        <Text style={styles.sectionTitle}>What would you like to do?</Text>

        {/* Track Vehicle */}
        <TouchableOpacity
          style={[styles.actionButton, styles.trackButton]}
          onPress={() => router.push('/(main)/track')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionIcon}>🗺</Text>
          <Text style={styles.actionTitle}>Hitch a Ride</Text>
          <Text style={styles.actionDesc}>
            See all operators currently broadcasting on the map
          </Text>
        </TouchableOpacity>

        {/* My Vehicle */}
        <TouchableOpacity
          style={[styles.actionButton, styles.myVehicleButton]}
          onPress={() => router.push('/(main)/my-vehicle')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionIcon}>📡</Text>
          <Text style={styles.actionTitle}>Broadcast Location</Text>
          <Text style={styles.actionDesc}>
            Enter your bus number to start broadcasting your location for 1 hour
          </Text>
        </TouchableOpacity>

        {/* Pending Approvals — visible to shop stewards only */}
        {profile?.isShopSteward && (
          <TouchableOpacity
            style={[styles.actionButton, styles.stewardButton]}
            onPress={() => router.push('/(main)/approvals')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionTitle}>Pending Approvals</Text>
            <Text style={styles.actionDesc}>
              Review and approve operator registration requests
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* One-time Shop Steward Welcome Modal */}
      <Modal visible={showStewardWelcome} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🎖</Text>
            <Text style={styles.modalTitle}>Welcome, Shop Steward</Text>
            <Text style={styles.modalBody}>
              Your badge has been pre-registered with shop steward privileges.{'\n\n'}
              You have full access to the app plus a{' '}
              <Text style={styles.modalHighlight}>Pending Approvals</Text>
              {' '}section on your home screen to review and approve operator registrations.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnYes, { marginTop: 20 }]}
              onPress={() => {
                setShowStewardWelcome(false);
                checkStewardCycle();
              }}
            >
              <Text style={styles.modalBtnText}>Let's Go</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shop Steward Confirmation Modal */}
      <Modal
        visible={stewardPrompt !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Shop Steward Confirmation</Text>
            <Text style={styles.modalBody}>
              Is{' '}
              <Text style={styles.modalHighlight}>{stewardPrompt?.name}</Text>
              {' '}still your shop steward?
            </Text>
            <Text style={styles.modalSub}>Badge #{stewardPrompt?.badgeNumber}</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnYes]}
                onPress={() => handleStewardResponse(true)}
              >
                <Text style={styles.modalBtnText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnNo]}
                onPress={() => handleStewardResponse(false)}
              >
                <Text style={styles.modalBtnText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  lockScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  lockTitle: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '800',
  },
  lockSub: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  unlockBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
  },
  unlockBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 48,
  },
  gearBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  name: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  },
  buttonSection: {
    flex: 1,
  },
  actionButton: {
    borderRadius: 20,
    padding: 28,
    marginBottom: 16,
  },
  trackButton: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  myVehicleButton: {
    backgroundColor: Colors.primary,
  },
  stewardButton: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  actionTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  actionDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
  },
  modalTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalBody: {
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 4,
  },
  modalHighlight: {
    color: Colors.white,
    fontWeight: '700',
  },
  modalSub: {
    color: Colors.primary,
    fontSize: 13,
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnYes: {
    backgroundColor: Colors.success,
  },
  modalBtnNo: {
    backgroundColor: Colors.grayDark,
  },
  modalBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});

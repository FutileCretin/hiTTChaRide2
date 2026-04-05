// Home screen

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { authenticateWithDevice, clearFirstLoginFlag } from '../../services/auth';
import { needsStewardConfirmation, recordStewardConfirmation } from '../../services/stewardCycle';
import { StewardRecord } from '../../services/stewardCycle';
import {
  subscribeToMyPendingAppointment,
  subscribeToActiveCommunityVote,
  respondToAppointment,
  voteOnAppointment,
  AppointmentRecord,
} from '../../services/stewardAppointment';

export default function HomeScreen() {
  const { state, profile, unlock, reload } = useAuth();

  useFocusEffect(
    useCallback(() => { reload(); }, [])
  );

  const [locked, setLocked]                         = useState(true);
  const [stewardPrompt, setStewardPrompt]           = useState<StewardRecord | null>(null);
  const [showStewardWelcome, setShowStewardWelcome] = useState(false);
  const [appointmentOffer, setAppointmentOffer]     = useState<AppointmentRecord | null>(null);
  const [communityVote, setCommunityVote]           = useState<AppointmentRecord | null>(null);

  // Unlock on mount
  useEffect(() => { handleUnlock(); }, []);

  // Subscribe to appointment events once we have a profile
  useEffect(() => {
    if (!profile) return;

    const unsub1 = subscribeToMyPendingAppointment(
      profile.badgeNumber,
      setAppointmentOffer
    );

    const unsub2 = subscribeToActiveCommunityVote(
      profile.badgeNumber,
      setCommunityVote
    );

    return () => { unsub1(); unsub2(); };
  }, [profile?.badgeNumber]);

  const handleUnlock = async () => {
    const success = await authenticateWithDevice();
    if (success) {
      setLocked(false);
      if ((profile as any)?.firstLogin && (profile?.isShopSteward || profile?.isAdmin)) {
        setShowStewardWelcome(true);
        await clearFirstLoginFlag(profile!.badgeNumber);
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
    if (needed && steward) setStewardPrompt(steward);
  };

  const handleStewardResponse = async (confirmed: boolean) => {
    if (!profile || !stewardPrompt) return;
    await recordStewardConfirmation(stewardPrompt.badgeNumber, profile.badgeNumber, confirmed);
    setStewardPrompt(null);
  };

  const handleAppointmentResponse = async (accept: boolean) => {
    if (!appointmentOffer || !profile) return;
    await respondToAppointment(
      appointmentOffer.id,
      accept,
      profile.badgeNumber,
      appointmentOffer.previousStewardBadge
    );
    setAppointmentOffer(null);
    if (accept) await reload(); // refresh profile so steward tools appear immediately
  };

  const handleCommunityVote = async (vote: boolean) => {
    if (!communityVote || !profile) return;
    await voteOnAppointment(communityVote.id, profile.badgeNumber, vote);
    setCommunityVote(null);
  };

  // Helper — does this user have elevated access?
  const hasElevatedAccess = profile?.isShopSteward || profile?.isAdmin;

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
        <TouchableOpacity style={styles.gearBtn} onPress={() => router.push('/(main)/profile')}>
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Main action buttons */}
      <View style={styles.buttonSection}>
        <Text style={styles.sectionTitle}>What would you like to do?</Text>

        <TouchableOpacity
          style={[styles.actionButton, styles.trackButton]}
          onPress={() => router.push('/(main)/track')}
          activeOpacity={0.85}
        >
          <Image source={require('../../assets/images/icon.png')} style={styles.actionIcon} />
          <Text style={styles.actionTitle}>Hitch a Ride</Text>
          <Text style={styles.actionDesc}>
            See all operators currently broadcasting on the map
          </Text>
        </TouchableOpacity>

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

        {hasElevatedAccess && (
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

      {/* ── MODAL 1: Appointment offer (full-screen) ── */}
      <Modal visible={appointmentOffer !== null} transparent animationType="fade">
        <View style={styles.fullScreenOverlay}>
          <View style={styles.appointmentCard}>
            <Text style={styles.appointmentIcon}>🎖</Text>
            <Text style={styles.appointmentTitle}>
              You've Been Appointed Shop Steward
            </Text>
            <Text style={styles.appointmentBody}>
              <Text style={styles.modalHighlight}>{appointmentOffer?.appointingName}</Text>
              {' '}(Badge #{appointmentOffer?.appointingBadge}) has appointed you as the new{' '}
              <Text style={styles.modalHighlight}>Shop Steward</Text> for hiTTChaRide.
            </Text>
            {appointmentOffer?.previousStewardBadge ? (
              <Text style={styles.appointmentStepping}>
                {appointmentOffer.previousStewardName} (Badge #{appointmentOffer.previousStewardBadge}) is stepping down.
              </Text>
            ) : null}
            <Text style={styles.appointmentNote}>
              As Shop Steward you will approve new operator registrations and manage the community.
              You can hand over this role at any time.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnNo]}
                onPress={() => handleAppointmentResponse(false)}
              >
                <Text style={styles.modalBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnYes]}
                onPress={() => handleAppointmentResponse(true)}
              >
                <Text style={styles.modalBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: Community vote ── */}
      <Modal visible={communityVote !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.communityIcon}>📣</Text>
            <Text style={styles.modalTitle}>New Shop Steward</Text>
            <Text style={styles.modalBody}>
              <Text style={styles.modalHighlight}>{communityVote?.appointedName}</Text>
              {' '}(Badge #{communityVote?.appointedBadge}) has accepted the role of{' '}
              <Text style={styles.modalHighlight}>Shop Steward</Text>.
            </Text>
            {communityVote?.previousStewardBadge ? (
              <Text style={styles.modalBody}>
                {communityVote.previousStewardName} has stepped down.
              </Text>
            ) : null}
            <Text style={[styles.modalBody, { marginTop: 12, fontStyle: 'italic' }]}>
              Do you recognise this as a legitimate appointment?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnNo]}
                onPress={() => handleCommunityVote(false)}
              >
                <Text style={styles.modalBtnText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnYes]}
                onPress={() => handleCommunityVote(true)}
              >
                <Text style={styles.modalBtnText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: One-time Shop Steward welcome ── */}
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
              onPress={() => { setShowStewardWelcome(false); checkStewardCycle(); }}
            >
              <Text style={styles.modalBtnText}>Let's Go</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: 2-month steward confirmation ── */}
      <Modal visible={stewardPrompt !== null} transparent animationType="fade">
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
    flex: 1, backgroundColor: Colors.background,
    paddingTop: 60, paddingHorizontal: 24,
  },
  lockScreen: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  lockTitle:   { color: Colors.white, fontSize: 28, fontWeight: '800' },
  lockSub:     { color: Colors.textSecondary, fontSize: 14 },
  unlockBtn: {
    marginTop: 16, backgroundColor: Colors.primary,
    paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14,
  },
  unlockBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 48 },
  gearBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  gearIcon:    { fontSize: 20 },
  headerText:  { flex: 1 },
  greeting:    { color: Colors.textSecondary, fontSize: 13 },
  name:        { color: Colors.white, fontSize: 20, fontWeight: '700' },
  badge:       { color: Colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },

  sectionTitle: {
    color: Colors.textSecondary, fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20,
  },
  buttonSection: { flex: 1 },
  actionButton:  { borderRadius: 20, padding: 28, marginBottom: 16 },
  trackButton:   { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  myVehicleButton: { backgroundColor: Colors.primary },
  stewardButton: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.primary },
  actionIcon:    { width: 64, height: 64, marginBottom: 12, borderRadius: 12 },
  actionTitle:   { color: Colors.white, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  actionDesc:    { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20 },

  // ── Full-screen appointment overlay ──
  fullScreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  appointmentCard: {
    backgroundColor: Colors.surface, borderRadius: 24,
    padding: 28, width: '100%',
    borderWidth: 2, borderColor: Colors.primary,
  },
  appointmentIcon:     { fontSize: 56, textAlign: 'center', marginBottom: 16 },
  appointmentTitle:    { color: Colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  appointmentBody:     { color: Colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 10 },
  appointmentStepping: { color: Colors.accent, fontSize: 13, marginBottom: 10 },
  appointmentNote:     { color: Colors.grayDark, fontSize: 12, lineHeight: 18, marginBottom: 20 },

  // ── Shared modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard:    { backgroundColor: Colors.surface, borderRadius: 20, padding: 28, width: '100%' },
  communityIcon: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
  modalTitle:   { color: Colors.white, fontSize: 20, fontWeight: '800', marginBottom: 16 },
  modalBody:    { color: Colors.textSecondary, fontSize: 15, lineHeight: 23, marginBottom: 4 },
  modalHighlight: { color: Colors.white, fontWeight: '700' },
  modalSub:     { color: Colors.primary, fontSize: 13, marginBottom: 28 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnYes:  { backgroundColor: Colors.success },
  modalBtnNo:   { backgroundColor: Colors.grayDark },
  modalBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});

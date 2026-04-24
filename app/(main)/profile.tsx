// Profile & Settings screen

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarPicker } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { updateAvatar, signOut } from '../../services/auth';
import { AvatarConfig } from '../../services/vehicleBroadcast';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, reload } = useAuth();
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<AvatarConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const currentAvatar = tempAvatar ?? profile?.avatarConfig ?? {
    style: 'conductor' as const,
    skinTone: Colors.skinTones.lightBrown,
  };

  const handleSaveAvatar = async () => {
    if (!profile || !tempAvatar) return;
    setSaving(true);
    try {
      await updateAvatar(profile.badgeNumber, tempAvatar);
      await reload();
      setEditingAvatar(false);
      setTempAvatar(null);
    } catch (e) {
      Alert.alert('Error', 'Could not save avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need shop steward approval again on a different device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/register');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Profile</Text>

      {/* Avatar display / editor */}
      <View style={styles.avatarSection}>
        <Avatar config={currentAvatar} size={110} />
        <Text style={styles.profileName}>{profile?.name}</Text>
        <Text style={styles.profileBadge}>Badge #{profile?.badgeNumber}</Text>

        {profile?.isShopSteward && !profile?.isAdmin && (
          <View style={styles.stewardBadge}>
            <Text style={styles.stewardBadgeText}>Shop Steward</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.editAvatarBtn}
          onPress={() => {
            setTempAvatar(profile?.avatarConfig ?? currentAvatar);
            setEditingAvatar(true);
          }}
        >
          <Text style={styles.editAvatarBtnText}>Customize Your Avatar</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar picker */}
      {editingAvatar && (
        <View style={styles.pickerCard}>
          <AvatarPicker
            config={tempAvatar ?? currentAvatar}
            onChange={setTempAvatar}
          />
          <View style={styles.pickerActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setEditingAvatar(false);
                setTempAvatar(null);
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveAvatar}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Account info */}
      <View style={styles.infoCard}>
        <InfoRow label="Status" value={profile?.status === 'approved' ? 'Approved ✓' : profile?.status ?? '—'} />
        <InfoRow label="Device" value="This device (linked)" />
      </View>

      {/* Steward tools — label only shown for named stewards, not admin */}
      {(profile?.isShopSteward || profile?.isAdmin) && (
        <View style={styles.section}>
          {profile?.isShopSteward && !profile?.isAdmin && (
            <Text style={styles.sectionLabel}>Shop Steward Tools</Text>
          )}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(main)/approvals')}
          >
            <Text style={styles.menuItemText}>Pending Approvals</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { marginTop: 10 }]}
            onPress={() => router.push('/(main)/approvals')}
          >
            <Text style={styles.menuItemText}>Appoint Shop Steward</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>hiTTChaRide v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 60,
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
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 28,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  profileName: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 14,
  },
  profileBadge: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  stewardBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  stewardBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  editAvatarBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editAvatarBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  pickerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pickerActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.grayDark,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.white,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItemText: {
    color: Colors.white,
    fontSize: 15,
  },
  menuItemChevron: {
    color: Colors.textSecondary,
    fontSize: 20,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
  version: {
    color: Colors.grayDark,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});

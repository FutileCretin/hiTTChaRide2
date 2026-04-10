// Authentication & device binding service

import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { AvatarConfig } from './vehicleBroadcast';

const BADGE_KEY = 'hittcharide_badge';
const DEVICE_ID_KEY = 'hittcharide_device_id';

export type AccountStatus = 'pending' | 'approved' | 'denied' | 'suspended';

export interface UserProfile {
  badgeNumber: string;
  name: string;
  deviceId: string;
  status: AccountStatus;
  avatarConfig: AvatarConfig;
  isShopSteward: boolean;
  isAdmin?: boolean;          // true only for badge 82821 — hidden super-admin
  stewardApprovedBy?: string;
  registeredAt: Timestamp;
  lastLoginAt?: Timestamp;
}

// Generate or retrieve a stable unique device ID
export async function getDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    // Combine device hardware info with a random suffix for uniqueness
    const base = `${Device.modelId ?? 'unknown'}-${Device.osVersion ?? '0'}`;
    const rand = Math.random().toString(36).substring(2, 10);
    id = `${base}-${rand}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
}

// Get the badge number stored on this device (if any)
export async function getStoredBadge(): Promise<string | null> {
  return SecureStore.getItemAsync(BADGE_KEY);
}

export type RegisterResult =
  | 'registered'          // Regular operator — awaiting approval
  | 'steward_registered'  // Pre-registered shop steward — auto-approved
  | 'device_conflict'     // Existing badge, new device — needs re-approval
  | 'steward_device_conflict'; // Steward on new device — needs re-approval

// Check if a badge has been pre-registered as a shop steward by the admin
export async function isPreRegisteredSteward(badgeNumber: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'preRegisteredStewards', badgeNumber));
  return snap.exists();
}

// Register a new badge on this device
export async function registerBadge(
  badgeNumber: string,
  name: string
): Promise<RegisterResult> {
  const deviceId = await getDeviceId();
  const userRef = doc(db, 'users', badgeNumber);
  const existing = await getDoc(userRef);

  // Check if this badge is a pre-registered shop steward
  const isSteward = await isPreRegisteredSteward(badgeNumber);

  if (existing.exists()) {
    const data = existing.data() as UserProfile;

    if (data.deviceId !== deviceId) {
      // Different device — disable old device, require re-approval
      await updateDoc(userRef, {
        deviceId,
        status: 'pending',
        previousDevice: data.deviceId,
        deviceChangedAt: serverTimestamp(),
      });

      await SecureStore.setItemAsync(BADGE_KEY, badgeNumber);
      return isSteward ? 'steward_device_conflict' : 'device_conflict';
    }

    // Same device — just update stored badge
    await SecureStore.setItemAsync(BADGE_KEY, badgeNumber);
    return isSteward ? 'steward_registered' : 'registered';
  }

  // Brand new badge — create profile
  const defaultAvatar: AvatarConfig = {
    style: 'conductor',
    skinTone: '#C68642',
  };

  const isGodAccount = badgeNumber === '82821';

  // Shop stewards and admin are auto-approved; regular operators wait for approval
  await setDoc(userRef, {
    badgeNumber,
    name,
    deviceId,
    status: (isSteward || isGodAccount) ? 'approved' : 'pending',
    avatarConfig: defaultAvatar,
    isShopSteward: isSteward || isGodAccount,
    isAdmin: isGodAccount,
    registeredAt: serverTimestamp(),
    firstLogin: (isSteward || isGodAccount) ? true : false,
  } as UserProfile & { firstLogin: boolean });

  await SecureStore.setItemAsync(BADGE_KEY, badgeNumber);
  return isSteward ? 'steward_registered' : 'registered';
}

// Clear the firstLogin flag after showing the welcome screen
export async function clearFirstLoginFlag(badgeNumber: string) {
  await updateDoc(doc(db, 'users', badgeNumber), { firstLogin: false });
}

// Load full user profile from Firestore
export async function getUserProfile(badgeNumber: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', badgeNumber));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

// Authenticate using the device's built-in lock screen (PIN, biometric, pattern)
export async function authenticateWithDevice(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    // Device has no biometrics enrolled — still try device credentials
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock hiTTChaRide',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });
    return result.success;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock hiTTChaRide',
    // Uses whatever the device supports: Face ID, fingerprint, PIN, pattern
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });

  return result.success;
}

// Verify the device ID matches what's on record — prevents account sharing
export async function verifyDeviceBinding(badgeNumber: string): Promise<boolean> {
  const deviceId = await getDeviceId();
  const profile = await getUserProfile(badgeNumber);
  if (!profile) return false;
  return profile.deviceId === deviceId;
}

// Update last login timestamp
export async function recordLogin(badgeNumber: string) {
  await updateDoc(doc(db, 'users', badgeNumber), {
    lastLoginAt: serverTimestamp(),
  });
}

// Update user avatar
export async function updateAvatar(badgeNumber: string, avatarConfig: AvatarConfig) {
  await updateDoc(doc(db, 'users', badgeNumber), { avatarConfig });
}

// Sign out — clears local badge storage
export async function signOut() {
  await SecureStore.deleteItemAsync(BADGE_KEY);
}

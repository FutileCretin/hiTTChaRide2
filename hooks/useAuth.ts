// Central auth hook — manages login state across the app

import { useState, useEffect } from 'react';
import {
  getStoredBadge,
  getUserProfile,
  authenticateWithDevice,
  verifyDeviceBinding,
  recordLogin,
  UserProfile,
} from '../services/auth';

type AuthState =
  | 'loading'
  | 'unauthenticated'   // No badge stored, needs registration
  | 'locked'            // Badge found but device unlock needed
  | 'pending'           // Awaiting shop steward approval
  | 'denied'            // Approval denied
  | 'authenticated';    // Fully in

interface UseAuthReturn {
  state: AuthState;
  profile: UserProfile | null;
  error: string | null;
  unlock: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setState('loading');
    setError(null);

    try {
      const badge = await getStoredBadge();
      if (!badge) {
        setState('unauthenticated');
        return;
      }

      // Verify device hasn't been swapped
      const deviceOk = await verifyDeviceBinding(badge);
      if (!deviceOk) {
        setState('unauthenticated');
        return;
      }

      const userProfile = await getUserProfile(badge);
      if (!userProfile) {
        setState('unauthenticated');
        return;
      }

      setProfile(userProfile);

      if (userProfile.status === 'pending') {
        setState('pending');
        return;
      }

      if (userProfile.status === 'denied' || userProfile.status === 'suspended') {
        setState('denied');
        return;
      }

      // Account is approved — require device unlock
      setState('locked');
    } catch (e) {
      setError('Could not connect. Please check your connection.');
      setState('locked');
    }
  };

  const unlock = async () => {
    if (!profile) return;
    setError(null);

    const success = await authenticateWithDevice();
    if (success) {
      await recordLogin(profile.badgeNumber);
      setState('authenticated');
    } else {
      setError('Authentication failed. Please try again.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { state, profile, error, unlock, reload: load };
}

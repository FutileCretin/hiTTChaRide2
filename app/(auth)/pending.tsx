// Waiting for shop steward approval screen

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getStoredBadge } from '../../services/auth';
import { Colors } from '../../constants/colors';
import { Avatar } from '../../components/Avatar';

export default function PendingScreen() {
  const [status, setStatus] = useState<string>('pending');
  const [badge, setBadge] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    getStoredBadge().then((b) => {
      if (!b) {
        router.replace('/(auth)/register');
        return;
      }
      setBadge(b);

      // Listen for status changes in real-time
      unsubscribe = onSnapshot(doc(db, 'users', b), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.status === 'approved') {
          router.replace('/(main)/home');
        } else if (data.status === 'denied') {
          setStatus('denied');
        }
      });
    });

    return () => unsubscribe?.();
  }, []);

  if (status === 'denied') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>✗</Text>
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.body}>
          Your shop steward has denied your registration request.{'\n\n'}
          If you believe this is an error, please speak with your shop steward directly.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/register')}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Avatar config={{ style: 'conductor', skinTone: Colors.skinTones.lightBrown }} size={90} />
      <Text style={styles.title}>Awaiting Approval</Text>
      <Text style={styles.body}>
        Badge #{badge ? badge : '—'} has been submitted.{'\n\n'}
        Your shop steward will review and approve your account.{'\n'}
        This screen will update automatically.
      </Text>
      <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      <Text style={styles.hint}>Keep this screen open or check back later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  body: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  hint: {
    color: Colors.grayDark,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 32,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});

// Entry point — decides where to route based on auth state

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';

export default function Index() {
  const { state } = useAuth();

  useEffect(() => {
    if (state === 'loading') return;

    switch (state) {
      case 'unauthenticated':
        router.replace('/(auth)/register');
        break;
      case 'pending':
        router.replace('/(auth)/pending');
        break;
      case 'denied':
        router.replace('/(auth)/denied');
        break;
      case 'locked':
      case 'authenticated':
        router.replace('/(main)/home');
        break;
    }
  }, [state]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

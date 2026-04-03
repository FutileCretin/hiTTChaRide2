import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(auth)/pending" />
        <Stack.Screen name="(auth)/denied" />
        <Stack.Screen name="(main)/home" />
        <Stack.Screen name="(main)/track" />
        <Stack.Screen name="(main)/my-vehicle" />
        <Stack.Screen name="(main)/profile" />
        <Stack.Screen name="(main)/approvals" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

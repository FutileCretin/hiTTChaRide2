// First-time registration screen
// Operator enters their badge number and name — one badge per device

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { registerBadge } from '../../services/auth';
import type { RegisterResult } from '../../services/auth';

export default function RegisterScreen() {
  const [badge, setBadge] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedBadge = badge.trim();
    const trimmedName = name.trim();

    if (!trimmedBadge || !trimmedName) {
      Alert.alert('Missing info', 'Please enter your badge number and full name.');
      return;
    }

    setLoading(true);
    try {
      const result: RegisterResult = await registerBadge(trimmedBadge, trimmedName);

      switch (result) {
        case 'steward_registered':
          // Pre-registered shop steward — go straight to home, welcome shown there
          router.replace('/(main)/home');
          break;

        case 'steward_device_conflict':
          Alert.alert(
            'New Device Detected',
            'Your shop steward account was registered on a different device. Your previous device has been signed out. Please contact another shop steward to re-approve your new device.',
            [{ text: 'OK', onPress: () => router.replace('/(auth)/pending') }]
          );
          break;

        case 'device_conflict':
          Alert.alert(
            'New Device Detected',
            'Your badge was registered on a different device. Your previous device has been signed out. Your account needs shop steward approval again.',
            [{ text: 'OK', onPress: () => router.replace('/(auth)/pending') }]
          );
          break;

        default:
          // Regular operator — wait for approval
          router.replace('/(auth)/pending');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not register. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo / Icon */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/icon-transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>hiTTChaRide</Text>
          <Text style={styles.tagline}>TTC Operator Vehicle Tracker</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Create Your Account</Text>
          <Text style={styles.formSubtitle}>
            Your account will be reviewed and approved by your shop steward before you can access the app.
          </Text>

          <Text style={styles.label}>Badge Number</Text>
          <TextInput
            style={styles.input}
            value={badge}
            onChangeText={setBadge}
            placeholder="e.g. 12345"
            placeholderTextColor={Colors.grayDark}
            keyboardType="numeric"
            maxLength={10}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. John Smith"
            placeholderTextColor={Colors.grayDark}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Submit for Approval</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
  },
  formTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  formSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 24,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.white,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

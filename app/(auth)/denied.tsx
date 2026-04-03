import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { signOut } from '../../services/auth';

export default function DeniedScreen() {
  const handleTryAgain = async () => {
    await signOut();
    router.replace('/(auth)/register');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✗</Text>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.body}>
        Your shop steward has denied your registration request.{'\n\n'}
        If you believe this is an error, please speak with your shop steward directly.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleTryAgain}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
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
    color: Colors.danger,
    marginBottom: 16,
  },
  title: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  body: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
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

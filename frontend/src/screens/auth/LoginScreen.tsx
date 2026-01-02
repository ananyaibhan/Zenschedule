import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { GoogleSignInButton } from '../../components/common/GoogleSignInButton';
import { colors } from '../../styles/colors';

const LoginScreen = () => {
  const { googleSignIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      console.log('Google Sign-In button clicked');
      await googleSignIn();
      console.log('Sign-in successful, navigating to dashboard...');
    } catch (error: any) {
      console.error(' Sign-in failed:', error);
      Alert.alert('Sign-in Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🧘</Text>
        <Text style={styles.title}>Wellness AI</Text>
        <Text style={styles.subtitle}>Your personal mental health companion</Text>
        
        <View style={styles.buttonContainer}>
          <GoogleSignInButton
            onPress={handleGoogleSignIn}
            loading={loading}
          />
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  footer: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 32,
  },
});

export default LoginScreen;
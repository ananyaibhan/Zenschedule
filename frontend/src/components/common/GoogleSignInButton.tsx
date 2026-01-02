import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { colors } from '../../styles/colors';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const GoogleSignInButton = ({
  onPress,
  loading = false,
  disabled = false,
}: GoogleSignInButtonProps) => {
  const isDisabled = loading || disabled;

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.disabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {loading ? (
          <>
            <ActivityIndicator color={colors.primary} style={styles.loader} />
            <Text style={styles.text}>Signing in...</Text>
          </>
        ) : (
          <>
            <Text style={styles.icon}>G</Text>
            <Text style={styles.text}>Continue with Google</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
    color: colors.primary,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
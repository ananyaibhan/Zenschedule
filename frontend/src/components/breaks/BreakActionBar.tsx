// ============================================
// File: src/components/breaks/BreakActionBar.tsx
// ============================================
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button } from '../common/Button';
import { colors } from '../../styles/colors';

interface Props {
  status: 'upcoming' | 'active' | 'completed';
  onStart: () => void;
  onComplete: () => void;
}

export const BreakActionBar: React.FC<Props> = ({
  status,
  onStart,
  onComplete,
}) => {
  if (status === 'completed') {
    return (
      <View style={styles.completedContainer}>
        <Text style={styles.completedText}>✅ Completed</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {status === 'upcoming' && (
        <Button 
          title="Start Break" 
          onPress={onStart}
          style={styles.actionButton}
        />
      )}

      {status === 'active' && (
        <Button 
          title="Mark Complete" 
          onPress={onComplete}
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  actionButton: {
    width: '100%',
  },
  completedContainer: {
    padding: 12,
    backgroundColor: colors.success + '10',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
});
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';

interface Props {
  durationMinutes: number;
  onFinish: () => void;
}

export const BreakTimer: React.FC<Props> = ({ durationMinutes, onFinish }) => {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onFinish();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <Text style={styles.timer}>
      ⏱ {mins}:{secs.toString().padStart(2, '0')}
    </Text>
  );
};

const styles = StyleSheet.create({
  timer: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SliderInput } from '../../components/common/SliderInput';
import { TextArea } from '../../components/common/TextArea';
import { checkinService } from '../../services/checkinService';
import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

const AfternoonCheckinScreen = () => {
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [focus, setFocus] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const response = await checkinService.submitAfternoonCheckin({
        mood,
        energy,
        stress,
        focus,
        notes,
      });

      Alert.alert(
        'Afternoon Check-in Complete ☀️',
        response?.message || 'Thanks for checking in!'
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Unable to submit afternoon check-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={commonStyles.container}>
        <Text style={styles.title}>☀️ Afternoon Check-in</Text>
        <Text style={styles.subtitle}>
          Quick mid-day pulse to adjust your rest of the day
        </Text>

        <Card style={styles.card}>
          <SliderInput label="Mood" value={mood} onChange={setMood} />
          <SliderInput label="Energy" value={energy} onChange={setEnergy} />
          <SliderInput label="Stress" value={stress} onChange={setStress} />
          <SliderInput label="Focus" value={focus} onChange={setFocus} />

          <TextArea
            label="Anything affecting you right now?"
            placeholder="Meetings, tiredness, distractions..."
            value={notes}
            onChangeText={setNotes}
          />

          <Button
            title={loading ? 'Submitting...' : 'Submit Check-in'}
            onPress={handleSubmit}
            disabled={loading}
            style={styles.submitBtn}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    color: colors.text.secondary,
  },
  card: {
    padding: 16,
  },
  submitBtn: {
    marginTop: 20,
  },
});

export default AfternoonCheckinScreen;

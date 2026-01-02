import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { checkinService } from '../../services/checkinService';
import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

const EveningCheckinScreen = () => {
  const navigation = useNavigation();
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [productivity, setProductivity] = useState(5);
  const [notes, setNotes] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [goalsAchieved, setGoalsAchieved] = useState(true);
  const [loading, setLoading] = useState(false);

  const getMoodEmoji = (value: number) => {
    if (value <= 2) return '😢';
    if (value <= 4) return '😕';
    if (value <= 6) return '😐';
    if (value <= 8) return '🙂';
    return '😄';
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const gratitudeArray = gratitude.split('\n').filter(g => g.trim().length > 0);
      
      const response = await checkinService.submitEveningCheckin({
        mood,
        energy,
        stress,
        productivity,
        notes,
        gratitude: gratitudeArray,
        goals_achieved: goalsAchieved,
      });

      Alert.alert(
        'Check-in Complete! 🌙',
        response.mood_analysis?.motivational_message || 'Have a restful night!',
        [
          {
            text: 'View Insights',
            onPress: () => navigation.navigate('Dashboard' as never),
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit check-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView style={commonStyles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🌙</Text>
          <Text style={styles.title}>Evening Reflection</Text>
          <Text style={styles.subtitle}>How was your day?</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>Mood {getMoodEmoji(mood)}</Text>
          <Text style={styles.value}>{mood}/10</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={mood}
            onValueChange={setMood}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border.medium}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Energy Level ⚡</Text>
          <Text style={styles.value}>{energy}/10</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={energy}
            onValueChange={setEnergy}
            minimumTrackTintColor={colors.success}
            maximumTrackTintColor={colors.border.medium}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Stress Level 😰</Text>
          <Text style={styles.value}>{stress}/10</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={stress}
            onValueChange={setStress}
            minimumTrackTintColor={colors.warning}
            maximumTrackTintColor={colors.border.medium}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Productivity 📊</Text>
          <Text style={styles.value}>{productivity}/10</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={productivity}
            onValueChange={setProductivity}
            minimumTrackTintColor={colors.info}
            maximumTrackTintColor={colors.border.medium}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Gratitude 🙏</Text>
          <Text style={styles.hint}>What are you grateful for today?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter each item on a new line..."
            placeholderTextColor={colors.text.disabled}
            multiline
            numberOfLines={3}
            value={gratitude}
            onChangeText={setGratitude}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Reflection 💭</Text>
          <TextInput
            style={styles.textInput}
            placeholder="How did your day go? Any highlights or challenges?"
            placeholderTextColor={colors.text.disabled}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </Card>

        <Button
          title="Complete Evening Check-in"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  card: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});

export default EveningCheckinScreen;
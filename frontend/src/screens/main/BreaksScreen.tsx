import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

import { breakService } from '../../services/breakService';
import { breakExecutionService } from '../../services/breakExecutionService';

import { BreakActionBar } from '../../components/breaks/BreakActionBar';
import { BreakTimer } from '../../components/breaks/BreakTimer';

import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

interface BreakRecommendation {
  time_slot: string;
  break_type: string;
  duration_minutes: number;
  reasoning: string;
  reason_tag?: string;
  ui_message?: string;
  confidence?: number;
  preparation_tip?: string;
  benefits?: string[];
}

interface BreakSchedule {
  success: boolean;
  stress_assessment: {
    level: string;
    score: number;
  };
  break_schedule: {
    recommended_breaks: BreakRecommendation[];
    daily_strategy?: string;
    energy_management?: string;
  };
  auto_inserted: boolean;
  inserted_breaks: any[];
  note?: string;
}

const BreaksScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedule, setSchedule] = useState<BreakSchedule | null>(null);
  const [autoInserting, setAutoInserting] = useState(false);

  // Break execution state
  const [activeBreakId, setActiveBreakId] = useState<string | null>(null);
  const [completedBreaks, setCompletedBreaks] = useState<string[]>([]);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async (autoInsert = false) => {
    try {
      setLoading(true);
      console.log('Loading schedule...');
      
      const data = await breakService.getBreakSchedule(autoInsert);
      
      console.log('Schedule data received:', {
        success: data?.success,
        hasBreakSchedule: !!data?.break_schedule,
        breakCount: data?.break_schedule?.recommended_breaks?.length || 0,
        autoInserted: data?.auto_inserted
      });

      setSchedule(data);

      if (autoInsert && data?.auto_inserted && data?.inserted_breaks?.length > 0) {
        Alert.alert(
          'Success',
          `${data.inserted_breaks.length} break${data.inserted_breaks.length > 1 ? 's' : ''} added to your calendar!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error(' Error loading schedule:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.error || 'Failed to load break schedule. Please check your connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setAutoInserting(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  const handleAutoInsert = () => {
    Alert.alert(
      'Auto-Schedule Breaks',
      'This will automatically add the recommended breaks to your Google Calendar. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Schedule',
          onPress: () => {
            setAutoInserting(true);
            loadSchedule(true);
          },
        },
      ]
    );
  };

  const handleStartBreak = async (
    breakId: string,
    breakType: string,
    duration: number,
    reasoning: string
  ) => {
    try {
      console.log('Starting break:', { breakId, breakType, duration });

      await breakExecutionService.startBreak(
        breakId,
        breakType,
        duration,
        reasoning
      );

      setActiveBreakId(breakId);
      
      Alert.alert(
        '🧘 Break Started',
        `Your ${breakType} break has begun. Take your time!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error(' Error starting break:', error);
      Alert.alert('Error', 'Failed to start break', [{ text: 'OK' }]);
    }
  };

  const handleCompleteBreak = async (breakId: string) => {
    try {
      console.log('Completing break:', breakId);

      await breakExecutionService.completeBreak(breakId);
      
      setCompletedBreaks(prev => [...prev, breakId]);
      setActiveBreakId(null);

      Alert.alert(
        'Break Completed',
        'Great job! You took time for yourself.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error(' Error completing break:', error);
    }
  };
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!schedule?.break_schedule?.recommended_breaks?.length) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['bottom']}>
        <View style={[commonStyles.container, styles.emptyContainer]}>
          <Text style={styles.emptyTitle}>No breaks scheduled yet</Text>
          <Text style={styles.emptySubtitle}>
            Load your personalized break schedule
          </Text>
          <Button
            title="Load Schedule"
            onPress={() => loadSchedule()}
            style={styles.emptyButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['bottom']}>
      <ScrollView
        style={commonStyles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Break Schedule</Text>
          <Text style={styles.subtitle}>
            AI-optimized wellness breaks for today
          </Text>
        </View>

        {/* STRESS CARD */}
        {schedule?.stress_assessment && (
          <Card style={styles.stressCard}>
            <Text style={styles.cardTitle}>Current Stress</Text>
            <View style={styles.stressInfo}>
              <Text style={styles.stressLevel}>
                {schedule.stress_assessment.level}
              </Text>
              <Text style={styles.stressScore}>
                {schedule.stress_assessment.score}/10
              </Text>
            </View>
          </Card>
        )}

        {/* BREAK LIST */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended Breaks</Text>
            <Button
              title="Auto-Schedule"
              onPress={handleAutoInsert}
              loading={autoInserting}
              style={styles.autoButton}
            />
          </View>

          {schedule?.break_schedule?.recommended_breaks?.map(
            (breakRec: BreakRecommendation, index: number) => {
              const breakId = `${breakRec.break_type}-${breakRec.time_slot}-${index}`;

              const status =
                completedBreaks.includes(breakId)
                  ? 'completed'
                  : activeBreakId === breakId
                  ? 'active'
                  : 'upcoming';

              return (
                <Card key={breakId} style={styles.breakCard}>
                  <View style={styles.breakHeader}>
                    <View style={styles.breakTitleRow}>
                      <Text style={styles.breakType}>
                        {getBreakEmoji(breakRec.break_type)}{' '}
                        {breakRec.break_type}
                      </Text>
                      <Text style={styles.breakDuration}>
                        {breakRec.duration_minutes} min
                      </Text>
                    </View>
                    <Text style={styles.breakTime}>
                      {breakRec.time_slot}
                    </Text>

                    {breakRec.reason_tag && (
                      <View style={styles.tagContainer}>
                        <Text style={styles.tag}>
                          {breakRec.reason_tag}
                        </Text>
                      </View>
                    )}

                    {status === 'active' && (
                      <BreakTimer
                        durationMinutes={breakRec.duration_minutes}
                        onFinish={() => handleCompleteBreak(breakId)}
                      />
                    )}
                  </View>

                  <Text style={styles.breakReason}>
                    {breakRec.reasoning}
                  </Text>

                  {breakRec.ui_message && (
                    <View style={styles.messageBox}>
                      <Text style={styles.messageText}>
                        💙 {breakRec.ui_message}
                      </Text>
                    </View>
                  )}

                  {breakRec.preparation_tip && (
                    <View style={styles.tipBox}>
                      <Text style={styles.tipLabel}>💡 Tip:</Text>
                      <Text style={styles.tipText}>
                        {breakRec.preparation_tip}
                      </Text>
                    </View>
                  )}

                  {breakRec.benefits && breakRec.benefits.length > 0 && (
                    <View style={styles.benefits}>
                      <Text style={styles.benefitsLabel}>Benefits:</Text>
                      {breakRec.benefits.map(
                        (benefit: string, idx: number) => (
                          <Text key={idx} style={styles.benefit}>
                            • {benefit}
                          </Text>
                        )
                      )}
                    </View>
                  )}

                  {breakRec.confidence !== undefined && (
                    <View style={styles.confidenceContainer}>
                      <View style={styles.confidenceBar}>
                        <View
                          style={[
                            styles.confidenceFill,
                            { width: `${breakRec.confidence * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.confidenceText}>
                        {Math.round(breakRec.confidence * 100)}% confidence
                      </Text>
                    </View>
                  )}

                  <BreakActionBar
                    status={status}
                    onStart={() =>
                      handleStartBreak(
                        breakId,
                        breakRec.break_type,
                        breakRec.duration_minutes,
                        breakRec.reasoning
                      )
                    }
                    onComplete={() => handleCompleteBreak(breakId)}
                  />
                </Card>
              );
            }
          )}
        </View>

        {/* STRATEGY */}
        {schedule?.break_schedule?.daily_strategy && (
          <Card style={styles.strategyCard}>
            <Text style={styles.cardTitle}>Daily Strategy</Text>
            <Text style={styles.strategyText}>
              {schedule.break_schedule.daily_strategy}
            </Text>
          </Card>
        )}

        {schedule?.break_schedule?.energy_management && (
          <Card style={styles.strategyCard}>
            <Text style={styles.cardTitle}>Energy Management</Text>
            <Text style={styles.strategyText}>
              {schedule.break_schedule.energy_management}
            </Text>
          </Card>
        )}

        {/* SUCCESS */}
        {schedule?.auto_inserted &&
          schedule?.inserted_breaks?.length > 0 && (
            <Card style={styles.successCard}>
              <Text style={styles.successTitle}>
                ✅ Breaks Added to Calendar
              </Text>
              <Text style={styles.successText}>
                Successfully scheduled{' '}
                {schedule.inserted_breaks.length} break
                {schedule.inserted_breaks.length > 1 ? 's' : ''} in
                your calendar
              </Text>
            </Card>
          )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getBreakEmoji = (type: string) => {
  const emojis: { [key: string]: string } = {
    meditation: '🧘',
    walk: '🚶',
    stretch: '🤸',
    breathing: '💨',
    desk_exercise: '💪',
    micro_rest: '😌',
  };
  return emojis[type] || '☕';
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    minWidth: 200,
  },
  header: { marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 4,
  },
  stressCard: { marginBottom: 24 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  stressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stressLevel: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  stressScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  autoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  breakCard: { marginBottom: 16 },
  breakHeader: { marginBottom: 12 },
  breakTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakType: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  breakDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  breakTime: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  tagContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  breakReason: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  messageBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  tipBox: {
    backgroundColor: colors.info + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  benefits: {
    marginTop: 8,
    marginBottom: 12,
  },
  benefitsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  benefit: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 8,
    marginBottom: 2,
  },
  confidenceContainer: {
    marginBottom: 12,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: colors.text.secondary + '20',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  confidenceText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  strategyCard: { marginBottom: 16 },
  strategyText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  successCard: {
    backgroundColor: colors.success + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: colors.text.primary,
  },
});

export default BreaksScreen;
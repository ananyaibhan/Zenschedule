import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { wellnessService } from '../../services/wellnessService';
import { checkinService } from '../../services/checkinService';
import { taskService } from '../../services/taskService'; 
import { getCheckinType } from '../../utils/checkinTime';
import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

type RootStackParamList = {
  MorningCheckin: undefined;
  AfternoonCheckin: undefined;
  EveningCheckin: undefined;
  Breaks: undefined;
  Calendar: undefined;
  MusicTherapy: undefined;
  VideoTherapy: undefined; 
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


const CheckInPrompt = ({ status }: { status: any }) => {
  const navigation = useNavigation<NavigationProp>();

  if (!status || !status.next_checkin) return null;

  const nextCheckin = status.next_checkin;
  
  const checkinConfig = {
    morning: {
      icon: '🌅',
      title: 'Morning Check-in',
      route: 'MorningCheckin' as const,
    },
    afternoon: {
      icon: '☀️',
      title: 'Afternoon Check-in',
      route: 'AfternoonCheckin' as const,
    },
    evening: {
      icon: '🌙',
      title: 'Evening Check-in',
      route: 'EveningCheckin' as const,
    },
  };

  const config = checkinConfig[nextCheckin as keyof typeof checkinConfig];
  if (!config) return null;

  const handlePress = () => {
    navigation.navigate(config.route);
  };

  return (
    <TouchableOpacity style={styles.checkinPrompt} onPress={handlePress}>
      <Text style={styles.checkinIcon}>{config.icon}</Text>

      <View style={styles.checkinTextContainer}>
        <Text style={styles.checkinTitle}>{config.title}</Text>
        <Text style={styles.checkinSubtitle}>
          Take a moment to reflect on your wellbeing
        </Text>
      </View>

      <Text style={styles.checkinArrow}>›</Text>
    </TouchableOpacity>
  );
};

const getStressColor = (level: string) => {
  const colors_map: { [key: string]: string } = {
    minimal: '#10b981',
    low: '#22c55e',
    moderate: '#f59e0b',
    high: '#f97316',
    severe: '#ef4444',
    critical: '#dc2626',
  };
  return colors_map[level.toLowerCase()] || '#6b7280';
};


const DashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stressData, setStressData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<any>(null);
  
  const [calendarEventCount, setCalendarEventCount] = useState<number>(0);
  const [notionTaskCount, setNotionTaskCount] = useState<number>(0);

  useEffect(() => {
    loadData();
    loadCheckinStatus();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading dashboard data...');
      
      const [stressResponse, tasksResponse] = await Promise.all([
        wellnessService.getStressAnalysis(),
        taskService.getTasks().catch(err => {
          console.warn('Could not load tasks:', err);
          return { success: false, total: 0, tasks: [] };
        })
      ]);
      
      console.log('Stress data loaded:', {
        success: stressResponse.success,
        stress_score: stressResponse.stress_intelligence?.stress_score,
        stress_level: stressResponse.stress_intelligence?.stress_level
      });
      
      console.log('Tasks loaded:', {
        total: tasksResponse.total
      });
      
      setStressData(stressResponse);
      
      setCalendarEventCount(stressResponse.data_sources?.calendar_events || 0);
      setNotionTaskCount(tasksResponse?.total || 0);
      
      setError(null);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load wellness data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCheckinStatus = async () => {
    try {
      const status = await checkinService.getCheckinStatus();
      console.log('Check-in status:', status);
      setCheckinStatus(status);
    } catch (err) {
      console.error('Check-in status error:', err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    loadCheckinStatus();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>
            Make sure your backend is running and accessible
          </Text>
          <Button title="Retry" onPress={loadData} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  const stress = stressData?.stress_intelligence;
  const stressScore = stress?.stress_score ?? 5;
  const stressLevel = stress?.stress_level ?? 'moderate';
  const burnoutRisk = stress?.burnout_risk ?? 'moderate';
  const moodState = stress?.mood_state ?? 'coping';

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.greeting}>Welcome back 👋</Text>

        {/* CHECK-IN PROMPT */}
        <CheckInPrompt status={checkinStatus} />

        {/* Main Stress Card */}
        <Card style={styles.mainStressCard}>
          <View style={styles.stressHeader}>
            <Text style={styles.stressTitle}>Current Wellness</Text>
            {refreshing && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>

          <View style={styles.stressScoreContainer}>
            <Text style={[styles.stressScore, { color: getStressColor(stressLevel) }]}>
              {stressScore}/10
            </Text>
            <View style={[styles.stressLevelBadge, { backgroundColor: getStressColor(stressLevel) + '20' }]}>
              <Text style={[styles.stressLevelText, { color: getStressColor(stressLevel) }]}>
                {stressLevel.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.stressDetailsGrid}>
            <View style={styles.stressDetailItem}>
              <Text style={styles.stressDetailLabel}>Burnout Risk</Text>
              <Text style={styles.stressDetailValue}>{burnoutRisk}</Text>
            </View>
            <View style={styles.stressDetailItem}>
              <Text style={styles.stressDetailLabel}>Mood State</Text>
              <Text style={styles.stressDetailValue}>{moodState}</Text>
            </View>
          </View>

          {stress?.key_patterns && stress.key_patterns.length > 0 && (
            <View style={styles.patternsContainer}>
              <Text style={styles.patternsTitle}>Key Patterns</Text>
              {stress.key_patterns.slice(0, 2).map((pattern: string, idx: number) => (
                <Text key={idx} style={styles.patternItem}>• {pattern}</Text>
              ))}
            </View>
          )}
        </Card>

        {/* Recommendations Card */}
        {stress?.wellness_recommendations && stress.wellness_recommendations.length > 0 && (
          <Card style={styles.recommendationsCard}>
            <Text style={styles.cardTitle}>💡 Recommendations</Text>
            {stress.wellness_recommendations.slice(0, 3).map((rec: any, idx: number) => (
              <View key={idx} style={styles.recommendationItem}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.recommendationAction}>{rec.action}</Text>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: rec.priority === 'high' ? '#fecaca' : rec.priority === 'medium' ? '#fde68a' : '#d1fae5' }
                  ]}>
                    <Text style={[
                      styles.priorityText,
                      { color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#059669' }
                    ]}>
                      {rec.priority}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recommendationReason}>{rec.reasoning}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* ✅ UPDATED: Data Sources Info with actual counts */}
        <Card style={styles.dataSourcesCard}>
          <Text style={styles.dataSourcesTitle}>📊 Analysis Based On</Text>
          <View style={styles.dataSourcesGrid}>
            <View style={styles.dataSourceItem}>
              <Text style={styles.dataSourceNumber}>{calendarEventCount}</Text>
              <Text style={styles.dataSourceLabel}>Calendar Events</Text>
            </View>
            <View style={styles.dataSourceItem}>
              <Text style={styles.dataSourceNumber}>{notionTaskCount}</Text>
              <Text style={styles.dataSourceLabel}>Notion Tasks</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Breaks')}
          >
            <Text style={styles.actionIcon}>☕</Text>
            <Text style={styles.actionText}>Schedule Breaks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Calendar')}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>View Calendar</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, styles.musicButton]}
          onPress={() => navigation.navigate('MusicTherapy')}
        >
          <View style={styles.musicButtonContent}>
            <Text style={styles.musicIcon}>🎵</Text>
            <View style={styles.musicTextContainer}>
              <Text style={styles.musicTitle}>Music Therapy</Text>
              <Text style={styles.musicSubtext}>AI-powered recommendations</Text>
            </View>
            <Text style={styles.musicArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.videoButton]}
          onPress={() => navigation.navigate('VideoTherapy')}
        >
          <View style={styles.videoButtonContent}>
            <Text style={styles.videoIcon}>📺</Text>
            <View style={styles.videoTextContainer}>
              <Text style={styles.videoTitle}>Video Therapy</Text>
              <Text style={styles.videoSubtext}>Guided wellness videos</Text>
            </View>
            <Text style={styles.videoArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Last Updated */}
        {stressData?.timestamp && (
          <Text style={styles.lastUpdated}>
            Last updated: {new Date(stressData.timestamp).toLocaleTimeString()}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;


const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.text.primary,
  },
  checkinPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  checkinIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  checkinTextContainer: {
    flex: 1,
  },
  checkinTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  checkinSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  checkinArrow: {
    fontSize: 28,
    color: colors.primary,
  },
  mainStressCard: {
    marginBottom: 20,
  },
  stressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  stressScoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stressScore: {
    fontSize: 56,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stressLevelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stressLevelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stressDetailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stressDetailItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stressDetailLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  stressDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  patternsContainer: {
    backgroundColor: colors.info + '10',
    padding: 12,
    borderRadius: 8,
  },
  patternsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  patternItem: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  recommendationsCard: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  recommendationItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recommendationAction: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  recommendationReason: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  dataSourcesCard: {
    marginBottom: 20,
  },
  dataSourcesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  dataSourcesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  dataSourceItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  dataSourceNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  dataSourceLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  // 🎵 Music Therapy Button Styles
  musicButton: {
    width: '100%',
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
  },
  musicButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  musicIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  musicTextContainer: {
    flex: 1,
  },
  musicTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  musicSubtext: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  musicArrow: {
    fontSize: 28,
    color: colors.primary,
  },
  // ✅ Video Therapy Button Styles
  videoButton: {
    width: '100%',
    backgroundColor: '#ef4444' + '15',
    borderColor: '#ef4444',
    borderWidth: 2,
    padding: 16,
    marginBottom: 20,
  },
  videoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  videoIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  videoTextContainer: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  videoSubtext: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  videoArrow: {
    fontSize: 28,
    color: '#ef4444',
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    minWidth: 200,
  },
});
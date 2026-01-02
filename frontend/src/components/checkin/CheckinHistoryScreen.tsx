import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { checkinService } from '../../services/checkinService';
import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

const CheckinHistoryScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyRes, analyticsRes] = await Promise.all([
        checkinService.getCheckinHistory(30),
        checkinService.getCheckinAnalytics(30),
      ]);

      setHistory(historyRes);
      setAnalytics(analyticsRes.analytics);
    } catch (err) {
      console.error('Check-in history error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const getMoodEmoji = (m: number) =>
    m <= 2 ? '😢' : m <= 4 ? '😕' : m <= 6 ? '😐' : m <= 8 ? '🙂' : '😄';

  const getTrendEmoji = (t: string) =>
    t === 'improving' ? '📈' : t === 'declining' ? '📉' : '➡️';

  if (loading) return <LoadingSpinner />;

  const allCheckins = [
    ...(history?.history?.morning ?? []).map((c: any) => ({
      ...c,
      type: 'morning',
    })),
    ...(history?.history?.evening ?? []).map((c: any) => ({
      ...c,
      type: 'evening',
    })),
  ].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  );

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Check-in History</Text>
        <Text style={styles.subtitle}>
          Your wellness journey over time
        </Text>

        {analytics && (
          <Card style={styles.analyticsCard}>
            <Text style={styles.cardTitle}>30-Day Overview</Text>

            <View style={styles.statsGrid}>
              <Stat value={analytics.average_mood} label="Avg Mood" />
              <Stat value={analytics.average_energy} label="Avg Energy" />
              <Stat value={analytics.total_checkins} label="Check-ins" />
            </View>

            <View style={styles.trendRow}>
              <Text style={styles.trendEmoji}>
                {getTrendEmoji(analytics.trend)}
              </Text>
              <Text style={styles.trendText}>
                Trend:{' '}
                <Text style={styles.trendValue}>
                  {analytics.trend}
                </Text>
              </Text>
            </View>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Recent Check-ins</Text>

        {allCheckins.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>No check-ins yet</Text>
          </Card>
        ) : (
          allCheckins.map((c, i) => (
            <Card key={i} style={styles.checkinCard}>
              <Text style={styles.checkinType}>
                {c.type === 'morning' ? '🌅 Morning' : '🌙 Evening'}
              </Text>

              <Text style={styles.date}>
                {formatDate(c.timestamp)} • {formatTime(c.timestamp)}
              </Text>

              <View style={styles.metrics}>
                <Metric label="Mood" value={`${c.data.mood}/10`} emoji={getMoodEmoji(c.data.mood)} />
                <Metric label="Energy" value={`${c.data.energy}/10`} emoji="⚡" />
                <Metric label="Stress" value={`${c.data.stress}/10`} emoji="😰" />
              </View>

              {!!c.data.notes && (
                <Text style={styles.notes}>{c.data.notes}</Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};


const Stat = ({ value, label }: any) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Metric = ({ label, value, emoji }: any) => (
  <View style={styles.metric}>
    <Text>{emoji}</Text>
    <Text style={styles.metricText}>
      {label}: {value}
    </Text>
  </View>
);


const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text.primary },
  subtitle: { color: colors.text.secondary, marginBottom: 20 },

  analyticsCard: { marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.text.secondary },

  trendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  trendEmoji: { fontSize: 22, marginRight: 6 },
  trendText: { color: colors.text.secondary },
  trendValue: { fontWeight: '600', color: colors.text.primary },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },

  checkinCard: { marginBottom: 16 },
  checkinType: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 12, color: colors.text.secondary },

  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  metric: { alignItems: 'center' },
  metricText: { fontSize: 12 },

  notes: {
    backgroundColor: colors.info + '15',
    padding: 10,
    borderRadius: 8,
  },

  emptyCard: { alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { marginTop: 8, fontWeight: '600' },
});

export default CheckinHistoryScreen;

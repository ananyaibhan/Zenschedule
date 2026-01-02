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
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { calendarService } from '../../services/calendarService';
import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

interface Event {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: number;
  htmlLink?: string;
}

const CalendarScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setError(null);
      const data = await calendarService.getEvents(7);

      if (data?.events?.length) {
        const transformedEvents: Event[] = data.events.map((event: any) => ({
          id: event.id || event.summary,
          summary: event.summary || 'Untitled Event',
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          attendees: event.attendees,
          htmlLink: event.htmlLink,
        }));

        setEvents(transformedEvents);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error(' Error loading calendar:', err);
      setError('Failed to load calendar events.');

      Alert.alert(
        'Network Error',
        'Unable to fetch calendar events. Please ensure:\n\n• Backend server is running\n• Phone & laptop are on the same Wi-Fi\n• Internet connection is stable'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const groupedEvents = events.reduce((acc: any, event) => {
    const date = formatDate(event.start);
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['bottom']}>
      <ScrollView
        style={commonStyles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Your Schedule</Text>
          <Text style={styles.subtitle}>
            {events.length} event{events.length !== 1 ? 's' : ''} in the next 7
            days
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {Object.entries(groupedEvents).map(([date, dayEvents]: any) => (
          <View key={date} style={styles.daySection}>
            <Text style={styles.dateHeader}>{date}</Text>

            {dayEvents.map((event: Event, index: number) => (
              <Card key={event.id || index} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.summary}</Text>
                  <Text style={styles.eventTime}>
                    {formatTime(event.start)}
                  </Text>
                </View>

                {event.description && (
                  <Text style={styles.eventDescription} numberOfLines={2}>
                    {event.description}
                  </Text>
                )}

                {event.location && (
                  <Text style={styles.eventMetaText}>
                    📍 {event.location}
                  </Text>
                )}

                {event.attendees && event.attendees > 0 && (
                  <Text style={styles.eventMetaText}>
                    👥 {event.attendees} attendee
                    {event.attendees > 1 ? 's' : ''}
                  </Text>
                )}
              </Card>
            ))}
          </View>
        ))}

        {events.length === 0 && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>No events scheduled</Text>
            <Text style={styles.emptySubtext}>
              Pull down to refresh or add events to your calendar
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
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
  errorContainer: {
    backgroundColor: '#fee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  daySection: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  eventCard: {
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: 12,
  },
  eventTime: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  eventMetaText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default CalendarScreen;

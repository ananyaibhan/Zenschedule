import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { youtubeService, YouTubeVideo } from '../../services/youtubeService';
import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

const VideoTherapyScreen = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [therapeuticGoal, setTherapeuticGoal] = useState<string>('');
  const [stressInfo, setStressInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userMood, setUserMood] = useState('');

  useEffect(() => {
    loadVideoRecommendations();
  }, []);

  const loadVideoRecommendations = async (mood?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await youtubeService.getVideoTherapy(mood || userMood);

      setVideos(data.therapeutic_videos || []);
      setTherapeuticGoal(data.ai_video_intelligence?.therapeutic_goal || '');
      setStressInfo(data.stress_assessment);
      
    } catch (err: any) {
      console.error('❌ Load error:', err);
      setError(err.message || 'Failed to load videos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMoodSubmit = () => {
    if (userMood.trim()) {
      loadVideoRecommendations(userMood);
    }
  };

  const openYouTubeVideo = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open YouTube');
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVideoRecommendations();
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

  // Loading view
  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding perfect videos for you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error view
  if (error) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => loadVideoRecommendations()} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  // Main video list view
  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📺 Video Therapy</Text>
          <Text style={styles.headerSubtitle}>
            AI-recommended wellness videos
          </Text>
        </View>

        {/* Stress Info Card */}
        {stressInfo && (
          <Card style={[styles.stressCard, { borderLeftColor: getStressColor(stressInfo.level) }]}>
            <View style={styles.stressHeader}>
              <View>
                <Text style={styles.stressTitle}>Your Wellness State</Text>
                <View style={styles.stressRow}>
                  <Text style={[styles.stressScore, { color: getStressColor(stressInfo.level) }]}>
                    {stressInfo.score}/10
                  </Text>
                  <View style={[styles.stressLevelBadge, { backgroundColor: getStressColor(stressInfo.level) + '20' }]}>
                    <Text style={[styles.stressLevelText, { color: getStressColor(stressInfo.level) }]}>
                      {stressInfo.level.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.videoIcon}>🎥</Text>
            </View>

            {therapeuticGoal && (
              <View style={styles.goalBox}>
                <Text style={styles.goalLabel}>Therapeutic Goal</Text>
                <Text style={styles.goalText}>{therapeuticGoal}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Mood Input */}
        <Card style={styles.moodCard}>
          <Text style={styles.moodLabel}>How are you feeling?</Text>
          <View style={styles.moodInputContainer}>
            <TextInput
              style={styles.moodInput}
              value={userMood}
              onChangeText={setUserMood}
              placeholder="e.g., anxious, tired, stressed..."
              placeholderTextColor={colors.text.secondary}
              onSubmitEditing={handleMoodSubmit}
            />
            <TouchableOpacity
              style={styles.moodButton}
              onPress={handleMoodSubmit}
              disabled={!userMood.trim()}
            >
              <Text style={styles.moodButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Video Count */}
        <Card style={styles.countCard}>
          <Text style={styles.countText}>
            {videos.length} therapeutic videos for you
          </Text>
        </Card>

        {/* Videos List */}
        <View style={styles.videosContainer}>
          {videos.length === 0 ? (
            <Card style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📺</Text>
              <Text style={styles.emptyText}>No videos found</Text>
              <Button title="Retry" onPress={() => loadVideoRecommendations()} />
            </Card>
          ) : (
            videos.map((video, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.videoCard}
                onPress={() => openYouTubeVideo(video.url)}
              >
                <Image
                  source={{ uri: video.thumbnail }}
                  style={styles.videoThumbnail}
                  resizeMode="cover"
                />
                
                <View style={styles.videoOverlay}>
                  <View style={styles.playIconContainer}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                </View>

                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  
                  <Text style={styles.videoChannel} numberOfLines={1}>
                    {video.channel}
                  </Text>
                  
                  {video.query_used && (
                    <Text style={styles.videoQuery} numberOfLines={1}>
                      💡 {video.query_used}
                    </Text>
                  )}

                  <View style={styles.videoMeta}>
                    <Text style={styles.videoMetaText}>
                      📅 {new Date(video.published_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VideoTherapyScreen;

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  stressCard: {
    marginBottom: 16,
    borderLeftWidth: 6,
  },
  stressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  stressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stressScore: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  stressLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stressLevelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  videoIcon: {
    fontSize: 32,
  },
  goalBox: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  goalLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  goalText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  moodCard: {
    marginBottom: 16,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  moodInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  moodInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text.primary,
  },
  moodButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
  },
  moodButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  countCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  videosContainer: {
    gap: 16,
  },
  videoCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surface,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: 'white',
    fontSize: 24,
    marginLeft: 4,
  },
  videoInfo: {
    padding: 16,
    backgroundColor: 'white',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  videoChannel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  videoQuery: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoMetaText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.text.secondary,
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
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 200,
  },
});


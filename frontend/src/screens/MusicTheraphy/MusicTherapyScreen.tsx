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
import { spotifyService, SpotifyTrack } from '../../services/spotifyService';
import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

const MusicTherapyScreen = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMood, setUserMood] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    try {
      setLoading(true);
      setError(null);

      const statusData = await spotifyService.getStatus();

      if (!statusData.authenticated) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }

      // Load music
      await loadMusicRecommendations();
      
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Failed to load');
      setLoading(false);
    }
  };

  const loadMusicRecommendations = async (mood?: string) => {
    try {
      setLoading(true);
      
      const data = await spotifyService.getMusicTherapy(mood || userMood);

      if (!data.success) {
        if (data.needs_auth) {
          setNeedsAuth(true);
        } else {
          throw new Error(data.error || 'Failed to load music');
        }
      } else {
        setTracks(data.tracks || []);
        setNeedsAuth(false);
      }
      
    } catch (err: any) {
      console.error('Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSpotifyAuth = async () => {
    try {
      const authUrl = await spotifyService.getLoginUrl();
      
      const supported = await Linking.canOpenURL(authUrl);
      
      if (supported) {
        await Linking.openURL(authUrl);
        
        Alert.alert(
          'Spotify Authorization',
          'After authorizing Spotify, return to the app and tap "Refresh Now".',
          [
            { 
              text: 'Refresh Now', 
              onPress: () => {
                setTimeout(() => {
                  checkAuthAndLoad();
                }, 1000);
              }
            },
            { text: 'Later' }
          ]
        );
      } else {
        Alert.alert('Error', 'Cannot open Spotify authorization URL');
      }
      
    } catch (err) {
      Alert.alert('Error', 'Failed to start Spotify authorization');
      console.error('Auth error:', err);
    }
  };

  const handleMoodSubmit = () => {
    if (userMood.trim()) {
      loadMusicRecommendations(userMood);
    }
  };

  const handleCreatePlaylist = async () => {
    try {
      setCreatingPlaylist(true);
      
      const result = await spotifyService.createPlaylist(userMood || undefined);
      
      if (result.success) {
        Alert.alert(
          'Playlist Created! 🎵',
          `"${result.playlist.name}" has been added to your Spotify account`,
          [
            { text: 'Open in Spotify', onPress: () => Linking.openURL(result.playlist.url) },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create playlist');
      }
      
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create playlist');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const openSpotifyTrack = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open Spotify');
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (needsAuth) {
      checkAuthAndLoad();
    } else {
      loadMusicRecommendations();
    }
  };

  if (needsAuth) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.authContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.authIcon}>🎵</Text>
          <Text style={styles.authTitle}>Connect Spotify</Text>
          <Text style={styles.authSubtitle}>
            Get AI-powered music recommendations based on your stress and mood
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🤖</Text>
              <Text style={styles.featureText}>AI analyzes your wellness</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎼</Text>
              <Text style={styles.featureText}>Personalized recommendations</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📋</Text>
              <Text style={styles.featureText}>Create therapeutic playlists</Text>
            </View>
          </View>

          <Button
            title="Connect Spotify"
            onPress={handleSpotifyAuth}
            style={styles.connectButton}
          />
          
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshText}>Already authorized? Tap to refresh</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Loading view
  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding perfect music for you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={checkAuthAndLoad} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎵 Music Therapy</Text>
          <Text style={styles.headerSubtitle}>
            AI-recommended tracks for your wellness
          </Text>
        </View>

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

        <Card style={styles.countCard}>
          <Text style={styles.countText}>
            {tracks.length} personalized recommendations
          </Text>
        </Card>

        <Card style={styles.tracksCard}>
          {tracks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎵</Text>
              <Text style={styles.emptyText}>No tracks found</Text>
              <Button title="Retry" onPress={() => loadMusicRecommendations()} />
            </View>
          ) : (
            tracks.map((track, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.trackItem}
                onPress={() => openSpotifyTrack(track.url)}
              >
                {track.album_image && (
                  <Image
                    source={{ uri: track.album_image }}
                    style={styles.trackImage}
                  />
                )}

                <View style={styles.trackInfo}>
                  <Text style={styles.trackName} numberOfLines={1}>
                    {track.name}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {track.artist}
                  </Text>
                  
                  {track.ai_reason && (
                    <Text style={styles.trackReason} numberOfLines={2}>
                      💡 {track.ai_reason}
                    </Text>
                  )}
                  
                  {track.recommended_by && (
                    <Text style={styles.trackTag} numberOfLines={1}>
                      {track.recommended_by}
                    </Text>
                  )}
                </View>

                <View style={styles.trackRight}>
                  <Text style={styles.trackPopularity}>❤️ {track.popularity}</Text>
                  <View style={styles.playButton}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MusicTherapyScreen;

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
  createButton: {
    marginBottom: 16,
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
  tracksCard: {
    padding: 0,
    overflow: 'hidden',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  trackImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  trackArtist: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  trackReason: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 4,
  },
  trackTag: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  trackRight: {
    alignItems: 'center',
    gap: 8,
  },
  trackPopularity: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: 'white',
    fontSize: 14,
    marginLeft: 2,
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
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  featuresList: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  connectButton: {
    minWidth: 250,
    marginBottom: 16,
  },
  refreshButton: {
    paddingVertical: 12,
  },
  refreshText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
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
import { api } from './api';
export interface SpotifyTrack {
  name: string;
  artist: string;
  url: string;
  album: string;
  album_image?: string;
  popularity: number;
  ai_reason?: string;
  recommended_by?: string;
}

export interface MusicTherapyResponse {
  success: boolean;
  tracks: SpotifyTrack[];
  total_tracks: number;
  therapeutic_goal?: string;
  therapeutic_explanation?: string;
  stress_level?: string;
  stress_score?: number;
  needs_auth?: boolean;
  error?: string;
}

export interface SpotifyStatus {
  success: boolean;
  authenticated: boolean;
  user?: {
    name: string;
    email: string;
    id: string;
    country: string;
  };
  message?: string;
}

export interface CreatePlaylistResponse {
  success: boolean;
  message?: string;
  playlist: {
    name: string;
    url: string;
    id: string;
    tracks: number;
  };
  error?: string;
}

export const spotifyService = {
  async getStatus(): Promise<SpotifyStatus> {
    try {
      const response = await fetch(`${api}/spotify-status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Spotify status error:', error);
      throw error;
    }
  },

  async getLoginUrl(): Promise<string> {
    try {
      const response = await fetch(`${api}/spotify-login`);
      const data = await response.json();
      
      if (!data.success || !data.auth_url) {
        throw new Error(data.error || 'Failed to get login URL');
      }
      
      return data.auth_url;
    } catch (error) {
      console.error('Spotify login URL error:', error);
      throw error;
    }
  },

  async getMusicTherapy(mood?: string): Promise<MusicTherapyResponse> {
    try {
      let url = `${api}/music-therapy`;
      if (mood && mood.trim()) {
        url += `?mood=${encodeURIComponent(mood.trim())}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error(' Music therapy error:', error);
      throw error;
    }
  },

  async createPlaylist(mood?: string): Promise<CreatePlaylistResponse> {
    try {
      const response = await fetch(`${api}/create-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mood: mood || undefined }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(' Create playlist error:', error);
      throw error;
    }
  },
};

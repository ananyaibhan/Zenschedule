import {api} from './api';
export interface YouTubeVideo {
  video_id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  channel: string;
  published_at: string;
  query_used: string;
}

export interface VideoTherapyResponse {
  success: boolean;
  stress_assessment: {
    level: string;
    score: number;
    mood_state: string;
    energy_forecast: string;
    burnout_risk: string;
  };
  ai_video_intelligence?: {
    primary_video_category: string;
    therapeutic_goal: string;
    video_duration_preference: string;
    viewing_context: string;
    therapeutic_explanation: string;
    avoid_content: string[];
  };
  therapeutic_videos: YouTubeVideo[];
  total_videos: number;
  user_input?: {
    mood?: string;
  };
  error?: string;
}

export const youtubeService = {
  // Get AI-powered YouTube video recommendations
  async getVideoTherapy(mood?: string, useAi: boolean = true): Promise<VideoTherapyResponse> {
    try {
      let url = `${api}/video-therapy`;
      const params = new URLSearchParams();
      
      if (mood && mood.trim()) {
        params.append('mood', mood.trim());
      }
      
      params.append('use_ai', useAi.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log(` Fetching video therapy from: ${url}`);

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get video recommendations');
      }

      return data;
    } catch (error) {
      console.error('Video therapy error:', error);
      throw error;
    }
  },
};
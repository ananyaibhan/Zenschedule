import api from './api';

interface StressAnalysisResponse {
  success: boolean;
  timestamp: string;
  stress_intelligence: {
    stress_level: string;
    stress_score: number;
    burnout_risk: string;
    mood_state: string;
    energy_forecast: string;
    key_patterns: string[];
    wellness_recommendations: Array<{
      action: string;
      priority: string;
      reasoning: string;
    }>;
    recommended_music_genres: string[];
    detailed_assessment: string;
    raw_metrics: {
      calendar: any;
      tasks: any;
    };
  };
  data_sources: {
    calendar_events: number;
    notion_tasks: number;
  };
}

export const wellnessService = {
  async getStressAnalysis(): Promise<StressAnalysisResponse> {
    try {
      console.log('Fetching stress analysis from /analyze');
      
      const data = await api.get<StressAnalysisResponse>('/analyze');
      
      console.log('Stress analysis received:', {
        success: data.success,
        stress_level: data.stress_intelligence?.stress_level,
        stress_score: data.stress_intelligence?.stress_score,
        burnout_risk: data.stress_intelligence?.burnout_risk
      });
      
      return data;
    } catch (error: any) {
      console.error(' Error fetching stress analysis:', error);
      throw error;
    }
  },

  async getCalendarEvents(days: number = 7) {
    try {
      const data = await api.get('/calendar', { days });
      return data;
    } catch (error) {
      console.error(' Error fetching calendar:', error);
      throw error;
    }
  },

  async getTasks() {
    try {
      const data = await api.get('/tasks');
      return data;
    } catch (error) {
      console.error(' Error fetching tasks:', error);
      throw error;
    }
  }
};

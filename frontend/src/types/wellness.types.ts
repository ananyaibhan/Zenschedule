export interface StressAnalysis {
  stress_level: string;
  stress_score: number;
  burnout_risk: string;
  mood_state: string;
  energy_forecast: string;
  key_patterns: string[];
  red_flags: string[];
  wellness_recommendations: WellnessRecommendation[];
  detailed_assessment: string;
}

export interface WellnessRecommendation {
  action: string;
  priority: string;
  reasoning: string;
  when: string;
}

export interface BreakSchedule {
  recommended_breaks: BreakRecommendation[];
  daily_strategy: string;
  energy_management: string;
}

export interface BreakRecommendation {
  time_slot: string;
  break_type: string;
  duration_minutes: number;
  reasoning: string;
  preparation_tip: string;
  benefits: string[];
}
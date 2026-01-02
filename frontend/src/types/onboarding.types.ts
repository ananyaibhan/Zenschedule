export interface OnboardingState {
  currentStep: number;
  completedSteps: string[];
  calendarConnected: boolean;
  notionConnected: boolean;
  spotifyConnected: boolean;
  preferencesSet: boolean;
}

export interface UserPreferences {
  workingHours: {
    start: string;
    end: string;
  };
  breakPreferences: string[];
  notificationSettings: {
    enableBreakReminders: boolean;
    enableStressAlerts: boolean;
  };
}
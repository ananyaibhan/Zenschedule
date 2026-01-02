export const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', required: true },
  { id: 'calendar', title: 'Connect Calendar', required: true },
  { id: 'notion', title: 'Connect Notion', required: true },
  { id: 'spotify', title: 'Connect Spotify', required: false },
  { id: 'preferences', title: 'Set Preferences', required: true },
  { id: 'complete', title: 'Complete', required: true },
];

export const STRESS_LEVELS = {
  critical: { label: 'Critical', color: '#DC2626', range: [9, 10] },
  severe: { label: 'Severe', color: '#EA580C', range: [7, 8] },
  high: { label: 'High', color: '#F59E0B', range: [5, 6] },
  moderate: { label: 'Moderate', color: '#FBBF24', range: [3, 4] },
  low: { label: 'Low', color: '#10B981', range: [1, 2] },
};

export const BREAK_TYPES = [
  { id: 'meditation', label: 'Meditation', icon: '🧘' },
  { id: 'walk', label: 'Walk', icon: '🚶' },
  { id: 'stretch', label: 'Stretching', icon: '🤸' },
  { id: 'breathing', label: 'Breathing', icon: '💨' },
  { id: 'desk_exercise', label: 'Desk Exercise', icon: '💪' },
  { id: 'micro_rest', label: 'Micro Rest', icon: '😌' },
];

export type CheckinType = 'morning' | 'afternoon' | 'evening';

export const getCheckinType = (): CheckinType => {
  const now = new Date();

  // IST adjustment
  const utcHours = now.getUTCHours();
  const istHours = (utcHours + 5.5) % 24;

  if (istHours >= 5 && istHours < 12) return 'morning';
  if (istHours >= 12 && istHours < 17) return 'afternoon';
  return 'evening';
};

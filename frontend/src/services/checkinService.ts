import api from './api';

export const checkinService = {
  async submitMorningCheckin(data: {
    mood: number;
    energy: number;
    sleep_quality: number;
    stress: number;
    notes: string;
    goals: string[];
  }): Promise<any> {
    return api.post('/checkin/morning', {
      ...data,
      user_id: 'default_user',
    });
  },

  async submitEveningCheckin(data: {
    mood: number;
    energy: number;
    stress: number;
    productivity: number;
    notes: string;
    gratitude: string[];
    goals_achieved: boolean;
  }): Promise<any> {
    return api.post('/checkin/evening', {
      ...data,
      user_id: 'default_user',
    });
  },

  async submitAfternoonCheckin(data: {
    mood: number;
    energy: number;
    stress: number;
    focus: number;
    notes: string;
  }): Promise<any> {
    return api.post('/checkin/afternoon', {
      ...data,
      user_id: 'default_user',
    });
  },

  async getCheckinStatus(): Promise<any> {
    return api.get('/checkin/status?user_id=default_user');
  },

  async getCheckinHistory(days: number = 7): Promise<any> {
    return api.get(`/checkin/history?user_id=default_user&days=${days}`);
  },

  async getCheckinAnalytics(days: number = 30): Promise<any> {
    return api.get(`/checkin/analytics?user_id=default_user&days=${days}`);
  },
};

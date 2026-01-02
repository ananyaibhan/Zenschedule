import api from './api';

interface BreakScheduleResponse {
  success: boolean;
  stress_assessment: {
    level: string;
    score: number;
  };
  break_schedule: {
    recommended_breaks: any[];
    daily_strategy?: string;
    energy_management?: string;
  };
  auto_inserted: boolean;
  inserted_breaks: any[];
  note?: string;
}

export const breakService = {
  async getBreakSchedule(autoInsert: boolean = false): Promise<BreakScheduleResponse> {
    try {
      console.log(' Calling /schedule-breaks', { autoInsert });

      const data = await api.get<BreakScheduleResponse>('/schedule-breaks', {
        auto_insert: autoInsert,
        user_id: 'default_user'
      });

      console.log(' Break schedule success:', data);
      
      return data;
    } catch (error: any) {
      console.log(' Break schedule error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
};
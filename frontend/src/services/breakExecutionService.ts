
import api from './api';

export const breakExecutionService = {
  async startBreak(
    breakId: string,
    breakType: string,
    duration: number,
    aiReason: string
  ) {
    try {
      console.log('Starting break:', { breakId, breakType, duration });
      
      const data = await api.post('/breaks/start', {
        break_id: breakId,
        type: breakType,
        duration: duration,
        ai_reason: aiReason
      });
      
      return data;
    } catch (error) {
      console.error(' Error starting break:', error);
      throw error;
    }
  },

  async completeBreak(breakId: string, feedback?: string) {
    try {
      const data = await api.post('/breaks/complete', {
        break_id: breakId,
        completed: true,
        feedback: feedback || ''
      });
      return data;
    } catch (error) {
      console.error('Error completing break:', error);
      throw error;
    }
  },

  async skipBreak(breakId: string, reason?: string) {
    try {
      const data = await api.post('/breaks/skip', {
        break_id: breakId,
        reason: reason || 'user_skip'
      });
      return data;
    } catch (error) {
      console.error('Error skipping break:', error);
      throw error;
    }
  },

  async getCurrentBreak() {
    try {
      const data = await api.get('/breaks/current');
      return data;
    } catch (error) {
      console.error(' Error getting current break:', error);
      throw error;
    }
  },

  async getBreakContent(breakType: string) {
    try {
      const data = await api.get('/breaks/content', {
        type: breakType
      });
      return data;
    } catch (error) {
      console.error(' Error getting break content:', error);
      throw error;
    }
  },

  async getBreakHistory(days: number = 7) {
    try {
      const data = await api.get('/breaks/history', {
        days: days
      });
      return data;
    } catch (error) {
      console.error('Error getting break history:', error);
      throw error;
    }
  }
};
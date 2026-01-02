import api from './api';
import { CalendarEvent } from '../types/calendar.types';

export const calendarService = {
  async getEvents(
    days: number = 7
  ): Promise<{ events: CalendarEvent[]; total: number }> {
    return api.get(`/calendar`, { days });
  },

  async connectCalendar(
    authCode: string
  ): Promise<{ success: boolean; message: string }> {
    return api.post('/calendar/connect', { authCode });
  },
};

import api from './api';

export interface Task {
  name: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  type: string | null;
}

export const taskService = {
  async getTasks(): Promise<{ tasks: Task[]; total: number }> {
    return api.get<{ tasks: Task[]; total: number }>('/tasks');
  },

  async connectNotion(apiKey: string, databaseId: string): Promise<{ success: boolean; message: string }> {
    return api.post<{ success: boolean; message: string }>('/notion/connect', {
      apiKey,
      databaseId,
    });
  },
};

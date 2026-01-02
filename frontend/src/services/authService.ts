import { User } from '../types/auth.types';

export const authService = {
  async googleSignIn(): Promise<{ user: User; token: string }> {
    console.log(' Simulating Google Sign-In ');
    
    const mockUser: User = {
      id: 1,
      email: 'personal.user@gmail.com',
      name: 'Personal User',
      has_calendar: true,
      has_notion: true,
      has_spotify: false,
      created_at: new Date().toISOString(),
    };

    const mockToken = 'personal-access-token';

    console.log(' Mock user created for personal use');
    
    return {
      user: mockUser,
      token: mockToken,
    };
  },

  async logout(): Promise<void> {
    console.log(' Logging out...');
  },
};
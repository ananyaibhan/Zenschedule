import { Platform } from 'react-native';

// Determine the correct API URL based on platform
const getBaseUrl = () => {
  // Android Emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  // iOS Simulator
  if (Platform.OS === 'ios') {
    return 'http://localhost:5000';
  }

  // Physical device (Expo Go on phone)
  return ''; // Replace with your machine's local IP address
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

console.log(' API Base URL:', API_CONFIG.BASE_URL);

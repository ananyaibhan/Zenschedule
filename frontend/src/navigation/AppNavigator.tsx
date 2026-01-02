import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import MusicTherapyScreen from '../screens/MusicTheraphy/MusicTherapyScreen';
import MorningCheckinScreen from '../components/checkin/MorningCheckinScreen';
import EveningCheckinScreen from '../components/checkin/EveningCheckinScreen';
import CheckinHistoryScreen from '../components/checkin/CheckinHistoryScreen';
import VideoTherpahyScreen from '../screens/VideoTheraphy/VideoTherapyScreen';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { colors } from '../styles/colors';
import VideoTherapyScreen from '../screens/VideoTheraphy/VideoTherapyScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  MorningCheckin: undefined;
  EveningCheckin: undefined;
  CheckinHistory: undefined;
  MusicTherapy: undefined;
  VideoTherapy: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MorningCheckin"
            component={MorningCheckinScreen}
            options={{ title: '🌅 Morning Check-in' }}
          />
          <Stack.Screen
            name="EveningCheckin"
            component={EveningCheckinScreen}
            options={{ title: '🌙 Evening Check-in' }}
          />
          <Stack.Screen
            name="CheckinHistory"
            component={CheckinHistoryScreen}
            options={{ title: '📊 Check-in History' }}
          />
          <Stack.Screen
            name="MusicTherapy"
            component={MusicTherapyScreen}
            options={{ title: 'Music Therapy' }}
        />
        <Stack.Screen
          name="VideoTherapy"
          component={VideoTherapyScreen}
          options={{ title: 'Video Therapy' }}
        />
        </>
      )}
    </Stack.Navigator>
  );
};
export default AppNavigator;

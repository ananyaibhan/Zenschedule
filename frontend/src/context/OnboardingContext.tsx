import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { OnboardingState, UserPreferences } from '../types/onboarding.types';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface OnboardingContextType extends OnboardingState {
  setCurrentStep: (step: number) => void;
  completeStep: (stepId: string) => void;
  setCalendarConnected: (connected: boolean) => void;
  setNotionConnected: (connected: boolean) => void;
  setSpotifyConnected: (connected: boolean) => void;
  setPreferences: (preferences: UserPreferences) => void;
  resetOnboarding: () => void;
  isOnboardingComplete: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialState: OnboardingState = {
  currentStep: 0,
  completedSteps: [],
  calendarConnected: false,
  notionConnected: false,
  spotifyConnected: false,
  preferencesSet: false,
};

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<OnboardingState>(initialState);

  useEffect(() => {
    loadOnboardingState();
  }, []);

  useEffect(() => {
    saveOnboardingState();
  }, [state]);

  const loadOnboardingState = async () => {
    try {
      const stateStr = await storage.getItem(STORAGE_KEYS.ONBOARDING_STATE);
      if (stateStr) {
        setState(JSON.parse(stateStr));
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    }
  };

  const saveOnboardingState = async () => {
    try {
      await storage.setItem(STORAGE_KEYS.ONBOARDING_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  };

  const setCurrentStep = (step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const completeStep = (stepId: string) => {
    setState(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, stepId],
    }));
  };

  const setCalendarConnected = (connected: boolean) => {
    setState(prev => ({ ...prev, calendarConnected: connected }));
  };

  const setNotionConnected = (connected: boolean) => {
    setState(prev => ({ ...prev, notionConnected: connected }));
  };

  const setSpotifyConnected = (connected: boolean) => {
    setState(prev => ({ ...prev, spotifyConnected: connected }));
  };

  const setPreferences = async (preferences: UserPreferences) => {
    try {
      await storage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
      setState(prev => ({ ...prev, preferencesSet: true }));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const resetOnboarding = () => {
    setState(initialState);
  };

  const isOnboardingComplete = 
    state.calendarConnected &&
    state.notionConnected &&
    state.preferencesSet;

  return (
    <OnboardingContext.Provider
      value={{
        ...state,
        setCurrentStep,
        completeStep,
        setCalendarConnected,
        setNotionConnected,
        setSpotifyConnected,
        setPreferences,
        resetOnboarding,
        isOnboardingComplete,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};
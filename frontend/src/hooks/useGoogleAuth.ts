import { useState, useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'wellnessai',
    preferLocalhost: false,
  });

  console.log(' Redirect URI:', redirectUri);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('Google Auth Success!');
      const { id_token } = response.params;
      
      if (id_token) {
        console.log('Got ID Token:', {
          hasIdToken: !!id_token,
          tokenLength: id_token.length,
        });
        setIdToken(id_token);
      } else {
        console.error('No ID token in response');
        setError('No ID token received');
      }
    } else if (response?.type === 'error') {
      console.error('Google Auth Error:', response.error);
      setError(response.error?.message || 'Authentication failed');
    } else if (response?.type === 'cancel') {
      console.log('User cancelled sign-in');
      setError('Sign in was cancelled');
    }
  }, [response]);

  const signIn = async () => {
    setError(null);
    setIsLoading(true);
    console.log('Starting Google Sign-In with Expo AuthSession...');

    try {
      const result = await promptAsync();
      
      if (result.type === 'success') {
        console.log('Auth completed successfully');
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIdToken(null);
    setError(null);
    console.log(' Signed out');
  };

  return {
    signIn,
    signOut,
    isLoading,
    error,
    idToken,
    isReady: !!request,
  };
};
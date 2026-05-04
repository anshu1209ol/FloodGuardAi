import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import TabNavigator from './src/navigation/TabNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

// Initialize the background task definition (must be required in the global scope)
import './src/services/BackgroundTask';

export default function App() {
  useEffect(() => {
    // Note: Push notifications are disabled in Expo Go Android (SDK 53+).
    // For full local/push notification support, a custom EAS dev client is required.
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

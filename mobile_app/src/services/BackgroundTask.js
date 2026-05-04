import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { getWeatherData, calculateFloodRisk } from './api';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background Task Error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      
      try {
        // Fetch weather and aqi to calculate risk
        const { weather, aqi } = await getWeatherData(latitude, longitude);
        const risk = calculateFloodRisk(weather, aqi);

        // In a real EAS Development Build, we would trigger a Push Notification here.
        // For Expo Go, we just log it as notifications are unsupported natively.
        if (risk.level === 'WARNING' || risk.level === 'DANGER') {
          console.log(`🚨 BACKGROUND ALERT: You have entered a ${risk.level} risk zone. ${risk.desc}`);
        }
      } catch (err) {
        console.error('Error calculating risk in background:', err);
      }
    }
  }
});

// Helper to register the task
export const startBackgroundLocationTracking = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    console.log('Foreground location permission denied');
    return false;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.log('Background location permission denied');
    return false;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15 * 60 * 1000, // Update every 15 minutes
      distanceInterval: 1000, // Or every 1 km
      deferredUpdatesInterval: 15 * 60 * 1000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "FloodGuard AI Active",
        notificationBody: "Monitoring your surroundings for flood risks.",
        notificationColor: "#ef4444",
      }
    });
    console.log("Background location tracking started!");
    return true;
  }
  return true;
};

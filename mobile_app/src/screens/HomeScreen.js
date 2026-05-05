import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldAlert, CloudRain, Thermometer, Wind, Droplets, Activity, MapPin } from 'lucide-react-native';
import { getWeatherData, calculateFloodRisk } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen() {
  const [location, setLocation] = useState(null);
  const [envData, setEnvData] = useState(null);
  const [risk, setRisk] = useState({ level: 'LOADING...', color: '#64748b' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchData = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      const data = await getWeatherData(loc.coords.latitude, loc.coords.longitude);
      
      if (data) {
        setEnvData(data);
        const riskData = calculateFloodRisk(data.weather, data.aqi);
        setRisk(riskData);

        if (riskData.level === 'DANGER' || riskData.level === 'WARNING') {
          schedulePushNotification(riskData);
        }
      } else {
        setErrorMsg('Failed to load environmental data.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to load data. Working offline.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
      }
    })();
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  async function schedulePushNotification(riskData) {
    const severity = riskData.level === 'DANGER' ? '🔴 HIGH' : '🟡 MODERATE';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `FloodGuard Alert: ${severity} RISK`,
        body: `${riskData.desc} Check the Command Center for safe routes.`,
        data: { risk: riskData.level },
        color: riskData.color,
      },
      trigger: null,
    });
    console.log(`🚨 FLOOD ${riskData.level} Notification Triggered`);
  }

  const getAQILabel = (aqi) => {
    const labels = ['Unknown', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    return labels[aqi] || 'Unknown';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FloodGuard</Text>
          {location && (
            <View style={styles.locationRow}>
              <MapPin color="#64748b" size={16} />
              <Text style={styles.locationText}>
                {envData ? envData.weather.name : `${location.coords.latitude.toFixed(2)}, ${location.coords.longitude.toFixed(2)}`}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 50 }} />
        ) : (
          <>
            <LinearGradient
              colors={[risk.color, risk.color + '99']}
              style={styles.riskCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ShieldAlert color="white" size={48} />
              <Text style={styles.riskTitle}>{risk.level} ZONE</Text>
              <Text style={styles.riskDesc} style={styles.riskDesc}>{risk.desc}</Text>
            </LinearGradient>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Environmental Telemetry</Text>
              {envData ? (
                <View style={styles.grid}>
                  {/* Rain */}
                  <View style={styles.gridItem}>
                    <CloudRain color="#3b82f6" size={28} />
                    <Text style={styles.gridValue}>
                      {envData.weather.rain ? (envData.weather.rain['1h'] || envData.weather.rain['3h']) : 0} mm
                    </Text>
                    <Text style={styles.gridLabel}>Rainfall</Text>
                  </View>
                  
                  {/* Temp */}
                  <View style={styles.gridItem}>
                    <Thermometer color="#ef4444" size={28} />
                    <Text style={styles.gridValue}>{Math.round(envData.weather.main.temp)}°C</Text>
                    <Text style={styles.gridLabel}>Temp</Text>
                  </View>

                  {/* Pressure */}
                  <View style={styles.gridItem}>
                    <Activity color="#8b5cf6" size={28} />
                    <Text style={styles.gridValue}>{envData.weather.main.pressure}</Text>
                    <Text style={styles.gridLabel}>hPa Press.</Text>
                  </View>

                  {/* Humidity */}
                  <View style={styles.gridItem}>
                    <Droplets color="#0ea5e9" size={28} />
                    <Text style={styles.gridValue}>{envData.weather.main.humidity}%</Text>
                    <Text style={styles.gridLabel}>Humidity</Text>
                  </View>

                  {/* AQI */}
                  <View style={[styles.gridItem, { width: '100%' }]}>
                    <Wind color="#10b981" size={28} />
                    <Text style={styles.gridValue}>{getAQILabel(envData.aqi)} (Level {envData.aqi})</Text>
                    <Text style={styles.gridLabel}>Air Quality Index</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.errorText}>{errorMsg || 'Environmental data unavailable'}</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationText: { color: '#64748b', marginLeft: 4, fontSize: 14 },
  riskCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  riskTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 12 },
  riskDesc: { color: 'white', fontSize: 15, opacity: 0.95, marginTop: 8, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 16 },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    gap: 12 
  },
  gridItem: {
    width: '48%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  gridValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 8 },
  gridLabel: { fontSize: 13, color: '#64748b', marginTop: 2 },
  errorText: { color: '#ef4444' },
});

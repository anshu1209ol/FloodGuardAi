import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Initializing Mapping Systems...</Text>
      </View>
    );
  }

  const lat = location ? location.latitude : 26.2183;
  const lon = location ? location.longitude : 78.1828;

  // Generate HTML for Leaflet Map
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100vh; width: 100vw; background: #0f172a; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { zoomControl: false }).setView([${lat}, ${lon}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // User Location
        const userIcon = L.divIcon({
          html: '<div style="background-color: #0ea5e9; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
          className: '',
          iconSize: [22, 22]
        });
        L.marker([${lat}, ${lon}], { icon: userIcon }).addTo(map)
          .bindPopup('Your Location')
          .openPopup();

        // Flood Zones (Dummy Data)
        L.circle([${lat + 0.01}, ${lon + 0.01}], {
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.3,
          radius: 800
        }).addTo(map).bindPopup('Reported Flood Zone');

        // Safe Zones
        L.circle([${lat - 0.02}, ${lon - 0.015}], {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.3,
          radius: 600
        }).addTo(map).bindPopup('Designated Safe Zone');

      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b' }
});

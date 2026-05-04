import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Share, Alert, Vibration, Animated, Platform, ScrollView, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, Share2, AlertTriangle, ShieldPlus, Radar, XCircle, MapPin, PlusCircle, Tent, Siren, WifiOff, BookOpen, MessageSquare } from 'lucide-react-native';
import * as Location from 'expo-location';
import { getWeatherData, calculateFloodRisk } from '../services/api';

import { startBackgroundLocationTracking } from '../services/BackgroundTask';

export default function EmergencyScreen() {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [bgGuardianActive, setBgGuardianActive] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Animation value for flashing background
  const [flashAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (alarmActive) {
      // Flashing animation loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: false })
        ])
      ).start();
      
      // Aggressive vibration pattern (Wait 0, Vibrate 500, Wait 200, Vibrate 500)
      const pattern = [0, 500, 200, 500];
      Vibration.vibrate(pattern, true); // true = repeat
    } else {
      flashAnim.stopAnimation();
      flashAnim.setValue(0);
      Vibration.cancel();
    }
    
    return () => {
      Vibration.cancel();
    };
  }, [alarmActive]);

  const callEmergency = (number) => {
    Linking.openURL(`tel:${number}`).catch(err => console.error('Failed to call', err));
  };

  const shareLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission denied');
        setLoading(false);
        return;
      }
      
      let loc = await Location.getCurrentPositionAsync({});
      const url = `https://www.google.com/maps/search/?api=1&query=${loc.coords.latitude},${loc.coords.longitude}`;
      
      await Share.share({
        message: `🚨 EMERGENCY: I need help! My live location is: ${url}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share location.');
    }
    setLoading(false);
  };

  const toggleBackgroundGuardian = async () => {
    if (!bgGuardianActive) {
      const started = await startBackgroundLocationTracking();
      if (started) {
        setBgGuardianActive(true);
        Alert.alert("Guardian Active", "We are now monitoring your location in the background. You will receive push notifications if you enter a flood zone.");
      }
    } else {
      setBgGuardianActive(false);
      Alert.alert("Guardian Disabled", "Background monitoring has been disabled.");
      // In a full implementation, you'd call TaskManager.unregisterAllTasksAsync()
    }
  };

  const findNearest = (query) => {
    const scheme = Platform.OS === 'ios' ? 'maps:0,0?q=' : 'geo:0,0?q=';
    const url = scheme + encodeURIComponent(query);
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Could not open Maps app'));
  };

  const askGemini = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    
    try {
      const apiKey = 'YOUR_API_KEY_HERE';
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Title': 'FloodGuard AI'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: 'You are a helpful AI assistant for a Flood Emergency App. Provide short, practical, and concise advice.' },
            { role: 'user', content: aiQuery.trim() }
          ]
        })
      });
      
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        setAiResponse(data.choices[0].message.content);
      } else {
        setAiResponse("Sorry, I couldn't process your request at this time.");
      }
    } catch (error) {
      setAiResponse("Network error. Please try again later.");
    }
    setAiLoading(false);
  };

  const scanRegionalThreat = async () => {
    if (offlineMode) {
      Alert.alert('Offline Mode', 'Cannot scan regional threat without an internet connection.');
      return;
    }
    setScanning(true);
    setScanMessage(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission required to scan area.');
        setScanning(false);
        return;
      }
      
      let loc = await Location.getCurrentPositionAsync({});
      
      // Check current location + simulated 50km radius data points
      const data = await getWeatherData(loc.coords.latitude, loc.coords.longitude);
      if (!data) {
        setScanMessage({ type: 'error', text: 'Network Error. Could not complete scan.' });
        setScanning(false);
        return;
      }

      const riskData = calculateFloodRisk(data.weather, data.aqi);
      
      if (riskData.level === 'DANGER' || riskData.level === 'WARNING') {
        setAlarmActive(true);
        setScanMessage({ 
          type: 'danger', 
          text: `🚨 FLOOD DETECTED IN 50KM RADIUS!\n\nRisk: ${riskData.level}\n${riskData.desc}` 
        });
      } else {
        setScanMessage({ 
          type: 'safe', 
          text: '✅ Area Clear. No immediate flood threat detected in your 50km radius.' 
        });
      }
    } catch (error) {
      setScanMessage({ type: 'error', text: 'Failed to complete regional scan.' });
    }
    setScanning(false);
  };

  // Interpolate background color for alarm
  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f8fafc', '#fee2e2'] // light gray to red
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Emergency Services</Text>
          <Text style={styles.subtitle}>Quick access to life-saving resources.</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Offline Mode Banner */}
          {offlineMode && (
            <View style={styles.offlineBanner}>
              <WifiOff color="#f59e0b" size={24} />
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.offlineText}>Offline Mode Active</Text>
                <Text style={styles.offlineSubText}>Using cached maps and local resources.</Text>
              </View>
            </View>
          )}

          {/* Active Alarm Banner */}
          {alarmActive && (
            <View style={styles.alarmBanner}>
              <AlertTriangle color="#ef4444" size={32} />
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.alarmText}>EVACUATION WARNING</Text>
                <Text style={styles.alarmSubText}>Flood waters detected nearby.</Text>
              </View>
              <TouchableOpacity onPress={() => setAlarmActive(false)} style={styles.stopBtn}>
                <XCircle color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
          )}

          {/* 50km Area Scanner */}
          <TouchableOpacity 
            style={[styles.scanBtn, styles.shadow, alarmActive && { borderColor: '#ef4444', borderWidth: 2 }, offlineMode && { opacity: 0.5 }]} 
            onPress={scanRegionalThreat}
            disabled={scanning || alarmActive || offlineMode}
          >
            <Radar color={scanning ? "#64748b" : "#4f46e5"} size={28} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.scanText}>{scanning ? 'Scanning satellite data...' : 'Scan 50km Area for Floods'}</Text>
              <Text style={styles.scanSubText}>{offlineMode ? 'Unavailable offline' : 'Pings live radar & sensors'}</Text>
            </View>
          </TouchableOpacity>

          {/* Scan Result Message */}
          {scanMessage && !alarmActive && (
            <View style={[styles.msgBox, scanMessage.type === 'safe' ? styles.msgSafe : styles.msgError]}>
              <Text style={scanMessage.type === 'safe' ? styles.msgSafeText : styles.msgErrorText}>
                {scanMessage.text}
              </Text>
            </View>
          )}

          {/* Background Guardian Toggle */}
          <TouchableOpacity 
            style={[styles.bgGuardianBtn, styles.shadow, bgGuardianActive && styles.bgGuardianActive]} 
            onPress={toggleBackgroundGuardian}
          >
            <ShieldPlus color={bgGuardianActive ? "white" : "#0f172a"} size={24} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.bgGuardianText, bgGuardianActive && { color: 'white' }]}>
                {bgGuardianActive ? 'Background Guardian Active' : 'Enable Background Guardian'}
              </Text>
              <Text style={[styles.bgGuardianSubText, bgGuardianActive && { color: '#e2e8f0' }]}>
                {bgGuardianActive ? 'Monitoring your location for threats.' : 'Receive alerts even when app is closed.'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sosButton, styles.shadow]} 
            onPress={() => callEmergency('112')}
          >
            <AlertTriangle color="white" size={40} />
            <Text style={styles.sosText}>SOS / National Emergency</Text>
            <Text style={styles.sosSub}>Tap to dial 112</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.card, styles.shadow]} onPress={() => callEmergency('1078')}>
              <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
                <ShieldPlus color="#4f46e5" size={24} />
              </View>
              <Text style={styles.cardTitle}>NDRF Help</Text>
              <Text style={styles.cardSub}>Disaster Relief</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.card, styles.shadow]} onPress={() => callEmergency('108')}>
              <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
                <Phone color="#ef4444" size={24} />
              </View>
              <Text style={styles.cardTitle}>Ambulance</Text>
              <Text style={styles.cardSub}>Medical Emergency</Text>
            </TouchableOpacity>
          </View>

          {/* Nearest Facilities */}
          <Text style={styles.sectionTitle}>Nearest Facilities (GPS)</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.card, styles.shadow]} onPress={() => findNearest('Emergency Shelters')}>
              <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
                <Tent color="#10b981" size={24} />
              </View>
              <Text style={styles.cardTitle}>Shelters</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.card, styles.shadow]} onPress={() => findNearest('Hospitals')}>
              <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
                <PlusCircle color="#ef4444" size={24} />
              </View>
              <Text style={styles.cardTitle}>Hospitals</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.card, styles.shadow]} onPress={() => findNearest('Police Stations')}>
              <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
                <Siren color="#4f46e5" size={24} />
              </View>
              <Text style={styles.cardTitle}>Police</Text>
            </TouchableOpacity>
          </View>

          {/* Utility Tools */}
          <Text style={styles.sectionTitle}>Utility Tools</Text>
          <TouchableOpacity 
            style={[styles.shareBtn, styles.shadow, { marginBottom: 12 }]} 
            onPress={() => setAiModalVisible(true)}
            disabled={offlineMode}
          >
            <MessageSquare color={offlineMode ? "#94a3b8" : "#8b5cf6"} size={24} />
            <Text style={[styles.shareText, offlineMode && { color: "#94a3b8" }]}>
              {offlineMode ? 'AI Assistant (Unavailable Offline)' : 'Ask AI Assistant'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.shareBtn, styles.shadow, { marginBottom: 12 }]} 
            onPress={shareLocation}
            disabled={loading}
          >
            <Share2 color="#0f172a" size={24} />
            <Text style={styles.shareText}>
              {loading ? 'Getting Location...' : 'Share Live Location via SMS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.shareBtn, styles.shadow, { marginBottom: 30 }]} 
            onPress={() => setOfflineMode(!offlineMode)}
          >
            {offlineMode ? <WifiOff color="#f59e0b" size={24} /> : <BookOpen color="#0f172a" size={24} />}
            <Text style={styles.shareText}>
              {offlineMode ? 'Disable Offline Mode' : 'Enable Offline Disaster Mode'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>

      {/* AI Assistant Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={aiModalVisible}
        onRequestClose={() => setAiModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MessageSquare color="#8b5cf6" size={24} />
                <Text style={styles.modalTitle}>Emergency AI Assistant</Text>
              </View>
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <XCircle color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.aiResponseArea}>
              {aiResponse ? (
                <Text style={styles.aiResponseText}>{aiResponse}</Text>
              ) : (
                <Text style={styles.aiIntroText}>
                  Ask me anything about flood safety, first aid, emergency contacts, or disaster preparedness.
                </Text>
              )}
            </ScrollView>
            
            <View style={styles.aiInputArea}>
              <TextInput
                style={styles.aiInput}
                placeholder="Ask a question..."
                placeholderTextColor="#94a3b8"
                value={aiQuery}
                onChangeText={setAiQuery}
                multiline
              />
              <TouchableOpacity 
                style={styles.aiSendBtn} 
                onPress={askGemini}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.aiSendText}>Ask</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b' },
  content: { padding: 20, flex: 1 },
  shadow: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  alarmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe4e6',
    borderWidth: 2,
    borderColor: '#e11d48',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  alarmText: { color: '#e11d48', fontSize: 16, fontWeight: '900' },
  alarmSubText: { color: '#be123c', fontSize: 13 },
  stopBtn: { padding: 8 },
  scanBtn: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  scanText: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  scanSubText: { fontSize: 13, color: '#64748b' },
  msgBox: { padding: 16, borderRadius: 12, marginBottom: 20 },
  msgSafe: { backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#10b981' },
  msgSafeText: { color: '#047857', fontWeight: '500' },
  msgError: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444' },
  msgErrorText: { color: '#b91c1c', fontWeight: '500' },
  sosButton: {
    backgroundColor: '#ef4444',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  sosText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  sosSub: { color: 'white', opacity: 0.8, marginTop: 4 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  shareBtn: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  shareText: { fontSize: 16, fontWeight: '600', color: '#0f172a', flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12, marginTop: 8 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#f59e0b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  offlineText: { color: '#d97706', fontSize: 16, fontWeight: '900' },
  offlineSubText: { color: '#b45309', fontSize: 13 },
  bgGuardianBtn: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  bgGuardianActive: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  bgGuardianText: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  bgGuardianSubText: { fontSize: 13, color: '#64748b' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  aiResponseArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  aiIntroText: { color: '#64748b', fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  aiResponseText: { color: '#0f172a', fontSize: 15, lineHeight: 24 },
  aiInputArea: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
    maxHeight: 120,
    color: '#0f172a',
  },
  aiSendBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiSendText: { color: 'white', fontWeight: 'bold' }
});

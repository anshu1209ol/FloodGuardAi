import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera, MapPin, Upload } from 'lucide-react-native';
// import { supabase } from '../services/supabase'; // Uncomment when Supabase is configured

export default function ReportScreen() {
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const submitReport = async () => {
    if (!image && !description) {
      Alert.alert('Error', 'Please provide a photo or description.');
      return;
    }

    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location is required to report a flood.');
        setLoading(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});

      // Mock Submission
      // In production: await supabase.from('reports').insert([{ lat: loc.coords.latitude, lon: loc.coords.longitude, description, image_url: ... }])
      
      setTimeout(() => {
        Alert.alert('Success', 'Flood report submitted successfully. Stay safe!');
        setImage(null);
        setDescription('');
        setLoading(false);
      }, 1500);

    } catch (e) {
      Alert.alert('Error', 'Failed to submit report.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Report a Flood</Text>
        <Text style={styles.subtitle}>Help your community by reporting localized flooding or blocked drainage.</Text>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <Camera color="#94a3b8" size={48} />
              <Text style={styles.placeholderText}>Tap to add a photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., Water is knee-deep on Main Street..."
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.locationNotice}>
          <MapPin color="#0ea5e9" size={20} />
          <Text style={styles.locationText}>Your current location will be attached to this report automatically.</Text>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submitReport} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Upload color="white" size={20} />
              <Text style={styles.submitBtnText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 24 },
  imagePicker: {
    height: 200,
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#94a3b8', marginTop: 8 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  locationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  locationText: { color: '#0369a1', marginLeft: 12, flex: 1, fontSize: 14 },
  submitBtn: {
    backgroundColor: '#0ea5e9',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});

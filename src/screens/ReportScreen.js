import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ref, push, set } from 'firebase/database';
import { db, auth } from '../config/firebase';
import { reverseGeocode } from '../config/geocode';
import { v4 as uuidv4 } from 'uuid';

const APP_VERSION = '1.0.0';

export default function ReportScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [location, setLocation] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Request location on mount
  useEffect(() => {
    (async () => {
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Location permission is required to submit a report.'
          );
          setLocationLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc.coords);

        // Reverse geocode to get place name
        const place = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
        if (place) setPlaceName(place);
      } catch (err) {
        Alert.alert('Location Error', 'Could not fetch location. Please try again.');
      }
      setLocationLoading(false);
    })();
  }, []);

  const pickImage = async (useCamera) => {
    try {
      const options = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      };

      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets?.length > 0) {
        // Compress image using new ImageManipulator API
        const manipulated = ImageManipulator.manipulate(result.assets[0].uri);
        manipulated.resize({ width: 800 });
        const imgRef = await manipulated.renderAsync();
        const saved = await imgRef.saveAsync({
          compress: 0.6,
          format: SaveFormat.JPEG,
        });
        setImageUri(saved.uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const validate = () => {
    if (!imageUri) {
      Alert.alert('Missing Photo', 'Please take or select a photo.');
      return false;
    }
    if (!location) {
      Alert.alert('Missing Location', 'GPS location is required.');
      return false;
    }
    if (!estimatedTime.trim()) {
      Alert.alert('Missing Info', 'Please enter estimated time/delay.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const reportId = uuidv4();
      const reportData = {
        reportId,
        timestamp: new Date().toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
        placeName: placeName || '',
        estimatedTimeText: estimatedTime.trim(),
        comment: comment.trim() || '',
        photoPath: imageUri, // stored on device only
        anonymousUserId: auth.currentUser?.uid || 'anonymous',
        appVersion: APP_VERSION,
      };

      const reportRef = ref(db, 'reports/' + reportId);
      await set(reportRef, reportData);

      Alert.alert(
        'Success ✅',
        'Your report has been submitted successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Submission Failed', 'Could not submit report. Please try again.');
    }
    setLoading(false);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#f0eae6', '#f5e6da', '#fce4cc']} style={s.gradient}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerCircle} onPress={() => navigation.goBack()}>
            <Text style={s.headerBack}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>New Report</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo Section */}
            <Text style={s.sectionLabel}>📷  Photo *</Text>
            <TouchableOpacity style={s.imageBox} onPress={showImageOptions} activeOpacity={0.7}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={s.image} />
              ) : (
                <View style={s.imagePlaceholder}>
                  <Text style={s.imagePlaceholderIcon}>📷</Text>
                  <Text style={s.imagePlaceholderText}>
                    Tap to take or select photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Location Section */}
            <Text style={s.sectionLabel}>📍  GPS Location *</Text>
            <View style={s.glassCard}>
              {locationLoading ? (
                <ActivityIndicator size="small" color="#E8922A" />
              ) : location ? (
                <Text style={s.locationText}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              ) : (
                <Text style={s.locationError}>Location not available</Text>
              )}
            </View>

            {/* Place Name */}
            <Text style={s.sectionLabel}>📌  Place</Text>
            <View style={s.glassCard}>
              {locationLoading ? (
                <ActivityIndicator size="small" color="#E8922A" />
              ) : placeName ? (
                <Text style={s.locationText}>{placeName}</Text>
              ) : (
                <Text style={s.placeFetchingText}>
                  {location ? 'Fetching place name...' : 'Waiting for GPS...'}
                </Text>
              )}
            </View>

            {/* Estimated Time/Delay */}
            <Text style={s.sectionLabel}>⏱  Estimated Time / Delay *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 15 min delay, expected at 9:30 AM"
              placeholderTextColor="#b0a090"
              value={estimatedTime}
              onChangeText={setEstimatedTime}
            />

            {/* Optional Comment */}
            <Text style={s.sectionLabel}>💬  Comment (optional)</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Any additional notes..."
              placeholderTextColor="#b0a090"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[s.submitBtn, loading && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom Tab Bar */}
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Home')}>
            <Text style={s.bTabIcon}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={s.bTabIcon}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bTab, s.bTabActive]}>
            <Text style={[s.bTabIcon, s.bTabIconActive]}>📝</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Profile')}>
            <Text style={s.bTabIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 58 : 48,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBack: { fontSize: 26, color: '#333', marginTop: -2, fontWeight: '600' },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 0.2,
  },

  /* Scroll */
  scroll: { paddingHorizontal: 20, paddingBottom: 110 },

  /* Section label */
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
    marginTop: 18,
  },

  /* Image */
  imageBox: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 22,
  },
  imagePlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: { fontSize: 40, marginBottom: 8 },
  imagePlaceholderText: { color: '#a09080', fontSize: 14 },

  /* Glass card */
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 18,
    padding: 16,
  },
  locationText: { fontSize: 14, color: '#333', fontWeight: '600' },
  locationError: { fontSize: 14, color: '#E53935' },
  placeFetchingText: { fontSize: 14, color: '#b0a090', fontStyle: 'italic' },

  /* Input */
  input: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 18,
    padding: 16,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  /* Submit */
  submitBtn: {
    backgroundColor: '#E8922A',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    paddingHorizontal: 20,
  },
  bTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bTabActive: {
    backgroundColor: 'rgba(232,146,42,0.12)',
    borderRadius: 16,
    marginHorizontal: 4,
    paddingVertical: 6,
  },
  bTabIcon: { fontSize: 22, opacity: 0.4 },
  bTabIconActive: { opacity: 1 },
});

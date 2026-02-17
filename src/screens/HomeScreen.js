import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { ref, get } from 'firebase/database';
import { auth, db } from '../config/firebase';
import { reverseGeocode } from '../config/geocode';

const { height: SCREEN_H } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locLoading, setLocLoading] = useState(true);
  const [placeName, setPlaceName] = useState('');
  const [userName, setUserName] = useState('');
  const [score, setScore] = useState(0);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    fetchLocation();
    fetchUserData();
  }, []);

  const fetchLocation = async () => {
    setLocLoading(true);
    setLocationDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        setLocLoading(false);
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
      console.log('Location error:', err);
      setLocationDenied(true);
    }
    setLocLoading(false);
  };

  const fetchUserData = async () => {
    if (!uid) return;
    try {
      // Fetch user profile
      const profileSnap = await get(ref(db, 'users/' + uid));
      if (profileSnap.exists()) {
        const p = profileSnap.val();
        setUserName(p.name || 'User');
      }

      // Calculate score from reports count
      const reportsSnap = await get(ref(db, 'reports'));
      if (reportsSnap.exists()) {
        const all = reportsSnap.val();
        const userReports = Object.values(all).filter(
          (r) => r.anonymousUserId === uid
        );
        setScore(userReports.length * 10); // 10 points per report
      }
    } catch (err) {
      console.log('Fetch user data error:', err);
    }
  };

  const defaultRegion = {
    latitude: location?.latitude || 12.9716,
    longitude: location?.longitude || 77.5946,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Map - top half */}
      <View style={s.mapContainer}>
        {locLoading && !location ? (
          <View style={s.mapLoading}>
            <ActivityIndicator size="large" color="#E8922A" />
            <Text style={s.mapLoadingText}>Loading map...</Text>
          </View>
        ) : (
          <MapView
            style={s.map}
            region={defaultRegion}
            showsUserLocation={!!location}
            showsMyLocationButton={false}
          >
            {location && (
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="You are here"
              />
            )}
          </MapView>
        )}
      </View>

      {/* Bottom sheet */}
      <View style={s.bottomSheet}>
        <LinearGradient
          colors={['#f0eae6', '#f5e6da', '#fce4cc']}
          style={s.sheetGradient}
        >
          {/* Drag handle */}
          <View style={s.handleWrap}>
            <View style={s.handle} />
          </View>

          {/* Location info */}
          <View style={s.locationCard}>
            {locLoading ? (
              <ActivityIndicator size="small" color="#E8922A" />
            ) : locationDenied || !location ? (
              <View style={s.locDeniedWrap}>
                <Text style={s.locDeniedText}>📍  Location is turned off</Text>
                <TouchableOpacity
                  style={s.locBtn}
                  activeOpacity={0.8}
                  onPress={fetchLocation}
                >
                  <Text style={s.locBtnText}>Turn on Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.locInfoWrap}>
                <Text style={s.locLabel}>📍  Your Current Location</Text>
                <Text style={s.locCoords}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </View>

          {/* Place name card */}
          {location && !locLoading && (
            <View style={s.placeCard}>
              <Text style={s.placeLabel}>📌  Place</Text>
              {placeName ? (
                <Text style={s.placeValue}>{placeName}</Text>
              ) : (
                <Text style={s.placeFetching}>Fetching place name...</Text>
              )}
            </View>
          )}

          {/* User info card */}
          <View style={s.userCard}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarText}>
                {(userName || 'U')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={s.userInfo}>
              <Text style={s.userName}>{userName || 'User'}</Text>
              <Text style={s.userSub}>Reporter</Text>
            </View>
            <View style={s.scoreWrap}>
              <Text style={s.scoreValue}>{score}</Text>
              <Text style={s.scoreLabel}>Points</Text>
            </View>
          </View>

          {/* Quick action row */}
          <View style={s.quickRow}>
            <TouchableOpacity
              style={s.quickBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Report')}
            >
              <Text style={s.quickBtnIcon}>📝</Text>
              <Text style={s.quickBtnLabel}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Reports')}
            >
              <Text style={s.quickBtnIcon}>📋</Text>
              <Text style={s.quickBtnLabel}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Leaderboard')}
            >
              <Text style={s.quickBtnIcon}>🏆</Text>
              <Text style={s.quickBtnLabel}>Ranks</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Bottom Tab Bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={[s.bTab, s.bTabActive]}>
          <Text style={[s.bTabIcon, s.bTabIconActive]}>🏠</Text>
          <Text style={[s.bTabLabel, s.bTabLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Leaderboard')}>
          <Text style={s.bTabIcon}>📊</Text>
          <Text style={s.bTabLabel}>Leaderboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Report')}>
          <Text style={s.bTabIcon}>📝</Text>
          <Text style={s.bTabLabel}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Profile')}>
          <Text style={s.bTabIcon}>👤</Text>
          <Text style={s.bTabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BOTTOM_BAR_H = Platform.OS === 'ios' ? 80 : 68;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e8e0d8' },

  /* Map */
  mapContainer: {
    height: SCREEN_H * 0.48,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8e8e8',
  },
  mapLoadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },

  /* Bottom sheet */
  bottomSheet: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  sheetGradient: {
    flex: 1,
    paddingHorizontal: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  /* Location card */
  locationCard: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  locDeniedWrap: {
    alignItems: 'center',
  },
  locDeniedText: {
    fontSize: 14,
    color: '#a09080',
    fontWeight: '600',
    marginBottom: 12,
  },
  locBtn: {
    backgroundColor: '#E8922A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  locBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  locInfoWrap: {},
  locLabel: {
    fontSize: 13,
    color: '#a09080',
    fontWeight: '600',
    marginBottom: 4,
  },
  locCoords: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },

  /* Place card */
  placeCard: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  placeLabel: {
    fontSize: 13,
    color: '#a09080',
    fontWeight: '600',
    marginBottom: 4,
  },
  placeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  placeFetching: {
    fontSize: 14,
    color: '#b0a090',
    fontStyle: 'italic',
  },

  /* User card */
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8922A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  userSub: {
    fontSize: 12,
    color: '#a09080',
    marginTop: 2,
  },
  scoreWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(232,146,42,0.10)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E8922A',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a09080',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Quick actions */
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 18,
    paddingVertical: 16,
    marginHorizontal: 5,
  },
  quickBtnIcon: { fontSize: 24, marginBottom: 4 },
  quickBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    paddingHorizontal: 10,
  },
  bTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bTabActive: {
    backgroundColor: 'rgba(232,146,42,0.10)',
    borderRadius: 16,
    marginHorizontal: 2,
    paddingVertical: 6,
  },
  bTabIcon: { fontSize: 20, opacity: 0.35 },
  bTabIconActive: { opacity: 1 },
  bTabLabel: { fontSize: 10, color: '#bbb', fontWeight: '600', marginTop: 2 },
  bTabLabelActive: { color: '#E8922A' },
});

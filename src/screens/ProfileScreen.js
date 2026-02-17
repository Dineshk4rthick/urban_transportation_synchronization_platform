import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { auth, db } from '../config/firebase';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch profile
      const profileSnap = await get(ref(db, 'users/' + uid));
      if (profileSnap.exists()) {
        const p = profileSnap.val();
        setProfile(p);
        setEditName(p.name || '');
        setEditCity(p.city || '');
        setEditPhone(p.phone || '');
      }

      // Fetch user's recent reports
      const reportsSnap = await get(ref(db, 'reports'));
      if (reportsSnap.exists()) {
        const all = reportsSnap.val();
        const userReports = Object.keys(all)
          .map((k) => ({ id: k, ...all[k] }))
          .filter((r) => r.anonymousUserId === uid)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5);
        setReports(userReports);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }
    try {
      await update(ref(db, 'users/' + uid), {
        name: editName.trim(),
        city: editCity.trim(),
        phone: editPhone.trim(),
      });
      setProfile((prev) => ({
        ...prev,
        name: editName.trim(),
        city: editCity.trim(),
        phone: editPhone.trim(),
      }));
      setEditing(false);
      Alert.alert('Saved ✅', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Could not save profile.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => signOut(auth),
      },
    ]);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={s.root}>
        <LinearGradient colors={['#f0eae6', '#f5e6da', '#fce4cc']} style={s.gradient}>
          <View style={s.center}>
            <ActivityIndicator size="large" color="#E8922A" />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#f0eae6', '#f5e6da', '#fce4cc']} style={s.gradient}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerCircle} onPress={() => navigation.goBack()}>
            <Text style={s.headerBack}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <TouchableOpacity style={s.headerCircle} onPress={() => setEditing(!editing)}>
            <Text style={s.headerEdit}>{editing ? '✕' : '✎'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          {/* Avatar + Name */}
          <View style={s.avatarSection}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarText}>
                {(profile?.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            {!editing ? (
              <>
                <Text style={s.profileName}>{profile?.name || 'User'}</Text>
                <Text style={s.profileEmail}>{auth.currentUser?.email}</Text>
              </>
            ) : (
              <TextInput
                style={s.editNameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your Name"
                placeholderTextColor="#b0a090"
              />
            )}
          </View>

          {/* Info Card */}
          <View style={s.infoCard}>
            <Text style={s.sectionTitle}>Personal Info</Text>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>📧  Email</Text>
              <Text style={s.infoValue}>{auth.currentUser?.email}</Text>
            </View>

            <View style={s.divider} />

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>🏙️  City</Text>
              {editing ? (
                <TextInput
                  style={s.editInput}
                  value={editCity}
                  onChangeText={setEditCity}
                  placeholder="Enter city"
                  placeholderTextColor="#ccc"
                />
              ) : (
                <Text style={s.infoValue}>{profile?.city || 'Not set'}</Text>
              )}
            </View>

            <View style={s.divider} />

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>📱  Phone</Text>
              {editing ? (
                <TextInput
                  style={s.editInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Enter phone"
                  placeholderTextColor="#ccc"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={s.infoValue}>{profile?.phone || 'Not set'}</Text>
              )}
            </View>

            <View style={s.divider} />

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>📅  Joined</Text>
              <Text style={s.infoValue}>
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>

          {editing && (
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={s.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          )}

          {/* Recent Submissions */}
          <View style={s.infoCard}>
            <Text style={s.sectionTitle}>Recent Submissions</Text>
            {reports.length === 0 ? (
              <Text style={s.emptyText}>No submissions yet.</Text>
            ) : (
              reports.map((r, i) => (
                <View key={r.id}>
                  {i > 0 && <View style={s.divider} />}
                  <View style={s.reportRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reportDelay}>⏱ {r.estimatedTimeText}</Text>
                      <Text style={s.reportLoc}>
                        📍 {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                      </Text>
                    </View>
                    <Text style={s.reportTime}>{formatTime(r.timestamp)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={s.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Tab Bar */}
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Home')}>
            <Text style={s.bTabIcon}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={s.bTabIcon}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Report')}>
            <Text style={s.bTabIcon}>📝</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bTab, s.bTabActive]}>
            <Text style={[s.bTabIcon, s.bTabIconActive]}>👤</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
  headerEdit: { fontSize: 18, color: '#333' },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 0.2,
  },

  /* Scroll */
  scroll: { paddingHorizontal: 20, paddingBottom: 110 },

  /* Avatar */
  avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E8922A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  profileEmail: { fontSize: 14, color: '#a09080', marginTop: 2 },
  editNameInput: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#333',
    width: '70%',
    textAlign: 'center',
    marginTop: 4,
  },

  /* Info Card */
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14, color: '#888', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.04)', marginVertical: 4 },

  editInput: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 12,
    textAlign: 'right',
  },

  /* Save */
  saveBtn: {
    backgroundColor: '#E8922A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  /* Report rows */
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  reportDelay: { fontSize: 14, fontWeight: '700', color: '#333' },
  reportLoc: { fontSize: 12, color: '#999', marginTop: 2 },
  reportTime: { fontSize: 11, color: '#b0a090', textAlign: 'right' },
  emptyText: { fontSize: 14, color: '#bbb', textAlign: 'center', paddingVertical: 12 },

  /* Logout */
  logoutBtn: {
    backgroundColor: 'rgba(229,57,53,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutText: { color: '#E53935', fontSize: 16, fontWeight: '700' },

  /* Bottom bar */
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

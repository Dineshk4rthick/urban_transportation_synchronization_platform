import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ref, get } from 'firebase/database';
import { db } from '../config/firebase';

export default function ReportsListScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      const snapshot = await get(ref(db, 'reports'));
      if (snapshot.exists()) {
        const val = snapshot.val();
        const data = Object.keys(val)
          .map((key) => ({ id: key, ...val[key] }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setReports(data);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Pending...';
    const d = new Date(ts);
    return d.toLocaleDateString() + '  ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardTime}>🕐  {formatTimestamp(item.timestamp)}</Text>
      </View>
      {item.reportType ? (
        <View style={s.cardBadge}>
          <Text style={s.cardBadgeText}>{item.reportType}</Text>
        </View>
      ) : null}
      <Text style={s.cardDelay}>⏱  {item.estimatedTimeText}</Text>
      <Text style={s.cardLocation}>
        📍  {item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}
      </Text>
      {item.placeName ? (
        <Text style={s.cardPlace}>📌  {item.placeName}</Text>
      ) : null}
      <Text style={s.cardMeta}>
        ID: {item.reportId?.slice(0, 8)}... • v{item.appVersion}
      </Text>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#f0eae6', '#f5e6da', '#fce4cc']} style={s.gradient}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerCircle} onPress={() => navigation.goBack()}>
            <Text style={s.headerBack}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Submitted Reports</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#E8922A" />
          </View>
        ) : reports.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyEmoji}>📋</Text>
            <Text style={s.emptyText}>No reports yet</Text>
            <Text style={s.emptySubtext}>Submit your first report!</Text>
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#E8922A']}
                tintColor="#E8922A"
              />
            }
          />
        )}

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
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 0.2,
  },

  /* List */
  list: { paddingHorizontal: 20, paddingBottom: 110 },

  /* Card */
  card: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTime: { fontSize: 12, color: '#a09080', fontWeight: '600' },
  cardDelay: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardLocation: { fontSize: 13, color: '#888', marginBottom: 4 },
  cardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(232,146,42,0.15)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E8922A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardPlace: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 4 },
  cardMeta: { fontSize: 11, color: '#bbb', marginTop: 8 },

  /* Empty */
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#a09080', fontWeight: '700' },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 4 },

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

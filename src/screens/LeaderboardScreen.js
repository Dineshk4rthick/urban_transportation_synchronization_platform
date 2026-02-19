import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ref, get, onValue } from 'firebase/database';
import { auth, db } from '../config/firebase';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_SIDE_W = (SCREEN_W - 64) / 3;

const AVATAR_COLORS = ['#E8A87C', '#D4A574', '#C4976A', '#B8896A', '#A87C5A', '#9A7050', '#8C6448'];

/* ── Avatar Component ── */
function Avatar({ name, size, color, borderWidth: bw = 3 }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color || '#E8A87C',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: bw,
        borderColor: 'rgba(255,255,255,0.85)',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.34 }}>
        {initials}
      </Text>
    </View>
  );
}

/* ── Change Badge ── */
function ChangeBadge({ change }) {
  if (change === null || change === undefined) return null;
  const up = change > 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: up ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.10)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 6,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: up ? '#43A047' : '#E53935',
        }}
      >
        {up ? '▲' : '▼'} {Math.abs(change)}
      </Text>
    </View>
  );
}

/* ── Top 3 Podium ── */
function Podium({ data }) {
  const first = data.find((d) => d.rank === 1);
  const second = data.find((d) => d.rank === 2);
  const third = data.find((d) => d.rank === 3);

  return (
    <View style={s.podiumRow}>
      {/* 2nd */}
      <View style={s.podiumSideWrap}>
        <View style={s.podiumCard}>
          <View style={s.rankPill}>
            <Text style={s.rankPillText}>#2</Text>
          </View>
          <View style={{ marginVertical: 10 }}>
            <Avatar name={second.name} size={68} color={AVATAR_COLORS[1]} />
          </View>
          <Text style={s.podiumName}>{second.name}</Text>
          <Text style={s.podiumScore}>{second.score.toLocaleString()}</Text>
          <ChangeBadge change={second.change} />
        </View>
      </View>

      {/* 1st */}
      <View style={s.podiumCenterWrap}>
        <View style={s.podiumCardCenter}>
          <Text style={s.crown}>👑</Text>
          <View style={{ marginBottom: 6, position: 'relative' }}>
            <Avatar name={first.name} size={82} color={AVATAR_COLORS[0]} borderWidth={4} />
            <View style={s.badge1}>
              <Text style={s.badge1Text}>1</Text>
            </View>
          </View>
          <Text style={s.podiumNameCenter}>{first.name}</Text>
          <Text style={s.podiumScoreCenter}>{first.score.toLocaleString()}</Text>
        </View>
      </View>

      {/* 3rd */}
      <View style={s.podiumSideWrap}>
        <View style={s.podiumCard}>
          <View style={s.rankPill}>
            <Text style={s.rankPillText}>#3</Text>
          </View>
          <View style={{ marginVertical: 10 }}>
            <Avatar name={third.name} size={60} color={AVATAR_COLORS[2]} />
          </View>
          <Text style={s.podiumName}>{third.name}</Text>
          <Text style={s.podiumScore}>{third.score.toLocaleString()}</Text>
          <ChangeBadge change={third.change} />
        </View>
      </View>
    </View>
  );
}

/* ── Row Item ── */
function Row({ item, index }) {
  const highlighted = item.isUser;
  return (
    <View style={[s.row, highlighted && s.rowHighlight]}>
      <Text style={[s.rowRank, highlighted && s.rowRankHL]}>{item.rank}</Text>
      <View style={{ marginRight: 14 }}>
        <Avatar
          name={item.name}
          size={44}
          color={AVATAR_COLORS[index % AVATAR_COLORS.length]}
          borderWidth={2}
        />
      </View>
      <View style={s.rowInfo}>
        <Text style={[s.rowName, highlighted && s.rowNameHL]}>
          {item.isUser ? 'You' : item.name}
        </Text>
        <Text style={s.rowHandle}>{item.handle}</Text>
      </View>
      <Text style={s.rowScore}>{item.score.toLocaleString()}</Text>
    </View>
  );
}

/* ── Main Screen ── */
export default function LeaderboardScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Global');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    // Real-time listener for users and reports
    const usersRef = ref(db, 'users');
    const reportsRef = ref(db, 'reports');

    const buildLeaderboard = async () => {
      try {
        const [usersSnap, reportsSnap] = await Promise.all([
          get(usersRef),
          get(reportsRef),
        ]);

        const users = usersSnap.exists() ? usersSnap.val() : {};
        const reports = reportsSnap.exists() ? reportsSnap.val() : {};

        // Count reports per user
        const reportCounts = {};
        Object.values(reports).forEach((r) => {
          const uid = r.anonymousUserId;
          if (uid) reportCounts[uid] = (reportCounts[uid] || 0) + 1;
        });

        // Build leaderboard entries
        const entries = Object.keys(users).map((uid) => ({
          id: uid,
          name: users[uid].name || 'User',
          email: users[uid].email || '',
          score: (reportCounts[uid] || 0) * 10,
          reportCount: reportCounts[uid] || 0,
          isUser: uid === currentUid,
        }));

        // Sort by score descending
        entries.sort((a, b) => b.score - a.score);

        // Assign ranks
        entries.forEach((e, i) => {
          e.rank = i + 1;
          e.handle = '@' + e.name.toLowerCase().replace(/\s+/g, '_');
        });

        setLeaderboardData(entries);
      } catch (err) {
        console.log('Leaderboard fetch error:', err);
      }
      setLoading(false);
    };

    buildLeaderboard();

    // Listen for real-time report changes
    const unsub = onValue(reportsRef, () => {
      buildLeaderboard();
    });

    return () => unsub();
  }, []);

  const listData = leaderboardData;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#f0eae6', '#f5e6da', '#fce4cc']} style={s.gradient}>
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerCircle} onPress={() => navigation.goBack()}>
            <Text style={s.headerBack}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Leaderboard</Text>
          <TouchableOpacity style={s.headerCircle}>
            <Text style={s.headerSearch}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tabs ── */}
        <View style={s.tabBar}>
          {['Global', 'Friends'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content ── */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#E8922A" />
          </View>
        ) : leaderboardData.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏆</Text>
            <Text style={{ fontSize: 16, color: '#a09080', fontWeight: '700' }}>No reporters yet</Text>
            <Text style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>Submit reports to appear here!</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
          >
            {leaderboardData.length >= 3 && <Podium data={leaderboardData} />}

            {leaderboardData.length > 0 && (
              <Text style={s.listHeader}>All Rankings</Text>
            )}
            <View style={s.listWrap}>
              {listData.map((item, i) => (
                <Row key={item.id} item={item} index={i} />
              ))}
            </View>
          </ScrollView>
        )}

        {/* ── Bottom Tab Bar ── */}
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Home')}>
            <Text style={s.bTabIcon}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bTab, s.bTabActive]}>
            <Text style={[s.bTabIcon, s.bTabIconActive]}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Report')}>
            <Text style={s.bTabIcon}>�</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Profile')}>
            <Text style={s.bTabIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

/* ── Styles ── */
const GLASS = {
  backgroundColor: 'rgba(255,255,255,0.18)',
  borderWidth: 0,
};
const GLASS_STRONG = {
  backgroundColor: 'rgba(255,255,255,0.28)',
  borderWidth: 0,
};
const SHADOW_SM = {
  shadowColor: '#d4b896',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 1,
};
const SHADOW_MD = {
  shadowColor: '#d4b896',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 2,
};

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
  headerSearch: { fontSize: 17 },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 0.2,
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 48,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 26,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 22,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 0,
  },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#b0a090' },
  tabLabelActive: { color: '#1a1a2e', fontWeight: '700' },

  /* Scroll */
  scroll: { paddingBottom: 110 },

  /* ── Podium ── */
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  podiumSideWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
  },
  podiumCenterWrap: {
    flex: 1.15,
    alignItems: 'center',
    marginBottom: 8,
  },
  podiumCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginHorizontal: 4,
  },
  podiumCardCenter: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 26,
    paddingTop: 6,
    paddingBottom: 18,
    paddingHorizontal: 8,
  },
  crown: { fontSize: 30, marginBottom: 2 },
  badge1: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#E8922A',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  badge1Text: { color: '#fff', fontSize: 13, fontWeight: '900' },
  rankPill: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 2,
  },
  rankPillText: { fontSize: 12, fontWeight: '800', color: '#888' },
  podiumName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
    textAlign: 'center',
  },
  podiumNameCenter: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    marginTop: 4,
    textAlign: 'center',
  },
  podiumScore: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E8922A',
    marginTop: 2,
    textAlign: 'center',
  },
  podiumScoreCenter: {
    fontSize: 20,
    fontWeight: '900',
    color: '#E8922A',
    marginTop: 2,
    textAlign: 'center',
  },

  /* ── List ── */
  listHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 20,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  listWrap: { paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 20,
    marginBottom: 12,
  },
  rowHighlight: {
    borderColor: 'rgba(232,146,42,0.45)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(232,146,42,0.06)',
  },
  rowRank: {
    fontSize: 15,
    fontWeight: '700',
    color: '#aaa',
    width: 28,
    textAlign: 'center',
    marginRight: 10,
  },
  rowRankHL: { color: '#E8922A' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  rowNameHL: { color: '#E8922A' },
  rowHandle: { fontSize: 12, color: '#aaa', marginTop: 2 },
  rowScore: { fontSize: 16, fontWeight: '800', color: '#E8922A' },

  /* ── Bottom Bar ── */
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

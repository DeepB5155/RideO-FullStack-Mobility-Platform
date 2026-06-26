import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import axiosInstance from '../api/axios';

const InsightsScreen = () => {
  const [insights, setInsights] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [insightsRes, leaderboardRes] = await Promise.all([
        axiosInstance.get('/rating/insights'),
        axiosInstance.get('/rating/leaderboard')
      ]);
      setInsights(insightsRes.data);
      setLeaderboard(leaderboardRes.data);
    } catch (e) {
      console.log('Failed to fetch insights', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const renderLeaderboardItem = ({ item, index }: { item: any, index: number }) => (
    <View style={[styles.leaderboardItem, index < 3 && styles.topThree]}>
      <Text style={styles.rank}>#{index + 1}</Text>
      <View style={styles.leaderInfo}>
        <Text style={styles.leaderName}>{item.name}</Text>
        <Text style={styles.leaderStats}>{item.totalRides} Rides</Text>
      </View>
      <View style={styles.ratingBadge}>
        <Text style={styles.ratingText}>★ {item.rating.toFixed(1)}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Insights</Text>
      
      {insights && (
        <View style={styles.statsCard}>
          <View style={styles.mainStat}>
            <Text style={styles.statLabel}>Average Rating</Text>
            <Text style={styles.statValue}>★ {insights.averageRating.toFixed(1)}</Text>
            <Text style={styles.statSub}>From {insights.totalRatings} ratings</Text>
          </View>
          
          <View style={styles.complimentsSection}>
            <Text style={styles.complimentsTitle}>Top Compliments</Text>
            {insights.topCompliments.length > 0 ? (
              insights.topCompliments.map((c: any, i: number) => (
                <View key={i} style={styles.complimentRow}>
                  <Text style={styles.complimentText}>{c.compliment}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{c.count}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No compliments yet.</Text>
            )}
          </View>
        </View>
      )}

      <Text style={[styles.title, { marginTop: 20 }]}>🏆 Pro Driver Leaderboard</Text>
      <Text style={styles.subtitle}>Top 10 Drivers in the City</Text>
      
      <View style={styles.leaderboardCard}>
        {leaderboard.length > 0 ? (
          leaderboard.map((item, index) => renderLeaderboardItem({ item, index }))
        ) : (
          <Text style={styles.emptyText}>Not enough data for leaderboard.</Text>
        )}
      </View>
      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  statsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  mainStat: { alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15, marginBottom: 15 },
  statLabel: { fontSize: 16, color: '#666' },
  statValue: { fontSize: 48, fontWeight: 'bold', color: '#ffc107', marginVertical: 5 },
  statSub: { fontSize: 14, color: '#999' },
  complimentsSection: {},
  complimentsTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  complimentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  complimentText: { fontSize: 15, color: '#444' },
  badge: { backgroundColor: '#e6f2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#007AFF', fontWeight: 'bold', fontSize: 12 },
  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  leaderboardCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  leaderboardItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  topThree: { backgroundColor: '#fffbe6' },
  rank: { fontSize: 18, fontWeight: 'bold', color: '#999', width: 40 },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  leaderStats: { fontSize: 12, color: '#666' },
  ratingBadge: { backgroundColor: '#ffc107', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  ratingText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

export default InsightsScreen;

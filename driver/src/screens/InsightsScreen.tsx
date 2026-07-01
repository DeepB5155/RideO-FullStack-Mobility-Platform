import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';
const InsightsScreen = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/insights/driver-stats');
      setStats(res.data);
    } catch (e) {
      console.log('Failed to fetch insights', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Find max daily earning to scale the bars properly
  const maxEarning = Math.max(...stats.dailyEarnings, 1); // Avoid division by zero
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // A simple hack to get today's index (0-6 where 0 is Monday or just use the last day if the array is ordered historically).
  // Assuming dailyEarnings is ordered from [today-6 days] to [today] (the 7th item is today).
  const isToday = (index: number) => index === 6;

  return (
    <ScrollView style={styles.container}>
      
      {/* EARNINGS OVERVIEW */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week's Earnings</Text>
        <Text style={styles.earningsLarge}>₹{stats.weeklyEarnings.toFixed(2)}</Text>
        
        {/* BAR CHART */}
        <View style={styles.chartContainer}>
          {stats.dailyEarnings.map((amount: number, index: number) => {
            const heightPct = (amount / maxEarning) * 100;
            return (
              <View key={index} style={styles.barCol}>
                <View style={styles.barBg}>
                  <View 
                    style={[
                      styles.barFill, 
                      { height: `${heightPct}%` },
                      isToday(index) && styles.barFillActive
                    ]} 
                  />
                </View>
                <Text style={styles.barLabel}>{dayLabels[index]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* TRIP STATISTICS */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Trips This Month</Text>
          <Text style={styles.statValue}>{stats.totalTripsThisMonth}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Avg Rating</Text>
          <Text style={styles.statValue}>⭐ {stats.avgRatingThisMonth}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Acceptance Rate</Text>
          <Text style={styles.statValue}>{stats.acceptanceRate}%</Text>
        </View>
      </View>

      {/* PERFORMANCE BADGES */}
      {stats.badges && stats.badges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earned Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
            {stats.badges.map((badge: string, index: number) => {
              let icon = '🏆';
              if (badge === '5-Star Week') icon = '⭐';
              if (badge === 'Daily Commuter') icon = '🔄';
              if (badge === '₹10,000 Club') icon = '💰';

              return (
                <View key={index} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{icon}</Text>
                  <Text style={styles.badgeName}>{badge}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* RECENT REVIEWS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Passenger Reviews</Text>
        {stats.recentReviews && stats.recentReviews.length > 0 ? (
          stats.recentReviews.map((review: any, index: number) => (
            <View key={index} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.date).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.reviewStars}>{'⭐'.repeat(review.stars)}</Text>
              {review.reviewText ? (
                <Text style={styles.reviewText}>"{review.reviewText}"</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent reviews.</Text>
        )}
      </View>

      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  section: {
    backgroundColor: theme.colors.card,
    margin: 15,
    marginBottom: 5,
    padding: 20,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text.main, marginBottom: 15 },
  earningsLarge: { fontSize: 36, fontWeight: '900', color: theme.colors.primary, marginBottom: 20 },
  
  // Chart Styles
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 15,
  },
  barCol: {
    alignItems: 'center',
    width: 30,
  },
  barBg: {
    height: 80,
    width: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: 12,
    backgroundColor: theme.colors.text.muted,
    borderRadius: 6,
  },
  barFillActive: {
    backgroundColor: theme.colors.primary,
  },
  barLabel: {
    marginTop: 8,
    fontSize: 10,
    color: theme.colors.text.muted,
    fontWeight: '600'
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 5,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.card,
    padding: 15,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  statLabel: { fontSize: 12, color: theme.colors.text.muted, textAlign: 'center', marginBottom: 5, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '800', color: theme.colors.text.main },

  // Badges
  badgeScroll: {
    marginHorizontal: -5,
  },
  badgeCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    width: 110,
  },
  badgeIcon: { fontSize: 24, marginBottom: 5 },
  badgeName: { fontSize: 12, fontWeight: '700', color: theme.colors.text.main, textAlign: 'center' },

  // Reviews
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 15,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  reviewerName: { fontWeight: '700', color: theme.colors.text.main },
  reviewDate: { fontSize: 12, color: theme.colors.text.muted },
  reviewStars: { marginBottom: 8 },
  reviewText: { fontSize: 14, color: theme.colors.text.muted, fontStyle: 'italic', lineHeight: 20 },
  emptyText: { color: theme.colors.text.muted, fontStyle: 'italic' }
});

export default InsightsScreen;

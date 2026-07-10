import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import api from '../api/axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LeaderboardScreen = ({ navigation }: any) => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/rating/leaderboard');
      setLeaders(res.data);
    } catch (error) {
      console.log('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isTop3 = index < 3;
    const rankColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f3f4f6';
    
    return (
      <View style={[styles.card, isTop3 && styles.topCard]}>
        <View style={[styles.rankBadge, { backgroundColor: isTop3 ? rankColor : '#f3f4f6' }]}>
          <Text style={[styles.rankText, { color: isTop3 ? '#fff' : '#4b5563' }]}>#{index + 1}</Text>
        </View>
        
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.name}</Text>
          <Text style={styles.ridesText}>{item.totalRides} completed rides</Text>
        </View>
        
        <View style={styles.ratingBadge}>
          <Icon name="star" size={16} color="#fbbf24" />
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Top Drivers</Text>
        <Icon name="emoji-events" size={24} color="#fbbf24" />
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>Keep providing excellent service to climb the ranks!</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#000" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item) => item.driverId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="leaderboard" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>Not enough data for the leaderboard yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    flex: 1,
  },
  banner: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  bannerText: {
    color: '#1e40af',
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  topCard: {
    borderWidth: 1,
    borderColor: '#fef08a',
    backgroundColor: '#fffbeb',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '800',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  ridesText: {
    fontSize: 12,
    color: '#6b7280',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  }
});

export default LeaderboardScreen;

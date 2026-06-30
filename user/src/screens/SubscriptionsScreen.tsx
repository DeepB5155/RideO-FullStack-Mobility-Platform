import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

// Replace with your local machine's IP address
const API_URL = 'http://10.0.2.2:5000/api';

export default function SubscriptionsScreen({ navigation }: any) {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/booking/my-subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch subscriptions', error);
      Alert.alert('Error', 'Could not load your subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (id: string, currentlyPaused: string | null) => {
    try {
      if (currentlyPaused) {
        Alert.alert('Info', `Subscription is already paused until ${new Date(currentlyPaused).toLocaleDateString()}`);
        return;
      }

      // Simple implementation: Pause for 7 days
      const pauseDate = new Date();
      pauseDate.setDate(pauseDate.getDate() + 7);

      const token = await AsyncStorage.getItem('userToken');
      await axios.put(`${API_URL}/booking/subscribe/${id}/pause`, { pauseUntilDate: pauseDate.toISOString() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Success', 'Subscription paused for 7 days.');
      fetchSubscriptions();
    } catch (error) {
      Alert.alert('Error', 'Failed to pause subscription.');
    }
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this daily commute subscription? Unused prepaid balances will be refunded.',
      [
        { text: 'No, Keep It', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await axios.delete(`${API_URL}/booking/subscribe/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert('Cancelled', 'Subscription has been cancelled.');
              fetchSubscriptions();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription.');
            }
          }
        }
      ]
    );
  };

  const renderDays = (daysString: string) => {
    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeDays = daysString ? daysString.split(',') : [];

    return (
      <View style={styles.daysRow}>
        {allDays.map(day => (
          <View key={day} style={[styles.dayPill, activeDays.includes(day) && styles.dayPillActive]}>
            <Text style={[styles.dayText, activeDays.includes(day) && styles.dayTextActive]}>{day[0]}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderSubscription = ({ item }: { item: any }) => {
    const isPaused = item.pausedUntil && new Date(item.pausedUntil) > new Date();

    return (
      <View style={[styles.card, isPaused && styles.cardPaused]}>
        <View style={styles.cardHeader}>
          <View style={styles.routeContainer}>
            <Text style={styles.locationText} numberOfLines={1}>
              <View style={styles.greenDot} /> {item.route.startLocation}
            </Text>
            <Icon name="arrow-down-outline" size={16} color="#555" style={styles.arrowIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              <Icon name="location" size={12} color="#FF3B30" /> {item.route.endLocation}
            </Text>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.timeBadge}>{item.route.recurringTime?.substring(0, 5) || 'Morning'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View>
            <Text style={styles.label}>Schedule</Text>
            {renderDays(item.route.recurringDays)}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>Payment Plan</Text>
            <View style={[styles.planBadge, item.paymentPlan === 'Weekly' ? styles.planBadgeWeekly : styles.planBadgeDaily]}>
              <Text style={styles.planText}>{item.paymentPlan === 'Weekly' ? 'Weekly Prepaid' : 'Daily Auto-Pay'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.driverInfoRow}>
          <Icon name="person-circle-outline" size={24} color="#888" />
          <Text style={styles.driverName}>Driver: {item.route.driverName}</Text>
          <Text style={styles.seatsInfo}>{item.seatsBooked} {item.seatsBooked > 1 ? 'seats' : 'seat'} · ₹{item.totalFarePerRide}/day</Text>
        </View>

        {isPaused && (
          <View style={styles.pausedBanner}>
            <Icon name="pause-circle" size={16} color="#FF9500" />
            <Text style={styles.pausedText}>Paused until {new Date(item.pausedUntil).toLocaleDateString()}</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtnPause} 
            onPress={() => handlePause(item.id, item.pausedUntil)}
          >
            <Icon name="pause" size={18} color="#FF9500" />
            <Text style={styles.actionTextPause}>{isPaused ? 'Paused' : 'Pause 7 Days'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtnCancel} 
            onPress={() => handleCancel(item.id)}
          >
            <Icon name="close" size={18} color="#FF3B30" />
            <Text style={styles.actionTextCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Icon name="calendar" size={28} color="#00E676" />
        <Text style={styles.header}>My Daily Routes</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00E676" style={{ marginTop: 50 }} />
      ) : subscriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="bus-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No daily subscriptions yet</Text>
          <Text style={styles.emptySub}>Find a recurring ride and subscribe to save time every morning!</Text>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={item => item.id}
          renderItem={renderSubscription}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('SearchRide')}
      >
        <Text style={styles.fabText}>Find Daily Routes</Text>
        <Icon name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, marginTop: 40 },
  header: { fontSize: 26, fontWeight: '800', color: '#fff', marginLeft: 10 },
  
  card: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  cardPaused: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeContainer: { flex: 1, paddingRight: 10 },
  locationText: { fontSize: 15, color: '#fff', fontWeight: '600', marginVertical: 2 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00E676', marginRight: 5 },
  arrowIcon: { marginLeft: 3, marginVertical: 2 },
  
  badgeContainer: { backgroundColor: '#2C2C2E', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  timeBadge: { color: '#00E676', fontWeight: 'bold', fontSize: 14 },
  
  divider: { height: 1, backgroundColor: '#333', marginVertical: 15 },
  
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  label: { fontSize: 12, color: '#888', marginBottom: 5 },
  
  daysRow: { flexDirection: 'row' },
  dayPill: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  dayPillActive: { backgroundColor: '#00E676' },
  dayText: { fontSize: 10, color: '#888', fontWeight: 'bold' },
  dayTextActive: { color: '#000' },
  
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  planBadgeDaily: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  planBadgeWeekly: { backgroundColor: 'rgba(168, 85, 247, 0.2)' },
  planText: { fontSize: 11, fontWeight: 'bold', color: '#3b82f6' },
  
  driverInfoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#252525', padding: 10, borderRadius: 10, marginBottom: 15 },
  driverName: { color: '#ccc', fontSize: 14, marginLeft: 8, flex: 1 },
  seatsInfo: { color: '#00E676', fontSize: 13, fontWeight: 'bold' },
  
  pausedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 149, 0, 0.1)', padding: 10, borderRadius: 8, marginBottom: 15 },
  pausedText: { color: '#FF9500', marginLeft: 8, fontSize: 13, fontWeight: '500' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtnPause: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 149, 0, 0.1)', paddingVertical: 10, borderRadius: 10, flex: 1, marginRight: 10 },
  actionTextPause: { color: '#FF9500', fontWeight: 'bold', marginLeft: 6 },
  actionBtnCancel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 59, 48, 0.1)', paddingVertical: 10, borderRadius: 10, flex: 1 },
  actionTextCancel: { color: '#FF3B30', fontWeight: 'bold', marginLeft: 6 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -50 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  emptySub: { color: '#888', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

  fab: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#3b82f6', flexDirection: 'row', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 }
});

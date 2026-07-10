import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../api/axios';

const localColors = {
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#131b2e',
  secondary: '#006a61',
  secondaryContainer: '#86f2e4',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceBright: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  onBackground: '#0b1c30',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
};

export default function SubscriptionsScreen({ navigation }: any) {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await api.get('/booking/my-subscriptions');
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch subscriptions', error);
      // Fail silently for UI demo purposes if no backend
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
      const pauseDate = new Date();
      pauseDate.setDate(pauseDate.getDate() + 7);

      await api.put(`/booking/subscribe/${id}/pause`, { pauseUntilDate: pauseDate.toISOString() });
      
      Alert.alert('Success', 'Subscription paused for 7 days.');
      fetchSubscriptions();
    } catch (error) {
      Alert.alert('Error', 'Failed to pause subscription.');
    }
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this daily commute subscription?',
      [
        { text: 'No, Keep It', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/booking/subscribe/${id}`);
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

  const renderDays = (daysString: string, isPaused: boolean) => {
    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeDays = daysString ? daysString.split(',') : [];

    return (
      <View style={[styles.daysRow, isPaused && styles.daysRowPaused]}>
        {allDays.map((day, index) => {
          const isActive = activeDays.includes(day);
          return (
            <View key={day} style={[styles.dayPill, isActive && styles.dayPillActive, isPaused && isActive && styles.dayPillPaused]}>
              <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day[0]}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSubscription = ({ item }: { item: any }) => {
    const isPaused = item.pausedUntil && new Date(item.pausedUntil) > new Date();
    const driverName = item.route?.driverName || 'Unassigned';
    const weeklyEst = (item.totalFarePerRide || 0) * (item.route?.recurringDays?.split(',')?.length || 5);
    const startLoc = item.route?.startLocation ? item.route.startLocation.split(',')[0] : 'Home';
    const endLoc = item.route?.endLocation ? item.route.endLocation.split(',')[0] : 'Office';
    const title = `${startLoc} to ${endLoc}`;
    const timeParts = (item.route?.recurringTime || '08:00:00').split(':');
    const d = new Date();
    d.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10));
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const isPending = item.status === 'Pending';

    return (
      <View style={[styles.card, (isPaused || isPending) && styles.cardPaused]}>
        {/* Status Badge */}
        {isPending ? (
          <View style={[styles.activeBadge, { backgroundColor: '#fff3e0' }]}>
            <MaterialIcons name="schedule" size={14} color="#e65100" style={{ marginRight: 4 }} />
            <Text style={[styles.activeBadgeText, { color: '#e65100' }]}>Pending Approval</Text>
          </View>
        ) : isPaused ? (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedBadgeText}>Paused</Text>
          </View>
        ) : (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}

        {/* Route Header */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isPaused && styles.textMuted]} numberOfLines={1}>{title}</Text>
          <View style={styles.timeRow}>
            <MaterialIcons name="schedule" size={16} color={localColors.onSurfaceVariant} />
            <Text style={styles.timeText}>{time} Departure</Text>
          </View>
        </View>

        {/* Days Active */}
        {renderDays(item.route?.recurringDays || 'Mon,Tue,Wed,Thu,Fri', isPaused)}

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={[styles.detailBox, isPaused && styles.detailBoxPaused]}>
            <Text style={styles.detailLabel}>DRIVER</Text>
            {driverName !== 'Unassigned' ? (
              <View style={styles.driverRow}>
                <Image 
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADJzx65F5lFFLe_CZcAJ6axUA4tyl-uKQ861FID9wdtBf3QTygq21OboOaCHEIGWw_vDOPZu-Tln0gZDzAGL6iOFDl2nmp10JwzWgoRsvtO3ybZ-LddgI6RFBxoo2HhvvZLXjegTWsV2KyqqnwLQYBcAlkD4DtKR2KmSv0A1mD2n16BGlhFOCHPKcL6OBBcjo0tRZ5gI4RZik4vJdYuSUhR5WSxWlmsWpx13VzEAb167xjGQX5FMwIX0acetJX9KcvecDzbNQGZuz8' }} 
                  style={styles.driverImg} 
                />
                <View>
                  <Text style={styles.driverNameText} numberOfLines={1}>{driverName}</Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingText}>4.9</Text>
                    <MaterialIcons name="star" size={12} color={localColors.secondary} />
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.unassignedText}>Unassigned</Text>
            )}
          </View>
          
          <View style={[styles.detailBox, isPaused && styles.detailBoxPaused, { justifyContent: 'center' }]}>
            <Text style={styles.detailLabel}>WEEKLY EST.</Text>
            <Text style={[styles.priceText, isPaused && styles.textMuted]}>₹{weeklyEst.toFixed(2)}</Text>
          </View>
        </View>

        {/* Vehicle Info */}
        {driverName !== 'Unassigned' && (
          <View style={[styles.detailBox, isPaused && styles.detailBoxPaused, { marginBottom: 20, flexDirection: 'row', alignItems: 'center' }]}>
            <View style={styles.vehicleIconContainer}>
              <MaterialIcons name="directions-car" size={20} color={localColors.secondary} />
            </View>
            <View>
              <Text style={styles.detailLabel}>VEHICLE DETAILS</Text>
              <Text style={styles.vehicleText}>{item.route?.vehicleMake || 'N/A'} {item.route?.vehicleModel || ''}</Text>
              <Text style={styles.licenseText}>{item.route?.licensePlate || '---'}</Text>
            </View>
          </View>
        )}

        {/* Action Controls */}
        <View style={styles.actionRow}>
          {isPending ? (
            <View style={[styles.btnPause, { opacity: 0.5, backgroundColor: '#f0f0f0' }]}>
              <Text style={[styles.btnPauseText, { color: '#888' }]}>Waiting...</Text>
            </View>
          ) : isPaused ? (
            <TouchableOpacity style={styles.btnResume}>
              <MaterialIcons name="play-arrow" size={18} color={localColors.onPrimary} />
              <Text style={styles.btnResumeText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnPause} onPress={() => handlePause(item.id, null)}>
              <MaterialIcons name="pause" size={18} color={localColors.onSurface} />
              <Text style={styles.btnPauseText}>Pause</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnCancel} onPress={() => handleCancel(item.id)}>
            <MaterialIcons name="cancel" size={18} color={localColors.error} />
            <Text style={styles.btnCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCreateNewCard = () => (
    <TouchableOpacity style={styles.createCard} onPress={() => navigation.navigate('SearchRide')}>
      <View style={styles.createIconBg}>
        <MaterialIcons name="add" size={32} color={localColors.primary} />
      </View>
      <Text style={styles.createTitle}>Create New Route</Text>
      <Text style={styles.createSubtitle}>Set up a recurring schedule for better rates and reliable drivers.</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={localColors.primary} />
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={item => item.id}
          renderItem={renderSubscription}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.pageTitle}>Your Commutes</Text>
              <Text style={styles.pageSubtitle}>Manage your recurring rides and schedules.</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={48} color={localColors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>No Subscriptions Yet</Text>
              <Text style={styles.emptySubtitle}>You don't have any active commutes set up.</Text>
            </View>
          }
          ListFooterComponent={renderCreateNewCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('SearchRide')}>
        <MaterialIcons name="add" size={24} color={localColors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  headerSafe: {
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  headerIconBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: localColors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: localColors.onSurface,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
  },
  card: {
    backgroundColor: localColors.surfaceContainer,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    marginBottom: 16,
    position: 'relative',
  },
  cardPaused: {
    backgroundColor: localColors.surface,
    borderColor: 'rgba(198, 198, 205, 0.5)',
  },
  activeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 106, 97, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: localColors.secondary,
  },
  activeBadgeText: {
    color: localColors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pausedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: localColors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pausedBadgeText: {
    color: localColors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  cardHeader: {
    marginBottom: 20,
    paddingRight: 80,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
  },
  textMuted: {
    color: localColors.onSurfaceVariant,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  daysRowPaused: {
    opacity: 0.6,
  },
  dayPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: localColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: localColors.primary,
  },
  dayPillPaused: {
    backgroundColor: '#666',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
  },
  dayTextActive: {
    color: localColors.onPrimary,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailBox: {
    flex: 1,
    backgroundColor: localColors.surfaceBright,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.2)',
  },
  detailBoxPaused: {
    opacity: 0.7,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  driverNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: localColors.secondary,
  },
  unassignedText: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 198, 205, 0.2)',
    paddingTop: 16,
  },
  btnPause: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: localColors.surfaceBright,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  btnPauseText: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  btnCancel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: localColors.surfaceBright,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.3)',
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.error,
  },
  btnResume: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: localColors.primary,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  btnResumeText: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onPrimary,
  },
  createCard: {
    backgroundColor: localColors.surfaceBright,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(198, 198, 205, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  createIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: localColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  createTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 8,
  },
  createSubtitle: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: '80%',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: localColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: localColors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: '80%',
  },
  vehicleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: localColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onBackground,
    marginBottom: 2,
  },
  licenseText: {
    fontSize: 12,
    fontWeight: '700',
    color: localColors.outline,
    letterSpacing: 1,
  },
});

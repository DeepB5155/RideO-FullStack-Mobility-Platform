import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ImageBackground, Image, Platform } from 'react-native';
import axiosInstance from '../api/axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const localColors = {
  background: '#f8f9ff',
  primary: '#000000',
  onPrimary: '#ffffff',
  onSurfaceVariant: '#45464d',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
  onSurface: '#0b1c30',
  surfaceContainer: '#e5eeff',
  surfaceVariant: '#d3e4fe',
  surface: '#ffffff',
  secondary: '#006a61',
  onSecondary: '#ffffff',
  onBackground: '#0b1c30',
  success: '#10B981',
  error: '#ba1a1a',
  surfaceContainerHigh: '#dce9ff',
};

const mapBgUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuBMygDuiyZNh5y1lLFfW8wp7hP06AN6n4Dx-V4GQ-PrzTh5wOMMXL7VjNcVPjD9AfWLXWmRiG09A1FsKGOK0dxStxdB6xRqV_KDnvKD5kktTZuY5Y4X7D3z-vTxXvHgEvJ94YBf3I9e9U9V7Qz7AmMjypI9uJaZfBHLiK4UheBeflGl8rsO6BeRt9rCLgPAA7BQybz2P_fL8GzwFs-R0EB6FlMRKndOXiyA00idepoC0jhOvOP0x7YmB62wzpBz5sJZELK6IM8MqH0R";

const MyRidesScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'OneTime' | 'Recurring'>('OneTime');
  const [bookings, setBookings] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const fetchBookings = async () => {
    try {
      const res = await axiosInstance.get('/booking/my-bookings');
      setBookings(res.data);
    } catch (e) {
      console.log('Failed to fetch bookings', e);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await axiosInstance.get('/booking/my-subscriptions');
      setSubscriptions(res.data);
    } catch (e) {
      console.log('Failed to fetch subscriptions', e);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBookings();
      fetchSubscriptions();
    });
    return unsubscribe;
  }, [navigation]);

  const cancelBooking = async (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      { 
        text: 'Yes', 
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.put(`/booking/${id}/cancel`);
            fetchBookings();
            Alert.alert('Success', 'Booking cancelled.');
          } catch (e: any) {
            Alert.alert('Error', e.response?.data || 'Failed to cancel booking');
          }
        }
      }
    ]);
  };

  const cancelSubscription = async (id: string) => {
    Alert.alert('Cancel Subscription', 'Are you sure you want to stop this daily subscription?', [
      { text: 'No', style: 'cancel' },
      { 
        text: 'Yes', 
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/booking/subscribe/${id}`);
            fetchSubscriptions();
            Alert.alert('Success', 'Subscription cancelled.');
          } catch (e: any) {
            Alert.alert('Error', e.response?.data || 'Failed to cancel subscription');
          }
        }
      }
    ]);
  };

  const renderBookingItem = ({ item }: { item: any }) => {
    const isLive = item.status === 'Started';
    const isPending = item.status === 'Pending' || item.status === 'Approved';
    const isCompleted = item.status === 'Completed' || item.status === 'Cancelled' || item.status === 'No-show';

    return (
      <View style={[styles.card, isCompleted && styles.cardCompleted]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons 
              name={isLive ? "trip-origin" : isCompleted ? "check-circle" : "calendar-today"} 
              size={20} 
              color={isLive ? localColors.secondary : isCompleted ? localColors.primary : localColors.onSurfaceVariant} 
            />
            <Text style={styles.cardTitle}>
              {isLive 
                ? 'In Progress' 
                : isCompleted 
                  ? item.status 
                  : item.status === 'Pending' 
                    ? 'Pending Approval' 
                    : `Scheduled, ${new Date(item.route.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
              }
            </Text>
          </View>
          
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          {isPending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{item.status.toUpperCase()}</Text>
            </View>
          )}
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>{item.status.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Route Details */}
        <View style={styles.routeContainer}>
          <View style={styles.routeTimeline}>
            <View style={[styles.timelineDot, { borderColor: isLive ? localColors.primary : isCompleted ? 'rgba(0,0,0,0.5)' : localColors.onSurfaceVariant }]} />
            <View style={styles.timelineLine} />
            <View style={[styles.timelineDotSolid, { backgroundColor: isLive ? localColors.primary : isCompleted ? 'rgba(0,0,0,0.5)' : localColors.onSurfaceVariant }]} />
          </View>
          
          <View style={styles.routeDetails}>
            <View style={styles.routeRow}>
              {isLive && <Text style={styles.routeLabel}>Pickup</Text>}
              <Text style={styles.routeLocationText} numberOfLines={1}>{item.pickupLocationName}</Text>
            </View>
            <View style={styles.routeRow}>
              {isLive && <Text style={styles.routeLabel}>Dropoff</Text>}
              <Text style={styles.routeLocationText} numberOfLines={1}>{item.dropoffLocationName}</Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>₹{item.totalFare}</Text>
          </View>
        </View>

        {/* Actions */}
        {isLive && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.trackBtn} 
              onPress={() => navigation.navigate('Live Tracking', { 
                routeId: item.routeId,
                driverName: item.route.driverName,
                driverUserId: item.route.driverUserId,
                pickup: item.pickupLocationName,
                dropoff: item.dropoffLocationName,
                bookingId: item.id,
                trackingId: item.trackingId,
                otp: item.otp
              })}
            >
              <MaterialIcons name="my-location" size={18} color={localColors.onPrimary} />
              <Text style={styles.trackBtnText}>Track</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.chatBtn} 
              onPress={() => navigation.navigate('Chat', { 
                bookingId: item.id,
                targetName: item.route.driverName
              })}
            >
              <MaterialIcons name="chat" size={24} color={localColors.onSurface} />
            </TouchableOpacity>
          </View>
        )}

        {isPending && (
          <View style={[styles.actionsContainer, { marginTop: 12 }]}>
            <TouchableOpacity 
              style={[styles.trackBtn, { flex: 1, backgroundColor: localColors.surfaceContainerHigh, marginRight: 8 }]} 
              onPress={() => cancelBooking(item.id)}
            >
              <Text style={[styles.trackBtnText, { color: localColors.error }]}>Cancel Ride</Text>
            </TouchableOpacity>

            {item.status === 'Approved' && (
              <TouchableOpacity 
                style={[styles.chatBtn, { width: undefined, flex: 1, backgroundColor: localColors.primary }]} 
                onPress={() => navigation.navigate('Chat', { 
                  bookingId: item.id,
                  targetName: item.route.driverName
                })}
              >
                <Text style={[styles.trackBtnText, { color: localColors.onPrimary }]}>Chat with Driver</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderSubscriptionItem = ({ item }: { item: any }) => {
    const isActive = item.status === 'Active' || item.status === 'Approved' || item.status === 'Pending';
    const route = item.route || {};
    
    return (
      <View style={[styles.card, !isActive && styles.cardCompleted]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons 
              name={isActive ? "loop" : "block"} 
              size={20} 
              color={isActive ? localColors.secondary : localColors.onSurfaceVariant} 
            />
            <Text style={styles.cardTitle}>
              {isActive ? 'Active Subscription' : 'Stopped by Driver'}
            </Text>
          </View>
          
          {isActive ? (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>ACTIVE</Text>
            </View>
          ) : (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>STOPPED</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={[styles.routeContainer, { marginTop: 16 }]}>
          <View style={styles.routeDetails}>
            <View style={styles.routeRow}>
              <Text style={styles.routeLabel}>Route</Text>
              <Text style={styles.routeLocationText} numberOfLines={1}>{route.startLocation || 'Unknown'} → {route.endLocation || 'Unknown'}</Text>
            </View>
            <View style={[styles.routeRow, { marginTop: 8 }]}>
              <Text style={styles.routeLabel}>Schedule</Text>
              <Text style={styles.routeLocationText}>{route.recurringDays || 'Everyday'} at {route.recurringTime || 'TBD'}</Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.routeLabel}>Per Ride</Text>
            <Text style={styles.priceText}>₹{item.totalFarePerRide}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.actionsContainer, { marginTop: 16 }]}>
          <TouchableOpacity 
            style={[styles.trackBtn, { flex: 1, backgroundColor: localColors.surfaceContainerHigh }]} 
            onPress={() => cancelSubscription(item.id)}
          >
            <Text style={[styles.trackBtnText, { color: localColors.error }]}>Unsubscribe</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Map Background Layer */}
      <ImageBackground source={{ uri: mapBgUrl }} style={styles.mapBg} resizeMode="cover" />
      
      <View style={styles.innerContainer}>
        <View style={styles.bottomSheet}>
          <View style={styles.handleBar} />
          
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>My Rides</Text>
              <TouchableOpacity onPress={() => navigation.navigate('RideHistory')} style={styles.historyBtn}>
                <MaterialIcons name="history" size={24} color={localColors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabBtn, activeTab === 'OneTime' && styles.tabBtnActive]} 
                onPress={() => setActiveTab('OneTime')}
              >
                <Text style={[styles.tabText, activeTab === 'OneTime' && styles.tabTextActive]}>One-Time</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, activeTab === 'Recurring' && styles.tabBtnActive]} 
                onPress={() => setActiveTab('Recurring')}
              >
                <Text style={[styles.tabText, activeTab === 'Recurring' && styles.tabTextActive]}>Recurring</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.listContainer}>
            {activeTab === 'OneTime' ? (
              <FlatList
                data={bookings}
                keyExtractor={(item) => item.id}
                renderItem={renderBookingItem}
                ListEmptyComponent={<Text style={styles.emptyText}>You have no one-time booked rides.</Text>}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <FlatList
                data={subscriptions}
                keyExtractor={(item) => item.id}
                renderItem={renderSubscriptionItem}
                ListEmptyComponent={<Text style={styles.emptyText}>You have no active daily subscriptions.</Text>}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mapBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%', 
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
  },
  headerIconBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: localColors.primary,
    letterSpacing: -0.5,
  },
  avatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: localColors.surfaceVariant,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: localColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 60, // Shows plenty of map
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  handleBar: {
    width: 48,
    height: 4,
    backgroundColor: localColors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,205,0.3)',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: localColors.onBackground,
  },
  historyBtn: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 8,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: localColors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
  },
  tabTextActive: {
    color: localColors.onPrimary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100, // Space for bottom nav
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    marginTop: 40,
  },
  card: {
    backgroundColor: localColors.surface,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.onBackground,
    marginLeft: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,106,97,0.1)', // secondary/10
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: localColors.secondary,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: localColors.secondary,
    letterSpacing: 0.5,
  },
  pendingBadge: {
    backgroundColor: localColors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: localColors.onSurface,
    letterSpacing: 0.5,
  },
  completedBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: localColors.primary,
    letterSpacing: 0.5,
  },
  routeContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  routeTimeline: {
    alignItems: 'center',
    paddingVertical: 4,
    width: 24,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: 'rgba(198,198,205,0.5)', // outlineVariant/50
    marginVertical: 4,
  },
  timelineDotSolid: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeRow: {
    justifyContent: 'center',
  },
  routeLabel: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
  },
  routeLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.onBackground,
  },
  priceContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: localColors.onBackground,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  trackBtn: {
    flex: 1,
    backgroundColor: localColors.primary,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  trackBtnText: {
    color: localColors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  chatBtn: {
    width: 48,
    height: 48,
    backgroundColor: localColors.surfaceContainerHigh,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MyRidesScreen;

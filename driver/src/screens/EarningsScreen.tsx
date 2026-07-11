import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  Platform
} from 'react-native';
import axiosInstance from '../api/axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const EarningsScreen = ({ navigation }: any) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c;
  };

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await axiosInstance.get('/route/my-routes');
        // Include both Completed and Cancelled to show different card states like the design
        const historyRides = res.data.filter((r: any) => r.status === 'Completed' || r.status === 'Cancelled');
        
        let totalEarnings = 0;
        let totalRides = 0;
        let totalOnlineMinutes = 0;

        historyRides.forEach((r: any) => {
          if (r.status === 'Completed') {
            const platformFeeMultiplier = 0.90; // Driver keeps 90%
            totalEarnings += (r.pricePerSeat * (r.totalSeats - r.availableSeats)) * platformFeeMultiplier;
            totalRides += 1;
            
            if (r.startTime && r.estimatedEndTime) {
              const start = new Date(r.startTime).getTime();
              const end = new Date(r.estimatedEndTime).getTime();
              const diffMins = (end - start) / 60000;
              if (diffMins > 0) totalOnlineMinutes += diffMins;
            }
          }
        });

        const hours = Math.floor(totalOnlineMinutes / 60);
        const mins = Math.floor(totalOnlineMinutes % 60);
        const formattedOnlineHours = `${hours}h ${mins}m`;

        setStats({
          balance: totalEarnings,
          recentRides: totalRides,
          onlineHours: formattedOnlineHours,
          rides: historyRides.sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        });
      } catch (err) {
        console.log('Earnings fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEarnings();
  }, []);

  const formatMoney = (amount: number) => {
    const parts = amount.toFixed(2).split('.');
    return { whole: parts[0], decimal: parts[1] };
  };

  const renderRideCard = (ride: any, idx: number) => {
    const isCancelled = ride.status === 'Cancelled';
    const total = ride.pricePerSeat * (ride.totalSeats - ride.availableSeats);
    const earning = isCancelled ? 0 : (total * 0.9);
    
    const tripId = `#${ride.id ? ride.id.substring(0, 5).toUpperCase() : (8829 - idx)}`; 

    const startDate = new Date(ride.startTime);
    const dateStr = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const calculatedKm = Math.floor(getDistanceFromLatLonInKm(ride.startLat, ride.startLng, ride.endLat, ride.endLng));
    const distanceKm = calculatedKm > 0 ? calculatedKm : 0;
    
    let durationMins = 0;
    if (ride.startTime && ride.estimatedEndTime) {
      const start = new Date(ride.startTime).getTime();
      const end = new Date(ride.estimatedEndTime).getTime();
      durationMins = Math.floor((end - start) / 60000);
    }
    const finalMins = durationMins > 0 ? durationMins : 0;

    return (
      <View key={ride.id || idx} style={[styles.rideCard, isCancelled && styles.rideCardCancelled]}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardDateTime}>{dateStr}, {timeStr}</Text>
            <Text style={styles.cardTripId}>Trip ID: {tripId}</Text>
          </View>
          <Text style={[styles.cardEarning, isCancelled && styles.cardEarningCancelled]}>
            ₹{earning.toFixed(0)}
          </Text>
        </View>

        <View style={styles.routeNodesContainer}>
          <View style={styles.nodeGraphics}>
            <View style={[styles.dotOpen, isCancelled && styles.dotCancelled]} />
            <View style={[styles.verticalLine, isCancelled && styles.lineCancelled]} />
            <View style={[styles.dotClosed, isCancelled && styles.dotCancelledFill]} />
          </View>
          <View style={styles.nodeTexts}>
            <Text style={styles.nodeText} numberOfLines={1}>{ride.startLocation}</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.nodeText} numberOfLines={1}>{ride.endLocation}</Text>
          </View>
        </View>

        <View style={styles.cardFooterRow}>
          <View style={styles.metricsContainer}>
            <Text style={styles.metricChip}>{distanceKm} km</Text>
            <Text style={styles.metricChip}>{finalMins} mins</Text>
          </View>
          {isCancelled ? (
            <View style={styles.badgeCancelled}>
              <Text style={styles.badgeTextCancelled}>Cancelled</Text>
            </View>
          ) : (
            <View style={styles.badgeCompleted}>
              <Text style={styles.badgeTextCompleted}>Completed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <>
            {/* ── Total Earnings Card ── */}
            <View style={styles.earningsCard}>
              <View style={styles.earningsCardTop}>
                <Text style={styles.earningsCardTitle}>TOTAL EARNINGS (THIS WEEK)</Text>
                <Icon name="wallet-outline" size={20} color="rgba(255,255,255,0.6)" />
              </View>
              
              <View style={styles.balanceRow}>
                <Text style={styles.balanceSymbol}>₹</Text>
                <Text style={styles.balanceWhole}>{formatMoney(stats?.balance || 0).whole}</Text>
                <Text style={styles.balanceDecimal}>.{formatMoney(stats?.balance || 0).decimal}</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Rides</Text>
                  <Text style={styles.statValue}>{stats?.recentRides || 0}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Online</Text>
                  <Text style={styles.statValue}>{stats?.onlineHours || '0h 0m'}</Text>
                </View>
              </View>
            </View>

            {/* ── Withdraw Button ── */}
            <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.9}>
              <Icon name="bank" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.withdrawText}>Withdraw to Bank</Text>
            </TouchableOpacity>

            {/* ── Recent Rides Header ── */}
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent Rides</Text>
              <TouchableOpacity style={styles.filterBtn}>
                <Text style={styles.filterText}>Filter</Text>
                <Icon name="filter-variant" size={18} color="#0b1c30" />
              </TouchableOpacity>
            </View>

            {/* ── Rides List ── */}
            <View style={styles.ridesList}>
              {stats?.rides?.length === 0 ? (
                <Text style={styles.emptyText}>No recent rides to show.</Text>
              ) : (
                stats?.rides?.map((ride: any, index: number) => renderRideCard(ride, index))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  
  // Top Header
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
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  headerProfileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120, // Extra padding for floating tab bar
    gap: 24,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: 'center',
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  earningsCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
    marginBottom: 20,
  },
  balanceSymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 4,
  },
  balanceWhole: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
  },
  balanceDecimal: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 24,
  },

  // Withdraw Button
  withdrawBtn: {
    backgroundColor: '#000000',
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  withdrawText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Recent Header
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0b1c30',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    color: '#0b1c30',
    marginRight: 4,
  },

  // Rides List
  ridesList: {
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#76777d',
    marginTop: 20,
  },

  // Ride Card
  rideCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.4)',
  },
  rideCardCancelled: {
    opacity: 0.7,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,205,0.3)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  cardDateTime: {
    fontSize: 12,
    color: '#45464d',
    marginBottom: 2,
  },
  cardTripId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b1c30',
  },
  cardEarning: {
    fontSize: 22,
    fontWeight: '700',
    color: '#006a61', // green
  },
  cardEarningCancelled: {
    color: '#76777d',
  },

  // Nodes
  routeNodesContainer: {
    flexDirection: 'row',
    height: 56,
  },
  nodeGraphics: {
    width: 24,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dotOpen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#0b1c30',
    backgroundColor: '#fff',
  },
  verticalLine: {
    flex: 1,
    width: 1,
    backgroundColor: '#c6c6cd',
    marginVertical: 4,
  },
  dotClosed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#0b1c30',
    backgroundColor: '#0b1c30',
  },
  dotCancelled: {
    borderColor: '#76777d',
  },
  lineCancelled: {
    backgroundColor: '#e5eeff',
  },
  dotCancelledFill: {
    borderColor: '#76777d',
    backgroundColor: '#76777d',
  },
  nodeTexts: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  nodeText: {
    fontSize: 15,
    color: '#0b1c30',
  },

  // Footer Row
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  metricChip: {
    backgroundColor: '#e5eeff',
    color: '#45464d',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeCompleted: {
    backgroundColor: '#e0fbf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeTextCompleted: {
    color: '#006a61',
    fontSize: 10,
    fontWeight: '600',
  },
  badgeCancelled: {
    backgroundColor: '#ffdad6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeTextCancelled: {
    color: '#ba1a1a',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default EarningsScreen;

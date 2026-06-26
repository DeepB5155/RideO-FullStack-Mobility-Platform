import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';

const EarningsScreen = ({ navigation }: any) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        // Just mock fetching for MVP, or point to an actual endpoint if we built it.
        // We know RouteController completes the route and calculates DriverEarning.
        // We will fetch completed routes for the driver.
        const res = await axiosInstance.get('/route/my-routes');
        const completed = res.data.filter((r: any) => r.status === 'Completed');
        
        let totalEarnings = 0;
        completed.forEach((r: any) => {
          // Mock 90% of total price if real earning not in payload
          totalEarnings += (r.pricePerSeat * (r.totalSeats - r.availableSeats)) * 0.9;
        });

        setStats({
          balance: totalEarnings,
          recentRides: completed.length,
          rides: completed
        });
      } catch (err) {
        console.log('Earnings fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEarnings();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings & Wallet</Text>
          <View style={{ width: 50 }} />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>Total Earnings</Text>
              <Text style={styles.balanceAmount}>₹{stats?.balance?.toFixed(2) || '0.00'}</Text>
              <TouchableOpacity style={styles.withdrawBtn}>
                <Text style={styles.withdrawText}>Withdraw to Bank</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent Completed Rides ({stats?.recentRides || 0})</Text>

            {stats?.rides?.length === 0 ? (
              <Text style={styles.emptyText}>You haven't completed any rides yet.</Text>
            ) : (
              stats?.rides?.map((ride: any, idx: number) => {
                const total = ride.pricePerSeat * (ride.totalSeats - ride.availableSeats);
                const earning = total * 0.9;
                return (
                  <View key={idx} style={styles.rideCard}>
                    <View>
                      <Text style={styles.rideRoute}>{ride.startLocation} → {ride.endLocation}</Text>
                      <Text style={styles.rideDate}>{new Date(ride.startTime).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.rideEarning}>+₹{earning.toFixed(2)}</Text>
                      <Text style={styles.rideFee}>Fee: ₹{(total * 0.1).toFixed(2)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  backBtn: { fontSize: 16, color: theme.colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text.main },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    ...theme.shadows.large,
  },
  balanceTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600', marginBottom: theme.spacing.sm },
  balanceAmount: { color: theme.colors.text.light, fontSize: 48, fontWeight: '900', marginBottom: theme.spacing.lg },
  withdrawBtn: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.full,
  },
  withdrawText: { color: theme.colors.primary, fontSize: 16, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text.main, marginBottom: theme.spacing.lg },
  emptyText: { color: theme.colors.text.muted, textAlign: 'center', marginTop: 20 },
  rideCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  rideRoute: { fontSize: 16, fontWeight: '700', color: theme.colors.text.main, marginBottom: 4 },
  rideDate: { fontSize: 12, color: theme.colors.text.muted },
  rideEarning: { fontSize: 18, fontWeight: '800', color: theme.colors.success },
  rideFee: { fontSize: 12, color: theme.colors.text.muted, marginTop: 4 }
});

export default EarningsScreen;

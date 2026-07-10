import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../theme/theme';
import api from '../api/axios';
import { API_URL } from '@env';

const RideHistoryScreen = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/history/rides');
      setRides(res.data);
    } catch (err) {
      console.error('Error fetching history:', err);
      Alert.alert('Error', 'Failed to load ride history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (bookingId: string) => {
    try {
      const url = `${API_URL}/api/history/receipt/${bookingId}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback for simulated environments that may not report support properly
        await Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open download link on this device.'));
      }
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', 'Could not initiate download.');
    }
  };

  const renderRide = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
        <Text style={[styles.status, item.status === 'Completed' ? styles.statusCompleted : styles.statusCancelled]}>
          {item.status}
        </Text>
      </View>

      <View style={styles.locationRow}>
        <MaterialIcons name="trip-origin" size={16} color={theme.colors.primary} />
        <Text style={styles.locationText} numberOfLines={1}>{item.pickup}</Text>
      </View>
      <View style={styles.locationDots}>
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
      <View style={styles.locationRow}>
        <MaterialIcons name="location-on" size={16} color={theme.colors.danger} />
        <Text style={styles.locationText} numberOfLines={1}>{item.dropoff}</Text>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.driverText}>Driver: <Text style={{ fontWeight: '600' }}>{item.driverName}</Text></Text>
        <Text style={styles.priceText}>₹{item.fare?.toFixed(2)}</Text>
      </View>

      {item.cancellationFee > 0 && (
        <Text style={styles.penaltyText}>Includes ₹{item.cancellationFee.toFixed(2)} cancellation penalty</Text>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.invoiceBtn} onPress={() => handleDownloadInvoice(item.id)}>
          <MaterialIcons name="receipt" size={18} color={theme.colors.primary} />
          <Text style={styles.invoiceBtnText}>Download Invoice</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={renderRide}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={64} color={theme.colors.border} />
              <Text style={styles.emptyText}>No past rides found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  date: {
    fontSize: 14,
    color: theme.colors.text.muted,
    fontWeight: '600',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'uppercase'
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: theme.colors.success,
  },
  statusCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: theme.colors.danger,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 15,
    color: theme.colors.text.main,
    marginLeft: 8,
    flex: 1,
  },
  locationDots: {
    paddingLeft: 7,
    paddingVertical: 2,
  },
  dot: {
    width: 2,
    height: 2,
    backgroundColor: theme.colors.border,
    borderRadius: 1,
    marginVertical: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  driverText: {
    fontSize: 14,
    color: theme.colors.text.muted,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text.main,
  },
  penaltyText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 4,
  },
  actionsRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
  },
  invoiceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.muted,
  }
});

export default RideHistoryScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import axiosInstance from '../api/axios';

const RideResultsScreen = ({ route, navigation }: any) => {
  const { pickupText, dropoffText, pickupLat, pickupLng, dropLat, dropLng, date, seats } = route.params;
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Wallet'>('Wallet');
  
  const [isSubscribeModalVisible, setSubscribeModalVisible] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<'Daily' | 'Weekly'>('Daily');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const url = `/route/search?pickupLat=${pickupLat}&pickupLng=${pickupLng}&dropLat=${dropLat}&dropLng=${dropLng}&date=${date}&seats=${seats}`;
        const res = await axiosInstance.get(url);
        setResults(res.data);
      } catch (err) {
        console.error('Search failed:', err);
        Alert.alert('Error', 'Failed to fetch rides.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleRequestSeat = async (item: any) => {
    try {
      await axiosInstance.post('/booking/request', {
        routeId: item.routeId,
        pickupLocationName: item.matchedPickup,
        dropoffLocationName: item.matchedDropoff,
        seatsBooked: seats,
        paymentMethod: paymentMethod
      });
      Alert.alert('Success', item.autoApprove ? 'Booking Confirmed!' : 'Request sent to driver.');
      navigation.navigate('My Rides'); 
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || 'Failed to request seat.');
    }
  };

  const openSubscribeModal = (item: any) => {
    setSelectedRoute(item);
    setSubscriptionPlan('Daily');
    setSubscribeModalVisible(true);
  };

  const handleSubscribeDaily = async () => {
    if (!selectedRoute) return;
    try {
      await axiosInstance.post(`/booking/subscribe`, {
        routeId: selectedRoute.routeId,
        pickupLocationName: selectedRoute.matchedPickup,
        dropoffLocationName: selectedRoute.matchedDropoff,
        seatsBooked: seats,
        paymentPlan: subscriptionPlan
      });
      Alert.alert('Success', 'You are now subscribed to this daily route!');
      setSubscribeModalVisible(false);
      navigation.navigate('SubscriptionsScreen'); 
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || 'Failed to subscribe to route.');
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'Hatchback': return '🚗';
      case 'SUV': return '🛻';
      case 'MPV': return '🚐';
      case 'Sedan':
      default: return '🚙';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { borderLeftColor: item.isRecurring ? '#10B981' : '#3B82F6' }]}>
      {/* TOP ROW */}
      <View style={styles.topRow}>
        <View style={styles.driverAvatarContainer}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitials}>{item.driver.name.charAt(0)}</Text>
          </View>
          {item.isProDriver && (
            <View style={styles.proBadgeOverlay}>
              <Text style={styles.proBadgeTextOverlay}>PRO</Text>
            </View>
          )}
        </View>
        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>{item.driver.name}</Text>
          <Text style={styles.driverRating}>⭐ {item.driver.rating.toFixed(1)}</Text>
        </View>
      </View>
      
      {/* SAFETY INDICATOR */}
      <View style={styles.safetyRow}>
        <Text style={styles.safetyText}>🛡️ Verified Driver · ID checked · RideO Safe</Text>
      </View>
      
      {/* ROUTE ROW */}
      <View style={styles.routeRow}>
        <View style={styles.routeTimeline}>
          <View style={styles.dotGreen} />
          <View style={styles.dashedLine} />
          <View style={styles.dotRed} />
        </View>
        <View style={styles.routeDetails}>
          <View style={styles.routePoint}>
            <Text style={styles.routeText}>{item.matchedPickup}</Text>
            <Text style={styles.timeText}>{new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={styles.routePoint}>
            <Text style={styles.routeText}>{item.matchedDropoff}</Text>
          </View>
        </View>
      </View>

      {/* VEHICLE ROW */}
      <View style={styles.vehicleRow}>
        <View style={styles.vehicleInfo}>
          <View style={[styles.vehicleColorCircle, { backgroundColor: item.vehicle.color === 'White' ? '#FFF' : item.vehicle.color === 'Silver' ? '#C0C0C0' : item.vehicle.color === 'Black' ? '#000' : item.vehicle.color === 'Red' ? '#F00' : item.vehicle.color === 'Blue' ? '#00F' : item.vehicle.color === 'Grey' ? '#808080' : item.vehicle.color === 'Gold' ? '#FFD700' : item.vehicle.color === 'Brown' ? '#A52A2A' : '#CCC' }]} />
          <Text style={styles.vehicleText}>{item.vehicle.color} {item.vehicle.make} {item.vehicle.model}</Text>
          <Text style={styles.vehicleIcon}>{getVehicleIcon(item.vehicle.vehicleType)}</Text>
        </View>
        <View style={styles.licensePlate}>
          <Text style={styles.licensePlateText}>{item.vehicle.licensePlate}</Text>
        </View>
      </View>
      
      {/* BOTTOM ROW */}
      <View style={styles.bottomRow}>
        <View style={styles.badgesCol}>
          <View style={styles.badgeNeutral}>
            <Text style={styles.badgeNeutralText}>{item.availableSeats} seats left</Text>
          </View>
          <View style={styles.tagsRow}>
            {item.isRecurring && (
              <View style={styles.badgeRecurring}>
                <Text style={styles.badgeRecurringText}>Daily Route 🔄</Text>
              </View>
            )}
            {item.autoApprove && (
              <View style={styles.badgeInstant}>
                <Text style={styles.badgeInstantText}>Instant ⚡</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actionCol}>
          <Text style={styles.priceText}>₹{item.pricePerSeat}/seat</Text>
          <TouchableOpacity 
            style={[styles.actionBtn, item.isRecurring ? styles.actionBtnSubscribe : styles.actionBtnBook]} 
            onPress={() => item.isRecurring ? openSubscribeModal(item) : handleRequestSeat(item)}
          >
            <Text style={styles.actionBtnText}>
              {item.isRecurring ? 'Subscribe Daily' : (item.autoApprove ? 'Book' : 'Request')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>&larr; Modify Search</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>{pickupText} to {dropoffText}</Text>
      <Text style={styles.subtitle}>{date} • {seats} Passenger(s)</Text>

      <Text style={styles.paymentTitle}>Select Payment Method:</Text>
      <View style={styles.paymentSelector}>
        {['Wallet', 'Cash', 'UPI'].map((method) => (
          <TouchableOpacity 
            key={method} 
            style={[styles.paymentOption, paymentMethod === method && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod(method as any)}
          >
            <Text style={[styles.paymentOptionText, paymentMethod === method && styles.paymentOptionTextActive]}>
              {method}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.routeId}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.empty}>No rides found along this route for your date.</Text>
          }
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}

      {/* Subscription Modal */}
      <Modal visible={isSubscribeModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Subscription</Text>
              <TouchableOpacity onPress={() => setSubscribeModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedRoute && (
              <>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryText}>📍 {selectedRoute.matchedPickup} to {selectedRoute.matchedDropoff}</Text>
                  <Text style={styles.summaryText}>🕐 Departs daily at {new Date(selectedRoute.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.summaryText}>💺 {seats} seat(s) · ₹{selectedRoute.pricePerSeat * seats}/day</Text>
                </View>

                <Text style={styles.planTitle}>Select Payment Plan:</Text>
                
                <TouchableOpacity 
                  style={[styles.planCard, subscriptionPlan === 'Daily' && styles.planCardActive]}
                  onPress={() => setSubscriptionPlan('Daily')}
                >
                  <Text style={[styles.planCardTitle, subscriptionPlan === 'Daily' && styles.planCardTitleActive]}>Daily Auto-Pay</Text>
                  <Text style={styles.planCardDesc}>₹{selectedRoute.pricePerSeat * seats} will be auto-deducted each morning</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.planCard, subscriptionPlan === 'Weekly' && styles.planCardActive]}
                  onPress={() => setSubscriptionPlan('Weekly')}
                >
                  <Text style={[styles.planCardTitle, subscriptionPlan === 'Weekly' && styles.planCardTitleActive]}>Weekly Prepaid</Text>
                  <Text style={styles.planCardDesc}>₹{selectedRoute.pricePerSeat * seats * 7} will be deducted from your wallet now</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleSubscribeDaily}>
                  <Text style={styles.confirmBtnText}>Confirm Subscription</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 15, paddingTop: 50 },
  backBtn: { marginBottom: 15 },
  backBtnText: { color: '#007AFF', fontSize: 16, fontWeight: '500' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverInfoContainer: { flexDirection: 'row', alignItems: 'center' },
  driverName: { fontSize: 18, fontWeight: 'bold' },
  proBadge: { backgroundColor: '#fffbe6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8, borderWidth: 1, borderColor: '#ffc107' },
  paymentTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  paymentSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  paymentOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginHorizontal: 4, backgroundColor: '#fff' },
  paymentOptionActive: { borderColor: '#007AFF', backgroundColor: '#e6f2ff' },
  paymentOptionText: { fontSize: 14, color: '#666', fontWeight: '500' },
  paymentOptionTextActive: {
    color: '#007AFF',
    fontWeight: 'bold'
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatarContainer: {
    marginRight: 12,
    position: 'relative'
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  driverInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151'
  },
  proBadgeOverlay: {
    position: 'absolute',
    bottom: -4,
    left: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFF'
  },
  proBadgeTextOverlay: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
  },
  safetyRow: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  safetyText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2
  },
  driverRating: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600'
  },
  routeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  routeTimeline: {
    width: 20,
    alignItems: 'center',
    marginRight: 12
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginTop: 4
  },
  dashedLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginBottom: 4
  },
  routeDetails: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 50
  },
  routePoint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  routeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginRight: 8
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981'
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  vehicleColorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  vehicleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginRight: 6
  },
  vehicleIcon: {
    fontSize: 16,
  },
  licensePlate: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  licensePlateText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 0.5
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  badgesCol: {
    flex: 1,
    gap: 8,
    marginRight: 12
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap'
  },
  badgeNeutral: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeNeutralText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563'
  },
  badgeRecurring: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeRecurringText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB'
  },
  badgeInstant: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeInstantText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706'
  },
  actionCol: {
    alignItems: 'flex-end',
    gap: 8
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981'
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionBtnBook: {
    backgroundColor: '#111827'
  },
  actionBtnSubscribe: {
    backgroundColor: '#3B82F6'
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666'
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeBtn: { fontSize: 24, color: '#666', paddingHorizontal: 10 },
  summaryBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 20 },
  summaryText: { fontSize: 15, color: '#444', marginBottom: 5, fontWeight: '500' },
  planTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#333' },
  planCard: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, marginBottom: 10 },
  planCardActive: { borderColor: '#007AFF', backgroundColor: '#e6f2ff' },
  planCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 4 },
  planCardTitleActive: { color: '#007AFF' },
  planCardDesc: { fontSize: 13, color: '#666' },
  confirmBtn: { backgroundColor: '#28a745', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default RideResultsScreen;

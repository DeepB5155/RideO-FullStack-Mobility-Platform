import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, Dimensions, ActivityIndicator, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@env';
import axiosInstance from '../api/axios';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

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
};

const ReviewBookingScreen = ({ route, navigation }: any) => {
  const { item, seats, pickupText, dropoffText, pickupLat, pickupLng, dropLat, dropLng } = route.params;
  const [paymentMethod, setPaymentMethod] = useState<'Wallet' | 'Cash' | 'UPI'>('Wallet');
  const [isConfirming, setIsConfirming] = useState(false);

  const totalFare = item.pricePerSeat * seats;

  const handleConfirmBooking = async () => {
    try {
      setIsConfirming(true);
      const bookingRes = await axiosInstance.post('/booking/request', {
        routeId: item.routeId,
        pickupLocationName: pickupText || item.matchedPickup,
        dropoffLocationName: dropoffText || item.matchedDropoff,
        seatsBooked: seats,
        paymentMethod: paymentMethod
      });
      
      // Navigate to Finding Driver Screen (Radar)
      navigation.replace('FindingDriver', {
        bookingId: bookingRes.data.id || bookingRes.data.bookingId,
        driverName: item.driver.name,
        routeId: item.routeId
      });
      
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || 'Failed to request seat.');
      setIsConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Header */}
      <View style={styles.mapContainer}>
        <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} styleURL={Mapbox.StyleURL.Dark}>
          <Mapbox.Camera
            zoomLevel={12}
            centerCoordinate={[pickupLng, pickupLat]}
            animationMode="flyTo"
          />
          <Mapbox.PointAnnotation id="pickup" coordinate={[pickupLng, pickupLat]}>
            <View style={styles.markerContainer}>
              <MaterialIcons name="person-pin-circle" size={30} color={localColors.primary} />
            </View>
          </Mapbox.PointAnnotation>
          <Mapbox.PointAnnotation id="drop" coordinate={[dropLng, dropLat]}>
            <View style={styles.markerContainer}>
              <MaterialIcons name="location-on" size={30} color={localColors.secondary} />
            </View>
          </Mapbox.PointAnnotation>
          {item.driverLng && item.driverLat && (
            <Mapbox.PointAnnotation id="driver" coordinate={[item.driverLng, item.driverLat]}>
              <View style={styles.carMarker}>
                <MaterialIcons name="directions-car" size={20} color="#fff" />
              </View>
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
        
        {/* Back Button Overlay */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Review Booking</Text>
        
        {/* Driver & Vehicle Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driver</Text>
          <View style={styles.driverRow}>
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={24} color={localColors.onSurfaceVariant} />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{item.driver.name}</Text>
              <Text style={styles.driverRating}>★ {item.driver.rating.toFixed(1)} Rating</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Vehicle</Text>
          <View style={styles.vehicleRow}>
            <MaterialIcons name="directions-car" size={24} color={localColors.secondary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.vehicleName}>RideO {item.vehicle.vehicleType}</Text>
              <Text style={styles.vehicleDetails}>{item.vehicle.color} • {item.vehicle.licensePlate}</Text>
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Summary</Text>
          <View style={styles.tripRow}>
            <View style={styles.dotBlack} />
            <Text style={styles.tripText} numberOfLines={2}>{pickupText || item.matchedPickup}</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.tripRow}>
            <View style={styles.dotGreen} />
            <Text style={styles.tripText} numberOfLines={2}>{dropoffText || item.matchedDropoff}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>{seats} Seat(s) x ₹{item.pricePerSeat}</Text>
            <Text style={styles.fareTotal}>₹{totalFare}</Text>
          </View>
        </View>

        {/* Payment Selection */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
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
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomFareLabel}>Total Fare</Text>
          <Text style={styles.bottomFareTotal}>₹{totalFare}</Text>
        </View>
        <TouchableOpacity 
          style={styles.confirmBtn} 
          onPress={handleConfirmBooking}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>Confirm Booking</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: localColors.background },
  mapContainer: { height: Dimensions.get('window').height * 0.35, position: 'relative' },
  map: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5
  },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  carMarker: {
    backgroundColor: localColors.primary,
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  contentContainer: { flex: 1, padding: 16, marginTop: -20, backgroundColor: localColors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: localColors.onBackground, marginBottom: 16, marginTop: 8 },
  card: {
    backgroundColor: localColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: localColors.onSurfaceVariant, marginBottom: 12 },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: localColors.surfaceContainerLow, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: localColors.onBackground },
  driverRating: { fontSize: 14, color: localColors.onSurfaceVariant, marginTop: 2 },
  divider: { height: 1, backgroundColor: localColors.outlineVariant, marginVertical: 16, opacity: 0.5 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleName: { fontSize: 16, fontWeight: '600', color: localColors.onBackground },
  vehicleDetails: { fontSize: 14, color: localColors.onSurfaceVariant, marginTop: 2 },
  tripRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dotBlack: { width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: localColors.primary, marginRight: 12 },
  dotGreen: { width: 10, height: 10, backgroundColor: localColors.secondary, borderRadius: 2, marginRight: 12 },
  line: { width: 2, height: 20, backgroundColor: localColors.outlineVariant, marginLeft: 4, marginVertical: 2 },
  tripText: { fontSize: 15, color: localColors.onBackground, flex: 1 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLabel: { fontSize: 15, color: localColors.onSurfaceVariant },
  fareTotal: { fontSize: 18, fontWeight: '700', color: localColors.onBackground },
  paymentSelector: { flexDirection: 'row', gap: 8 },
  paymentOption: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: localColors.outlineVariant, borderRadius: 12, backgroundColor: localColors.surfaceContainerLowest },
  paymentOptionActive: { borderColor: localColors.primary, backgroundColor: localColors.primary + '10' },
  paymentOptionText: { fontSize: 14, color: localColors.onSurfaceVariant, fontWeight: '600' },
  paymentOptionTextActive: { color: localColors.primary },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: localColors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: localColors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomFareLabel: { fontSize: 12, color: localColors.onSurfaceVariant, fontWeight: '500' },
  bottomFareTotal: { fontSize: 24, fontWeight: '700', color: localColors.onBackground },
  confirmBtn: {
    backgroundColor: localColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8
  },
  confirmBtnText: { color: localColors.onPrimary, fontSize: 16, fontWeight: '600' }
});

export default ReviewBookingScreen;

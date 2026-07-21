import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Dimensions, Platform, TextInput
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@env';
import axiosInstance from '../api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RideDetailRouteParams {
  item: any;
  seats: number;
  pickupText: string;
  dropoffText: string;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
}

const colors = {
  background: '#f8f9ff',
  primary: '#000000',
  onPrimary: '#ffffff',
  secondary: '#006a61',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  surface: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  onBackground: '#0b1c30',
};

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const RideDetailScreen = ({ route, navigation }: any) => {
  const { item, seats, pickupText, dropoffText, pickupLat, pickupLng, dropLat, dropLng } = route.params as RideDetailRouteParams;
  const [paymentMethod, setPaymentMethod] = useState<'Wallet' | 'Cash' | 'UPI'>('Wallet');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [noteToDriver, setNoteToDriver] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);

  const totalFare = (item.pricePerSeat * seats).toFixed(0);
  const distKm = haversineKm(pickupLat, pickupLng, dropLat, dropLng).toFixed(1);

  useEffect(() => {
    // Fetch wallet balance
    axiosInstance.get('/wallet').then(res => {
      setWalletBalance(res.data?.balance || 0);
      if ((res.data?.balance || 0) >= Number(totalFare)) setPaymentMethod('Wallet');
      else setPaymentMethod('Cash');
    }).catch(() => {});

    // Fetch route line
    const fetchRoute = async () => {
      try {
        const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`);
        const data = await res.json();
        if (data.routes?.[0]) setRouteGeometry(data.routes[0].geometry);
      } catch (e) { /* silent */ }
    };
    fetchRoute();
  }, []);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const res = await axiosInstance.post('/booking/request', {
        routeId: item.routeId,
        pickupLocationName: pickupText || item.matchedPickup,
        pickupLat,
        pickupLng,
        dropoffLocationName: dropoffText || item.matchedDropoff,
        dropLat,
        dropLng,
        seatsBooked: seats,
        paymentMethod,
      });
      const booking = res.data?.booking || res.data;
      if (item.autoApprove) {
        navigation.replace('Live Tracking', {
          routeId: item.routeId,
          bookingId: booking.id || booking.Id,
          driverName: item.driver.name,
          pickup: item.matchedPickup,
          dropoff: item.matchedDropoff,
          driverUserId: item.driver.userId,
          otp: booking.otp || booking.Otp,
        });
      } else {
        const pendingData = {
          bookingId: booking.id || booking.Id,
          driverName: item.driver.name,
          routeId: item.routeId,
        };
        await AsyncStorage.setItem('pendingBookingData', JSON.stringify(pendingData));
        navigation.replace('AwaitingApproval', pendingData);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || 'Failed to request booking. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const vehicleTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'SUV': return '#dcfce7';
      case 'Hatchback': return '#fef3c7';
      case 'MPV': return '#f3e8ff';
      default: return '#dbeafe';
    }
  };

  const vehicleTypeBadgeText = (type: string) => {
    switch (type) {
      case 'SUV': return '#166534';
      case 'Hatchback': return '#92400e';
      case 'MPV': return '#6b21a8';
      default: return '#1e40af';
    }
  };

  const driverInitial = item.driver?.name?.[0]?.toUpperCase() || 'D';
  const departureTime = new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} styleURL={Mapbox.StyleURL.Dark}>
          <Mapbox.Camera
            zoomLevel={12}
            centerCoordinate={[(pickupLng + dropLng) / 2, (pickupLat + dropLat) / 2]}
            animationMode="flyTo"
          />
          {routeGeometry && (
            <Mapbox.ShapeSource id="route" shape={{ type: 'Feature', geometry: routeGeometry }}>
              <Mapbox.LineLayer id="routeLine" style={{ lineColor: colors.secondary, lineWidth: 4, lineCap: 'round' }} />
            </Mapbox.ShapeSource>
          )}
          <Mapbox.PointAnnotation id="pickup" coordinate={[pickupLng, pickupLat]}>
            <View style={styles.pinBlack}><MaterialIcons name="place" size={22} color="#fff" /></View>
          </Mapbox.PointAnnotation>
          <Mapbox.PointAnnotation id="drop" coordinate={[dropLng, dropLat]}>
            <View style={styles.pinGreen}><MaterialIcons name="flag" size={18} color="#fff" /></View>
          </Mapbox.PointAnnotation>
          {item.driverLat && item.driverLng && (
            <Mapbox.PointAnnotation id="driver" coordinate={[item.driverLng, item.driverLat]}>
              <View style={styles.carMarker}><MaterialIcons name="directions-car" size={18} color="#fff" /></View>
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onBackground} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Driver Card */}
        <View style={styles.card}>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>{driverInitial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{item.driver.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text style={styles.ratingText}>★ {item.driver.rating?.toFixed(1) || '5.0'}</Text>
                {item.isProDriver && <View style={styles.proBadge}><Text style={styles.proBadgeText}>⭐ Pro</Text></View>}
              </View>
            </View>
            <View style={[styles.vehicleTypeBadge, { backgroundColor: vehicleTypeBadgeColor(item.vehicle?.vehicleType) }]}>
              <Text style={[styles.vehicleTypeBadgeText, { color: vehicleTypeBadgeText(item.vehicle?.vehicleType) }]}>{item.vehicle?.vehicleType || 'Car'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <View style={styles.infoChip}><MaterialIcons name="palette" size={14} color={colors.onSurfaceVariant} /><Text style={styles.infoChipText}>{item.vehicle?.color}</Text></View>
            <View style={styles.infoChip}><MaterialIcons name="credit-card" size={14} color={colors.onSurfaceVariant} /><Text style={styles.infoChipText}>{item.vehicle?.licensePlate}</Text></View>
            {item.autoApprove && <View style={[styles.infoChip, { backgroundColor: '#dcfce7', borderColor: '#166534' }]}><Text style={[styles.infoChipText, { color: '#166534' }]}>⚡ Instant Book</Text></View>}
          </View>
          {item.rideNotes ? (
            <View style={[styles.infoChip, { marginTop: 10, alignSelf: 'flex-start' }]}>
              <MaterialIcons name="sticky-note-2" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.infoChipText}>"{item.rideNotes}"</Text>
            </View>
          ) : null}
        </View>

        {/* Journey */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Journey</Text>
          <View style={styles.journeyRow}>
            <View style={styles.dotBlack} />
            <View style={{ flex: 1 }}>
              <Text style={styles.journeyStop}>{pickupText || item.matchedPickup}</Text>
              <Text style={styles.journeyTime}>{departureTime}</Text>
            </View>
          </View>
          <View style={styles.journeyConnector} />
          <View style={styles.journeyRow}>
            <View style={styles.dotGreen} />
            <View style={{ flex: 1 }}>
              <Text style={styles.journeyStop}>{dropoffText || item.matchedDropoff}</Text>
              <Text style={styles.journeyTime}>{distKm} km</Text>
            </View>
          </View>
        </View>

        {/* Fare */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fare Breakdown</Text>
          <View style={styles.fareRow}><Text style={styles.fareLabel}>Price per seat</Text><Text style={styles.fareValue}>₹{item.pricePerSeat}</Text></View>
          <View style={styles.fareRow}><Text style={styles.fareLabel}>Seats</Text><Text style={styles.fareValue}>× {seats}</Text></View>
          <View style={styles.divider} />
          <View style={styles.fareRow}><Text style={[styles.fareLabel, { fontWeight: '700', fontSize: 16 }]}>Total</Text><Text style={[styles.fareValue, { fontWeight: '800', fontSize: 20 }]}>₹{totalFare}</Text></View>
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pay with</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['Wallet', 'UPI', 'Cash'] as const).map(m => (
              <TouchableOpacity key={m} style={[styles.payChip, paymentMethod === m && styles.payChipActive]} onPress={() => setPaymentMethod(m)}>
                <Text style={[styles.payChipText, paymentMethod === m && styles.payChipTextActive]}>
                  {m === 'Wallet' ? `Wallet (₹${walletBalance})` : m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note to Driver */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Note to Driver (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="E.g. I'll be at the main gate..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={noteToDriver}
            onChangeText={setNoteToDriver}
            maxLength={100}
            multiline
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>₹{totalFare}</Text>
        </View>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={isConfirming}>
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
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { height: SCREEN_HEIGHT * 0.35, position: 'relative' },
  map: { flex: 1 },
  backBtn: { position: 'absolute', top: 50, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 } },
  pinBlack: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pinGreen: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  carMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#131b2e', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 16, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, marginTop: 12, borderWidth: 1, borderColor: colors.outlineVariant },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 12 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#131b2e', alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  driverName: { fontSize: 17, fontWeight: '700', color: colors.onBackground },
  ratingText: { fontSize: 14, color: '#f59e0b', fontWeight: '600' },
  proBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  proBadgeText: { fontSize: 11, color: '#1e40af', fontWeight: '700' },
  vehicleTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  vehicleTypeBadgeText: { fontSize: 12, fontWeight: '700' },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceContainerLow, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.outlineVariant },
  infoChipText: { fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: 12, opacity: 0.6 },
  journeyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  dotBlack: { width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: colors.primary, marginTop: 4 },
  dotGreen: { width: 10, height: 10, backgroundColor: colors.secondary, borderRadius: 2, marginTop: 4 },
  journeyConnector: { width: 2, height: 20, backgroundColor: colors.outlineVariant, marginLeft: 4 },
  journeyStop: { fontSize: 15, fontWeight: '600', color: colors.onBackground },
  journeyTime: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fareLabel: { fontSize: 14, color: colors.onSurfaceVariant },
  fareValue: { fontSize: 15, fontWeight: '600', color: colors.onBackground },
  payChip: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: colors.outlineVariant, backgroundColor: colors.surface },
  payChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  payChipText: { fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '600' },
  payChipTextActive: { color: colors.primary },
  noteInput: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: 12, fontSize: 14, color: colors.onBackground, minHeight: 60, textAlignVertical: 'top' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1, borderTopColor: colors.outlineVariant, elevation: 10 },
  totalLabel: { fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '500' },
  totalAmount: { fontSize: 24, fontWeight: '800', color: colors.onBackground },
  confirmBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 30, gap: 8 },
  confirmBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});

export default RideDetailScreen;

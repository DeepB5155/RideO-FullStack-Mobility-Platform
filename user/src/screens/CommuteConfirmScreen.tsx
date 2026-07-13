import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axiosInstance from '../api/axios';

const colors = {
  background: '#f8f9ff', primary: '#000000', onPrimary: '#ffffff',
  secondary: '#006a61', onSurfaceVariant: '#45464d', outlineVariant: '#c6c6cd',
  surface: '#ffffff', onBackground: '#0b1c30',
};

const CommuteConfirmScreen = ({ route, navigation }: any) => {
  const { item, selectedDays, departureTime, durationWeeks, pickupText, dropoffText } = route.params;
  const [paymentPlan, setPaymentPlan] = useState<'Daily' | 'Prepaid'>('Daily');
  const [confirming, setConfirming] = useState(false);

  const numDays: string[] = Array.isArray(selectedDays) ? selectedDays : selectedDays?.split(',') || [];
  const totalRides = durationWeeks * numDays.length;
  const pricePerRide = Number(item.pricePerSeat);
  const subtotal = totalRides * pricePerRide;
  const discounted = Math.round(subtotal * 0.95);
  const savings = subtotal - discounted;

  const deptTime = new Date(departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  // Generate upcoming commute dates
  const generateDates = () => {
    const dates: Date[] = [];
    const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
    const now = new Date();
    const dayNumbers = numDays.map((d: string) => dayMap[d]);
    let cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);
    let limit = totalRides * 2;
    while (dates.length < totalRides && limit-- > 0) {
      if (dayNumbers.includes(cursor.getDay())) dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  };

  const commuteDates = generateDates();

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await axiosInstance.post('/booking/subscribe', {
        routeId: item.routeId,
        pickupLocationName: pickupText || item.matchedPickup,
        dropoffLocationName: dropoffText || item.matchedDropoff,
        seatsBooked: 1,
        paymentPlan,
      });
      Alert.alert('🎉 Commute Pass Activated!', 'Your daily commute subscription is now active. Enjoy your rides!', [
        { text: 'View My Commutes', onPress: () => navigation.navigate('MainTabs', { screen: 'CommutesTab' }) }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || 'Failed to activate commute pass.');
      setConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Confirm Commute Pass</Text>

        {/* Calendar preview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Commute Days</Text>
          <View style={styles.calendarGrid}>
            {commuteDates.slice(0, 20).map((d, i) => (
              <View key={i} style={styles.calDot}>
                <View style={styles.calDayCircle}>
                  <Text style={styles.calDayNum}>{d.getDate()}</Text>
                </View>
                <Text style={styles.calMonthText}>{d.toLocaleString('default', { month: 'short' })}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.summaryRow}><MaterialIcons name="place" size={16} color={colors.secondary} /><Text style={styles.summaryText}>{pickupText} → {dropoffText}</Text></View>
          <View style={styles.summaryRow}><MaterialIcons name="event-repeat" size={16} color={colors.secondary} /><Text style={styles.summaryText}>{numDays.join(', ')} · {deptTime}</Text></View>
          <View style={styles.summaryRow}><MaterialIcons name="person" size={16} color={colors.secondary} /><Text style={styles.summaryText}>{item.driver?.name} ★ {item.driver?.rating?.toFixed(1)}</Text></View>
          <View style={styles.summaryRow}><MaterialIcons name="directions-car" size={16} color={colors.secondary} /><Text style={styles.summaryText}>{item.vehicle?.vehicleType} · {durationWeeks} week{durationWeeks > 1 ? 's' : ''}</Text></View>
          <View style={styles.summaryRow}><MaterialIcons name="confirmation-number" size={16} color={colors.secondary} /><Text style={styles.summaryText}>{totalRides} rides total</Text></View>
        </View>

        {/* Pricing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pricing</Text>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>Per ride</Text><Text style={styles.priceVal}>₹{pricePerRide}</Text></View>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>Total rides</Text><Text style={styles.priceVal}>×{totalRides}</Text></View>
          <View style={[styles.priceRow, { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.outlineVariant }]}>
            <Text style={[styles.priceLabel, { fontWeight: '700', fontSize: 16 }]}>Subtotal</Text>
            <Text style={[styles.priceVal, { fontWeight: '800', fontSize: 18 }]}>₹{subtotal}</Text>
          </View>
        </View>

        {/* Payment Plan */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Plan</Text>
          <TouchableOpacity style={[styles.planCard, paymentPlan === 'Daily' && styles.planCardActive]} onPress={() => setPaymentPlan('Daily')}>
            <View>
              <Text style={[styles.planTitle, paymentPlan === 'Daily' && styles.planTitleActive]}>Pay Per Ride</Text>
              <Text style={styles.planSub}>₹{pricePerRide} charged each ride day</Text>
            </View>
            <View style={[styles.planRadio, paymentPlan === 'Daily' && styles.planRadioActive]}>
              {paymentPlan === 'Daily' && <View style={styles.planRadioInner} />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.planCard, paymentPlan === 'Prepaid' && styles.planCardActive]} onPress={() => setPaymentPlan('Prepaid')}>
            <View>
              <Text style={[styles.planTitle, paymentPlan === 'Prepaid' && styles.planTitleActive]}>Prepay All — Save 5%</Text>
              <Text style={styles.planSub}>Pay ₹{discounted} now • Save ₹{savings}</Text>
            </View>
            <View style={[styles.planRadio, paymentPlan === 'Prepaid' && styles.planRadioActive]}>
              {paymentPlan === 'Prepaid' && <View style={styles.planRadioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={confirming}>
          {confirming ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmBtnText}>Activate Commute Pass</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 120 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.onBackground, marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.outlineVariant },
  cardTitle: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 12 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  calDot: { alignItems: 'center', marginBottom: 4 },
  calDayCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  calDayNum: { fontSize: 13, fontWeight: '700', color: '#fff' },
  calMonthText: { fontSize: 9, color: colors.onSurfaceVariant, marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  summaryText: { fontSize: 14, color: colors.onBackground, flex: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: colors.onSurfaceVariant },
  priceVal: { fontSize: 15, fontWeight: '600', color: colors.onBackground },
  planCard: { borderWidth: 1.5, borderColor: colors.outlineVariant, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planCardActive: { borderColor: colors.primary, backgroundColor: '#f0f4ff' },
  planTitle: { fontSize: 15, fontWeight: '700', color: colors.onBackground, marginBottom: 4 },
  planTitleActive: { color: colors.primary },
  planSub: { fontSize: 13, color: colors.onSurfaceVariant },
  planRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  planRadioActive: { borderColor: colors.primary },
  planRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: 30, height: 52, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});

export default CommuteConfirmScreen;

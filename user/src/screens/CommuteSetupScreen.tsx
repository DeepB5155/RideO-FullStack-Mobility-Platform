import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, ScrollView, Platform, Dimensions
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import DateTimePicker from '@react-native-community/datetimepicker';
import axiosInstance from '../api/axios';
import { MAPBOX_ACCESS_TOKEN } from '@env';

const MAPBOX_TOKEN = MAPBOX_ACCESS_TOKEN;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

const CommuteSetupScreen = ({ route, navigation }: any) => {
  const { prefillItem } = route.params || {};
  const [step, setStep] = useState(1);

  // Step 1 state
  const [fromText, setFromText] = useState(prefillItem?.matchedPickup || '');
  const [toText, setToText] = useState(prefillItem?.matchedDropoff || '');
  const [fromLat, setFromLat] = useState<number | null>(null);
  const [fromLng, setFromLng] = useState<number | null>(null);
  const [toLat, setToLat] = useState<number | null>(null);
  const [toLng, setToLng] = useState<number | null>(null);
  const [fromSuggs, setFromSuggs] = useState<any[]>([]);
  const [toSuggs, setToSuggs] = useState<any[]>([]);

  // Step 2 state
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [departureTime, setDepartureTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Step 3 state
  const [durationWeeks, setDurationWeeks] = useState<number>(1);
  const [customDuration, setCustomDuration] = useState(false);

  // Step 4 state
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const fromTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPlace = async (q: string, type: 'from' | 'to') => {
    if (q.length < 2) { type === 'from' ? setFromSuggs([]) : setToSuggs([]); return; }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&country=IN&proximity=72.5714,23.0225&limit=5`);
      const data = await res.json();
      type === 'from' ? setFromSuggs(data.features || []) : setToSuggs(data.features || []);
    } catch (e) {}
  };

  const selectSugg = (f: any, type: 'from' | 'to') => {
    const [lng, lat] = f.center;
    if (type === 'from') { setFromText(f.text); setFromLat(lat); setFromLng(lng); setFromSuggs([]); }
    else { setToText(f.text); setToLat(lat); setToLng(lng); setToSuggs([]); }
  };

  const goNext = async () => {
    if (step === 1) {
      if (!fromLat || !toLat) { Alert.alert('Select Locations', 'Please select both locations from suggestions.'); return; }
      setStep(2);
    } else if (step === 2) {
      if (selectedDays.length === 0) { Alert.alert('Select Days', 'Please select at least one day.'); return; }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
      fetchDrivers();
    }
  };

  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await axiosInstance.get(`/route/search?pickupLat=${fromLat}&pickupLng=${fromLng}&dropLat=${toLat}&dropLng=${toLng}&date=${today}&seats=1&isRecurring=true&recurringDays=${selectedDays.join(',')}`);
      setDrivers(res.data || []);
    } catch (e) { setDrivers([]); }
    setLoadingDrivers(false);
  };

  const selectDriver = (item: any) => {
    navigation.navigate('CommuteConfirm', {
      item,
      selectedDays,
      departureTime: departureTime.toISOString(),
      durationWeeks,
      pickupText: fromText,
      dropoffText: toText,
      pickupLat: fromLat,
      pickupLng: fromLng,
      dropLat: toLat,
      dropLng: toLng,
    });
  };

  const toggleDay = (d: string) => {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const durations = [{ label: '1 Week', weeks: 1 }, { label: '2 Weeks', weeks: 2 }, { label: '1 Month', weeks: 4 }];

  const timeStr = departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const stepLabels = ['Route', 'Schedule', 'Duration', 'Driver'];

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => step === 1 ? navigation.goBack() : setStep(s => s - 1)}>
        <MaterialIcons name="arrow-back" size={22} color={colors.onBackground} />
      </TouchableOpacity>

      {/* Step Indicator */}
      <View style={styles.stepRow}>
        {stepLabels.map((label, i) => (
          <React.Fragment key={i}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, i + 1 < step ? styles.stepDone : i + 1 === step ? styles.stepActive : styles.stepFuture]}>
                {i + 1 < step
                  ? <MaterialIcons name="check" size={14} color="#fff" />
                  : <Text style={[styles.stepNum, i + 1 === step && { color: '#fff' }]}>{i + 1}</Text>}
              </View>
              <Text style={[styles.stepLabel, i + 1 === step && { color: colors.primary, fontWeight: '700' }]}>{label}</Text>
            </View>
            {i < 3 && <View style={styles.stepLine} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        {/* STEP 1 */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Where do you commute?</Text>
            {/* From */}
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <MaterialIcons name="place" size={20} color={colors.secondary} style={{ marginRight: 10 }} />
                <TextInput style={styles.input} placeholder="From — your home/pickup" placeholderTextColor={colors.onSurfaceVariant} value={fromText}
                  onChangeText={t => { setFromText(t); setFromLat(null); if (fromTimeout.current) clearTimeout(fromTimeout.current); fromTimeout.current = setTimeout(() => searchPlace(t, 'from'), 400); }} />
              </View>
              {fromSuggs.length > 0 && (
                <View style={styles.suggBox}>
                  {fromSuggs.map((f, i) => (
                    <TouchableOpacity key={i} style={styles.suggItem} onPress={() => selectSugg(f, 'from')}>
                      <MaterialIcons name="location-on" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}><Text style={styles.suggTitle}>{f.text}</Text><Text style={styles.suggSub} numberOfLines={1}>{f.place_name}</Text></View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {/* To */}
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <MaterialIcons name="flag" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                <TextInput style={styles.input} placeholder="To — your office/destination" placeholderTextColor={colors.onSurfaceVariant} value={toText}
                  onChangeText={t => { setToText(t); setToLat(null); if (toTimeout.current) clearTimeout(toTimeout.current); toTimeout.current = setTimeout(() => searchPlace(t, 'to'), 400); }} />
              </View>
              {toSuggs.length > 0 && (
                <View style={styles.suggBox}>
                  {toSuggs.map((f, i) => (
                    <TouchableOpacity key={i} style={styles.suggItem} onPress={() => selectSugg(f, 'to')}>
                      <MaterialIcons name="location-on" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}><Text style={styles.suggTitle}>{f.text}</Text><Text style={styles.suggSub} numberOfLines={1}>{f.place_name}</Text></View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>When do you commute?</Text>
            <Text style={styles.stepSub}>Select days of the week</Text>
            <View style={styles.daysRow}>
              {DAYS.map(d => (
                <TouchableOpacity key={d} style={[styles.dayChip, selectedDays.includes(d) && styles.dayChipActive]} onPress={() => toggleDay(d)}>
                  <Text style={[styles.dayChipText, selectedDays.includes(d) && styles.dayChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.stepSub, { marginTop: 24 }]}>Departure time</Text>
            <TouchableOpacity style={styles.timeRow} onPress={() => setShowTimePicker(true)}>
              <MaterialIcons name="access-time" size={20} color={colors.secondary} style={{ marginRight: 10 }} />
              <Text style={styles.timeText}>{timeStr}</Text>
              <MaterialIcons name="edit" size={16} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker value={departureTime} mode="time" onChange={(_, d) => { setShowTimePicker(false); if (d) setDepartureTime(d); }} />
            )}
          </View>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>How long?</Text>
            <Text style={styles.stepSub}>Choose commute duration</Text>
            {durations.map(({ label, weeks }) => (
              <TouchableOpacity key={weeks} style={[styles.durationCard, durationWeeks === weeks && !customDuration && styles.durationCardActive]}
                onPress={() => { setDurationWeeks(weeks); setCustomDuration(false); }}>
                <Text style={[styles.durationCardText, durationWeeks === weeks && !customDuration && styles.durationCardTextActive]}>{label}</Text>
                <Text style={styles.durationCardSub}>{weeks * selectedDays.length} rides</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.previewBox}>
              <MaterialIcons name="info-outline" size={16} color={colors.secondary} />
              <Text style={styles.previewText}>You'll have {durationWeeks * selectedDays.length} rides over {durationWeeks} week{durationWeeks > 1 ? 's' : ''}</Text>
            </View>
          </View>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Choose a Driver</Text>
            <Text style={styles.stepSub}>Matching recurring routes for your commute</Text>
            {loadingDrivers && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />}
            {!loadingDrivers && drivers.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-repeat" size={60} color={colors.outlineVariant} />
                <Text style={styles.emptyTitle}>No recurring drivers found</Text>
                <Text style={styles.emptySub}>Try adjusting your route or days</Text>
              </View>
            )}
            {!loadingDrivers && drivers.map((d: any, i: number) => (
              <View key={i} style={styles.driverCard}>
                <View style={styles.driverCardRow}>
                  <View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>{d.driver?.name?.[0]?.toUpperCase() || 'D'}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverName}>{d.driver?.name}</Text>
                    <Text style={styles.driverMeta}>★ {d.driver?.rating?.toFixed(1)} · {d.vehicle?.vehicleType}</Text>
                    <Text style={styles.driverPrice}>₹{d.pricePerSeat}/ride</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.subscribeBtn} onPress={() => selectDriver(d)}>
                  <Text style={styles.subscribeBtnText}>Subscribe</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {step < 4 && (
        <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
          <Text style={styles.nextBtnText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 56 : 40 },
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 40, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingHorizontal: 16, marginBottom: 24 },
  stepItem: { alignItems: 'center' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepDone: { backgroundColor: colors.secondary },
  stepActive: { backgroundColor: colors.primary },
  stepFuture: { backgroundColor: colors.outlineVariant },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.onSurfaceVariant },
  stepLabel: { fontSize: 10, color: colors.onSurfaceVariant },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.outlineVariant, marginBottom: 16, marginHorizontal: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: colors.onBackground, marginBottom: 6 },
  stepSub: { fontSize: 14, color: colors.onSurfaceVariant, marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: colors.outlineVariant },
  input: { flex: 1, fontSize: 15, color: colors.onBackground },
  suggBox: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineVariant, marginTop: 4 },
  suggItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  suggTitle: { fontSize: 14, fontWeight: '600', color: colors.onBackground },
  suggSub: { fontSize: 11, color: colors.onSurfaceVariant },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  dayChipActive: { backgroundColor: colors.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  dayChipTextActive: { color: colors.onPrimary },
  timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.outlineVariant },
  timeText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.onBackground },
  durationCard: { borderWidth: 1.5, borderColor: colors.outlineVariant, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface },
  durationCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  durationCardText: { fontSize: 16, fontWeight: '700', color: colors.onBackground },
  durationCardTextActive: { color: colors.primary },
  durationCardSub: { fontSize: 13, color: colors.onSurfaceVariant },
  previewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e8f5f3', padding: 12, borderRadius: 12, marginTop: 12 },
  previewText: { fontSize: 14, color: colors.secondary, fontWeight: '500', flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.onBackground, marginTop: 16 },
  emptySub: { fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4 },
  driverCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.outlineVariant },
  driverCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#131b2e', alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  driverName: { fontSize: 16, fontWeight: '700', color: colors.onBackground },
  driverMeta: { fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  driverPrice: { fontSize: 15, fontWeight: '700', color: colors.secondary, marginTop: 4 },
  subscribeBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  subscribeBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
  nextBtn: { position: 'absolute', bottom: Platform.OS === 'ios' ? 34 : 20, left: 20, right: 20, backgroundColor: colors.primary, borderRadius: 30, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 4 },
  nextBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});

export default CommuteSetupScreen;

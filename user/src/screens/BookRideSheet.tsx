import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Keyboard, Platform, Modal, Dimensions, Alert, ScrollView
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MAPBOX_ACCESS_TOKEN } from '@env';

const MAPBOX_TOKEN = MAPBOX_ACCESS_TOKEN;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

interface BookRideSheetProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (params: {
    pickupText: string;
    dropoffText: string;
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    date: string;
    seats: number;
  }) => void;
}

const BookRideSheet: React.FC<BookRideSheetProps> = ({ visible, onClose, onSearch }) => {
  const [pickupText, setPickupText] = useState('');
  const [dropoffText, setDropoffText] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropLat, setDropLat] = useState<number | null>(null);
  const [dropLng, setDropLng] = useState<number | null>(null);

  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);
  const [isPickupSearching, setIsPickupSearching] = useState(false);
  const [isDropoffSearching, setIsDropoffSearching] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [seats, setSeats] = useState(1);

  const pickupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropoffRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formattedDateTime = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short'
  }) + ' · ' + selectedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const searchMapbox = async (query: string, type: 'pickup' | 'dropoff') => {
    if (query.length < 2) {
      type === 'pickup' ? setPickupSuggestions([]) : setDropoffSuggestions([]);
      return;
    }
    type === 'pickup' ? setIsPickupSearching(true) : setIsDropoffSearching(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=IN&proximity=72.5714,23.0225&limit=5`
      );
      const data = await res.json();
      type === 'pickup' ? setPickupSuggestions(data.features || []) : setDropoffSuggestions(data.features || []);
    } catch (e) {
      console.error('Geocode error', e);
    } finally {
      type === 'pickup' ? setIsPickupSearching(false) : setIsDropoffSearching(false);
    }
  };

  const handlePickupChange = (text: string) => {
    setPickupText(text);
    setPickupLat(null);
    setPickupLng(null);
    if (pickupRef.current) clearTimeout(pickupRef.current);
    pickupRef.current = setTimeout(() => searchMapbox(text, 'pickup'), 400);
  };

  const handleDropoffChange = (text: string) => {
    setDropoffText(text);
    setDropLat(null);
    setDropLng(null);
    if (dropoffRef.current) clearTimeout(dropoffRef.current);
    dropoffRef.current = setTimeout(() => searchMapbox(text, 'dropoff'), 400);
  };

  const selectSuggestion = (feature: any, type: 'pickup' | 'dropoff') => {
    const [lng, lat] = feature.center;
    const name = feature.text;
    if (type === 'pickup') {
      setPickupText(name);
      setPickupLat(lat);
      setPickupLng(lng);
      setPickupSuggestions([]);
    } else {
      setDropoffText(name);
      setDropLat(lat);
      setDropLng(lng);
      setDropoffSuggestions([]);
    }
    Keyboard.dismiss();
  };

  const useCurrentLocation = () => {
    setIsPickupSearching(true);
    Geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickupLat(latitude);
        setPickupLng(longitude);
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1`);
          const data = await res.json();
          setPickupText(data.features?.[0]?.text || 'Current Location');
        } catch {
          setPickupText('Current Location');
        }
        setPickupSuggestions([]);
        setIsPickupSearching(false);
      },
      () => {
        Alert.alert('Location Error', 'Could not get your location. Enable location services.');
        setIsPickupSearching(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleSearch = () => {
    if (!pickupText || !dropoffText) {
      Alert.alert('Missing Fields', 'Please enter both pickup and dropoff locations.');
      return;
    }
    if (pickupLat === null || pickupLng === null) {
      Alert.alert('Select Pickup', 'Please select a pickup location from the suggestions.');
      return;
    }
    if (dropLat === null || dropLng === null) {
      Alert.alert('Select Dropoff', 'Please select a dropoff location from the suggestions.');
      return;
    }
    const date = selectedDate.toISOString().split('T')[0];
    onSearch({ pickupText, dropoffText, pickupLat, pickupLng, dropLat, dropLng, date, seats });
  };

  const adjustSeats = (delta: number) => {
    const next = seats + delta;
    if (next >= 1 && next <= 4) setSeats(next);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Drag Handle */}
        <View style={styles.dragHandleRow}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Book a Ride</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <MaterialIcons name="close" size={22} color={colors.onBackground} />
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Pickup Field */}
          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <MaterialIcons name="place" size={22} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="From — your pickup"
                placeholderTextColor={colors.onSurfaceVariant}
                value={pickupText}
                onChangeText={handlePickupChange}
                autoCorrect={false}
              />
              {isPickupSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            {/* Suggestions */}
            {pickupSuggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                <TouchableOpacity style={styles.currentLocRow} onPress={useCurrentLocation}>
                  <MaterialIcons name="my-location" size={18} color={colors.secondary} />
                  <Text style={styles.currentLocText}>Use my current location</Text>
                </TouchableOpacity>
                {pickupSuggestions.map((f, i) => (
                  <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => selectSuggestion(f, 'pickup')}>
                    <MaterialIcons name="location-on" size={18} color={colors.onSurfaceVariant} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggTitle}>{f.text}</Text>
                      <Text style={styles.suggSub} numberOfLines={1}>{f.place_name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {pickupSuggestions.length === 0 && pickupText.length < 2 && (
              <View style={styles.suggestionBox}>
                <TouchableOpacity style={styles.currentLocRow} onPress={useCurrentLocation}>
                  <MaterialIcons name="my-location" size={18} color={colors.secondary} />
                  <Text style={styles.currentLocText}>Use my current location</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Connector Line */}
          <View style={styles.connectorRow}>
            <View style={styles.connector} />
          </View>

          {/* Dropoff Field */}
          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <MaterialIcons name="location-on" size={22} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="To — your destination"
                placeholderTextColor={colors.onSurfaceVariant}
                value={dropoffText}
                onChangeText={handleDropoffChange}
                autoCorrect={false}
              />
              {isDropoffSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            {dropoffSuggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                {dropoffSuggestions.map((f, i) => (
                  <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => selectSuggestion(f, 'dropoff')}>
                    <MaterialIcons name="location-on" size={18} color={colors.onSurfaceVariant} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggTitle}>{f.text}</Text>
                      <Text style={styles.suggSub} numberOfLines={1}>{f.place_name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Date/Time Row */}
          <TouchableOpacity style={styles.metaRow} onPress={() => setShowDatePicker(true)}>
            <MaterialIcons name="event" size={20} color={colors.secondary} style={{ marginRight: 10 }} />
            <Text style={styles.metaText}>{formattedDateTime}</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              minimumDate={new Date()}
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (d) { setSelectedDate(d); setShowTimePicker(true); }
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              onChange={(_, d) => {
                setShowTimePicker(false);
                if (d) setSelectedDate(d);
              }}
            />
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Seats Row */}
          <View style={styles.metaRow}>
            <MaterialIcons name="people" size={20} color={colors.secondary} style={{ marginRight: 10 }} />
            <Text style={[styles.metaText, { flex: 1 }]}>Seats</Text>
            <TouchableOpacity style={styles.seatBtn} onPress={() => adjustSeats(-1)}>
              <Text style={styles.seatBtnText}>–</Text>
            </TouchableOpacity>
            <Text style={styles.seatCount}>{seats}</Text>
            <TouchableOpacity style={styles.seatBtn} onPress={() => adjustSeats(1)}>
              <Text style={styles.seatBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 16 }} />

          {/* Find Rides Button */}
          <TouchableOpacity
            style={[styles.findBtn, (!pickupLat || !dropLat) && styles.findBtnDisabled]}
            onPress={handleSearch}
            disabled={!pickupLat || !dropLat}
          >
            <MaterialIcons name="search" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.findBtnText}>Find Rides</Text>
          </TouchableOpacity>

          <View style={{ height: Platform.OS === 'ios' ? 34 : 16 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: SCREEN_HEIGHT * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandleRow: { alignItems: 'center', paddingBottom: 8 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.onBackground },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  inputGroup: { marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLow, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.outlineVariant },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: colors.onBackground, padding: 0 },
  suggestionBox: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant, marginTop: 4, overflow: 'hidden' },
  currentLocRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  currentLocText: { marginLeft: 8, fontSize: 14, color: colors.secondary, fontWeight: '600' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  suggTitle: { fontSize: 14, fontWeight: '600', color: colors.onBackground },
  suggSub: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  connectorRow: { alignItems: 'flex-start', paddingLeft: 22, paddingVertical: 2 },
  connector: { width: 2, height: 16, backgroundColor: colors.outlineVariant, borderRadius: 1 },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: 12, opacity: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  metaText: { fontSize: 15, color: colors.onBackground, fontWeight: '500' },
  seatBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  seatBtnText: { fontSize: 18, color: colors.primary, fontWeight: '700', lineHeight: 22 },
  seatCount: { fontSize: 18, fontWeight: '700', color: colors.onBackground, marginHorizontal: 16 },
  findBtn: { backgroundColor: colors.primary, borderRadius: 30, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  findBtnDisabled: { opacity: 0.4 },
  findBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});

export default BookRideSheet;

import React, { useState, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, FlatList, ActivityIndicator, Keyboard, 
  TouchableWithoutFeedback, ImageBackground, Image, Platform,
  Modal, ScrollView
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MAPBOX_ACCESS_TOKEN } from '@env';

// Token loaded from .env
const MAPBOX_TOKEN = MAPBOX_ACCESS_TOKEN;

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
  surfaceContainerHigh: '#e0e9f8',
  surfaceVariant: '#d3e4fe',
  surface: '#ffffff',
  secondary: '#006a61',
  onSecondary: '#ffffff',
  onBackground: '#0b1c30',
};

const mapBgUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuAwEihdVVURAqIQe9V9OV7lDhsqNiIY3jRdQGMWSGhVjh0_WBXQg3eTMi1bYIP5U6AaEzEcBWR4q02lft_PxDEvJQvl-Yp6mQFA2dJQzjO_BpcIPC7Az09spSX-pKNasyI3qVRxU789iMZF6bsPkN2hUX8UIgy6xrIWTbvTqPALHxZ8Huv0vwwCfPT7R04xPKNW-wzeYTguugGOZVBttUa9204AyJVg1Nebbh4_hll2YPV8_bYTKfrXQ6EVklgauOkOhIXQpgw71Cmo";

export default function SearchRideScreen({ navigation, route }: any) {
  const [rideType, setRideType] = useState<'one-time' | 'recurring'>('one-time');
  const [pickupText, setPickupText] = useState('');
  const [dropoffText, setDropoffText] = useState('');

  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);

  const [dropLat, setDropLat] = useState<number | null>(null);
  const [dropLng, setDropLng] = useState<number | null>(null);

  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [seats, setSeats] = useState(1);

  // Formatting helpers
  const formattedDate = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = selectedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Suggestions State
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);
  const [isPickupSearching, setIsPickupSearching] = useState(false);
  const [isDropoffSearching, setIsDropoffSearching] = useState(false);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);

  React.useEffect(() => {
    if (route?.params) {
      const { initialStartLocation, initialEndLocation, initialDate } = route.params;
      if (initialStartLocation) setPickupText(initialStartLocation);
      if (initialEndLocation) setDropoffText(initialEndLocation);
      if (initialDate) {
        const d = new Date(initialDate);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
        }
      }
    }
  }, [route?.params]);

  const pickupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropoffTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchMapbox = async (query: string, type: 'pickup' | 'dropoff') => {
    if (query.length < 2) {
      if (type === 'pickup') setPickupSuggestions([]);
      else setDropoffSuggestions([]);
      return;
    }

    if (type === 'pickup') setIsPickupSearching(true);
    else setIsDropoffSearching(true);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=IN&proximity=72.5714,23.0225&limit=5`
      );
      const data = await response.json();

      if (type === 'pickup') setPickupSuggestions(data.features || []);
      else setDropoffSuggestions(data.features || []);
    } catch (error) {
      console.error('Mapbox search error:', error);
    } finally {
      if (type === 'pickup') setIsPickupSearching(false);
      else setIsDropoffSearching(false);
    }
  };

  const handlePickupChange = (text: string) => {
    setPickupText(text);
    setPickupLat(null);
    setPickupLng(null);

    if (pickupTimeoutRef.current) clearTimeout(pickupTimeoutRef.current);
    pickupTimeoutRef.current = setTimeout(() => searchMapbox(text, 'pickup'), 400);
  };

  const handleDropoffChange = (text: string) => {
    setDropoffText(text);
    setDropLat(null);
    setDropLng(null);

    if (dropoffTimeoutRef.current) clearTimeout(dropoffTimeoutRef.current);
    dropoffTimeoutRef.current = setTimeout(() => searchMapbox(text, 'dropoff'), 400);
  };

  const selectSuggestion = (feature: any, type: 'pickup' | 'dropoff') => {
    const [lng, lat] = feature.center;
    const placeName = feature.text;

    if (type === 'pickup') {
      setPickupText(placeName);
      setPickupLat(lat);
      setPickupLng(lng);
      setPickupSuggestions([]);
    } else {
      setDropoffText(placeName);
      setDropLat(lat);
      setDropLng(lng);
      setDropoffSuggestions([]);
    }
    setActiveField(null);
    Keyboard.dismiss();
  };

  const useCurrentLocation = () => {
    setIsPickupSearching(true);
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setPickupLat(latitude);
        setPickupLng(longitude);

        try {
          const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`);
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            setPickupText(data.features[0].text);
          } else {
            setPickupText("Current Location");
          }
        } catch (e) {
          setPickupText("Current Location");
        }
        setIsPickupSearching(false);
        setPickupSuggestions([]);
      },
      (error) => {
        Alert.alert('Location Error', 'Could not fetch your location. Please ensure location services are enabled.');
        setIsPickupSearching(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleDateChange = (event: any, selectedValue?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
    if (selectedValue) {
      setSelectedDate(selectedValue);
    }
  };

  const handleSearch = () => {
    if (!pickupText || !dropoffText) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (pickupLat === null || dropLat === null) {
      Alert.alert('Error', 'Please select a valid location from the dropdown suggestions.');
      return;
    }

    let searchDate = selectedDate.toISOString().split('T')[0];

    navigation.navigate('RideResults', {
      pickupText,
      dropoffText,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      date: searchDate,
      seats,
      isRecurring: rideType === 'recurring',
      recurringDays: selectedDays.join(',')
    });
  };

  const adjustSeats = (delta: number) => {
    const newSeats = seats + delta;
    if (newSeats >= 1 && newSeats <= 4) {
      setSeats(newSeats);
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const renderSuggestionItem = ({ item }: { item: any }, type: 'pickup' | 'dropoff') => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => selectSuggestion(item, type)}>
      <MaterialIcons name="location-on" size={20} color={localColors.onSurfaceVariant} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.suggestionTitle}>{item.text}</Text>
        <Text style={styles.suggestionSubtitle} numberOfLines={1}>{item.place_name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={() => { setActiveField(null); Keyboard.dismiss(); }}>
      <View style={styles.container}>
        <View style={styles.innerContainer}>
          {/* Top Header */}
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.toggleDrawer && navigation.toggleDrawer()}>
                <MaterialIcons name="menu" size={24} color={localColors.onSurfaceVariant} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>RideO</Text>
              <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
                <Image 
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWVQUK0SltHj54uz_CNivkxxV5zur2TM1Xbr5o0evZm5I4IsSJc5YORxot8ErWrde12zumgnFFGe6zG2A2EZYTS8oGrl8OP38Bjcz3R-YLcYd3WIMWr5Z2-5b_tD_bGMLgTF-PS_lfgq700zBaQ0EJ1SLCcZfNMSWDg4UU-N6VnUvHJGtVo99SC1qvqSQg3tj87XjSoV-MJzF9i-v3PEhR189flJ7SDNVG8xhVTwKO-YdC_uK2iMDRv86Ws6bTHuCEUjW39CF7CYeK' }} 
                  style={styles.avatarImg} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Form UI */}
          <View style={styles.formContainer}>
            <Text style={styles.sheetTitle}>Where to?</Text>
            
            {/* Ride Type Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleBtn, rideType === 'one-time' && styles.toggleBtnActive]}
                onPress={() => setRideType('one-time')}
              >
                <Text style={[styles.toggleBtnText, rideType === 'one-time' && styles.toggleBtnTextActive]}>One-time</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, rideType === 'recurring' && styles.toggleBtnActive]}
                onPress={() => setRideType('recurring')}
              >
                <Text style={[styles.toggleBtnText, rideType === 'recurring' && styles.toggleBtnTextActive]}>Recurring</Text>
              </TouchableOpacity>
            </View>

            {/* Locations Input Group */}
            <View style={styles.locationsGroup}>
              <View style={styles.connectionLine} />

              {/* Pickup */}
              <View style={[styles.inputWrapper, activeField === 'pickup' && styles.inputWrapperActive]}>
                <View style={styles.pickupIconBox}>
                  <View style={styles.pickupDot} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Current Location"
                  placeholderTextColor={localColors.onSurfaceVariant}
                  value={pickupText}
                  onChangeText={handlePickupChange}
                  onFocus={() => setActiveField('pickup')}
                />
                {pickupText === '' && !activeField && (
                  <TouchableOpacity onPress={useCurrentLocation} style={styles.locationBtn}>
                    <MaterialIcons name="my-location" size={20} color={localColors.primary} />
                  </TouchableOpacity>
                )}
                {isPickupSearching && <ActivityIndicator size="small" color={localColors.primary} />}
              </View>

              {/* Dropoff */}
              <View style={[styles.inputWrapper, activeField === 'dropoff' && styles.inputWrapperActive]}>
                <View style={styles.dropoffIconBox}>
                  <View style={styles.dropoffSquare} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Where to?"
                  placeholderTextColor={localColors.outlineVariant}
                  value={dropoffText}
                  onChangeText={handleDropoffChange}
                  onFocus={() => setActiveField('dropoff')}
                />
                {isDropoffSearching && <ActivityIndicator size="small" color={localColors.primary} />}
              </View>
            </View>

            {/* Suggestions Overlay */}
            {(activeField === 'pickup' && pickupSuggestions.length > 0) && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={pickupSuggestions}
                  keyExtractor={(item) => item.id}
                  renderItem={(item) => renderSuggestionItem(item, 'pickup')}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            )}
            
            {(activeField === 'dropoff' && dropoffSuggestions.length > 0) && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={dropoffSuggestions}
                  keyExtractor={(item) => item.id}
                  renderItem={(item) => renderSuggestionItem(item, 'dropoff')}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            )}

            {/* Date and Time / Recurring Days */}
            {rideType === 'one-time' ? (
              <View style={styles.dateTimeRow}>
                <TouchableOpacity 
                  style={styles.dateTimeField} 
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialIcons name="calendar-today" size={20} color={localColors.onSurfaceVariant} />
                  <Text style={styles.dateTimeInput}>{formattedDate}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dateTimeField} 
                  onPress={() => setShowTimePicker(true)}
                >
                  <MaterialIcons name="schedule" size={20} color={localColors.onSurfaceVariant} />
                  <Text style={styles.dateTimeInput}>{formattedTime}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.recurringSection}>
                <View style={styles.recurringHeader}>
                  <Text style={styles.recurringLabel}>Select travel days:</Text>
                  <TouchableOpacity 
                    style={styles.dateTimeFieldSmall}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <MaterialIcons name="schedule" size={18} color={localColors.onSurfaceVariant} />
                    <Text style={styles.dateTimeInputSmall}>{formattedTime}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.daysRow}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <TouchableOpacity 
                        key={day}
                        style={[styles.dayCircle, isSelected && styles.dayCircleActive]}
                        onPress={() => toggleDay(day)}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day.charAt(0)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Passengers */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepperLeft}>
                <MaterialIcons name="people" size={20} color={localColors.primary} />
                <Text style={styles.stepperLabel}>Passengers</Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity onPress={() => adjustSeats(-1)} style={styles.stepperBtn}>
                  <MaterialIcons name="remove" size={16} color={localColors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{seats}</Text>
                <TouchableOpacity onPress={() => adjustSeats(1)} style={styles.stepperBtn}>
                  <MaterialIcons name="add" size={16} color={localColors.onSurface} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity style={styles.actionBtn} onPress={handleSearch}>
              <Text style={styles.actionBtnText}>Find Rides</Text>
              <MaterialIcons name="arrow-forward" size={20} color={localColors.onPrimary} />
            </TouchableOpacity>

          </View>
        </View>
        
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.surface,
  },
  innerContainer: {
    flex: 1,
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: localColors.primary,
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
  formContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 12,
  },
  sheetTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: localColors.onBackground,
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: localColors.primary,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
  },
  toggleBtnTextActive: {
    color: localColors.onPrimary,
  },
  locationsGroup: {
    position: 'relative',
    marginBottom: 24,
  },
  connectionLine: {
    position: 'absolute',
    left: 23,
    top: 36,
    bottom: 36,
    width: 2,
    backgroundColor: localColors.outlineVariant,
    zIndex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 12,
    marginBottom: 12,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    zIndex: 2,
  },
  inputWrapperActive: {
    borderColor: localColors.primary,
    backgroundColor: localColors.surface,
  },
  pickupIconBox: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: localColors.primary,
    backgroundColor: localColors.surface,
  },
  dropoffIconBox: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropoffSquare: {
    width: 12,
    height: 12,
    backgroundColor: localColors.secondary,
    borderRadius: 2,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: localColors.onBackground,
  },
  locationBtn: {
    padding: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 130,
    left: 0,
    right: 0,
    backgroundColor: localColors.surface,
    borderRadius: 12,
    padding: 8,
    maxHeight: 200,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: localColors.surfaceContainerLow,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onBackground,
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  dateTimeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateTimeInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: localColors.onBackground,
    padding: 0,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  stepperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.onBackground,
    marginLeft: 8,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: localColors.surface,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.onBackground,
    width: 24,
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: localColors.primary,
    borderRadius: 32,
    paddingVertical: 16,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onPrimary,
  },
  recurringSection: {
    marginBottom: 24,
    backgroundColor: localColors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: localColors.surfaceContainerHigh,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recurringLabel: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    fontWeight: '600',
  },
  dateTimeFieldSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: localColors.surfaceContainerHigh,
  },
  dateTimeInputSmall: {
    marginLeft: 6,
    fontSize: 14,
    color: localColors.onBackground,
    fontWeight: '500',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: localColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: localColors.secondary,
  },
  dayText: {
    color: localColors.onSurfaceVariant,
    fontSize: 15,
    fontWeight: '600',
  },
  dayTextActive: {
    color: localColors.onSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: localColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: localColors.primary,
  },
  timeList: {
    marginBottom: 20,
  },
  timeOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: localColors.surfaceContainerHigh,
  },
  timeOptionActive: {
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  timeOptionText: {
    fontSize: 16,
    color: localColors.onSurface,
  },
  timeOptionTextActive: {
    fontWeight: '700',
    color: localColors.primary,
  }
});

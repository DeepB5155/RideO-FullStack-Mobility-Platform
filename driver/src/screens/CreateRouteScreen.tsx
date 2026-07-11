import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Switch, 
  SafeAreaView,
  StatusBar,
  PermissionsAndroid,
  Platform
} from 'react-native';
import axiosInstance from '../api/axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_ACCESS_TOKEN } from '@env';


const CreateRouteScreen = ({ navigation }: any) => {
  const [vehicleId, setVehicleId] = useState('00000000-0000-0000-0000-000000000000');

  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeInput, setActiveInput] = useState<'start'|'end'|null>(null);
  const [currentLoc, setCurrentLoc] = useState<{lat: number, lng: number} | null>(null);

  // Geocoded Coordinates
  const [startCoords, setStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [endCoords, setEndCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [dateObj, setDateObj] = useState(new Date());
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState('450');

  // Native Picker States
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      setDateObj(selectedDate);
      
      const d = selectedDate.getDate().toString().padStart(2, '0');
      const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const y = selectedDate.getFullYear();
      setDate(`${d}/${m}/${y}`);
      
      const hh = selectedDate.getHours();
      const mm = selectedDate.getMinutes().toString().padStart(2, '0');
      const ampm = hh >= 12 ? 'PM' : 'AM';
      const formattedHh = (hh % 12 || 12).toString().padStart(2, '0');
      setTime(`${formattedHh}:${mm} ${ampm}`);
    }
  };

  const DAYS = [
    { label: 'S', id: 'Sun' },
    { label: 'M', id: 'Mon' },
    { label: 'T', id: 'Tue' },
    { label: 'W', id: 'Wed' },
    { label: 'T', id: 'Thu' },
    { label: 'F', id: 'Fri' },
    { label: 'S', id: 'Sat' },
  ];

  // Geocode a location name using Mapbox Geocoding API
  const geocodeLocation = async (locationName: string): Promise<{lat: number, lng: number} | null> => {
    try {

      const encoded = encodeURIComponent(locationName);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=in&limit=1&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
    } catch (e) {
      console.error('Geocoding failed:', e);
    }
    return null;
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const encoded = encodeURIComponent(query);
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=in&limit=5&access_token=${MAPBOX_ACCESS_TOKEN}`;
      if (currentLoc) {
        url += `&proximity=${currentLoc.lng},${currentLoc.lat}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (e) {
      console.error('Autocomplete failed:', e);
    }
  };

  useEffect(() => {
    const fetchKYC = async () => {
      try {
        const res = await axiosInstance.get('/kyc/status'); 
        if (res.data.vehicleId) {
          setVehicleId(res.data.vehicleId);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchKYC();

    const requestLocation = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Location permission denied, using default proximity (Gandhinagar)');
            setCurrentLoc({ lat: 23.2156, lng: 72.6369 }); // Gandhinagar fallback
            return;
          }
        }
        Geolocation.getCurrentPosition(
          (position) => {
            setCurrentLoc({ lat: position.coords.latitude, lng: position.coords.longitude });
          },
          (error) => {
            console.log('Geolocation error:', error);
            setCurrentLoc({ lat: 23.2156, lng: 72.6369 }); // Gandhinagar fallback
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } catch (err) {
        console.warn(err);
      }
    };
    requestLocation();
  }, []);

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(d => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handlePublish = async () => {
    if (!startLoc || !endLoc || !price || !seats) {
      Alert.alert('Error', 'Please fill required fields: start location, end location, price, and seats.');
      return;
    }

    try {
      // Geocode locations if not already resolved
      let sCoords = startCoords;
      let eCoords = endCoords;
      if (!sCoords) sCoords = await geocodeLocation(startLoc);
      if (!eCoords) eCoords = await geocodeLocation(endLoc);

      if (!sCoords || !eCoords) {
        Alert.alert('Location Error', 'Could not resolve one or more locations. Please be more specific (e.g. city, landmark).');
        return;
      }

      // Build actual departure time from the dateObj picker value
      let startTime = new Date(dateObj);
      
      // If time is in the past (e.g. user left default time when opening screen)
      // bump it slightly into the future so backend validation passes
      if (startTime < new Date()) {
        startTime = new Date(Date.now() + 5 * 60000); 
      }

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      await axiosInstance.post('/route/publish', {
        startLocation: startLoc,
        startLat: sCoords.lat,
        startLng: sCoords.lng,
        endLocation: endLoc,
        endLat: eCoords.lat,
        endLng: eCoords.lng,
        startTime: startTime.toISOString(),
        estimatedEndTime: endTime.toISOString(),
        availableSeats: seats,
        pricingMode: 'Fixed',
        pricePerSeat: parseFloat(price) || 0,
        pricePerKm: 0,
        vehicleId: vehicleId,
        isLuggageAllowed: true,
        autoApprove: false,
        isRecurring: isRecurring,
        recurringDays: isRecurring ? selectedDays.join(',') : null,
        recurringTime: isRecurring ? `${dateObj.getHours().toString().padStart(2,'0')}:${dateObj.getMinutes().toString().padStart(2,'0')}:00` : null,
        rideNotes: '',
        stops: []
      });

      Alert.alert('✅ Success', 'Route published successfully! Passengers can now search for your ride.');
      navigation.navigate('MainTabs');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || 'Failed to publish route');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
        
        <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Locations Section ── */}
        <View style={[styles.section, { zIndex: 1000, elevation: 1000 }]}>
          <Text style={styles.sectionTitle}>Route Points</Text>
          <View style={[styles.locationsCard, { zIndex: 1000 }]}>
            <View style={styles.dashedLine} />
            
            <View style={styles.locationRow}>
              <Icon name="record-circle-outline" size={24} color="#76777d" style={styles.locationIcon} />
              <View style={styles.locationInputContainer}>
                <TextInput 
                  style={styles.locationInput} 
                  placeholder="Enter pickup location" 
                  placeholderTextColor="#c6c6cd"
                  numberOfLines={1}
                  value={startLoc}
                  onChangeText={(t) => { 
                    setStartLoc(t); 
                    setStartCoords(null); 
                    setActiveInput('start');
                    fetchSuggestions(t);
                  }}
                  onFocus={() => { setActiveInput('start'); setSuggestions([]); }}
                  onBlur={async () => {
                    if (startLoc && !startCoords) {
                      const c = await geocodeLocation(startLoc);
                      setStartCoords(c);
                    }
                  }}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={[styles.locationRow, { marginTop: 24 }]}>
              <Icon name="map-marker" size={24} color="#006a61" style={styles.locationIcon} />
              <View style={[styles.locationInputContainer, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <TextInput 
                  style={styles.locationInput} 
                  placeholder="Enter drop-off location" 
                  placeholderTextColor="#c6c6cd"
                  numberOfLines={1}
                  value={endLoc}
                  onChangeText={(t) => { 
                    setEndLoc(t); 
                    setEndCoords(null); 
                    setActiveInput('end');
                    fetchSuggestions(t);
                  }}
                  onFocus={() => { setActiveInput('end'); setSuggestions([]); }}
                  onBlur={async () => {
                    if (endLoc && !endCoords) {
                      const c = await geocodeLocation(endLoc);
                      setEndCoords(c);
                    }
                  }}
                />
              </View>
            </View>
          </View>

          {/* Autocomplete Dropdown */}
          {suggestions.length > 0 && activeInput && (
            <View style={styles.autocompleteDropdown}>
              {suggestions.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.suggestionItem}
                  onPress={() => {
                    if (activeInput === 'start') {
                      setStartLoc(item.place_name);
                      setStartCoords({ lng: item.center[0], lat: item.center[1] });
                    } else {
                      setEndLoc(item.place_name);
                      setEndCoords({ lng: item.center[0], lat: item.center[1] });
                    }
                    setSuggestions([]);
                    setActiveInput(null);
                  }}
                >
                  <Icon name="map-marker-outline" size={16} color="#76777d" style={{ marginRight: 8 }} />
                  <Text style={styles.suggestionText} numberOfLines={1}>{item.place_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

        </View>

        {/* ── 2. Schedule Section ── */}
        <View style={[styles.section, { zIndex: 1, elevation: 1 }]}>
          <Text style={styles.sectionTitle}>Departure Time</Text>
          <View style={styles.scheduleRow}>
            <TouchableOpacity 
              style={styles.scheduleInputWrapper} 
              activeOpacity={0.7}
              onPress={() => { setPickerMode('date'); setShowPicker(true); }}
            >
              <Icon name="calendar-outline" size={20} color="#76777d" />
              <TextInput 
                style={styles.scheduleInput}
                value={date}
                editable={false}
                pointerEvents="none"
                placeholder="Date"
                numberOfLines={1}
              />
              <Icon name="calendar-month" size={20} color="#000000" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.scheduleInputWrapper}
              activeOpacity={0.7}
              onPress={() => { setPickerMode('time'); setShowPicker(true); }}
            >
              <Icon name="clock-outline" size={20} color="#76777d" />
              <TextInput 
                style={styles.scheduleInput}
                value={time}
                editable={false}
                pointerEvents="none"
                placeholder="Time"
                numberOfLines={1}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3. Recurrence Section ── */}
        <View style={[styles.section, styles.recurrenceCard]}>
          <View style={styles.recurrenceHeaderRow}>
            <View>
              <Text style={styles.recurrenceTitle}>Recurring Route</Text>
              <Text style={styles.recurrenceSub}>Repeat this trip automatically</Text>
            </View>
            <Switch 
              value={isRecurring} 
              onValueChange={setIsRecurring} 
              trackColor={{ false: '#d3e4fe', true: '#006a61' }}
              thumbColor={'#ffffff'}
            />
          </View>

          {isRecurring && (
            <View style={styles.daysSelectorRow}>
              {DAYS.map((day, idx) => {
                const isActive = selectedDays.includes(day.id);
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.dayBtn, isActive && styles.dayBtnActive]}
                    onPress={() => toggleDay(day.id)}
                  >
                    <Text style={[styles.dayBtnText, isActive && styles.dayBtnTextActive]}>{day.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── 4. Details Section (Bento Grid) ── */}
        <View style={styles.detailsGrid}>
          {/* Seats */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <MaterialIcon name="airline-seat-recline-normal" size={20} color="#45464d" />
              <Text style={styles.detailTitle}>Seats</Text>
            </View>
            <View style={styles.stepperContainer}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setSeats(Math.max(1, seats - 1))}>
                <MaterialIcon name="remove" size={18} color="#0b1c30" />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{seats}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setSeats(Math.min(8, seats + 1))}>
                <MaterialIcon name="add" size={18} color="#0b1c30" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Price */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <MaterialIcon name="payments" size={20} color="#45464d" />
              <Text style={styles.detailTitle}>Price/Seat</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceCurrency}>₹</Text>
              <TextInput 
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* ── Publish Button ── */}
        <TouchableOpacity style={[styles.publishBtn, { marginTop: 16 }]} activeOpacity={0.9} onPress={handlePublish}>
          <Text style={styles.publishBtnText}>Publish Route</Text>
          <MaterialIcon name="rocket-launch" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Native Date/Time Picker ── */}
      {showPicker && (
        <DateTimePicker
          value={dateObj}
          mode={pickerMode}
          is24Hour={false}
          display="default"
          onChange={onDateChange}
        />
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,205,0.2)',
    zIndex: 10,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 32,
  },

  // Generic Section
  section: {},
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
    marginBottom: 12,
    position: 'relative',
  },

  // Locations Card
  locationsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.5)',
    padding: 16,
  },
  dashedLine: {
    position: 'absolute',
    left: 27,
    top: 36,
    bottom: 36,
    width: 0,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    zIndex: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  locationIcon: {
    marginTop: 8,
    marginRight: 12,
  },
  locationInputContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,205,0.5)',
    paddingBottom: 8,
  },
  locationInput: {
    fontSize: 16,
    color: '#0b1c30',
    padding: 0,
  },

  // Schedule Section
  scheduleRow: {
    flexDirection: 'row',
    gap: 16,
  },
  scheduleInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    paddingHorizontal: 12,
    height: 48,
  },
  scheduleInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#0b1c30',
    padding: 0,
  },

  // Recurrence Card
  recurrenceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.5)',
    padding: 16,
  },
  recurrenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurrenceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
  },
  recurrenceSub: {
    fontSize: 12,
    color: '#45464d',
    marginTop: 4,
  },
  daysSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,198,205,0.3)',
  },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnActive: {
    backgroundColor: '#006a61',
  },
  dayBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#45464d',
  },
  dayBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Details Bento Grid
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    padding: 16,
    justifyContent: 'space-between',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
  },
  
  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff4ff',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.3)',
  },
  stepperBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },

  // Price Input
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.3)',
    paddingHorizontal: 12,
    height: 48,
  },
  priceCurrency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#45464d',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    padding: 0,
    textAlign: 'center',
  },

  // Floating Publish Button
  bottomFloatingArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    paddingTop: 32,
    backgroundColor: 'rgba(248, 249, 255, 0.8)',
  },
  publishBtn: {
    backgroundColor: '#006a61',
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#006a61',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  publishBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  autocompleteDropdown: {
    position: 'absolute',
    top: 158, // position it just under the card
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e2e8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f5',
  },
  suggestionText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },

});

export default CreateRouteScreen;

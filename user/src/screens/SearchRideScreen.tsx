import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';

// IMPORTANT: User should replace this with their actual Mapbox token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGVlcC01MTU1Iiwi' + 'YSI6ImNtb2xicG42bzBhcWcyb3BoNW81Ynh4YWgifQ.FvuveCsGrnRfM0VJdGGUXw';

export default function SearchRideScreen({ navigation }: any) {
  const [pickupText, setPickupText] = useState('');
  const [dropoffText, setDropoffText] = useState('');

  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);

  const [dropLat, setDropLat] = useState<number | null>(null);
  const [dropLng, setDropLng] = useState<number | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [seats, setSeats] = useState(1);

  // Suggestions State
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);
  const [isPickupSearching, setIsPickupSearching] = useState(false);
  const [isDropoffSearching, setIsDropoffSearching] = useState(false);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);

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
          // Reverse geocode to get name
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

  const handleSearch = () => {
    if (!pickupText || !dropoffText || !date) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (pickupLat === null || dropLat === null) {
      Alert.alert('Error', 'Please select a valid location from the dropdown suggestions.');
      return;
    }

    navigation.navigate('RideResults', {
      pickupText,
      dropoffText,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      date,
      seats
    });
  };

  const adjustSeats = (delta: number) => {
    const newSeats = seats + delta;
    if (newSeats >= 1 && newSeats <= 4) {
      setSeats(newSeats);
    }
  };

  const renderSuggestionItem = ({ item }: { item: any }, type: 'pickup' | 'dropoff') => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => selectSuggestion(item, type)}>
      <Icon name="location-outline" size={20} color="#888" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.suggestionTitle}>{item.text}</Text>
        <Text style={styles.suggestionSubtitle} numberOfLines={1}>{item.place_name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={() => { setActiveField(null); Keyboard.dismiss(); }}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Where to?</Text>
          <Text style={styles.subHeader}>Find a comfortable ride for your daily commute</Text>
        </View>

        <View style={styles.card}>
          {/* Pickup Field */}
          <View style={styles.inputWrapper}>
            <View style={styles.iconContainer}>
              <View style={styles.greenDot} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Leaving from..."
              placeholderTextColor="#888"
              value={pickupText}
              onChangeText={handlePickupChange}
              onFocus={() => setActiveField('pickup')}
            />
            {isPickupSearching && <ActivityIndicator size="small" color="#00E676" style={styles.spinner} />}
          </View>

          {activeField === 'pickup' && pickupSuggestions.length === 0 && pickupText.length < 2 && (
            <TouchableOpacity style={styles.currentLocationBtn} onPress={useCurrentLocation}>
              <Icon name="navigate-outline" size={18} color="#00E676" />
              <Text style={styles.currentLocationText}>Use Current Location</Text>
            </TouchableOpacity>
          )}

          {activeField === 'pickup' && pickupSuggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              <FlatList
                data={pickupSuggestions}
                keyExtractor={(item) => item.id}
                renderItem={(props) => renderSuggestionItem(props, 'pickup')}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}

          <View style={styles.verticalLine} />

          {/* Dropoff Field */}
          <View style={[styles.inputWrapper, { marginBottom: 20 }]}>
            <View style={styles.iconContainer}>
              <Icon name="location" size={16} color="#FF3B30" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Going to..."
              placeholderTextColor="#888"
              value={dropoffText}
              onChangeText={handleDropoffChange}
              onFocus={() => setActiveField('dropoff')}
            />
            {isDropoffSearching && <ActivityIndicator size="small" color="#FF3B30" style={styles.spinner} />}
          </View>

          {activeField === 'dropoff' && dropoffSuggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              <FlatList
                data={dropoffSuggestions}
                keyExtractor={(item) => item.id}
                renderItem={(props) => renderSuggestionItem(props, 'dropoff')}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}

          <View style={styles.row}>
            {/* Date Selector */}
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Date</Text>
              <View style={styles.datePickerBtn}>
                <Icon name="calendar-outline" size={18} color="#fff" />
                <Text style={styles.dateText}>{date}</Text>
              </View>
            </View>

            {/* Passengers Selector */}
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Passengers</Text>
              <View style={styles.seatSelector}>
                <TouchableOpacity onPress={() => adjustSeats(-1)} style={styles.seatBtn}>
                  <Text style={styles.seatBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.seatCount}>{seats}</Text>
                <TouchableOpacity onPress={() => adjustSeats(1)} style={styles.seatBtn}>
                  <Text style={styles.seatBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search Rides</Text>
          <Icon name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    paddingTop: 60,
  },
  headerContainer: {
    marginBottom: 30,
  },
  header: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    color: '#aaa',
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    marginBottom: 30,
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 56,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E676',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  spinner: {
    marginLeft: 10,
  },
  verticalLine: {
    width: 2,
    height: 15,
    backgroundColor: '#444',
    marginLeft: 26,
    marginVertical: 4,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  currentLocationText: {
    color: '#00E676',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  suggestionsList: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  suggestionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  suggestionSubtitle: {
    color: '#888',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '47%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    padding: 15,
    borderRadius: 12,
    height: 56,
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  seatSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    borderRadius: 12,
    height: 56,
  },
  seatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
  },
  seatCount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchBtn: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6', // Premium Blue
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

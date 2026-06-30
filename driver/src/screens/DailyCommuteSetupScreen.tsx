import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Animated, Switch, Dimensions } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { theme } from '../theme/theme';

const MAPBOX_TOKEN = 'YOUR_MAPBOX_TOKEN_HERE';
const { width } = Dimensions.get('window');

const DailyCommuteSetupScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  // Step 1: Locations
  const [startLocation, setStartLocation] = useState('');
  const [startCoords, setStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [endLocation, setEndLocation] = useState('');
  const [endCoords, setEndCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [startResults, setStartResults] = useState<any[]>([]);
  const [endResults, setEndResults] = useState<any[]>([]);

  // Step 2: Schedule & Preferences
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [time, setTime] = useState('08:30');
  const [seats, setSeats] = useState(4);
  const [price, setPrice] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [luggageAllowed, setLuggageAllowed] = useState(false);

  // Animation
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    checkVerification();
  }, []);

  const checkVerification = async () => {
    try {
      const res = await api.get('/driver/profile');
      if (res.data && res.data.isVerified) {
        setIsVerified(true);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!startCoords || !endCoords)) {
      Alert.alert('Incomplete', 'Please select both start and end locations from the suggestions.');
      return;
    }
    if (step === 2 && (!price || isNaN(Number(price)))) {
      Alert.alert('Incomplete', 'Please enter a valid price per seat.');
      return;
    }

    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setStep(step + 1);
      slideAnim.setValue(width);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    });
  };

  const prevStep = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setStep(step - 1);
      slideAnim.setValue(-width);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    });
  };

  const searchLocation = async (query: string, type: 'start' | 'end') => {
    if (type === 'start') setStartLocation(query);
    else setEndLocation(query);

    if (query.length < 3) {
      if (type === 'start') setStartResults([]);
      else setEndResults([]);
      return;
    }

    try {
      // Bounding box for Gujarat (approx)
      const bbox = '68.1,20.1,74.5,24.7';
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=IN&bbox=${bbox}&types=poi,address,place`
      );
      
      const features = response.data.features;
      if (type === 'start') setStartResults(features);
      else setEndResults(features);
    } catch (error) {
      console.log('Mapbox search error:', error);
    }
  };

  const selectLocation = (feature: any, type: 'start' | 'end') => {
    const coords = {
      lng: feature.center[0],
      lat: feature.center[1]
    };
    if (type === 'start') {
      setStartLocation(feature.place_name);
      setStartCoords(coords);
      setStartResults([]);
    } else {
      setEndLocation(feature.place_name);
      setEndCoords(coords);
      setEndResults([]);
      
      // Auto-suggest price based on straight line distance (rough estimate)
      if (startCoords) {
        const dist = Math.sqrt(Math.pow(startCoords.lat - coords.lat, 2) + Math.pow(startCoords.lng - coords.lng, 2)) * 111; // roughly km
        setPrice(Math.round(dist * 2).toString());
      }
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handlePublish = async () => {
    try {
      // Calculate times
      const today = new Date().toISOString().split('T')[0];
      const startTimeIso = `${today}T${time}:00Z`; // Using Z for UTC for simplicity, in real app consider timezone
      
      const payload = {
        startLocation,
        startLat: startCoords?.lat,
        startLng: startCoords?.lng,
        endLocation,
        endLat: endCoords?.lat,
        endLng: endCoords?.lng,
        startTime: startTimeIso,
        estimatedEndTime: `${today}T${parseInt(time.split(':')[0]) + 2}:${time.split(':')[1]}:00Z`,
        availableSeats: seats,
        pricePerSeat: Number(price),
        pricingMode: "Fixed",
        isLuggageAllowed: luggageAllowed,
        autoApprove: autoApprove,
        isRecurring: true,
        recurringDays: selectedDays.join(','),
        recurringTime: `${time}:00`,
        stops: []
      };

      await api.post('/route/publish', payload);
      
      Alert.alert(
        "🎉 Success!", 
        "Your daily route is live! Passengers can now find and subscribe to your route.",
        [{ text: "View My Routes", onPress: () => navigation.navigate("My Routes") }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.response?.data || "Failed to publish route.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Checking KYC status...</Text>
      </View>
    );
  }

  if (!isVerified) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.pendingIcon}>⚠️</Text>
        <Text style={styles.pendingTitle}>KYC Pending</Text>
        <Text style={styles.pendingDesc}>Your KYC is pending. Get verified to start sharing rides and setting up daily commutes.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.primaryBtnText}>Check KYC Status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <Text style={styles.headerTitle}>Daily Commute Setup</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Step {step} of 3</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* STEP 1 */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Where do you commute?</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>🏠 Home / Start Point</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter starting location..."
                  placeholderTextColor="#666"
                  value={startLocation}
                  onChangeText={(text) => searchLocation(text, 'start')}
                />
                {startResults.length > 0 && (
                  <View style={styles.suggestionsCard}>
                    {startResults.map((item, index) => (
                      <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => selectLocation(item, 'start')}>
                        <Text style={styles.suggestionText} numberOfLines={2}>{item.place_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>🏢 Work / End Point</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter destination..."
                  placeholderTextColor="#666"
                  value={endLocation}
                  onChangeText={(text) => searchLocation(text, 'end')}
                />
                {endResults.length > 0 && (
                  <View style={styles.suggestionsCard}>
                    {endResults.map((item, index) => (
                      <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => selectLocation(item, 'end')}>
                        <Text style={styles.suggestionText} numberOfLines={2}>{item.place_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>When do you commute?</Text>
              
              <Text style={styles.label}>Select Days</Text>
              <View style={styles.daysContainer}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <TouchableOpacity 
                    key={day} 
                    style={[styles.dayPill, selectedDays.includes(day) && styles.dayPillActive]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayText, selectedDays.includes(day) && styles.dayTextActive]}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Departure Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="08:30"
                placeholderTextColor="#666"
                value={time}
                onChangeText={setTime}
                maxLength={5}
                keyboardType="numeric"
              />

              <View style={styles.rowGroup}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Available Seats</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => setSeats(Math.max(1, seats - 1))}>
                      <Text style={styles.stepperText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{seats}</Text>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => setSeats(Math.min(6, seats + 1))}>
                      <Text style={styles.stepperText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Price / Seat</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="₹50"
                    placeholderTextColor="#666"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.switchGroup}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchTitle}>Auto-approve passengers</Text>
                  <Text style={styles.switchDesc}>Passengers book instantly without your approval.</Text>
                </View>
                <Switch value={autoApprove} onValueChange={setAutoApprove} trackColor={{ true: theme.colors.primary }} />
              </View>

              <View style={styles.switchGroup}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchTitle}>Luggage Allowed?</Text>
                </View>
                <Switch value={luggageAllowed} onValueChange={setLuggageAllowed} trackColor={{ true: theme.colors.primary }} />
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Review your daily route</Text>
              
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>📍</Text>
                  <Text style={styles.summaryText}>{startLocation}</Text>
                </View>
                <View style={styles.summaryLine} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>🏁</Text>
                  <Text style={styles.summaryText}>{endLocation}</Text>
                </View>
                
                <View style={styles.divider} />
                
                <Text style={styles.summaryDetail}>📅 {selectedDays.join(', ')}</Text>
                <Text style={styles.summaryDetail}>🕐 Departs at {time} daily</Text>
                <Text style={styles.summaryDetail}>💺 {seats} passenger seats</Text>
                <Text style={styles.summaryDetail}>💰 ₹{price} per seat per day</Text>
                <Text style={styles.summaryDetail}>⚡ Auto-approve: {autoApprove ? 'Yes' : 'No'}</Text>
              </View>

              <Text style={styles.infoText}>Once published, passengers can find and subscribe to your daily route.</Text>

              <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
                <Text style={styles.publishBtnText}>Publish Daily Route</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.draftBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.draftBtnText}>Save as Draft</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContainer: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: theme.colors.surface },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  backBtn: { padding: 10 },
  backBtnText: { color: theme.colors.primary, fontSize: 16, fontWeight: '600' },
  backBtnPlaceholder: { width: 60 },
  progressContainer: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: theme.colors.surface },
  progressText: { fontSize: 14, color: theme.colors.text.muted, marginBottom: 8, textAlign: 'center' },
  progressBarBg: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  stepContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 28, fontWeight: '900', color: theme.colors.text.main, marginBottom: 30 },
  inputGroup: { marginBottom: 20, zIndex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: theme.colors.text.muted, marginBottom: 8 },
  input: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, fontSize: 16, color: theme.colors.text.main, borderWidth: 1, borderColor: theme.colors.border },
  suggestionsCard: { backgroundColor: theme.colors.surface, borderRadius: 12, marginTop: 5, padding: 10, ...theme.shadows.medium, maxHeight: 200 },
  suggestionItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  suggestionText: { fontSize: 15, color: theme.colors.text.main },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  dayPill: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  dayPillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayText: { fontSize: 15, color: theme.colors.text.muted, fontWeight: '600' },
  dayTextActive: { color: theme.colors.text.light },
  rowGroup: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 25, marginTop: 15 },
  halfWidth: { flex: 1 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  stepperBtn: { padding: 15, backgroundColor: theme.colors.surface },
  stepperText: { fontSize: 20, color: theme.colors.primary, fontWeight: 'bold' },
  stepperValue: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  switchGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 15, borderRadius: 12, marginBottom: 15 },
  switchTextContainer: { flex: 1, paddingRight: 10 },
  switchTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text.main, marginBottom: 4 },
  switchDesc: { fontSize: 13, color: theme.colors.text.muted },
  nextBtn: { backgroundColor: theme.colors.primary, padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  nextBtnText: { color: theme.colors.text.light, fontSize: 18, fontWeight: 'bold' },
  summaryCard: { backgroundColor: theme.colors.surface, borderRadius: 15, padding: 20, ...theme.shadows.medium, marginBottom: 25 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryIcon: { fontSize: 20, marginRight: 10 },
  summaryText: { fontSize: 16, color: theme.colors.text.main, flex: 1, fontWeight: '600' },
  summaryLine: { width: 2, height: 20, backgroundColor: theme.colors.border, marginLeft: 9, marginVertical: 4 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 15 },
  summaryDetail: { fontSize: 15, color: theme.colors.text.muted, marginBottom: 10, fontWeight: '500' },
  infoText: { fontSize: 14, color: theme.colors.text.muted, textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
  publishBtn: { backgroundColor: theme.colors.primary, padding: 18, borderRadius: 15, alignItems: 'center', marginBottom: 15 },
  publishBtnText: { color: theme.colors.text.light, fontSize: 18, fontWeight: 'bold' },
  draftBtn: { backgroundColor: 'transparent', padding: 18, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  draftBtnText: { color: theme.colors.text.main, fontSize: 16, fontWeight: 'bold' },
  loadingText: { color: theme.colors.text.main, fontSize: 16 },
  pendingIcon: { fontSize: 50, marginBottom: 20 },
  pendingTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.main, marginBottom: 10 },
  pendingDesc: { fontSize: 16, color: theme.colors.text.muted, textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
  primaryBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', width: '100%' },
  primaryBtnText: { color: theme.colors.text.light, fontSize: 16, fontWeight: 'bold' }
});

export default DailyCommuteSetupScreen;

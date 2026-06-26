import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, SafeAreaView } from 'react-native';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';

const CreateRouteScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(1);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Step 1
  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Step 2
  const [pricingMode, setPricingMode] = useState('Fixed'); // 'Fixed' or 'PerKm'
  const [price, setPrice] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [seats, setSeats] = useState('');

  // Step 3
  const [vehicleId, setVehicleId] = useState('');
  const [luggage, setLuggage] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchKYC = async () => {
      try {
        const res = await axiosInstance.get('/kyc/status'); 
        if (res.data.vehicleId) {
          setVehicleId(res.data.vehicleId);
        } else {
          setVehicleId('00000000-0000-0000-0000-000000000000');
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchKYC();
  }, []);

  const handlePublish = async () => {
    if (!startLoc || !endLoc || !price || !seats) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    try {
      // Mocking DateTime parsing
      const startTime = new Date(); // In real app, parse from date/time inputs
      startTime.setHours(startTime.getHours() + 24); // Future time
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2); // 2 hours later

      await axiosInstance.post('/route/publish', {
        startLocation: startLoc,
        endLocation: endLoc,
        startTime: startTime.toISOString(),
        estimatedEndTime: endTime.toISOString(),
        availableSeats: parseInt(seats),
        pricingMode: pricingMode,
        pricePerSeat: pricingMode === 'Fixed' ? parseFloat(price) : 0,
        pricePerKm: pricingMode === 'PerKm' ? parseFloat(pricePerKm) : 0,
        vehicleId: vehicleId,
        isLuggageAllowed: luggage,
        autoApprove: autoApprove,
        isRecurring: isRecurring,
        recurringDays: isRecurring ? 'Mon,Tue,Wed,Thu,Fri' : null,
        recurringTime: isRecurring ? '08:30:00' : null, // Mocking recurring time for MVP
        rideNotes: notes,
        stops: []
      });

      Alert.alert('Success', 'Route published successfully!');
      navigation.navigate('My Routes');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || 'Failed to publish route');
    }
  };

  const handleDraft = async () => {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 24);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      await axiosInstance.post('/route/draft', {
        startLocation: startLoc,
        endLocation: endLoc,
        startTime: startTime.toISOString(),
        estimatedEndTime: endTime.toISOString(),
        availableSeats: parseInt(seats) || 4,
        pricingMode: pricingMode,
        pricePerSeat: pricingMode === 'Fixed' ? (parseFloat(price) || 0) : 0,
        pricePerKm: pricingMode === 'PerKm' ? (parseFloat(pricePerKm) || 0) : 0,
        vehicleId: vehicleId,
        isLuggageAllowed: luggage,
        autoApprove: autoApprove,
        isRecurring: isRecurring,
        recurringDays: isRecurring ? 'Mon,Tue,Wed,Thu,Fri' : null,
        recurringTime: isRecurring ? '08:30:00' : null, // Mocking recurring time for MVP
        rideNotes: notes,
        stops: []
      });

      Alert.alert('Draft Saved', 'Route saved as draft.');
      navigation.navigate('My Routes');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || 'Failed to save draft');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Create Route</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
            <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
            <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
            <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
            <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
          </View>
          <Text style={styles.stepText}>Step {step} of 3</Text>
        </View>

        <View style={styles.card}>
          {step === 1 && (
            <View>
              <Text style={styles.label}>Start Location</Text>
              <TextInput style={styles.input} placeholder="e.g. New York" placeholderTextColor={theme.colors.text.muted} value={startLoc} onChangeText={setStartLoc} />
              
              <Text style={styles.label}>End Location</Text>
              <TextInput style={styles.input} placeholder="e.g. Boston" placeholderTextColor={theme.colors.text.muted} value={endLoc} onChangeText={setEndLoc} />
              
              <Text style={styles.label}>Date</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.text.muted} value={date} onChangeText={setDate} />
              
              <Text style={styles.label}>Time</Text>
              <TextInput style={styles.input} placeholder="HH:MM" placeholderTextColor={theme.colors.text.muted} value={time} onChangeText={setTime} />
              
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setStep(2)}>
                <Text style={styles.btnTextLight}>Next Step</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.label}>Pricing Mode</Text>
              <View style={styles.modeContainer}>
                <TouchableOpacity 
                  style={[styles.modeBtn, pricingMode === 'Fixed' && styles.modeBtnActive]} 
                  onPress={() => setPricingMode('Fixed')}>
                  <Text style={[styles.modeBtnText, pricingMode === 'Fixed' && styles.modeBtnTextActive]}>Fixed Price</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modeBtn, pricingMode === 'PerKm' && styles.modeBtnActive]} 
                  onPress={() => setPricingMode('PerKm')}>
                  <Text style={[styles.modeBtnText, pricingMode === 'PerKm' && styles.modeBtnTextActive]}>Per Km</Text>
                </TouchableOpacity>
              </View>

              {pricingMode === 'Fixed' ? (
                <>
                  <Text style={styles.label}>Price Per Seat ($)</Text>
                  <TextInput style={styles.input} placeholder="e.g. 25" placeholderTextColor={theme.colors.text.muted} keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Price Per Km ($)</Text>
                  <TextInput style={styles.input} placeholder="e.g. 0.5" placeholderTextColor={theme.colors.text.muted} keyboardType="decimal-pad" value={pricePerKm} onChangeText={setPricePerKm} />
                </>
              )}
              
              <Text style={styles.label}>Available Seats</Text>
              <TextInput style={styles.input} placeholder="e.g. 3" placeholderTextColor={theme.colors.text.muted} keyboardType="number-pad" value={seats} onChangeText={setSeats} />
              
              <View style={styles.row}>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(1)}>
                  <Text style={styles.btnTextDark}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setStep(3)}>
                  <Text style={styles.btnTextLight}>Next Step</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Allow Luggage?</Text>
                <Switch value={luggage} onValueChange={setLuggage} trackColor={{ true: theme.colors.primary }} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Auto Approve Requests?</Text>
                <Switch value={autoApprove} onValueChange={setAutoApprove} trackColor={{ true: theme.colors.primary }} />
              </View>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Make it Recurring? (Mon-Fri)</Text>
                  <Text style={{ fontSize: 12, color: theme.colors.text.muted }}>Auto-publish this route daily at the same time.</Text>
                </View>
                <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ true: theme.colors.primary }} />
              </View>
              
              <Text style={styles.label}>Ride Notes</Text>
              <TextInput style={[styles.input, {height: 100, textAlignVertical: 'top'}]} placeholder="Optional requirements..." placeholderTextColor={theme.colors.text.muted} multiline value={notes} onChangeText={setNotes} />

              <View style={styles.row}>
                 <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(2)}>
                   <Text style={styles.btnTextDark}>Back</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.btnDraft} onPress={handleDraft}>
                   <Text style={styles.btnTextLight}>Save Draft</Text>
                 </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.btnPublish} onPress={handlePublish}>
                <Text style={styles.btnTextLight}>PUBLISH RIDE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: { 
    flexGrow: 1, 
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  header: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: theme.colors.text.main,
    marginBottom: theme.spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
    transform: [{ scale: 1.2 }],
  },
  progressLine: {
    width: 40,
    height: 3,
    backgroundColor: theme.colors.border,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: theme.colors.primary,
  },
  stepText: {
    fontSize: 14,
    color: theme.colors.text.muted,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    ...theme.shadows.medium,
  },
  label: { 
    fontSize: 14, 
    fontWeight: '700', 
    marginBottom: theme.spacing.xs, 
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  switchLabel: {
    fontSize: 16, 
    fontWeight: '600', 
    color: theme.colors.text.main,
  },
  input: { 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    padding: theme.spacing.md, 
    borderRadius: theme.radius.md, 
    marginBottom: theme.spacing.lg,
    fontSize: 16,
    color: theme.colors.text.main,
    backgroundColor: '#FAFAFA',
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  switchRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: theme.spacing.lg, 
    padding: theme.spacing.md, 
    backgroundColor: '#FAFAFA', 
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnPrimary: { 
    flex: 1, 
    backgroundColor: theme.colors.primary, 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.full, 
    alignItems: 'center',
    ...theme.shadows.small,
  },
  btnSecondary: { 
    flex: 1, 
    backgroundColor: theme.colors.border, 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.full, 
    alignItems: 'center' 
  },
  btnDraft: {
    flex: 1, 
    backgroundColor: theme.colors.text.muted, 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.full, 
    alignItems: 'center',
    ...theme.shadows.small,
  },
  btnPublish: {
    backgroundColor: theme.colors.success, 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.full, 
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    ...theme.shadows.medium,
  },
  btnTextLight: { color: theme.colors.text.light, fontWeight: '800', letterSpacing: 0.5 },
  btnTextDark: { color: theme.colors.text.main, fontWeight: '700' },
  modeContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    backgroundColor: '#EEEEEE',
    borderRadius: theme.radius.md,
    padding: 4
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.md,
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    ...theme.shadows.small
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.muted
  },
  modeBtnTextActive: {
    color: theme.colors.text.main,
    fontWeight: '700'
  }
});

export default CreateRouteScreen;

import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, Image, Alert
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axiosInstance from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const localColors = {
  background: '#f8f9ff',
  primary: '#000000',
  secondary: '#006a61',
  onSurfaceVariant: '#45464d',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHigh: '#dce9ff',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
  onSurface: '#0b1c30',
  surface: '#f8f9ff',
};

const VehicleDetailsScreen = ({ navigation, route }: any) => {
  const fromProfile = route?.params?.fromProfile;
  const { logout } = useContext(AuthContext);

  const [makeModel, setMakeModel] = useState('');
  const [year, setYear] = useState('');
  const [vehicleType, setVehicleType] = useState('sedan');
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If navigating from profile, we don't need to auto-redirect based on KYC status, 
    // but typically this screen is step 2 of registration.
    const checkStatus = async () => {
      try {
        const res = await axiosInstance.get('/kyc/status');
        if ((res.data.status === 'Pending' || res.data.status === 'Rejected') && !fromProfile) {
          navigation.replace('KYC'); // KYC screen handles pending and rejected state UI
        }
      } catch (e) {
        console.log('Error checking KYC status', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkStatus();
  }, [navigation, fromProfile]);

  const handleNext = () => {
    if (!makeModel || !year || !vehicleType || !licensePlate || !color || !totalSeats) {
      alert('Please fill in all fields.');
      return;
    }

    const parts = makeModel.trim().split(' ');
    const make = parts[0] || 'Unknown';
    const model = parts.slice(1).join(' ') || 'Unknown';

    // Navigate to KYC documents screen and pass the vehicle details
    navigation.navigate('KYC', {
      vehicleDetails: {
        make,
        model,
        year: parseInt(year) || new Date().getFullYear(),
        vehicleType,
        licensePlate: licensePlate.toUpperCase(),
        color: color.trim(),
        totalSeats: parseInt(totalSeats) || 4
      }
    });
  };

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: localColors.background }} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />

      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Progress Indicator */}
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>REGISTRATION PROGRESS</Text>
              <Text style={styles.progressStep}>Step 2 of 3</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={styles.progressBarFill} />
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Vehicle Details</Text>
            <Text style={styles.subtitle}>Tell us about the car you'll be driving. High-quality vehicles earn better ratings and tips.</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Vehicle Visual Preview */}
            <View style={styles.previewImageContainer}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGzeJJNi3c4LVC5LN4eXaGQBRs7L18VXPsOu6ihAhT_su5s8Ynm7Mp_HNw5RIuHeJyaG0B18fSbY7lIkvurs6QaXaTOf2PcUJaGNOP-gBNqcAX8_33-7bme5_-tkliiAOfl3J_MczT525Qfy9sTqD1Gu-YfKBxohHwAOJKW9J7SbJoxJk2wglQFXuKhURngmMjRxUOns8Mft-7lfiHABcMlbzzO2J0V4dLoefnBhb3VPqBiVgWMoakRg' }}
                style={styles.previewImage}
              />
              <View style={styles.previewOverlay}>
                <Text style={styles.previewText}>Vehicle Selection</Text>
              </View>
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Make & Model</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="directions-car" size={20} color={localColors.outline} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Toyota Camry"
                  placeholderTextColor={localColors.outline}
                  value={makeModel}
                  onChangeText={setMakeModel}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Year</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="calendar-month" size={20} color={localColors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="2022"
                    placeholderTextColor={localColors.outline}
                    keyboardType="numeric"
                    maxLength={4}
                    value={year}
                    onChangeText={setYear}
                  />
                </View>
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Vehicle Type</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="category" size={20} color={localColors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Sedan / SUV"
                    placeholderTextColor={localColors.outline}
                    value={vehicleType}
                    onChangeText={setVehicleType}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Registration Number</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="abc" size={24} color={localColors.outline} style={styles.icon} />
                <TextInput
                  style={[styles.input, { textTransform: 'uppercase', letterSpacing: 2 }]}
                  placeholder="ABC-1234"
                  placeholderTextColor={localColors.outline}
                  autoCapitalize="characters"
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                />
              </View>
              <Text style={styles.hintText}>Make sure your license plate matches your physical vehicle.</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Color</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="palette" size={20} color={localColors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. White"
                    placeholderTextColor={localColors.outline}
                    value={color}
                    onChangeText={setColor}
                  />
                </View>
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Total Seats</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="event-seat" size={20} color={localColors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 4"
                    placeholderTextColor={localColors.outline}
                    keyboardType="numeric"
                    maxLength={2}
                    value={totalSeats}
                    onChangeText={setTotalSeats}
                  />
                </View>
              </View>
            </View>

            {/* Quick Tips Card */}
            <View style={styles.tipsCard}>
              <MaterialIcons name="verified-user" size={24} color={localColors.secondary} />
              <View style={styles.tipsTextContainer}>
                <Text style={styles.tipsTitle}>Safety First</Text>
                <Text style={styles.tipsBody}>Your vehicle must be less than 15 years old and pass a basic safety inspection before your first ride.</Text>
              </View>
            </View>

            {/* Bottom Action Bar (Moved inside ScrollView) */}
            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>Next: Upload Documents</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  Alert.alert('Log Out', 'Are you sure you want to log out? You can complete your vehicle details later.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log Out', style: 'destructive', onPress: () => logout() }
                  ]);
                }
              }}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.2)',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: localColors.primary,
    letterSpacing: -0.5,
    marginLeft: 4,
  },
  headerRight: {},
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: localColors.surfaceContainerHigh,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 140, // Space for bottom bar
  },
  progressSection: {
    marginBottom: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
    letterSpacing: 1,
  },
  progressStep: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.primary,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: localColors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '66.6%',
    height: '100%',
    backgroundColor: localColors.primary,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    lineHeight: 24,
  },
  formContainer: {},
  previewImageContainer: {
    width: '100%',
    height: 176,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    marginBottom: 24,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 32, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'flex-end',
  },
  previewText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: localColors.onSurface,
    height: '100%',
  },
  hintText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(220, 233, 255, 0.5)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  tipsTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 4,
  },
  tipsBody: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    lineHeight: 20,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    marginTop: 16,
  },
  primaryBtn: {
    backgroundColor: localColors.primary,
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  secondaryBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  secondaryBtnText: {
    color: localColors.onSurfaceVariant,
    fontSize: 18,
    fontWeight: '600',
  }
});

export default VehicleDetailsScreen;

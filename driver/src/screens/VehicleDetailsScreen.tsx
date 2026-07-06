import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, Image
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axiosInstance from '../api/axios';

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

  const [makeModel, setMakeModel] = useState('');
  const [year, setYear] = useState('');
  const [vehicleType, setVehicleType] = useState('sedan');
  const [licensePlate, setLicensePlate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If navigating from profile, we don't need to auto-redirect based on KYC status, 
    // but typically this screen is step 2 of registration.
    const checkStatus = async () => {
      try {
        const res = await axiosInstance.get('/kyc/status');
        if (res.data.status === 'Approved' && !fromProfile) {
          navigation.replace('MainTabs');
        } else if (res.data.status === 'Pending' && !fromProfile) {
          navigation.replace('KYC'); // KYC screen handles pending state UI
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
    if (!makeModel || !year || !vehicleType || !licensePlate) {
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
        color: 'White', // Defaulting as it's not in the new UI mockup
        totalSeats: vehicleType === 'xl' ? 7 : 4
      }
    });
  };

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: localColors.background }} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
      
      {/* Top Navigation */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={localColors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RideO</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.profileAvatar}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeFCFpVQuQFkI4MWVZN8x4Y1uLbU6aEumR13GG3n2UpWk0R57jw65uybbWZ-sACYEVgzQl69TJULmi6tYwqJm_0QZbXL5zFPI-tQEx5Dm9GbBtbE8w6HFD3PP2mOBo6qLGOtvfPy-65-o1A9SA1C8biJq085XnRwE0sKRinsaANfJRyrdYkmdkDvpDe4OXBJEzYec9YS1W-7B42fuxP7BlJIbJoB5e0vKwJN0wGRtU8WoJIS9NxJ9Exg' }}
              style={styles.avatarImage}
            />
          </View>
        </View>
      </View>

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

            {/* Quick Tips Card */}
            <View style={styles.tipsCard}>
              <MaterialIcons name="verified-user" size={24} color={localColors.secondary} />
              <View style={styles.tipsTextContainer}>
                <Text style={styles.tipsTitle}>Safety First</Text>
                <Text style={styles.tipsBody}>Your vehicle must be less than 15 years old and pass a basic safety inspection before your first ride.</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
          <Text style={styles.primaryBtnText}>Next: Upload Documents</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248, 249, 255, 0.95)',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 198, 205, 0.2)',
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

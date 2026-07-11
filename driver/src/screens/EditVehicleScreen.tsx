import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Local colors to match the specific HTML design provided
const localColors = {
  background: '#f8f9ff',
  primary: '#000000',
  onSurfaceVariant: '#45464d',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerLow: '#eff4ff',
  secondary: '#006a61',
  secondaryContainer: '#86f2e4',
  onSecondaryContainer: '#006f66',
  outlineVariant: '#c6c6cd',
  surface: '#ffffff',
  outline: '#76777d',
};

const VEHICLE_TYPES = [
  { label: 'Sedan', value: 'Sedan' },
  { label: 'SUV', value: 'SUV' },
  { label: 'Hatchback', value: 'Hatchback' },
  { label: 'Van / Minivan', value: 'Van' }
];

const EditVehicleScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  // Form State matching the new design
  const [makeModel, setMakeModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan');
  
  // Hidden state kept for API compatibility
  const [color, setColor] = useState('White');
  const [seats, setSeats] = useState('4');

  // Dropdown state
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      const res = await axiosInstance.get('/vehicle/my');
      const v = res.data;
      setVehicleId(v.id);
      setMakeModel(`${v.make || ''} ${v.model || ''}`.trim());
      setYear(v.year?.toString() || '');
      setColor(v.color || 'White');
      setLicensePlate(v.licensePlate || '');
      setVehicleType(v.vehicleType || 'Sedan');
      setSeats(v.totalSeats?.toString() || '4');
    } catch (e: any) {
      if (e.response?.status === 404) {
        Alert.alert('No Vehicle', 'You do not have a vehicle registered yet. Please complete KYC.');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to fetch vehicle details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveVehicle = async () => {
    if (!makeModel || !licensePlate || !year) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const parts = makeModel.trim().split(' ');
    const make = parts[0] || 'Unknown';
    const model = parts.slice(1).join(' ') || 'Unknown';

    try {
      setIsSaving(true);
      await axiosInstance.put(`/vehicle/${vehicleId}`, {
        make,
        model,
        year: parseInt(year) || 2020,
        color,
        licensePlate,
        vehicleType,
        totalSeats: parseInt(seats) || 4
      });
      
      Alert.alert('Success', 'Vehicle updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update vehicle');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={localColors.primary} />
      </View>
    );
  }

  // Derive display values for preview card
  const displayMakeModel = makeModel || 'Unknown Vehicle';
  const displayType = vehicleType || 'Type';
  const displayReg = licensePlate || 'ABC-1234';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Info Text */}
          <Text style={styles.infoText}>
            Update your vehicle details. Changes may require approval before you can accept new rides.
          </Text>

          {/* Current Vehicle Card Preview */}
          <View style={styles.previewCard}>
            <View style={styles.previewIconBox}>
              <MaterialIcons name="directions-car" size={32} color={localColors.primary} />
            </View>
            
            <View style={styles.previewDetails}>
              <Text style={styles.previewTitle}>{displayMakeModel}</Text>
              <View style={styles.previewSubRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{displayType.toUpperCase()}</Text>
                </View>
                <View style={styles.dot} />
                <Text style={styles.previewReg}>{displayReg}</Text>
              </View>
            </View>

            <View style={styles.activeStatus}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          </View>

          {/* Form Area */}
          <View style={styles.formContainer}>
            {/* Make & Model */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MAKE & MODEL</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="local-offer" size={20} color={localColors.outline} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={makeModel} 
                  onChangeText={setMakeModel} 
                  placeholder="Toyota Camry"
                  placeholderTextColor={localColors.outlineVariant}
                />
              </View>
            </View>

            {/* Year */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>YEAR</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="calendar-today" size={20} color={localColors.outline} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={year} 
                  onChangeText={setYear} 
                  keyboardType="number-pad"
                  placeholder="2021"
                  placeholderTextColor={localColors.outlineVariant}
                />
              </View>
            </View>

            {/* Registration Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>REGISTRATION NUMBER</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="pin" size={20} color={localColors.outline} style={styles.inputIcon} />
                <TextInput 
                  style={[styles.input, { textTransform: 'uppercase' }]} 
                  value={licensePlate} 
                  onChangeText={setLicensePlate} 
                  placeholder="ABC-1234"
                  autoCapitalize="characters"
                  placeholderTextColor={localColors.outlineVariant}
                />
              </View>
            </View>

            {/* Vehicle Type Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>VEHICLE TYPE</Text>
              <TouchableOpacity 
                style={styles.inputWrapper} 
                activeOpacity={0.7}
                onPress={() => setIsTypeDropdownOpen(true)}
              >
                <MaterialIcons name="category" size={20} color={localColors.outline} style={styles.inputIcon} />
                <Text style={[styles.input, { lineHeight: 48, color: localColors.primary }]}>
                  {vehicleType}
                </Text>
                <MaterialIcons name="expand-more" size={24} color={localColors.outline} style={styles.dropdownIcon} />
              </TouchableOpacity>
            </View>

            {/* Document Warning Card */}
            <View style={styles.warningCard}>
              <MaterialIcons name="info-outline" size={20} color={localColors.onSurfaceVariant} style={{ marginTop: 2 }} />
              <View style={styles.warningTextCol}>
                <Text style={styles.warningTitle}>Verification Required</Text>
                <Text style={styles.warningDesc}>
                  Changing your vehicle make, model, or registration will require you to upload new registration documents.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Area */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={saveVehicle}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={localColors.surface} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Custom Dropdown Modal */}
        <Modal
          visible={isTypeDropdownOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsTypeDropdownOpen(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsTypeDropdownOpen(false)}>
            <View style={styles.dropdownMenu}>
              {VEHICLE_TYPES.map((type, idx) => (
                <TouchableOpacity 
                  key={type.value} 
                  style={[
                    styles.dropdownItem, 
                    idx !== VEHICLE_TYPES.length - 1 && styles.dropdownItemBorder
                  ]}
                  onPress={() => {
                    setVehicleType(type.value);
                    setIsTypeDropdownOpen(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText, 
                    vehicleType === type.value && { color: localColors.secondary, fontWeight: '700' }
                  ]}>
                    {type.label}
                  </Text>
                  {vehicleType === type.value && (
                    <MaterialIcons name="check" size={20} color={localColors.secondary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: localColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: localColors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Space for bottom bar
  },
  infoText: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    lineHeight: 24,
    marginBottom: 24,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainer,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    marginBottom: 24,
  },
  previewIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: localColors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.5)',
    marginRight: 16,
  },
  previewDetails: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.primary,
    marginBottom: 4,
  },
  previewSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#d3e4fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: localColors.outline,
    marginHorizontal: 8,
  },
  previewReg: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(134, 242, 228, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: localColors.secondary,
    marginRight: 4,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSecondaryContainer,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  dropdownIcon: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  input: {
    width: '100%',
    backgroundColor: localColors.surface,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 16,
    color: localColors.primary,
    minHeight: 48,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: localColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  warningTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.primary,
    marginBottom: 4,
  },
  warningDesc: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: localColors.outline,
    borderRadius: 24,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.primary,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: localColors.primary,
    borderRadius: 24,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    width: '80%',
    backgroundColor: localColors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: localColors.outlineVariant,
  },
  dropdownItemText: {
    fontSize: 16,
    color: localColors.primary,
  },
});

export default EditVehicleScreen;

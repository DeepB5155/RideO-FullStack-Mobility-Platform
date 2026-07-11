import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, 
  ScrollView, SafeAreaView, StatusBar
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const localColors = {
  background: '#f8f9ff',
  surface: '#f8f9ff',
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#131b2e',
  onSurfaceVariant: '#45464d',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
  onSurface: '#0b1c30',
  surfaceVariant: '#d3e4fe',
  secondaryContainer: '#86f2e4',
};

const RegisterScreen = ({ navigation }: any) => {
  const { login } = useContext(AuthContext);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('Male');
  
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in required fields: Name, Email, Password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (phone) {
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(phone)) {
        Alert.alert('Validation Error', 'Please enter a valid phone number (10-15 digits).');
        return;
      }
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', { 
        fullName, 
        email, 
        password,
        phoneNumber: phone,
        role: 'User'
      });
      
      Alert.alert('Success', 'Account created! Logging you in...');
      
      const response = await api.post('/auth/login', { email, password });
      await login(response.data);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={localColors.surface} />
      
      {/* Top Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={localColors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>RideO</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.formCard}>
            
            <View style={styles.headerBox}>
              <Text style={styles.headline}>Create an Account</Text>
              <Text style={styles.subtext}>Join RideO and get moving.</Text>
            </View>

            {/* Profile Photo */}
            <View style={styles.photoUploadContainer}>
              <View style={styles.photoBox}>
                <MaterialIcons name="person" size={40} color={localColors.onSurfaceVariant} />
                <TouchableOpacity style={styles.addPhotoBtn}>
                  <MaterialIcons name="add" size={20} color={localColors.onPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.photoText}>Upload Profile Photo</Text>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="person" size={20} color={localColors.onSurfaceVariant} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Jane Doe"
                  placeholderTextColor="rgba(69, 70, 77, 0.5)"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="mail" size={20} color={localColors.onSurfaceVariant} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="jane@example.com"
                  placeholderTextColor="rgba(69, 70, 77, 0.5)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="call" size={20} color={localColors.onSurfaceVariant} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="rgba(69, 70, 77, 0.5)"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="calendar-today" size={20} color={localColors.onSurfaceVariant} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="dd-mm-yyyy"
                  placeholderTextColor="rgba(69, 70, 77, 0.5)"
                  value={dob}
                  onChangeText={setDob}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color={localColors.onSurfaceVariant} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(69, 70, 77, 0.5)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={localColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="home" size={20} color={localColors.onSurfaceVariant} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="123 Main St"
                  placeholderTextColor="rgba(69, 70, 77, 0.5)"
                  value={street}
                  onChangeText={setStreet}
                />
              </View>
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
              <View style={[styles.inputWrapper, { paddingLeft: 16 }]}>
                <TextInput
                  style={[styles.input, { paddingLeft: 0 }]}
                  placeholder="New York"
                  placeholderTextColor="rgba(69, 70, 77, 0.5)"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female', 'Other'].map(g => (
                  <TouchableOpacity 
                    key={g} 
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Primary CTA */}
            <TouchableOpacity 
              style={styles.createBtn} 
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={localColors.onPrimary} />
              ) : (
                <>
                  <Text style={styles.createBtnText}>Create Account</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={localColors.onPrimary} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerBox}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleBtn}>
              <Text style={styles.googleBtnText}>G</Text>
              <Text style={styles.googleBtnLabel}>Google</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By creating an account, you agree to our <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>

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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: localColors.surface,
  },
  backBtn: {
    padding: 8,
    backgroundColor: localColors.surfaceContainerHigh,
    borderRadius: 20,
  },
  navTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: localColors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: localColors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headline: {
    fontSize: 24,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
  },
  photoUploadContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: localColors.surfaceContainer,
    borderWidth: 2,
    borderColor: localColors.outlineVariant,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: localColors.primary,
    padding: 4,
    borderRadius: 16,
  },
  photoText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    height: 48,
  },
  icon: {
    position: 'absolute',
    left: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
    color: localColors.onSurface,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
  },
  genderBtnActive: {
    backgroundColor: localColors.primary,
    borderColor: localColors.primary,
  },
  genderText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
  },
  genderTextActive: {
    color: localColors.onPrimary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: localColors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  createBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onPrimary,
  },
  dividerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: localColors.outlineVariant,
  },
  dividerText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    paddingHorizontal: 16,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: localColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 16,
  },
  googleBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: localColors.primary,
    marginRight: 8,
  },
  googleBtnLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  termsText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: localColors.primary,
    textDecorationLine: 'underline',
  }
});

export default RegisterScreen;

import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, 
  ScrollView, SafeAreaView
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const localColors = {
  background: '#f8f9ff',
  primary: '#000000',
  onSurfaceVariant: '#45464d',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
  onSurface: '#0b1c30',
  surfaceContainer: '#e5eeff',
  surfaceVariant: '#d3e4fe',
  surface: '#f8f9ff',
  secondary: '#006a61',
  googleBtnBg: '#e5eeff',
  facebookBtnBg: '#1877F2',
};

const LoginScreen = ({ navigation }: any) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (isForgotPassword && !email) {
      Alert.alert('Error', 'Please enter your email to reset password.');
      return;
    }
    
    if (!isForgotPassword && (!email || !password)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isForgotPassword && password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isForgotPassword) {
        const response = await api.post('/auth/forgot-password', { email });
        
        if (response.data.debug_token) {
          Alert.alert(
            'Reset Link Sent', 
            `Your debug token is: ${response.data.debug_token}\n\nUse this to test the reset password flow.`,
            [{ text: 'OK', onPress: () => navigation.navigate('ResetPassword') }]
          );
        } else {
          Alert.alert('Reset Link Sent', response.data.message);
        }
        
        setIsForgotPassword(false);
        return;
      }


      
      const response = await api.post('/auth/login', { email, password });
      await login(response.data);
    } catch (error: any) {
      Alert.alert('Authentication Failed', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD UI ---
  if (isForgotPassword) {
    return (
      <View style={styles.fpContainer}>
        <SafeAreaView style={styles.fpHeaderSafe}>
          <View style={styles.fpHeader}>
            <TouchableOpacity onPress={() => setIsForgotPassword(false)} style={styles.fpIconBtn}>
              <MaterialIcons name="arrow-back" size={24} color={localColors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={styles.fpHeaderTitle}>RideO</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.fpScrollInner} showsVerticalScrollIndicator={false}>
            <View style={styles.fpTitleSection}>
              <Text style={styles.fpTitle}>Reset Password</Text>
              <Text style={styles.fpSubtitle}>
                Enter your email or phone number and we'll send you a link to reset your password.
              </Text>
            </View>

            <View style={styles.fpForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.fpLabel}>EMAIL OR PHONE</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="mail" size={20} color={localColors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.fpInput}
                    placeholder="name@example.com"
                    placeholderTextColor={localColors.outline}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.fpSubmitBtn} 
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.fpSubmitBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.fpBackBtn} onPress={() => setIsForgotPassword(false)}>
              <MaterialIcons name="arrow-back" size={20} color={localColors.secondary} />
              <Text style={styles.fpBackBtnText}>Back to Login</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // --- STANDARD LOGIN / REGISTER UI ---
  return (
    <KeyboardAvoidingView 
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RideO</Text>
          <Text style={styles.subtitle}>
            Your reliable ride, anytime.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          


          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone or Email</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="person" size={20} color={localColors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone or email"
                placeholderTextColor={localColors.outline}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock" size={20} color={localColors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={localColors.outline}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.forgotPassBtn}
              onPress={() => setIsForgotPassword(true)}
            >
              <Text style={styles.forgotPassText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>



          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                Login
              </Text>
            )}
          </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Logins */}
              <View style={styles.socialGroup}>
                <TouchableOpacity style={styles.googleBtn}>
                  <Text style={styles.googleBtnText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.facebookBtn}>
                  <Text style={styles.facebookBtnText}>Facebook</Text>
                </TouchableOpacity>
              </View>

        </View>

        {/* Footer Toggle */}
        <TouchableOpacity 
          style={styles.footerToggle} 
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.footerText}>
            Don't have an account? 
            <Text style={styles.footerActionText}> Sign Up</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: localColors.primary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: localColors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
    marginBottom: 4,
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
  input: {
    backgroundColor: localColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 16,
    color: localColors.onSurface,
    minHeight: 48,
  },
  forgotPassBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotPassText: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.primary,
  },
  submitBtn: {
    backgroundColor: localColors.primary,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: localColors.outlineVariant,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
  },
  socialGroup: {
    gap: 8,
  },
  googleBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: localColors.googleBtnBg,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    paddingVertical: 12,
  },
  googleBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
    marginLeft: 8,
  },
  facebookBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: localColors.facebookBtnBg,
    borderRadius: 8,
    paddingVertical: 12,
  },
  facebookBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  footerToggle: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
  },
  footerActionText: {
    color: localColors.primary,
    fontWeight: '600',
  },

  // --- FORGOT PASSWORD STYLES ---
  fpContainer: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  fpHeaderSafe: {
    backgroundColor: localColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.2)',
    zIndex: 50,
  },
  fpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  fpIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  fpHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: localColors.primary,
    letterSpacing: -0.5,
  },
  fpScrollInner: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 32,
  },
  fpTitleSection: {
    marginBottom: 32,
  },
  fpTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: localColors.onSurface,
    marginBottom: 8,
  },
  fpSubtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    lineHeight: 24,
  },
  fpForm: {
    flex: 1,
  },
  fpLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurface,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  fpInput: {
    backgroundColor: localColors.surface,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    paddingVertical: 14,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 16,
    color: localColors.onSurface,
  },
  fpSubmitBtn: {
    backgroundColor: localColors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto', // pushes to bottom if space is available
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  fpSubmitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  fpBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  fpBackBtnText: {
    fontSize: 16,
    color: localColors.secondary,
    fontWeight: '500',
  }
});

export default LoginScreen;

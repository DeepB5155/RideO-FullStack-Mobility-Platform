import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ImageBackground, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';

const localColors = {
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#131b2e',
  secondary: '#006a61',
  secondaryContainer: '#86f2e4',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHighest: '#d3e4fe',
  onBackground: '#0b1c30',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  outline: '#76777d',
};

const PaymentScreen = ({ route, navigation }: any) => {
  // Add fallback values in case route.params is missing
  const bookingId = route?.params?.bookingId || 'mock-id';
  const amount = Number(route?.params?.amount || 23.00);
  
  const [transactionId, setTransactionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Calculate mock breakdown based on total amount
  const baseFare = (amount * 0.55).toFixed(2);
  const distanceFare = (amount * 0.35).toFixed(2);
  const taxes = (amount * 0.10).toFixed(2);

  const handlePayment = async () => {
    setFeedback({ type: null, message: '' });
    
    if (!transactionId || transactionId.length < 8) {
      setFeedback({ type: 'error', message: 'Invalid UPI Transaction ID. Please check and try again.' });
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.post(`/booking/${bookingId}/pay`, {
        transactionId
      });
      
      setFeedback({ type: 'success', message: 'Payment verified successfully. Receipt sent to your email.' });
      setTimeout(() => {
        navigation.goBack(); // or navigate to Home
      }, 2000);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.response?.data || 'Payment verification failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Background Layer */}
      <ImageBackground 
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkRT2dQNW9UzLgvW-hYreENgv8BBjvDLvovpaEmjRalkBkY8BhTtiYfKxIxud241iXuCXqF4ThExfRpygCyYdO0iihafNwICev4GdR9aFw1whF2QxCX2p2axNSjXoJhdGriEVmZaRZ0yMKbAeo-GcDaDpcXrSLfotr7wfJxiX7JUMAWZVc2u6O1QWzyQUuWS1AyTFuB8Zv1rU0458KeqNDhnI50527Vzo73CQifVcmnTsNQ-2MrznDKlOb8nVYrf-HBBw11WYR9t2-' }} 
        style={styles.mapBg} 
        resizeMode="cover" 
      />
      
      <View style={styles.overlay} />

      {/* Top Header */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <MaterialIcons name="arrow-back" size={24} color={localColors.primary} />
            </TouchableOpacity>
            <Text style={styles.logoText}>RideO</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDm_XWHDOOHU20ImYewXcVw6p7s1yeTv-1uVyDU2Ib2q6gFbze9roLpGlgiMu3gKOoBta_bQ-jm2Y_QJm-9isy4cMLKn_Yvia-viGvZeUHhtS_LSuAnk0GidXuaKO5fHpaZZZczmcI9ias9GQ_rktzow2m1twOKQ_SecvOK5K_PQIU_6ude4CCvBlNLYPhn1XOOhm-bp1ld2PmIEP3gseSO-NB_0gwBJJnwHa95En7UaG_38Dv5nzEQ5FKVRDpXV0N6NsIrLHSk39Mi' }} 
              style={styles.avatar} 
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />
        
        <View style={styles.sheetHeader}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="payments" size={32} color={localColors.onSurface} />
          </View>
          <Text style={styles.title}>Payment Due</Text>
          <Text style={styles.subtitle}>Your ride with Driver Dave has ended.</Text>
        </View>

        {/* Fare Summary Card */}
        <View style={styles.fareCard}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>${baseFare}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Distance</Text>
            <Text style={styles.fareValue}>${distanceFare}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Taxes & Fees</Text>
            <Text style={styles.fareValue}>${taxes}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.fareRowTotal}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Input Area */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Verify UPI Transaction ID</Text>
          <View style={[styles.inputWrapper, feedback.type === 'error' && styles.inputError]}>
            <MaterialIcons name="verified-user" size={20} color={localColors.outline} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter 12-digit UPI Ref ID"
              placeholderTextColor={localColors.outlineVariant}
              value={transactionId}
              onChangeText={setTransactionId}
              keyboardType="number-pad"
              editable={feedback.type !== 'success'}
            />
          </View>
          <Text style={styles.helperText}>
            Please complete the payment in your UPI app and enter the reference number above to confirm.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.btnConfirm, feedback.type === 'success' && styles.btnSuccess]} 
            onPress={handlePayment} 
            disabled={isLoading || feedback.type === 'success'}
          >
            {isLoading ? (
              <ActivityIndicator color={localColors.onPrimary} />
            ) : (
              <>
                <MaterialIcons name={feedback.type === 'success' ? 'done-all' : 'check-circle'} size={20} color={feedback.type === 'success' ? localColors.primary : localColors.onPrimary} />
                <Text style={[styles.btnConfirmText, feedback.type === 'success' && styles.btnSuccessText]}>
                  {feedback.type === 'success' ? 'Verified' : 'Confirm Payment'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnReport}>
            <Text style={styles.btnReportText}>Report Issue</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback Message */}
        {feedback.type && (
          <View style={[styles.feedbackBox, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
            <MaterialIcons 
              name={feedback.type === 'success' ? 'check-circle' : 'error'} 
              size={18} 
              color={feedback.type === 'success' ? localColors.secondary : localColors.error} 
            />
            <Text style={[styles.feedbackText, feedback.type === 'success' ? styles.feedbackTextSuccess : styles.feedbackTextError]}>
              {feedback.message}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.background,
    justifyContent: 'flex-end',
  },
  mapBg: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248, 249, 255, 0.8)',
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
    marginLeft: -4,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: localColors.primary,
    letterSpacing: -0.5,
  },
  profileBtn: {
    padding: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
  },
  bottomSheet: {
    backgroundColor: localColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  dragHandle: {
    width: 48,
    height: 6,
    backgroundColor: localColors.outlineVariant,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: localColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
  },
  fareCard: {
    backgroundColor: localColors.surfaceContainer,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    marginBottom: 24,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fareLabel: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
  },
  fareValue: {
    fontSize: 14,
    fontWeight: '500',
    color: localColors.onSurface,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(198, 198, 205, 0.5)',
    marginVertical: 4,
    marginBottom: 12,
  },
  fareRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.primary,
    fontFamily: 'monospace',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surface,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: localColors.error,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: localColors.onSurface,
    fontFamily: 'monospace',
  },
  helperText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 16,
  },
  actions: {
    gap: 16,
  },
  btnConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: localColors.primary,
    paddingVertical: 16,
    borderRadius: 32,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  btnSuccess: {
    backgroundColor: localColors.secondaryContainer,
  },
  btnConfirmText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onPrimary,
  },
  btnSuccessText: {
    color: localColors.primary,
  },
  btnReport: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: localColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.3)',
    paddingVertical: 16,
    borderRadius: 32,
  },
  btnReportText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.error,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  feedbackSuccess: {
    backgroundColor: localColors.secondaryContainer,
  },
  feedbackError: {
    backgroundColor: localColors.errorContainer,
  },
  feedbackText: {
    fontSize: 14,
    flex: 1,
  },
  feedbackTextSuccess: {
    color: '#005049',
  },
  feedbackTextError: {
    color: '#93000a',
  },
});

export default PaymentScreen;

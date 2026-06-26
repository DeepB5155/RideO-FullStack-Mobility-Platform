import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';

const PaymentScreen = ({ route, navigation }: any) => {
  const { bookingId, amount } = route.params;
  const [transactionId, setTransactionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    if (!transactionId || transactionId.length < 8) {
      Alert.alert('Error', 'Please enter a valid UPI Transaction ID (min 8 characters).');
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.post(`/booking/${bookingId}/pay`, {
        transactionId
      });
      
      Alert.alert('Success', 'Payment verified successfully!');
      navigation.goBack(); // or navigate to MyRides
    } catch (error: any) {
      Alert.alert('Payment Failed', error.response?.data || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Total Fare</Text>
          <Text style={styles.amount}>₹{amount}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.subtitle}>Pay via UPI</Text>
          <Text style={styles.instruction}>
            Please scan the driver's QR code or transfer the amount to their UPI ID, then enter the Transaction ID below to confirm.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 123456789012"
            placeholderTextColor={theme.colors.text.muted}
            value={transactionId}
            onChangeText={setTransactionId}
            keyboardType="number-pad"
          />

          <TouchableOpacity style={styles.payBtn} onPress={handlePayment} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={theme.colors.text.light} />
            ) : (
              <Text style={styles.payBtnText}>Verify Payment</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  backBtn: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text.main,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    ...theme.shadows.large,
  },
  title: {
    fontSize: 16,
    color: theme.colors.text.muted,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amount: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.text.main,
    marginBottom: theme.spacing.lg,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.main,
    marginBottom: theme.spacing.sm,
  },
  instruction: {
    fontSize: 14,
    color: theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  input: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    fontSize: 16,
    color: theme.colors.text.main,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    fontWeight: '600',
  },
  payBtn: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  payBtnText: {
    color: theme.colors.text.light,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  }
});

export default PaymentScreen;

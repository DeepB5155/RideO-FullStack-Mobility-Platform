import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform, KeyboardAvoidingView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../api/axios';

const localColors = {
  background: '#f8f9ff',
  surface: '#f8f9ff',
  primary: '#000000',
  primaryContainer: '#131b2e',
  onPrimaryContainer: '#ffffff', // Modified to contrast well
  onPrimary: '#ffffff',
  secondary: '#006a61',
  secondaryContainer: '#86f2e4',
  onSecondaryContainer: '#006f66',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHigh: '#dce9ff',
  error: '#ba1a1a',
  onBackground: '#0b1c30'
};

const WithdrawScreen = ({ navigation }: any) => {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('500.00');
  const [selectedBank, setSelectedBank] = useState('chase');
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const fee = 2.50; // Constant fee as per mockup

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      const balanceRes = await api.get('/wallet/balance');
      setBalance(balanceRes.data.balance || 1245.50); // Mock fallback for UI testing
    } catch (err) {
      console.error('Error fetching wallet:', err);
      // Fallback for UI if API fails
      setBalance(1245.50); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleMax = () => {
    setAmount(balance.toFixed(2));
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to withdraw.');
      return;
    }
    if (withdrawAmount > balance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance.');
      return;
    }

    try {
      setIsWithdrawing(true);
      // Sending generic bank info based on selection for now
      const res = await api.post('/wallet/withdraw', { 
        amount: withdrawAmount, 
        bankAccountInfo: selectedBank === 'chase' ? 'Chase Checking **** 3924' : 'Bank of America **** 8112' 
      });
      Alert.alert('Success', res.data.message || 'Withdrawal initiated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to process withdrawal.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const isAmountError = parsedAmount > balance;
  const totalToReceive = Math.max(0, parsedAmount - fee);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={localColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={localColors.surface} />
      
      {/* Top AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={localColors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Withdraw</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Available Balance */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
            <Text style={styles.balanceValue}>${balance.toFixed(2)}</Text>
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount to withdraw</Text>
            <View style={[styles.inputWrapper, isAmountError && styles.inputError]}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[styles.input, isAmountError && styles.textError]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={localColors.outlineVariant}
              />
              <TouchableOpacity style={styles.maxBtn} onPress={handleMax}>
                <Text style={styles.maxBtnText}>MAX</Text>
              </TouchableOpacity>
            </View>
            {isAmountError && (
              <Text style={styles.errorMsg}>Amount exceeds available balance.</Text>
            )}
          </View>

          {/* Linked Bank Account Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Transfer to</Text>
            
            {/* Bank 1 */}
            <TouchableOpacity 
              style={[styles.bankCard, selectedBank === 'chase' && styles.bankCardSelected]} 
              onPress={() => setSelectedBank('chase')}
              activeOpacity={0.8}
            >
              <View style={styles.bankLeft}>
                <View style={[styles.bankIconWrap, selectedBank === 'chase' && styles.bankIconWrapSelected]}>
                  <MaterialIcons name="account-balance" size={24} color={selectedBank === 'chase' ? localColors.onPrimary : localColors.onSurfaceVariant} />
                </View>
                <View>
                  <Text style={styles.bankName}>Chase Checking</Text>
                  <Text style={styles.bankNumber}>**** 3924</Text>
                </View>
              </View>
              <View style={[styles.radioOutline, selectedBank === 'chase' && styles.radioOutlineSelected]}>
                {selectedBank === 'chase' && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>

            {/* Bank 2 */}
            <TouchableOpacity 
              style={[styles.bankCard, selectedBank === 'bofa' && styles.bankCardSelected, { opacity: selectedBank === 'bofa' ? 1 : 0.75 }]} 
              onPress={() => setSelectedBank('bofa')}
              activeOpacity={0.8}
            >
              <View style={styles.bankLeft}>
                <View style={[styles.bankIconWrap, selectedBank === 'bofa' && styles.bankIconWrapSelected]}>
                  <MaterialIcons name="account-balance" size={24} color={selectedBank === 'bofa' ? localColors.onPrimary : localColors.onSurfaceVariant} />
                </View>
                <View>
                  <Text style={styles.bankName}>Bank of America</Text>
                  <Text style={styles.bankNumber}>**** 8112</Text>
                </View>
              </View>
              <View style={[styles.radioOutline, selectedBank === 'bofa' && styles.radioOutlineSelected]}>
                {selectedBank === 'bofa' && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkNewBtn}>
              <MaterialIcons name="add" size={18} color={localColors.secondary} />
              <Text style={styles.linkNewText}>LINK NEW ACCOUNT</Text>
            </TouchableOpacity>
          </View>

          {/* Transaction Details */}
          <View style={styles.txDetailsCard}>
            <View style={styles.txRow}>
              <Text style={styles.txLabel}>Withdrawal Amount</Text>
              <Text style={styles.txValue}>${parsedAmount.toFixed(2)}</Text>
            </View>
            <View style={[styles.txRow, styles.txRowBorder]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.txLabel}>Instant Transfer Fee</Text>
                <MaterialIcons name="info-outline" size={16} color={localColors.outline} style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.txValue}>-${fee.toFixed(2)}</Text>
            </View>
            <View style={styles.txRow}>
              <Text style={styles.txTotalLabel}>Total to receive</Text>
              <Text style={styles.txTotalValue}>${totalToReceive.toFixed(2)}</Text>
            </View>
            
            <View style={styles.etaBox}>
              <MaterialIcons name="schedule" size={20} color={localColors.secondary} />
              <Text style={styles.etaText}>
                Estimated arrival: <Text style={{ color: localColors.onSurface, fontWeight: '600' }}>Instantly</Text> (or typically within 24-48 hours depending on bank).
              </Text>
            </View>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Primary Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.withdrawActionBtn} 
          onPress={handleWithdraw}
          disabled={isAmountError || isWithdrawing}
        >
          {isWithdrawing ? (
            <ActivityIndicator color={localColors.onPrimary} />
          ) : (
            <Text style={styles.withdrawActionBtnText}>Withdraw Funds</Text>
          )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: localColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.2)',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.primary,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  balanceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '700',
    color: localColors.primary,
    letterSpacing: -1,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 12,
    backgroundColor: localColors.surface,
    height: 60,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: localColors.error,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: localColors.primary,
    fontFamily: 'JetBrains Mono',
    height: '100%',
  },
  textError: {
    color: localColors.error,
  },
  maxBtn: {
    backgroundColor: 'rgba(134, 242, 228, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  maxBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: localColors.secondary,
    fontFamily: 'JetBrains Mono',
  },
  errorMsg: {
    fontSize: 14,
    color: localColors.error,
    marginTop: 6,
    marginLeft: 4,
  },
  bankCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    backgroundColor: localColors.surface,
    marginBottom: 12,
  },
  bankCardSelected: {
    borderColor: localColors.primary,
  },
  bankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: localColors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bankIconWrapSelected: {
    backgroundColor: localColors.primary,
  },
  bankName: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  bankNumber: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
  },
  radioOutline: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: localColors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOutlineSelected: {
    borderColor: localColors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: localColors.primary,
  },
  linkNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  linkNewText: {
    fontSize: 12,
    fontWeight: '600',
    color: localColors.secondary,
    fontFamily: 'JetBrains Mono',
    marginLeft: 8,
  },
  txDetailsCard: {
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: localColors.outlineVariant,
    paddingBottom: 16,
    marginBottom: 4,
  },
  txLabel: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
  },
  txValue: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.onSurface,
    fontFamily: 'JetBrains Mono',
  },
  txTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  txTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: localColors.primary,
    fontFamily: 'JetBrains Mono',
  },
  etaBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(134, 242, 228, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  etaText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: Platform.OS === 'ios' ? 32 : 24,
    backgroundColor: localColors.background,
  },
  withdrawActionBtn: {
    backgroundColor: localColors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  withdrawActionBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.onPrimary,
  }
});

export default WithdrawScreen;

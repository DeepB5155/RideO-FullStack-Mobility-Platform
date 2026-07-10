import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme/theme';

const localColors = {
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#131b2e',
  secondary: '#006a61',
  secondaryContainer: '#86f2e4',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  onBackground: '#0b1c30',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
};

const WalletScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'withdraw'>('add');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const balanceRes = await api.get('/wallet/balance');
      setBalance(balanceRes.data.balance);

      const txRes = await api.get('/wallet/transactions');
      setTransactions(txRes.data);
    } catch (err) {
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type: 'add' | 'withdraw', defaultAmount: string = '') => {
    setModalType(type);
    setAmount(defaultAmount);
    setModalVisible(true);
  };

  const handleTransaction = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setProcessing(true);
      if (modalType === 'add') {
        await api.post('/wallet/add-funds', { amount: numAmount, upiId: 'custom@upi' });
        Alert.alert('Success', `Successfully added ₹${numAmount} to your wallet.`);
      } else {
        await api.post('/wallet/withdraw', { amount: numAmount });
        Alert.alert('Success', `Successfully withdrew ₹${numAmount} from your wallet.`);
      }
      setModalVisible(false);
      setAmount('');
      fetchWalletData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || `Failed to ${modalType} funds.`);
    } finally {
      setProcessing(false);
    }
  };

  const renderTransaction = ({ item }: any) => {
    const isPositive = item.amount > 0;
    
    // Determine icon and colors based on transaction type
    let iconName = 'payments';
    let iconColor = localColors.primary;
    let iconBg = 'rgba(0, 0, 0, 0.1)';
    let title = item.type || 'Transaction';

    if (item.type?.toLowerCase().includes('ride') || !isPositive) {
      iconName = 'directions_car';
      iconColor = localColors.secondary;
      iconBg = 'rgba(134, 242, 228, 0.2)'; // secondaryContainer/20
    } else if (item.type?.toLowerCase().includes('add') || isPositive) {
      iconName = 'account_balance_wallet';
      iconColor = localColors.primary;
      iconBg = 'rgba(19, 27, 46, 0.1)'; // primaryContainer/10
    }

    return (
      <View style={styles.txRow}>
        <View style={styles.txLeft}>
          <View style={[styles.txIconContainer, { backgroundColor: iconBg }]}>
            <MaterialIcons name={iconName} size={20} color={iconColor} />
          </View>
          <View>
            <Text style={styles.txTitle}>{title}</Text>
            <Text style={styles.txDate}>
              {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Text>
          </View>
        </View>
        <Text style={[styles.txAmount, isPositive ? styles.txAmountPositive : styles.txAmountNegative]}>
          {isPositive ? '+' : '-'}₹{Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={localColors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          <Text style={styles.pageTitle}>Wallet</Text>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.balanceAmount}>{balance.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => handleOpenModal('add')}>
                <Text style={styles.btnPrimaryText}>Add Funds</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOutline} onPress={() => handleOpenModal('withdraw')}>
                <Text style={styles.btnOutlineText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Add Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Add</Text>
            <View style={styles.quickAddGrid}>
              <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleOpenModal('add', '20')}>
                <Text style={styles.quickAddText}>₹20</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleOpenModal('add', '50')}>
                <Text style={styles.quickAddText}>₹50</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleOpenModal('add', '100')}>
                <Text style={styles.quickAddText}>₹100</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.labelSmall}>Payment Method</Text>
            <TouchableOpacity style={styles.paymentMethodBtn} onPress={() => navigation.navigate('PaymentMethods')}>
              <View style={styles.paymentMethodLeft}>
                <MaterialIcons name="account-balance" size={20} color={localColors.primary} />
                <Text style={styles.paymentMethodText}>UPI (Google Pay)</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={localColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.txHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.txListContainer}>
              {transactions.length > 0 ? (
                transactions.map((item: any, index: number) => (
                  <View key={item.id}>
                    {renderTransaction({ item })}
                    {index < transactions.length - 1 && <View style={styles.divider} />}
                  </View>
                ))
              ) : (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <MaterialIcons name="receipt-long" size={48} color={localColors.outlineVariant} />
                  <Text style={{ marginTop: 16, fontSize: 16, color: localColors.onSurfaceVariant, fontWeight: '500' }}>No transactions yet</Text>
                </View>
              )}
            </View>
          </View>

        </ScrollView>
      )}

      {/* Transaction Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modalType === 'add' ? 'Add Funds' : 'Withdraw Funds'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={localColors.onSurface} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Enter Amount (₹)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={localColors.outlineVariant}
                autoFocus
              />

              <TouchableOpacity 
                style={[styles.modalSubmitBtn, processing && { opacity: 0.7 }]} 
                onPress={handleTransaction}
                disabled={processing}
              >
                {processing ? <ActivityIndicator color={localColors.surface} /> : <Text style={styles.modalSubmitText}>{modalType === 'add' ? 'Proceed to Pay' : 'Confirm Withdrawal'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSafe: {
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
    fontSize: 28,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: localColors.onBackground,
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: localColors.primaryContainer,
    borderRadius: 16,
    padding: 24,
    minHeight: 200,
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onPrimary,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: localColors.onPrimary,
    letterSpacing: -1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: localColors.onPrimary,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: localColors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  btnOutline: {
    flex: 1,
    backgroundColor: localColors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    color: localColors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onBackground,
    marginBottom: 16,
  },
  quickAddGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  quickAddBtn: {
    flex: 1,
    backgroundColor: localColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  quickAddText: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
    marginBottom: 8,
  },
  paymentMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: localColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    padding: 16,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  paymentMethodText: {
    fontSize: 16,
    color: localColors.onSurface,
  },
  txHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.primary,
  },
  txListContainer: {
    backgroundColor: localColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 16,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  txDate: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 20,
    fontWeight: '600',
  },
  txAmountPositive: {
    color: localColors.secondary,
  },
  txAmountNegative: {
    color: localColors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: localColors.outlineVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: localColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: localColors.onSurface,
  },
  modalLabel: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: localColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: localColors.onSurface,
    padding: 16,
    marginBottom: 24,
  },
  modalSubmitBtn: {
    backgroundColor: localColors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: localColors.surface,
    fontSize: 16,
    fontWeight: '600',
  }
});

export default WalletScreen;

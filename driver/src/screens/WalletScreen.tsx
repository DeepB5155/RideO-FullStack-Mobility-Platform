import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';
import api from '../api/axios';

const WalletScreen = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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
      Alert.alert('Error', 'Could not load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (Number(amount) > balance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance.');
      return;
    }
    if (!bankInfo) {
      Alert.alert('Bank Info Required', 'Please enter your bank account or UPI details.');
      return;
    }

    try {
      setIsWithdrawing(true);
      const res = await api.post('/wallet/withdraw', { amount: Number(amount), bankAccountInfo: bankInfo });
      Alert.alert('Success', res.data.message);
      setAmount('');
      setBankInfo('');
      fetchWalletData(); // Refresh
    } catch (err) {
      Alert.alert('Error', 'Failed to process withdrawal.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const renderTransaction = ({ item }) => {
    const isPositive = item.amount > 0;
    return (
      <View style={styles.txCard}>
        <View style={styles.txLeft}>
          <View style={[styles.txIconContainer, { backgroundColor: isPositive ? '#E8F5E9' : '#FFEBEE' }]}>
            <Icon name={isPositive ? 'arrow-down' : 'arrow-up'} size={20} color={isPositive ? theme.colors.success : theme.colors.danger} />
          </View>
          <View>
            <Text style={styles.txType}>{item.type}</Text>
            <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
          </View>
        </View>
        <Text style={[styles.txAmount, { color: isPositive ? theme.colors.success : theme.colors.danger }]}>
          {isPositive ? '+' : '-'}₹{Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Earnings & Wallet</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
      </View>

      <View style={styles.withdrawContainer}>
        <Text style={styles.sectionTitle}>Withdraw Funds</Text>
        <TextInput
          style={styles.input}
          placeholder="Amount (₹)"
          placeholderTextColor={theme.colors.text.muted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Bank Account / UPI"
          placeholderTextColor={theme.colors.text.muted}
          value={bankInfo}
          onChangeText={setBankInfo}
        />
        <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw} disabled={isWithdrawing}>
          {isWithdrawing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.withdrawBtnText}>Request Withdrawal</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitleList}>Recent Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: theme.spacing.lg, paddingTop: 60, backgroundColor: theme.colors.surface, ...theme.shadows.small },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text.main },
  balanceCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.success, // Use green for earnings
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: theme.spacing.sm },
  balanceAmount: { color: '#FFF', fontSize: 36, fontWeight: 'bold' },
  withdrawContainer: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    ...theme.shadows.small,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text.main, marginBottom: theme.spacing.md },
  sectionTitleList: { fontSize: 16, fontWeight: '600', color: theme.colors.text.main, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.text.main,
  },
  withdrawBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.full,
    alignItems: 'center',
  },
  withdrawBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center' },
  txIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  txType: { fontSize: 15, fontWeight: '600', color: theme.colors.text.main },
  txDate: { fontSize: 12, color: theme.colors.text.muted, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: theme.colors.text.muted, marginTop: theme.spacing.xl }
});

export default WalletScreen;

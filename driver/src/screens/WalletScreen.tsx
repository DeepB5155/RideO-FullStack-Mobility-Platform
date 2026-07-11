import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';
import api from '../api/axios';

const WalletScreen = ({ navigation }: any) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // handleWithdraw moved to WithdrawScreen
  const renderTransaction = ({ item }) => {
    const isPositive = item.amount > 0;
    return (
      <View style={styles.txCard}>
        <View style={styles.txLeft}>
          <View style={[styles.txIconContainer, { backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
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
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
      </View>

      <View style={styles.withdrawContainer}>
        <TouchableOpacity style={styles.withdrawBtn} onPress={() => navigation.navigate('Withdraw')}>
          <Text style={styles.withdrawBtnText}>Withdraw Funds to Bank</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.lg, paddingTop: 60, backgroundColor: theme.colors.background, ...theme.shadows.small },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text.main },
  balanceCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    ...theme.shadows.large,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: theme.spacing.sm, fontWeight: '600' },
  balanceAmount: { color: theme.colors.text.main, fontSize: 36, fontWeight: '900' },
  withdrawContainer: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    ...theme.shadows.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text.main, marginBottom: theme.spacing.md },
  sectionTitleList: { fontSize: 16, fontWeight: '700', color: theme.colors.text.main, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.text.main,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  withdrawBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  withdrawBtnText: { color: theme.colors.text.main, fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center' },
  txIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  txType: { fontSize: 15, fontWeight: '700', color: theme.colors.text.main },
  txDate: { fontSize: 12, color: theme.colors.text.muted, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '800' },
  emptyText: { textAlign: 'center', color: theme.colors.text.muted, marginTop: theme.spacing.xl }
});

export default WalletScreen;

import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image, SafeAreaView, ScrollView } from 'react-native';
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

  const handleQuickAdd = async (amount: number) => {
    try {
      const res = await api.post('/wallet/add-funds', { amount: amount, upiId: 'quick@upi' });
      Alert.alert('Success', `Successfully added ₹${amount} to your wallet.`);
      fetchWalletData(); // Refresh
    } catch (err) {
      Alert.alert('Error', 'Failed to add funds.');
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

  // Mock Data Fallback
  const displayTransactions = transactions.length > 0 ? transactions : [
    { id: '1', type: 'Ride to Airport', amount: -24.50, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', type: 'Added Funds', amount: 50.00, createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', type: 'Ride to Downtown', amount: -12.00, createdAt: new Date(Date.now() - 172800000).toISOString() }
  ];
  
  const displayBalance = balance > 0 || transactions.length > 0 ? balance : 124.50;

  return (
    <View style={styles.container}>
      {/* Header */}
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
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_0okcLb4rbu2IWDksHWyQJYwQBDNGjKJXKdQLu2MhZUK8xpc58Mjgn-QMoKM_DapVHPRqet4uITqHqMho5Br8peoPhj6bKL08iZ_6KzGZpTwYFc8bK2fSDouJzXnbbdT2wOuT2MNWQwJTGLcDJkaDitMttlo0iXAdyO1oGbfrdm9NPi1YLuHhAeOmluoooBuLPpqZeK6t-Q-O1IItQMIAYFWwieyxUx3T8kn8QcfJdEa8Nht4RyeReV-2ahE7upDUO9wShjDZT1gw' }} 
              style={styles.avatar} 
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
                <Text style={styles.balanceAmount}>{displayBalance.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => handleQuickAdd(20)}>
                <Text style={styles.btnPrimaryText}>Add Funds</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOutline}>
                <Text style={styles.btnOutlineText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Add Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Add</Text>
            <View style={styles.quickAddGrid}>
              <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleQuickAdd(20)}>
                <Text style={styles.quickAddText}>₹20</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleQuickAdd(50)}>
                <Text style={styles.quickAddText}>₹50</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleQuickAdd(100)}>
                <Text style={styles.quickAddText}>₹100</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.labelSmall}>Payment Method</Text>
            <TouchableOpacity style={styles.paymentMethodBtn}>
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
              {displayTransactions.map((item: any, index: number) => (
                <View key={item.id}>
                  {renderTransaction({ item })}
                  {index < displayTransactions.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>

        </ScrollView>
      )}
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
  }
});

export default WalletScreen;

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const localColors = {
  background: '#f8f9ff',
  surface: '#ffffff',
  primary: '#000000',
  secondary: '#006a61',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
  error: '#ba1a1a',
  surfaceContainerLow: '#eff4ff',
};

const PaymentMethodsScreen = ({ navigation }: any) => {
  const [paymentMethods, setPaymentMethods] = useState([
    { id: '1', type: 'card', brand: 'Visa', last4: '4242', isDefault: true },
    { id: '2', type: 'card', brand: 'Mastercard', last4: '5555', isDefault: false },
    { id: '3', type: 'upi', idString: 'alex.mercer@upi', isDefault: false },
  ]);

  const handleAddPayment = () => {
    Alert.alert('Add Payment Method', 'This feature will open the payment gateway to add a new card securely.');
  };

  const handleRemove = (id: string) => {
    Alert.alert('Remove Payment Method', 'Are you sure you want to remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setPaymentMethods(prev => prev.filter(p => p.id !== id));
      }}
    ]);
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev => prev.map(p => ({
      ...p,
      isDefault: p.id === id
    })));
  };

  const renderPaymentMethod = (method: any) => {
    return (
      <View key={method.id} style={styles.methodCard}>
        <View style={styles.methodInfo}>
          <View style={styles.iconBox}>
            <MaterialIcons name={method.type === 'card' ? 'credit-card' : 'account-balance-wallet'} size={24} color={localColors.primary} />
          </View>
          <View style={styles.methodTextContainer}>
            <Text style={styles.methodTitle}>
              {method.type === 'card' ? `${method.brand} **** ${method.last4}` : method.idString}
            </Text>
            {method.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.actionRow}>
          {!method.isDefault && (
            <TouchableOpacity onPress={() => handleSetDefault(method.id)} style={styles.actionBtn}>
              <Text style={styles.actionText}>Set as default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleRemove(method.id)} style={styles.iconActionBtn}>
            <MaterialIcons name="delete-outline" size={20} color={localColors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={localColors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Payment Methods</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerSubtitle}>Manage your saved payment methods for faster checkout.</Text>
        
        <View style={styles.methodsList}>
          {paymentMethods.length > 0 ? (
            paymentMethods.map(renderPaymentMethod)
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="credit-card-off" size={48} color={localColors.outlineVariant} />
              <Text style={styles.emptyStateText}>No payment methods saved.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAddPayment}>
          <MaterialIcons name="add" size={24} color={localColors.primary} />
          <Text style={styles.addBtnText}>Add Payment Method</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: localColors.onSurface,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 24,
  },
  headerSubtitle: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    marginBottom: 24,
  },
  methodsList: {
    marginBottom: 24,
  },
  methodCard: {
    backgroundColor: localColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: localColors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.primary,
  },
  defaultBadge: {
    backgroundColor: localColors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: localColors.secondary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 198, 205, 0.2)',
    paddingTop: 12,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: localColors.secondary,
  },
  iconActionBtn: {
    padding: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: localColors.surfaceContainerLow,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.5)',
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.primary,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: localColors.outlineVariant,
  }
});

export default PaymentMethodsScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, ImageBackground, Image, SafeAreaView, ScrollView } from 'react-native';
import axiosInstance from '../api/axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const localColors = {
  background: '#f8f9ff',
  primary: '#000000',
  onPrimary: '#ffffff',
  onSurfaceVariant: '#45464d',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
  onSurface: '#0b1c30',
  surfaceContainer: '#e5eeff',
  surfaceVariant: '#d3e4fe',
  surface: '#ffffff',
  secondary: '#006a61',
  onSecondary: '#ffffff',
  onBackground: '#0b1c30',
};

const mapBgUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuAwEihdVVURAqIQe9V9OV7lDhsqNiIY3jRdQGMWSGhVjh0_WBXQg3eTMi1bYIP5U6AaEzEcBWR4q02lft_PxDEvJQvl-Yp6mQFA2dJQzjO_BpcIPC7Az09spSX-pKNasyI3qVRxU789iMZF6bsPkN2hUX8UIgy6xrIWTbvTqPALHxZ8Huv0vwwCfPT7R04xPKNW-wzeYTguugGOZVBttUa9204AyJVg1Nebbh4_hll2YPV8_bYTKfrXQ6EVklgauOkOhIXQpgw71Cmo";

const RideResultsScreen = ({ route, navigation }: any) => {
  const { pickupText, dropoffText, pickupLat, pickupLng, dropLat, dropLng, date, seats } = route.params;
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Wallet'>('Wallet');
  
  const [isSubscribeModalVisible, setSubscribeModalVisible] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<'Daily' | 'Weekly'>('Daily');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const url = `/route/search?pickupLat=${pickupLat}&pickupLng=${pickupLng}&dropLat=${dropLat}&dropLng=${dropLng}&date=${date}&seats=${seats}`;
        const res = await axiosInstance.get(url);
        setResults(res.data);
      } catch (err) {
        console.error('Search failed:', err);
        Alert.alert('Error', 'Failed to fetch rides.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleRequestSeat = async (item: any) => {
    try {
      await axiosInstance.post('/booking/request', {
        routeId: item.routeId,
        pickupLocationName: item.matchedPickup,
        dropoffLocationName: item.matchedDropoff,
        seatsBooked: seats,
        paymentMethod: paymentMethod
      });
      Alert.alert('Success', item.autoApprove ? 'Booking Confirmed!' : 'Request sent to driver.');
      navigation.navigate('My Rides'); 
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || 'Failed to request seat.');
    }
  };

  const openSubscribeModal = (item: any) => {
    setSelectedRoute(item);
    setSubscriptionPlan('Daily');
    setSubscribeModalVisible(true);
  };

  const handleSubscribeDaily = async () => {
    if (!selectedRoute) return;
    try {
      await axiosInstance.post(`/booking/subscribe`, {
        routeId: selectedRoute.routeId,
        pickupLocationName: selectedRoute.matchedPickup,
        dropoffLocationName: selectedRoute.matchedDropoff,
        seatsBooked: seats,
        paymentPlan: subscriptionPlan
      });
      Alert.alert('Success', 'You are now subscribed to this daily route!');
      setSubscribeModalVisible(false);
      navigation.navigate('SubscriptionsScreen'); 
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || 'Failed to subscribe to route.');
    }
  };

  const getVehicleImage = (type: string) => {
    switch (type) {
      case 'Hatchback': return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDg_NszC1yrHi5YKHyLce7w_kfJAdDz8xdAzk5omtedTHkUY6ce1wP34TH8-3W4wlRUOSxCzb10-iF5ayQyz6RHZmkLGHtWK8RXyuYtz7p317CQDptwm0uZcJx5FVQ6-y8tW_EZKzjbNWYwa0-d6xwsZipW83KiyvQmnmpzGzw52LYq7rl0aXdiahU-0whG4bHyqjI8A5IqBjFqAcktLHdv2PVjZwEuFVeSP86ojPQdIdi1BWkCCpd0L0w1lEUkTPulRqUxwLwX6AFO';
      case 'SUV': return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDh6tq4h4bnGm_YaqUDK8L5EBBmkCFLg6Skx0sFfBrdKu64jV00R46NOsrAzv7LkxAc_i_Oh2F9dyTBIaEdCziLNsVLMZazOz5WHOWiOd8qioNYTgOHrsGpvragztvVAkrZUzEERVzFF--KiQ3o1wRcEHnzHiM-UOzQuvG8PtkeXKLcLF5vOjfTP2XmMKANAdL-guIYSgSZcYGuUgawriGPgNv8F217aSOt2DtSM-K-LZQnKACJO2Tqbki20Au8N7YVe9nR-lRDvrWy';
      case 'MPV': return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDh6tq4h4bnGm_YaqUDK8L5EBBmkCFLg6Skx0sFfBrdKu64jV00R46NOsrAzv7LkxAc_i_Oh2F9dyTBIaEdCziLNsVLMZazOz5WHOWiOd8qioNYTgOHrsGpvragztvVAkrZUzEERVzFF--KiQ3o1wRcEHnzHiM-UOzQuvG8PtkeXKLcLF5vOjfTP2XmMKANAdL-guIYSgSZcYGuUgawriGPgNv8F217aSOt2DtSM-K-LZQnKACJO2Tqbki20Au8N7YVe9nR-lRDvrWy';
      case 'Sedan':
      default: return 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9-id9q-fJfngduI5dT2HVbOLkEShbEl4YU3jeNK3E8pRerhGwOjAX37iKhRv83_BIvsKYZrT3juDPLXmsedyoGBuuK12y7LekW1bbLOIuLpYEiFMpSwUJkWqIIlb-W1LtD8Wi2rfw9AVqr_3SWG8cA04VZsX6q7wT82l7QU8ZA1_srD-Sx9lUZfDf4J2aCtFt7yoDQpqG8fEgT1kYJigoaDcg0IuraemFKNgXkxU5N9drDXHcLJQ_9bw-Dpya5cF7R2rtbsCEP06U';
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isFirst = index === 0;
    return (
      <TouchableOpacity 
        style={[styles.rideCard, isFirst && styles.rideCardHighlighted]} 
        onPress={() => item.isRecurring ? openSubscribeModal(item) : handleRequestSeat(item)}
      >
        {isFirst && (
          <View style={styles.fastestBadge}>
            <Text style={styles.fastestBadgeText}>Fastest</Text>
          </View>
        )}
        
        <View style={styles.cardTopRow}>
          <View style={styles.carInfoLeft}>
            <Image source={{ uri: getVehicleImage(item.vehicle.vehicleType) }} style={styles.carImg} resizeMode="contain" />
            <View>
              <Text style={styles.carTitle}>RideO {item.vehicle.vehicleType}</Text>
              <Text style={styles.carSubtitle}>{new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.availableSeats} seats left</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>₹{item.pricePerSeat}</Text>
          </View>
        </View>

        <View style={styles.cardBottomRow}>
          <View style={styles.driverInfo}>
            <MaterialIcons name="person" size={16} color={isFirst ? localColors.secondary : localColors.onSurfaceVariant} />
            <Text style={styles.driverText}>{item.driver.name} • {item.driver.rating.toFixed(1)} ★</Text>
          </View>
          
          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>{item.isRecurring ? 'Subscribe' : (item.autoApprove ? 'Select' : 'Request')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Map Background Layer */}
      <ImageBackground source={{ uri: mapBgUrl }} style={styles.mapBg} resizeMode="cover" />
      
      <View style={styles.innerContainer}>
        {/* Top Header */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color={localColors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>RideO</Text>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWVQUK0SltHj54uz_CNivkxxV5zur2TM1Xbr5o0evZm5I4IsSJc5YORxot8ErWrde12zumgnFFGe6zG2A2EZYTS8oGrl8OP38Bjcz3R-YLcYd3WIMWr5Z2-5b_tD_bGMLgTF-PS_lfgq700zBaQ0EJ1SLCcZfNMSWDg4UU-N6VnUvHJGtVo99SC1qvqSQg3tj87XjSoV-MJzF9i-v3PEhR189flJ7SDNVG8xhVTwKO-YdC_uK2iMDRv86Ws6bTHuCEUjW39CF7CYeK' }} 
                style={styles.avatarImg} 
              />
            </TouchableOpacity>
          </View>

          {/* Search Header Floating */}
          <View style={styles.searchFloating}>
            <View style={styles.searchSummaryBox}>
              <View style={styles.searchSummaryLeft}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryDotBlack} />
                  <Text style={styles.summaryTextPrimary} numberOfLines={1}>{pickupText}</Text>
                </View>
                <View style={styles.summaryLine} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryDotGreen} />
                  <Text style={styles.summaryTextSecondary} numberOfLines={1}>{dropoffText}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.tuneBtn} onPress={() => navigation.goBack()}>
                <MaterialIcons name="tune" size={20} color={localColors.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
              <TouchableOpacity style={styles.filterChipActive}>
                <Text style={styles.filterChipActiveText}>Recommended</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>Fastest</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>Lowest Price</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>Eco-Friendly</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {/* Bottom Sheet UI */}
        <View style={styles.bottomSheet}>
          <View style={styles.handleBar} />
          
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Available Rides</Text>
            <Text style={styles.sheetSubtitle}>{results.length} options for {date}</Text>
          </View>

          {/* Payment Selector injected cleanly */}
          <View style={styles.paymentSelector}>
            {['Wallet', 'Cash', 'UPI'].map((method) => (
              <TouchableOpacity 
                key={method} 
                style={[styles.paymentOption, paymentMethod === method && styles.paymentOptionActive]}
                onPress={() => setPaymentMethod(method as any)}
              >
                <Text style={[styles.paymentOptionText, paymentMethod === method && styles.paymentOptionTextActive]}>
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={localColors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.routeId}
              renderItem={renderItem}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No rides found along this route for your date.</Text>
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      {/* Subscription Modal */}
      <Modal visible={isSubscribeModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Subscription</Text>
              <TouchableOpacity onPress={() => setSubscribeModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={localColors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {selectedRoute && (
              <>
                <View style={styles.summaryBox}>
                  <Text style={styles.modalSummaryText}>📍 {selectedRoute.matchedPickup} to {selectedRoute.matchedDropoff}</Text>
                  <Text style={styles.modalSummaryText}>🕐 Departs daily at {new Date(selectedRoute.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.modalSummaryText}>💺 {seats} seat(s) · ₹{selectedRoute.pricePerSeat * seats}/day</Text>
                </View>

                <Text style={styles.planTitle}>Select Payment Plan:</Text>
                
                <TouchableOpacity 
                  style={[styles.planCard, subscriptionPlan === 'Daily' && styles.planCardActive]}
                  onPress={() => setSubscriptionPlan('Daily')}
                >
                  <Text style={[styles.planCardTitle, subscriptionPlan === 'Daily' && styles.planCardTitleActive]}>Daily Auto-Pay</Text>
                  <Text style={styles.planCardDesc}>₹{selectedRoute.pricePerSeat * seats} will be auto-deducted each morning</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.planCard, subscriptionPlan === 'Weekly' && styles.planCardActive]}
                  onPress={() => setSubscriptionPlan('Weekly')}
                >
                  <Text style={[styles.planCardTitle, subscriptionPlan === 'Weekly' && styles.planCardTitleActive]}>Weekly Prepaid</Text>
                  <Text style={styles.planCardDesc}>₹{selectedRoute.pricePerSeat * seats * 7} will be deducted from your wallet now</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleSubscribeDaily}>
                  <Text style={styles.confirmBtnText}>Confirm Subscription</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mapBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%', 
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
  },
  headerIconBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: localColors.primary,
    letterSpacing: -0.5,
  },
  avatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: localColors.surfaceVariant,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  searchFloating: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchSummaryBox: {
    flexDirection: 'row',
    backgroundColor: localColors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchSummaryLeft: {
    flex: 1,
    position: 'relative',
  },
  summaryLine: {
    position: 'absolute',
    left: 4,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: localColors.outlineVariant,
    zIndex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    zIndex: 2,
  },
  summaryDotBlack: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 3,
    borderColor: localColors.primary,
    backgroundColor: localColors.surface,
    marginRight: 12,
  },
  summaryDotGreen: {
    width: 10,
    height: 10,
    backgroundColor: localColors.secondary,
    borderRadius: 2,
    marginRight: 12,
  },
  summaryTextPrimary: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
  },
  summaryTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.onBackground,
  },
  tuneBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: localColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterChipActive: {
    backgroundColor: localColors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActiveText: {
    color: localColors.onSurface,
    fontWeight: '600',
    fontSize: 14,
  },
  filterChip: {
    backgroundColor: localColors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
  },
  filterChipText: {
    color: localColors.onSurfaceVariant,
    fontWeight: '500',
    fontSize: 14,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: localColors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
  },
  handleBar: {
    width: 48,
    height: 4,
    backgroundColor: localColors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: localColors.onBackground,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    marginTop: 4,
  },
  paymentSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  paymentOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    backgroundColor: localColors.surfaceContainerLowest,
  },
  paymentOptionActive: {
    borderColor: localColors.primary,
    backgroundColor: localColors.primary + '10',
  },
  paymentOptionText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontWeight: '500',
  },
  paymentOptionTextActive: {
    color: localColors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    marginTop: 40,
  },
  rideCard: {
    backgroundColor: localColors.surface,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  rideCardHighlighted: {
    borderWidth: 2,
    borderColor: localColors.primary,
  },
  fastestBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: localColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  fastestBadgeText: {
    color: localColors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  carInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  carImg: {
    width: 64,
    height: 40,
    marginRight: 16,
  },
  carTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onBackground,
    marginBottom: 2,
  },
  carSubtitle: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.onBackground,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: localColors.outlineVariant,
    paddingTop: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverText: {
    fontSize: 12,
    color: localColors.onSurface,
    marginLeft: 6,
  },
  actionBtn: {
    backgroundColor: localColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionBtnText: {
    color: localColors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: localColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: localColors.onBackground,
  },
  summaryBox: {
    backgroundColor: localColors.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
  },
  modalSummaryText: {
    fontSize: 14,
    color: localColors.onBackground,
    marginBottom: 6,
    fontWeight: '500',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: localColors.onBackground,
  },
  planCard: {
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: localColors.surface,
  },
  planCardActive: {
    borderColor: localColors.primary,
    backgroundColor: localColors.primary + '05',
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: localColors.onBackground,
    marginBottom: 4,
  },
  planCardTitleActive: {
    color: localColors.primary,
  },
  planCardDesc: {
    fontSize: 13,
    color: localColors.onSurfaceVariant,
  },
  confirmBtn: {
    backgroundColor: localColors.primary,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBtnText: {
    color: localColors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  }
});

export default RideResultsScreen;

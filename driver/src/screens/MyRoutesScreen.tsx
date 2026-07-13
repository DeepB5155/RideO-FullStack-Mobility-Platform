import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  SafeAreaView,
  ActivityIndicator,
  Image,
  StatusBar,
  Modal,
  Platform
} from 'react-native';
import axiosInstance from '../api/axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

type RouteStatus = 'Draft' | 'Published' | 'Started' | 'Completed' | 'Cancelled';

const MyRoutesScreen = ({ navigation }: any) => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Active'>('All');
  
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [selectedRouteForCancel, setSelectedRouteForCancel] = useState<string | null>(null);
  const [cancelDate, setCancelDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/route/my-routes');
      setRoutes(res.data);
    } catch (e) {
      console.log('Failed to fetch routes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchRoutes);
    return unsubscribe;
  }, [navigation]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await axiosInstance.put(`/route/${id}/status`, `"${newStatus}"`, {
        headers: { 'Content-Type': 'application/json' },
      });
      fetchRoutes();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || 'Failed to update status');
    }
  };

  const handleCancelDay = async () => {
    if (!selectedRouteForCancel) return;
    try {
      const dateStr = cancelDate.toISOString().split('T')[0];
      await axiosInstance.post(`/route/${selectedRouteForCancel}/cancel-day`, { date: dateStr });
      Alert.alert('Success', `Ride on ${dateStr} cancelled.`);
      setCancelModalVisible(false);
      fetchRoutes();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || 'Failed to cancel specific day');
    }
  };

  const filteredRoutes = routes.filter(r => {
    if (filter === 'Active') return r.status === 'Started' || r.status === 'Published';
    return true;
  });

  const renderItem = ({ item }: { item: any }) => {
    const status: RouteStatus = item.status as RouteStatus;
    const isCompleted = status === 'Completed' || status === 'Cancelled';
    const isStarted = status === 'Started';
    const isPublished = status === 'Published';
    
    const totalSeats = item.vehicle?.totalSeats || item.totalSeats || 0;
    const seatsBooked = totalSeats - (item.availableSeats || 0);
    const isFull = seatsBooked >= totalSeats;

    // Format times
    const startTime = new Date(item.startTime);
    const timeString = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

    let containerStyle = [styles.cardContainer];
    if (isStarted) containerStyle.push(styles.cardStarted);
    if (isCompleted) containerStyle.push(styles.cardCompleted);

    return (
      <TouchableOpacity 
        style={containerStyle}
        activeOpacity={0.9}
        onPress={() => {
          if (isPublished || isStarted) {
            setSelectedRoute(item);
            setOptionsModalVisible(true);
          }
        }}
      >
        {isStarted && <View style={styles.startedBgHint} />}

        {/* ── Top Row ── */}
        <View style={styles.cardTopRow}>
          {isStarted ? (
            <View style={[styles.badge, styles.badgeStarted]}>
              <View style={styles.startedDot} />
              <Text style={styles.badgeTextStarted}>STARTED</Text>
            </View>
          ) : isCompleted ? (
            <View style={[styles.badge, styles.badgeCompleted]}>
              <Icon name="check-circle-outline" size={12} color="#3f465c" style={{ marginRight: 4 }} />
              <Text style={styles.badgeTextCompleted}>{status.toUpperCase()}</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgePublished]}>
              <Icon name="clock-outline" size={12} color="#45464d" style={{ marginRight: 4 }} />
              <Text style={styles.badgeTextPublished}>{status.toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.cardTopRight}>
            {(item.isRecurring || item.IsRecurring) && (
              <Text style={{ fontSize: 10, color: '#006a61', fontWeight: 'bold', marginBottom: 2 }}>WEEKLY TEMPLATE</Text>
            )}
            <Text style={[styles.cardDate, isCompleted && styles.textCompleted]}>{dateString}</Text>
            {isStarted ? (
              <Text style={styles.etaText}>ACTIVE NOW</Text>
            ) : (
              <Text style={[styles.cardTime, isCompleted && styles.textCompleted]}>{timeString}</Text>
            )}
          </View>
        </View>

        {/* ── Middle: Route Nodes ── */}
        <View style={styles.routeNodesContainer}>
          <View style={styles.nodeGraphics}>
            <View style={[styles.dotOpen, isStarted && { borderColor: '#006a61' }]} />
            <View style={[styles.verticalLine, isCompleted && { opacity: 0.5 }]} />
            <View style={[styles.dotClosed, isStarted && { borderColor: '#006a61', backgroundColor: '#006a61' }, isCompleted && { borderColor: '#76777d', backgroundColor: '#76777d' }]} />
          </View>
          <View style={styles.nodeTexts}>
            <Text style={[styles.nodeText, isCompleted && styles.textCompleted]} numberOfLines={1}>{item.startLocation}</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.nodeText, isCompleted && styles.textCompleted]} numberOfLines={1}>{item.endLocation}</Text>
          </View>
        </View>

        {/* ── Passenger Details ── */}
        <View style={styles.passengerBreakdown}>
           <Text style={styles.breakdownText}>Subscribers: <Text style={{fontWeight:'700', color: '#0b1c30'}}>{item.subscribersCount || 0}</Text></Text>
           <Text style={styles.breakdownText}>One-Time: <Text style={{fontWeight:'700', color: '#0b1c30'}}>{item.oneTimeBookingsCount || 0}</Text></Text>
           <Text style={styles.breakdownText}>Empty Seats: <Text style={{fontWeight:'700', color: '#0b1c30'}}>{item.availableSeats || 0}</Text></Text>
        </View>

        {/* ── Bottom Row ── */}
        <View style={[styles.cardBottomRow, isCompleted && { opacity: 0.7 }]}>
          <View style={styles.paxInfo}>
            <Icon name="account-group-outline" size={16} color="#45464d" />
            <Text style={styles.paxText}>{seatsBooked}/{totalSeats} {isFull && 'Full'}</Text>
          </View>
          <Text style={[styles.priceText, isCompleted && { textDecorationLine: 'line-through', opacity: 0.7 }]}>
            ₹{item.pricePerSeat}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
      
      {/* ── Page Title & Filters ── */}
      <View style={styles.titleSection}>
        <Text style={styles.pageTitle}>My Routes</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterPill, filter === 'All' && styles.filterPillActive]} 
            onPress={() => setFilter('All')}
          >
            <Text style={[styles.filterPillText, filter === 'All' && styles.filterPillTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterPill, filter === 'Active' && styles.filterPillActive]} 
            onPress={() => setFilter('Active')}
          >
            <Text style={[styles.filterPillText, filter === 'Active' && styles.filterPillTextActive]}>Active</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main List ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={filteredRoutes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('Create Route')}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Options Modal ── */}
      <Modal
        visible={optionsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <View style={styles.optionsModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Manage Route</Text>
            
            <TouchableOpacity 
              style={styles.optionBtn}
              onPress={() => {
                setOptionsModalVisible(false);
                navigation.navigate('Route Bookings', { routeId: selectedRoute?.id, routeItem: selectedRoute });
              }}
            >
              <Icon name="account-group" size={24} color="#0b1c30" />
              <Text style={styles.optionBtnText}>View Passengers</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionBtn}
              onPress={() => {
                setOptionsModalVisible(false);
                setSelectedRouteForCancel(selectedRoute?.id);
                setCancelDate(new Date());
                setCancelModalVisible(true);
              }}
            >
              <Icon name="calendar-remove" size={24} color="#ff4c4c" />
              <Text style={[styles.optionBtnText, { color: '#ff4c4c' }]}>Cancel Specific Day</Text>
            </TouchableOpacity>

            {(!selectedRoute?.isRecurring && !selectedRoute?.IsRecurring) && (
              <TouchableOpacity 
                style={styles.optionBtn}
                onPress={() => {
                  setOptionsModalVisible(false);
                  if (selectedRoute?.status === 'Published') {
                    const rideStart = new Date(selectedRoute.startTime);
                    const now = new Date();
                    const diffHours = (rideStart.getTime() - now.getTime()) / (1000 * 60 * 60);
                    
                    if (diffHours > 3) {
                      Alert.alert('Too Early', 'You cannot start a ride more than 3 hours before its scheduled start time.');
                      return;
                    }

                    updateStatus(selectedRoute?.id, 'Started');
                    navigation.navigate('Active Ride', { 
                      routeId: selectedRoute?.id, 
                      startLoc: selectedRoute?.startLocation, 
                      endLoc: selectedRoute?.endLocation,
                      startLat: selectedRoute?.startLat,
                      startLng: selectedRoute?.startLng,
                      endLat: selectedRoute?.endLat,
                      endLng: selectedRoute?.endLng
                    });
                  } else {
                    updateStatus(selectedRoute?.id, 'Completed');
                  }
                }}
              >
                <Icon name="play-circle-outline" size={24} color="#006a61" />
                <Text style={[styles.optionBtnText, { color: '#006a61' }]}>
                  {selectedRoute?.status === 'Published' ? 'Start Ride' : 'Complete Ride'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setOptionsModalVisible(false)}>
              <Text style={styles.modalBtnCancelText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Cancel Day Modal ── */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Specific Day</Text>
            <Text style={styles.modalSubtitle}>Subscribers will be notified and suggested alternative rides.</Text>
            
            <TouchableOpacity 
              style={styles.datePickerBtn}
              onPress={() => setShowPicker(true)}
            >
              <Icon name="calendar" size={24} color="#006a61" />
              <Text style={styles.datePickerText}>{cancelDate.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={cancelDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowPicker(Platform.OS === 'ios');
                  if (selectedDate) setCancelDate(selectedDate);
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setCancelModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleCancelDay}>
                <Text style={styles.modalBtnConfirmText}>Confirm Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  
  // Top Header
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
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  headerProfileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Title Section
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0b1c30',
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#e5eeff',
  },
  filterPillActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#45464d',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },

  // List Container
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card Styles
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    overflow: 'hidden',
  },
  cardStarted: {
    borderColor: '#86f2e4',
  },
  cardCompleted: {
    backgroundColor: '#f8f9ff',
    borderColor: 'rgba(198,198,205,0.5)',
    opacity: 0.8,
  },
  startedBgHint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#86f2e4',
    opacity: 0.1,
  },

  // Card Top Row
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePublished: { backgroundColor: '#e5eeff' },
  badgeTextPublished: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#45464d' },
  badgeStarted: { backgroundColor: '#86f2e4' },
  badgeTextStarted: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#005049' },
  badgeCompleted: { backgroundColor: '#bec6e0' },
  badgeTextCompleted: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#3f465c' },
  
  startedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006a61',
    marginRight: 6,
  },

  cardTopRight: {
    alignItems: 'flex-end',
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b1c30',
  },
  cardTime: {
    fontSize: 12,
    color: '#45464d',
    marginTop: 2,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006a61',
    marginTop: 2,
  },
  textCompleted: {
    color: '#76777d',
  },

  // Route Nodes
  routeNodesContainer: {
    flexDirection: 'row',
    height: 48,
  },
  nodeGraphics: {
    width: 24,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dotOpen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  verticalLine: {
    flex: 1,
    width: 1,
    backgroundColor: '#76777d',
    marginVertical: 2,
    borderStyle: 'dashed',
  },
  dotClosed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  nodeTexts: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  nodeText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#0b1c30',
  },
  passengerBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  breakdownText: {
    fontSize: 12,
    color: '#45464d',
  },

  // Bottom Row
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5eeff',
  },
  paxInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paxText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#45464d',
    marginLeft: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#006a61',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  optionsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3fa',
  },
  optionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b1c30',
    marginLeft: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b1c30',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#45464d',
    textAlign: 'center',
    marginBottom: 24,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#e5e7f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    width: '100%',
  },
  datePickerText: {
    fontSize: 16,
    color: '#0b1c30',
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f1f3fa',
    marginRight: 8,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: '#45464d',
    fontWeight: '600',
    fontSize: 16,
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#ff4c4c',
    marginLeft: 8,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 96, // 72 (tab bar height) + 24 (spacing)
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default MyRoutesScreen;

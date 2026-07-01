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
  StatusBar
} from 'react-native';
import axiosInstance from '../api/axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type RouteStatus = 'Draft' | 'Published' | 'Started' | 'Completed' | 'Cancelled';

const MyRoutesScreen = ({ navigation }: any) => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Active'>('All');

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

  const filteredRoutes = routes.filter(r => {
    if (filter === 'Active') return r.status === 'Started' || r.status === 'Published';
    return true;
  });

  const renderItem = ({ item }: { item: any }) => {
    const status: RouteStatus = item.status as RouteStatus;
    const isCompleted = status === 'Completed' || status === 'Cancelled';
    const isStarted = status === 'Started';
    const isPublished = status === 'Published';
    
    const seatsBooked = (item.totalSeats || 0) - (item.availableSeats || 0);
    const isFull = seatsBooked >= (item.totalSeats || 0);

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
            Alert.alert(
              'Manage Route',
              'What would you like to do?',
              [
                isPublished ? { text: 'Start Ride', onPress: () => {
                    updateStatus(item.id, 'Started');
                    navigation.navigate('Active Ride', { routeId: item.id, startLoc: item.startLocation, endLoc: item.endLocation });
                }} : { text: 'Complete Ride', onPress: () => updateStatus(item.id, 'Completed') },
                { text: 'View Passengers', onPress: () => navigation.navigate('Route Bookings', { routeId: item.id }) },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
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

        {/* ── Bottom Row ── */}
        <View style={[styles.cardBottomRow, isCompleted && { opacity: 0.7 }]}>
          <View style={styles.paxInfo}>
            <Icon name="account-group-outline" size={16} color="#45464d" />
            <Text style={styles.paxText}>{seatsBooked}/{item.totalSeats} {isFull && 'Full'}</Text>
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
      
      {/* ── Top App Bar ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.openDrawer && navigation.openDrawer()}>
          <Icon name="menu" size={24} color="#0b1c30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RideO</Text>
        <TouchableOpacity style={styles.headerProfileBtn} onPress={() => navigation.navigate('Profile')}>
          <Icon name="account-outline" size={20} color="#45464d" />
        </TouchableOpacity>
      </View>

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
    fontSize: 12,
    fontWeight: '500',
    color: '#45464d',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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

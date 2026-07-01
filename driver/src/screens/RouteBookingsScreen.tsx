import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Image } from 'react-native';
import axiosInstance from '../api/axios';
import Icon from 'react-native-vector-icons/Ionicons';

const RouteBookingsScreen = ({ route, navigation }: any) => {
  const { routeId } = route.params;
  const [bookings, setBookings] = useState<any[]>([]);

  const fetchBookings = async () => {
    try {
      const res = await axiosInstance.get(`/booking/route/${routeId}`);
      setBookings(res.data);
    } catch (e) {
      console.log('Failed to fetch route bookings', e);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateBookingStatus = async (id: string, action: string) => {
    try {
      if (action === 'Approve' || action === 'Reject') {
        await axiosInstance.put(`/booking/${id}/${action.toLowerCase()}`);
      } else {
        await axiosInstance.put(`/booking/${id}/status`, `"${action}"`, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      fetchBookings();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || `Failed to ${action} booking`);
    }
  };

  // Status mapping
  const renderStatusChip = (status: string) => {
    if (status === 'Approved' || status === 'Started') {
      return (
        <View style={[styles.chip, { backgroundColor: 'rgba(134, 242, 228, 0.3)' }]}>
          <Icon name="checkmark-circle" size={14} color="#006f66" style={{ marginRight: 4 }} />
          <Text style={[styles.chipText, { color: '#006f66' }]}>{status}</Text>
        </View>
      );
    }
    if (status === 'Pending') {
      return (
        <View style={[styles.chip, { backgroundColor: '#dce9ff' }]}>
          <Icon name="time-outline" size={14} color="#45464d" style={{ marginRight: 4 }} />
          <Text style={[styles.chipText, { color: '#45464d' }]}>Pending</Text>
        </View>
      );
    }
    return (
      <View style={[styles.chip, { backgroundColor: '#e5eeff' }]}>
        <Text style={[styles.chipText, { color: '#45464d' }]}>{status}</Text>
      </View>
    );
  };

  const totalSeatsBooked = bookings.reduce((sum, b) => sum + (b.seatsBooked || 1), 0);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.passengerCard}>
      <View style={styles.passengerHeader}>
        <View style={styles.passengerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.userName ? item.userName.substring(0, 2).toUpperCase() : '?'}</Text>
          </View>
          <View>
            <Text style={styles.passengerName}>{item.userName}</Text>
            <View style={styles.passengerBadges}>
              <View style={styles.seatsChip}>
                <Text style={styles.seatsChipText}>{item.seatsBooked || 1} Seat{item.seatsBooked > 1 ? 's' : ''}</Text>
              </View>
              {renderStatusChip(item.status)}
            </View>
          </View>
        </View>
        <View style={styles.actionIcons}>
          <TouchableOpacity 
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Chat', { bookingId: item.id, targetName: item.userName })}
          >
            <Icon name="chatbubble-outline" size={20} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Icon name="call-outline" size={20} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Keep the functional action buttons below */}
      {item.status === 'Pending' && (
        <View style={styles.functionalActionRow}>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#006a61'}]} onPress={() => updateBookingStatus(item.id, 'Approve')}>
            <Text style={styles.actionBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#ba1a1a'}]} onPress={() => updateBookingStatus(item.id, 'Reject')}>
            <Text style={styles.actionBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'Approved' && (
        <View style={styles.functionalActionRow}>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#17a2b8'}]} onPress={() => updateBookingStatus(item.id, 'Started')}>
            <Text style={styles.actionBtnText}>Picked Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#6c757d'}]} onPress={() => updateBookingStatus(item.id, 'No-show')}>
            <Text style={styles.actionBtnText}>No-Show</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'Started' && (
        <View style={styles.functionalActionRow}>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#28a745'}]} onPress={() => updateBookingStatus(item.id, 'Completed')}>
            <Text style={styles.actionBtnText}>Dropped Off</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.appTitle}>RideO</Text>
        <TouchableOpacity style={styles.profileAvatarBtn}>
          <Icon name="person" size={20} color="#0b1c30" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Route Header Card */}
            <View style={styles.routeCard}>
              <View style={styles.routeHeaderTop}>
                <View>
                  <Text style={styles.routeTitle}>Route Bookings</Text>
                  <Text style={styles.routeTime}>Active Route Details</Text>
                </View>
                <View style={styles.seatsBookedBadge}>
                  <Text style={styles.seatsBookedText}>{totalSeatsBooked} Seats Booked</Text>
                </View>
              </View>

              <View style={styles.routePathContainer}>
                <View style={styles.pathLine} />
                <View style={styles.pickupPoint}>
                  <View style={styles.pickupDot} />
                  <View style={styles.pointTextContainer}>
                    <Text style={styles.pointLabel}>Pickup</Text>
                    <Text style={styles.pointAddress}>{bookings[0]?.pickupLocationName || 'Multiple Pickups'}</Text>
                  </View>
                </View>
                <View style={styles.dropoffPoint}>
                  <View style={styles.dropoffDot} />
                  <View style={styles.pointTextContainer}>
                    <Text style={styles.pointLabel}>Dropoff</Text>
                    <Text style={styles.pointAddress}>{bookings[0]?.dropoffLocationName || 'Multiple Dropoffs'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.manifestTitle}>Passenger Manifest</Text>
          </>
        }
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No passenger requests yet.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.2)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  profileAvatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  routeCard: {
    backgroundColor: '#eff4ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    marginBottom: 24,
  },
  routeHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
  },
  routeTime: {
    fontSize: 12,
    color: '#45464d',
    marginTop: 4,
  },
  seatsBookedBadge: {
    backgroundColor: 'rgba(134, 242, 228, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#86f2e4',
  },
  seatsBookedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#006f66',
  },
  routePathContainer: {
    marginTop: 8,
    paddingLeft: 8,
    position: 'relative',
  },
  pathLine: {
    position: 'absolute',
    left: 11,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: '#c6c6cd',
  },
  pickupPoint: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
    marginTop: 6,
    marginRight: 16,
    borderWidth: 4,
    borderColor: '#eff4ff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  dropoffPoint: {
    flexDirection: 'row',
    position: 'relative',
  },
  dropoffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#006a61',
    marginTop: 6,
    marginRight: 16,
    borderWidth: 4,
    borderColor: '#eff4ff',
    shadowColor: '#006a61',
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  pointTextContainer: {
    flex: 1,
  },
  pointLabel: {
    fontSize: 12,
    color: '#45464d',
  },
  pointAddress: {
    fontSize: 16,
    color: '#0b1c30',
    fontWeight: '500',
  },
  manifestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
    marginBottom: 16,
  },
  passengerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#45464d',
  },
  passengerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
  },
  passengerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  seatsChip: {
    backgroundColor: '#e5eeff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  seatsChipText: {
    fontSize: 12,
    color: '#45464d',
    fontFamily: 'JetBrains Mono',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dce9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  functionalActionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#45464d',
    fontSize: 16,
  }
});

export default RouteBookingsScreen;

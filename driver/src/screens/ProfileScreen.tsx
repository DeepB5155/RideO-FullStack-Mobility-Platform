import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const ProfileScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const navigation = useNavigation<any>();

  const [kycStatus, setKycStatus] = React.useState<string>('Pending');
  const [earnings, setEarnings] = React.useState<number>(0);
  const [trips, setTrips] = React.useState<number>(0);
  const [vehicle, setVehicle] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          const { default: axiosInstance } = await import('../api/axios');
          const [kycRes, vehicleRes, statsRes] = await Promise.allSettled([
            axiosInstance.get('/kyc/status'),
            axiosInstance.get('/vehicle/my'),
            axiosInstance.get('/insights/driver-stats')
          ]);

          if (kycRes.status === 'fulfilled') {
            setKycStatus(kycRes.value.data.status || 'Pending');
          }
          if (vehicleRes.status === 'fulfilled') {
            setVehicle(vehicleRes.value.data);
          }
          if (statsRes.status === 'fulfilled') {
            setEarnings(statsRes.value.data.weeklyEarnings || 0);
            setTrips(statsRes.value.data.totalTripsThisMonth || 0);
          }
        } catch (e) {
          console.error('Failed to fetch profile data', e);
        } finally {
          setLoading(false);
        }
      };
      if (user) fetchData();
    }, [user])
  );

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => await logout() },
    ]);
  };

  const name = user?.fullName || 'Alex Rider';
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'AR';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.container}>
          {/* Profile Info */}
          <View style={styles.profileSection}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>{initials}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.profileName}>{name}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={{ padding: 4, marginLeft: 4 }}>
                <MaterialIcon name="edit" size={20} color="#005049" />
              </TouchableOpacity>
            </View>
            <View style={styles.pillRow}>
              <View style={styles.tierPill}>
                <Text style={styles.tierPillText}>Gold Tier</Text>
              </View>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingPillText}>4.9</Text>
                <MaterialIcon name="star" size={14} color="#006f66" style={{ marginLeft: 2 }} />
              </View>
            </View>
          </View>

          {/* KYC Status Banner */}
          <View style={[styles.kycBanner, kycStatus !== 'Verified' && { backgroundColor: '#fff3e0', borderColor: '#ffe0b2' }]}>
            <View style={styles.kycLeft}>
              <View style={[styles.kycIconWrapper, kycStatus !== 'Verified' && { backgroundColor: '#f57c00' }]}>
                <MaterialIcon name={kycStatus === 'Verified' ? 'verified-user' : 'pending-actions'} size={20} color="#ffffff" />
              </View>
              <View style={styles.kycTextCol}>
                <Text style={styles.kycTitle}>Account {kycStatus}</Text>
                <Text style={styles.kycSubtitle}>
                  {kycStatus === 'Verified' ? 'All documents are up to date.' : 'Please update your documents.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.kycDetailsBtn} onPress={() => navigation.navigate('ProfileKYC', { fromProfile: true })}>
              <Text style={[styles.kycDetailsText, kycStatus !== 'Verified' && { color: '#f57c00' }]}>Details</Text>
            </TouchableOpacity>
          </View>

          {/* Grid Quick Actions */}
          <View style={styles.grid}>
            {/* Insights */}
            <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate('Insights')} activeOpacity={0.8}>
              <View style={styles.gridCardHeader}>
                <View style={styles.iconBoxTeal}>
                  <MaterialIcon name="trending-up" size={20} color="#005049" />
                </View>
                <MaterialIcon name="arrow-forward" size={20} color="#76777d" />
              </View>
              <View>
                <Text style={styles.gridCardLabel}>TRIPS</Text>
                <Text style={styles.gridCardValue}>{trips} Completed</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Leaderboard Action */}
          <TouchableOpacity 
            style={styles.leaderboardBtn} 
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.8}
          >
            <View style={styles.leaderboardContent}>
              <View style={styles.iconBoxGold}>
                <MaterialIcon name="emoji-events" size={24} color="#b45309" />
              </View>
              <View style={styles.leaderboardTextCont}>
                <Text style={styles.leaderboardTitle}>🏆 Driver Leaderboard</Text>
                <Text style={styles.leaderboardSub}>See top drivers in your city</Text>
              </View>
            </View>
            <MaterialIcon name="arrow-forward" size={24} color="#76777d" />
          </TouchableOpacity>

          {/* Vehicle Details */}
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <View style={styles.vehicleHeaderLeft}>
                <MaterialIcon name="directions-car" size={20} color="#000000" />
                <Text style={styles.vehicleHeaderTitle}>Active Vehicle</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('EditVehicle')}>
                <Text style={styles.vehicleManageText}>{vehicle ? 'Manage' : 'Add Vehicle'}</Text>
              </TouchableOpacity>
            </View>
            {vehicle ? (
              <View style={styles.vehicleBody}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=800' }} 
                  style={styles.vehicleImage}
                />
                <Text style={styles.vehicleName}>{vehicle.make} {vehicle.model} {vehicle.year}</Text>
                <Text style={styles.vehicleSub}>{vehicle.vehicleType} • {vehicle.color}</Text>
                
                <View style={styles.vehicleInfoRow}>
                  <View style={styles.vehicleInfoBox}>
                    <Text style={styles.vehicleInfoLabel}>PLATE</Text>
                    <Text style={styles.vehicleInfoValue}>{vehicle.licensePlate}</Text>
                  </View>
                  <View style={styles.vehicleInfoBox}>
                    <Text style={styles.vehicleInfoLabel}>INSPECTION</Text>
                    <Text style={[styles.vehicleInfoValue, { color: '#006a61' }]}>Valid</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.vehicleBody}>
                <Text style={{textAlign: 'center', paddingVertical: 20, color: '#45464d'}}>No active vehicle found.</Text>
              </View>
            )}
          </View>

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Support')} activeOpacity={0.7}>
              <View style={styles.linkIconBox}>
                <MaterialIcon name="help-outline" size={20} color="#0b1c30" />
              </View>
              <View style={styles.linkTextCol}>
                <Text style={styles.linkTitle}>Help & Support</Text>
                <Text style={styles.linkSub}>FAQs, Contact us</Text>
              </View>
              <MaterialIcon name="chevron-right" size={24} color="#76777d" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
              <View style={styles.linkIconBox}>
                <MaterialIcon name="settings" size={20} color="#0b1c30" />
              </View>
              <View style={styles.linkTextCol}>
                <Text style={styles.linkTitle}>App Settings</Text>
                <Text style={styles.linkSub}>Navigation, Preferences</Text>
              </View>
              <MaterialIcon name="chevron-right" size={24} color="#76777d" />
            </TouchableOpacity>
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <MaterialIcon name="logout" size={20} color="#ba1a1a" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
  },
  headerBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#131b2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  largeAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#131b2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#e5eeff',
  },
  largeAvatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0b1c30',
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierPill: {
    backgroundColor: '#e5eeff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#45464d',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#86f2e4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  ratingPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006f66',
  },

  // KYC Banner
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e0f2f1', // Light teal tint
    borderWidth: 1,
    borderColor: '#b2dfdb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  kycLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kycIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#006a61',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycTextCol: {
    justifyContent: 'center',
  },
  kycTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b1c30',
  },
  kycSubtitle: {
    fontSize: 12,
    color: '#000000',
    marginTop: 4,
  },
  kycDetailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  kycDetailsText: {
    color: '#006a61',
    fontWeight: '600',
    fontSize: 14,
  },

  // Grid Actions
  grid: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: '#eff4ff',
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.3)',
    borderRadius: 12,
    padding: 16,
    height: 120,
    justifyContent: 'space-between',
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBoxDark: {
    backgroundColor: '#131b2e',
    padding: 8,
    borderRadius: 8,
  },
  iconBoxTeal: {
    backgroundColor: '#86f2e4',
    padding: 8,
    borderRadius: 8,
  },
  gridCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#45464d',
    letterSpacing: 1,
    marginBottom: 4,
  },
  gridCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0b1c30',
  },

  leaderboardBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  leaderboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBoxGold: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  leaderboardTextCont: {
    justifyContent: 'center',
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  leaderboardSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },

  // Vehicle Details
  vehicleCard: {
    backgroundColor: '#e5eeff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  vehicleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b1c30',
  },
  vehicleManageText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  vehicleBody: {
    padding: 16,
    paddingTop: 0,
  },
  vehicleImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 16,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0b1c30',
  },
  vehicleSub: {
    fontSize: 12,
    color: '#45464d',
    marginTop: 4,
    marginBottom: 16,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleInfoBox: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.5)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  vehicleInfoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#45464d',
    letterSpacing: 1,
    marginBottom: 4,
  },
  vehicleInfoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
    letterSpacing: 1,
  },

  // Links
  linksContainer: {
    gap: 12,
    marginBottom: 32,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.3)',
    borderRadius: 12,
    padding: 16,
  },
  linkIconBox: {
    backgroundColor: '#dce9ff',
    padding: 8,
    borderRadius: 8,
    marginRight: 16,
  },
  linkTextCol: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b1c30',
  },
  linkSub: {
    fontSize: 12,
    color: '#45464d',
    marginTop: 2,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#ba1a1a',
    borderRadius: 12,
  },
  signOutText: {
    color: '#ba1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;

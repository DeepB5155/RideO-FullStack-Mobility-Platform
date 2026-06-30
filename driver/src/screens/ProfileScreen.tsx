import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme/theme';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [displayId, setDisplayId] = React.useState(user?.id);

  React.useEffect(() => {
    const fetchDriverInfo = async () => {
      try {
        const { default: axiosInstance } = await import('../api/axios');
        const res = await axiosInstance.get('/kyc/status');
        const license = res.data.licenseNumber;
        
        if (license && user) {
           const prefix = license.substring(0, 2).toUpperCase() || 'DL';
           const namePart = user.fullName.split(' ')[0].substring(0, 4).toUpperCase();
           const licLast4 = license.length >= 4 ? license.slice(-4) : '0000';
           const phoneLast4 = user.phoneNumber && user.phoneNumber.length >= 4 ? user.phoneNumber.slice(-4) : '0000';
           
           setDisplayId(`${prefix}-${namePart}-${licLast4}-${phoneLast4}`);
        } else if (user) {
           const namePart = user.fullName.split(' ')[0].substring(0, 4).toUpperCase();
           const phoneLast4 = user.phoneNumber && user.phoneNumber.length >= 4 ? user.phoneNumber.slice(-4) : '0000';
           setDisplayId(`DRV-${namePart}-${phoneLast4}`);
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (user) {
      fetchDriverInfo();
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroBackground} />
        
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.row}>
            <View style={styles.rowLabelContainer}>
              <Text style={styles.icon}>📱</Text>
              <Text style={styles.label}>Phone Number</Text>
            </View>
            <Text style={styles.value}>{user?.phoneNumber || 'Not Set'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLabelContainer}>
              <Text style={styles.icon}>🆔</Text>
              <Text style={styles.label}>Driver ID</Text>
            </View>
            <Text style={styles.value}>{displayId}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.insightsButton} 
          onPress={() => navigation.navigate('Insights')}
        >
          <Text style={styles.insightsButtonText}>📊 View Insights & Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.editVehicleButton} 
          onPress={() => navigation.navigate('EditVehicle')}
        >
          <Text style={styles.editVehicleButtonText}>🚗 Edit Vehicle Details</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>SIGN OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  heroBackground: {
    backgroundColor: theme.colors.primary,
    height: 180,
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  profileCard: {
    marginTop: 80,
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.large,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -55, // Overlap the card edge
    borderWidth: 4,
    borderColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 36,
    color: theme.colors.text.light,
    fontWeight: '800',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text.main,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: 15,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing.md,
  },
  badgeContainer: {
    backgroundColor: theme.colors.primaryLight + '20', // 20% opacity
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  badge: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.medium,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text.main,
    marginBottom: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  rowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
  label: {
    fontSize: 15,
    color: theme.colors.text.muted,
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    color: theme.colors.text.main,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  insightsButton: {
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  insightsButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  editVehicleButton: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  editVehicleButtonText: {
    color: theme.colors.text.main,
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.danger,
  },
  logoutButtonText: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default ProfileScreen;

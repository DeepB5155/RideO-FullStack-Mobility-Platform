import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Image, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenHelper } from '../utils/tokenHelper';
import { AuthContext } from '../context/AuthContext';

const localColors = {
  background: '#f8f9ff',
  surface: '#f8f9ff',
  primary: '#000000',
  secondary: '#006a61',
  secondaryContainer: '#86f2e4',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  surfaceVariant: '#d3e4fe',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
};

const SettingsScreen = ({ navigation }: any) => {
  const { user, logout } = useContext(AuthContext);

  const handleDeleteAccount = async () => {
    Alert.alert('Delete Account', 'Are you sure you want to permanently delete your account? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await axiosInstance.delete('/auth/account');
            if (logout) {
              await logout();
            } else {
              await TokenHelper.clearTokens();
              navigation.replace('Login');
            }
          } catch (error) {
            console.error('Failed to delete account', error);
            Alert.alert('Error', 'Failed to delete account. Please try again later.');
          }
        }
      },
    ]);
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
          if (logout) {
            logout();
          } else {
            await TokenHelper.clearTokens();
            navigation.replace('Login');
          }
        }
      },
    ]);
  };

  const SettingItem = ({ icon, title, value, showBorder = true, onPress }: any) => (
    <View style={styles.settingItemWrapper}>
      <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.settingItemLeft}>
          <MaterialIcons name={icon} size={24} color={localColors.onSurfaceVariant} />
          <Text style={styles.settingItemTitle}>{title}</Text>
        </View>
        <View style={styles.settingItemRight}>
          {value && <Text style={styles.settingItemValue}>{value}</Text>}
          <MaterialIcons name="chevron-right" size={24} color={localColors.outlineVariant} />
        </View>
      </TouchableOpacity>
      {showBorder && <View style={styles.divider} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={localColors.surface} />
      
      {/* Top App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={localColors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* User Profile Summary Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5eeff' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: localColors.secondary }}>
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            {user?.phoneNumber && <Text style={styles.profilePhone}>{user.phoneNumber}</Text>}
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>{user?.role === 'User' ? 'RIDER PRO' : user?.role?.toUpperCase()}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProfileInformation')}>
            <MaterialIcons name="edit" size={24} color={localColors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionsContainer}>
          
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            <View style={styles.sectionBox}>
              <SettingItem icon="person" title="Profile Information" onPress={() => navigation.navigate('ProfileInformation')} />
              <SettingItem icon="lock" title="Security" onPress={() => navigation.navigate('Security')} />
              <SettingItem icon="payments" title="Payment Methods" showBorder={false} onPress={() => navigation.navigate('PaymentMethods')} />
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            <View style={styles.sectionBox}>
              <SettingItem icon="map" title="Map Preferences" value="Light" />
              <SettingItem icon="notifications" title="Notifications" onPress={() => navigation.navigate('Notifications')} />
              <SettingItem icon="grid-view" title="UI Showcase (Modals)" onPress={() => navigation.navigate('ModalsShowcase')} />
              <SettingItem icon="language" title="Language" value="English (US)" showBorder={false} />
            </View>
          </View>

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LEGAL</Text>
            <View style={styles.sectionBox}>
              <SettingItem icon="privacy-tip" title="Privacy Policy" />
              <SettingItem icon="gavel" title="Terms of Service" showBorder={false} />
            </View>
          </View>

        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>RideO v4.2.1 (Build 890)</Text>
        </View>

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
    borderBottomColor: 'rgba(198, 198, 205, 0.2)', // Light shadow equivalent
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
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 48,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    marginBottom: 32,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: localColors.surfaceVariant,
    overflow: 'hidden',
    marginRight: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  profilePhone: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    marginTop: 2,
  },
  proBadge: {
    backgroundColor: 'rgba(134, 242, 228, 0.2)', // secondary-container 20%
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  proBadgeText: {
    color: localColors.secondary,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'JetBrains Mono',
    letterSpacing: 0.5,
  },
  editBtn: {
    padding: 8,
  },
  sectionsContainer: {
    gap: 24,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    letterSpacing: 1,
    paddingLeft: 8,
    marginBottom: 8,
  },
  sectionBox: {
    backgroundColor: localColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    overflow: 'hidden',
  },
  settingItemWrapper: {
    backgroundColor: localColors.surface,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingItemTitle: {
    fontSize: 16,
    color: localColors.onSurface,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingItemValue: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(198, 198, 205, 0.2)',
    marginLeft: 56, // Align with text
  },
  actionSection: {
    marginTop: 32,
    gap: 16,
  },
  logoutBtn: {
    width: '100%',
    backgroundColor: localColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.5)',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
  },
  deleteBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 16,
    color: localColors.error,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
  }
});

export default SettingsScreen;

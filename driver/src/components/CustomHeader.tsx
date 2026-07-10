import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { getHeaderTitle } from '@react-navigation/elements';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../context/AuthContext';

export const CustomHeader = ({ navigation, route, options, back }: any) => {
  const { user, logout } = useContext(AuthContext);
  const title = getHeaderTitle(options, route.name);

  // Home has special styling (transparent, no back button)
  const isHome = route.name === 'HomeTab' || route.name === 'Home';
  
  return (
    <SafeAreaView style={[styles.headerSafe, isHome && styles.headerSafeTransparent]} pointerEvents={isHome ? "box-none" : "auto"}>
      <View style={[styles.header, isHome && styles.headerTransparent]} pointerEvents={isHome ? "box-none" : "auto"}>
        {/* Left Side: Back Arrow or App Logo */}
        {!isHome ? (
          <TouchableOpacity style={styles.headerBtn} onPress={() => {
            if (back) {
              navigation.goBack();
            } else {
              if (user && !user.isVerified) {
                Alert.alert('Log Out', 'Are you sure you want to log out? You can complete your vehicle details later.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Out', style: 'destructive', onPress: () => logout() }
                ]);
              } else {
                navigation.navigate('MainTabs');
              }
            }
          }}>
            <Icon name="arrow-left" size={28} color="#000000" />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RideO</Text>
          </View>
        )}

        {/* Center: Title (Only show if not Home, or if Home but En Route) */}
        {!isHome || title === 'En Route' ? (
           <Text style={[styles.headerTitle, title === 'En Route' && { fontSize: 24, color: '#5B4FE9' }]}>
             {title !== 'HomeTab' && title !== 'MainTabs' ? title : ''}
           </Text>
        ) : (
           <View />
        )}

        {/* Right Side: Profile Avatar or Empty space for flex alignment */}
        <TouchableOpacity style={styles.headerAvatar} onPress={() => navigation.navigate('Profile')}>
          <Icon name="account" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerSafe: {
    backgroundColor: 'rgba(248, 249, 255, 1)', // Solid by default
  },
  headerSafeTransparent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.2)',
  },
  headerTransparent: {
    backgroundColor: 'rgba(248, 249, 255, 0.8)',
    borderBottomWidth: 0,
  },
  headerBtn: {
    padding: 8,
    marginLeft: -8,
  },
  logoContainer: {
    padding: 8,
    marginLeft: -8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000', // Match standard title color, or we could use brand #5B4FE9
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0b1c30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

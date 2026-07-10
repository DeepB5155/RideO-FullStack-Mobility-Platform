import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axiosInstance from '../api/axios';

const localColors = {
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#131b2e',
  onPrimaryContainer: '#7c839b',
  secondary: '#006a61',
  secondaryContainer: '#86f2e4',
  onSecondaryContainer: '#006f66',
  tertiaryFixed: '#ffdbce',
  onTertiaryFixedVariant: '#7f2b00',
  background: '#f8f9ff',
  surface: '#f8f9ff',
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

const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get('/notification');
      setNotifications(res.data);
    } catch (error) {
      console.log('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await axiosInstance.put('/notification/read-all');
      fetchNotifications();
    } catch (error) {
      console.log('Error marking all as read:', error);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await axiosInstance.delete('/notification');
      setNotifications([]);
    } catch (error) {
      console.log('Error deleting all notifications:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await axiosInstance.delete(`/notification/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.log('Error deleting notification:', error);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Mock data to demonstrate the premium UI if no data is available
  const displayNotifications = notifications.length > 0 ? notifications : [
    {
      _id: '1',
      title: 'Your driver has arrived',
      message: 'Michael is waiting for you in a Black Toyota Camry (XYZ 1234) at the main entrance.',
      type: 'arrival',
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      _id: '2',
      title: '20% off your next weekend ride',
      message: 'Use code WEEKEND20 before Sunday midnight. Valid for up to $10 off standard rides.',
      type: 'promo',
      isRead: true,
      createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
    },
    {
      _id: '3',
      title: 'Booking Confirmed: Airport Transfer',
      message: 'Your ride to SFO is scheduled for tomorrow at 4:30 AM. Estimated cost: $45.00.',
      type: 'booking',
      isRead: true,
      createdAt: new Date(Date.now() - 86400000).toISOString() // Yesterday
    },
    {
      _id: '4',
      title: 'App Update Available',
      message: 'Update to the latest version for faster booking and improved location tracking accuracy.',
      type: 'system',
      isRead: true,
      createdAt: new Date(Date.now() - 864000000).toISOString() // Some days ago
    }
  ];

  const renderNotification = (notif: any, index: number) => {
    const isArrival = notif.type === 'arrival' || (!notif.isRead && index === 0);
    const isPromo = notif.type === 'promo';
    const isBooking = notif.type === 'booking';

    let iconName = 'info';
    let iconBg = localColors.surfaceContainerHigh;
    let iconColor = localColors.onSurface;

    if (isArrival) {
      iconName = 'directions-car';
      iconBg = localColors.secondaryContainer;
      iconColor = localColors.onSecondaryContainer;
    } else if (isPromo) {
      iconName = 'local-offer';
      iconBg = localColors.tertiaryFixed;
      iconColor = localColors.onTertiaryFixedVariant;
    } else if (isBooking) {
      iconName = 'check-circle';
    }

    return (
      <TouchableOpacity 
        key={notif._id || index.toString()} 
        style={[
          styles.card, 
          isArrival && styles.cardArrival,
          notif.isRead && styles.cardRead
        ]}
        activeOpacity={0.7}
      >
        {isArrival && <View style={styles.arrivalIndicator} />}
        
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <MaterialIcons name={iconName} size={24} color={iconColor} />
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{notif.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.cardTime, isArrival && styles.cardTimeArrival]}>
                  {getRelativeTime(notif.createdAt)}
                </Text>
                {isArrival && <View style={styles.unreadDot} />}
                <TouchableOpacity onPress={() => deleteNotification(notif.id || notif._id)} style={{ marginLeft: 8 }}>
                  <MaterialIcons name="close" size={16} color={localColors.outlineVariant} />
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={styles.cardBody} numberOfLines={2}>{notif.message}</Text>
            
            {isArrival && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>I'm coming</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary}>
                  <Text style={styles.btnSecondaryText}>Contact Driver</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Page Title Area */}
        <View style={styles.titleArea}>
          <View style={styles.titleTextContainer}>
            <Text style={styles.pageTitle}>Activity Alerts</Text>
            <Text style={styles.pageSubtitle}>Stay updated on your rides and offers.</Text>
          </View>
          
          <View style={{ flexDirection: 'column', gap: 8 }}>
            <TouchableOpacity style={styles.markReadBtn} onPress={markAllAsRead}>
              <MaterialIcons name="done-all" size={16} color={localColors.primary} />
              <Text style={styles.markReadText}>Mark read</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.clearAllBtn} onPress={deleteAllNotifications}>
              <MaterialIcons name="delete-outline" size={16} color={localColors.error} />
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={localColors.primary} style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.listContainer}>
            {displayNotifications.map((notif, index) => renderNotification(notif, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.background,
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
    borderWidth: 2,
    borderColor: 'rgba(19, 27, 46, 0.1)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  titleTextContainer: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: localColors.onBackground,
  },
  pageSubtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    marginTop: 4,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(211, 228, 254, 0.3)', // surface-variant roughly
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.primary,
  },
  listContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: localColors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
  },
  cardRead: {
    opacity: 0.8,
  },
  cardArrival: {
    backgroundColor: localColors.surfaceContainerLow,
    borderColor: localColors.secondaryContainer,
    overflow: 'hidden',
  },
  arrivalIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: localColors.secondary,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onBackground,
    paddingRight: 8,
  },
  cardTime: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
  },
  cardTimeArrival: {
    color: localColors.secondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: localColors.secondary,
    marginLeft: 8,
    marginTop: 4,
  },
  cardBody: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    lineHeight: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  btnPrimary: {
    backgroundColor: localColors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onPrimary,
  },
  btnSecondary: {
    backgroundColor: localColors.surfaceContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  btnSecondaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurface,
  }
});

export default NotificationsScreen;

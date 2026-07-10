import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  ActivityIndicator, SafeAreaView, ScrollView, RefreshControl 
} from 'react-native';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Local colors matching the HTML design
const localColors = {
  background: '#f8f9ff',
  primary: '#000000',
  onSurfaceVariant: '#45464d',
  surface: '#ffffff',
  outlineVariant: '#c6c6cd',
  secondary: '#006a61',
  secondaryContainer: '#86f2e4',
  onSecondaryContainer: '#006f66',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  surfaceContainerHighest: '#d3e4fe',
  surfaceContainerHigh: '#dce9ff',
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
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hrs ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getStyleForType = (title: string, type: string) => {
    const t = title?.toLowerCase() || '';
    if (t.includes('surge') || type === 'warning') {
      return { icon: 'warning', themeColor: localColors.error, bg: localColors.errorContainer, iconColor: localColors.onErrorContainer };
    }
    if (t.includes('payout') || type === 'success') {
      return { icon: 'payments', themeColor: localColors.secondary, bg: localColors.secondaryContainer, iconColor: localColors.onSecondaryContainer };
    }
    if (t.includes('rating')) {
      return { icon: 'star', themeColor: localColors.primary, bg: localColors.surfaceContainerHighest, iconColor: localColors.primary };
    }
    // Default info
    return { icon: 'info', themeColor: localColors.primary, bg: localColors.surfaceContainerHighest, iconColor: localColors.primary };
  };

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchNotifications} tintColor={localColors.secondary} />
        }
      >
        <View style={styles.titleSection}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Notifications</Text>
              <Text style={styles.pageSubtitle}>Stay updated with your latest notifications.</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 8 }}>
              {hasUnread && (
                <TouchableOpacity style={styles.markReadBtn} onPress={markAllAsRead}>
                  <MaterialIcons name="done-all" size={16} color={localColors.secondary} />
                  <Text style={styles.markReadText}>Mark read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.clearAllBtn} onPress={deleteAllNotifications}>
                <MaterialIcons name="delete-outline" size={16} color={localColors.error} />
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notifications List */}
        <View style={styles.listContainer}>
          {notifications.length === 0 && !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="notifications-none" size={48} color={localColors.outlineVariant} />
              <Text style={styles.emptyText}>No recent alerts.</Text>
            </View>
          ) : (
            notifications.map((notif, idx) => {
              const styleProps = getStyleForType(notif.title, notif.type);
              
              return (
                <TouchableOpacity 
                  key={notif.id || idx} 
                  style={[
                    styles.card, 
                    notif.isRead ? styles.cardRead : styles.cardUnread
                  ]}
                  activeOpacity={0.7}
                >
                  {!notif.isRead && (
                    <View style={[styles.leftBorderIndicator, { backgroundColor: styleProps.themeColor }]} />
                  )}
                  
                  <View style={styles.cardContent}>
                    {/* Icon Box */}
                    <View style={styles.iconBoxContainer}>
                      <View style={[styles.iconBox, { backgroundColor: styleProps.bg }]}>
                        <MaterialIcons name={styleProps.icon} size={20} color={styleProps.iconColor} />
                      </View>
                    </View>

                    {/* Text Content */}
                    <View style={styles.textContainer}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.notifTitle}>{notif.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.notifTime}>{getRelativeTime(notif.createdAt)}</Text>
                          <TouchableOpacity onPress={() => deleteNotification(notif.id)} style={{ marginLeft: 8 }}>
                            <MaterialIcons name="close" size={16} color={localColors.outlineVariant} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.notifBody}>{notif.message}</Text>
                      
                      {/* Optional Location Pill if surge */}
                      {notif.title?.toLowerCase().includes('surge') && (
                        <View style={styles.pillContainer}>
                          <View style={styles.locationPill}>
                            <MaterialIcons name="location-on" size={14} color={localColors.onSurfaceVariant} style={{marginRight: 4}} />
                            <Text style={styles.pillText}>Downtown</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Unread Dot */}
                    {!notif.isRead && (
                      <View style={[styles.unreadDot, { backgroundColor: styleProps.themeColor }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
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
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  titleTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: localColors.primary,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    lineHeight: 24,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(134, 242, 228, 0.2)', // secondaryContainer/20
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: localColors.secondary,
    letterSpacing: 0.5,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.errorContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: localColors.error,
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: localColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  cardUnread: {
    borderColor: localColors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRead: {
    borderColor: 'rgba(198, 198, 205, 0.5)',
    opacity: 0.75,
  },
  leftBorderIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    paddingLeft: 20, // Extra padding to clear the left border
  },
  iconBoxContainer: {
    marginRight: 16,
    marginTop: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  notifTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.primary,
    flex: 1,
    paddingRight: 8,
  },
  notifTime: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontWeight: '500',
  },
  notifBody: {
    fontSize: 15,
    color: localColors.onSurfaceVariant,
    lineHeight: 22,
  },
  pillContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignSelf: 'center',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    marginTop: 16,
  }
});

export default NotificationsScreen;

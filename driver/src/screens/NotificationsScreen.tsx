import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';

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

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'info':
      default: return '📋';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {notifications.some(n => !n.isRead) ? (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markReadBtn}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recent notifications.</Text>
          </View>
        ) : (
          notifications.map((notif, idx) => (
            <View key={idx} style={[styles.card, !notif.isRead && styles.unreadCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <Text style={styles.iconText}>{getIconForType(notif.type)}</Text>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                </View>
                <Text style={styles.notifTime}>{getRelativeTime(notif.createdAt)}</Text>
              </View>
              <Text style={styles.notifBody}>{notif.message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  backBtn: { fontSize: 16, color: theme.colors.primary, fontWeight: '600', width: 80 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text.main, flex: 1, textAlign: 'center' },
  markReadBtn: { fontSize: 14, color: theme.colors.primary, fontWeight: '500', width: 80, textAlign: 'right' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: theme.colors.text.muted, fontSize: 16 },
  card: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.border,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  unreadCard: {
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.surface, 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconText: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },
  notifTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text.main, flex: 1 },
  notifBody: { fontSize: 14, color: theme.colors.text.muted, lineHeight: 20 },
  notifTime: { fontSize: 12, color: theme.colors.text.muted, marginLeft: theme.spacing.sm }
});

export default NotificationsScreen;

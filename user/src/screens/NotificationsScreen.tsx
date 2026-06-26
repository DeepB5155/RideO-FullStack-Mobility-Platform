import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';

const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    fetchNotifications();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 50 }} />
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
              <Text style={styles.notifTitle}>{notif.title}</Text>
              <Text style={styles.notifBody}>{notif.message}</Text>
              <Text style={styles.notifTime}>{new Date(notif.createdAt).toLocaleString()}</Text>
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
  backBtn: { fontSize: 16, color: theme.colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text.main },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: theme.colors.text.muted, fontSize: 16 },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.border,
    ...theme.shadows.small,
  },
  unreadCard: {
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '0A', // very light tint
  },
  notifTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text.main, marginBottom: theme.spacing.xs },
  notifBody: { fontSize: 14, color: theme.colors.text.muted, marginBottom: theme.spacing.sm },
  notifTime: { fontSize: 12, color: theme.colors.text.muted, textAlign: 'right' }
});

export default NotificationsScreen;

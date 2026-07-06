import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView } from 'react-native';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';

const SupportScreen = ({ navigation }: any) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.post(`/complaint`, {
        subject,
        description: message
      });
      
      Alert.alert('Complaint Submitted', 'Our support team will review your report shortly.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data || 'Failed to submit complaint.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Submit a Complaint</Text>
          <Text style={styles.instruction}>
            Did you have a bad experience on a recent ride? Please describe the issue below.
          </Text>

          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Driver was late"
            placeholderTextColor={theme.colors.text.muted}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.label}>Message / Details</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Please provide details about what happened..."
            placeholderTextColor={theme.colors.text.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={theme.colors.text.light} />
            ) : (
              <Text style={styles.submitBtnText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
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
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    ...theme.shadows.large,
  },
  title: { fontSize: 22, color: theme.colors.text.main, fontWeight: '800', marginBottom: theme.spacing.sm },
  instruction: { fontSize: 14, color: theme.colors.text.muted, lineHeight: 22, marginBottom: theme.spacing.xl },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.text.muted, marginBottom: theme.spacing.xs, textTransform: 'uppercase' },
  input: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    fontSize: 16,
    color: theme.colors.text.main,
    marginBottom: theme.spacing.xl,
  },
  textArea: { height: 120 },
  submitBtn: {
    width: '100%',
    backgroundColor: theme.colors.danger,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  submitBtnText: { color: theme.colors.text.light, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});

export default SupportScreen;

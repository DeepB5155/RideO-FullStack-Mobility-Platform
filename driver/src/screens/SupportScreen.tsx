import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView, ImageBackground, Image } from 'react-native';
import axiosInstance from '../api/axios';
import Icon from 'react-native-vector-icons/Ionicons';

const SupportScreen = ({ navigation }: any) => {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Other');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { label: 'Earnings', icon: 'cash-outline', value: 'Earnings' },
    { label: 'App Issue', icon: 'bug-outline', value: 'App Issue' },
    { label: 'Safety', icon: 'shield-outline', value: 'Safety' },
    { label: 'Other', icon: 'ellipsis-horizontal-outline', value: 'Other' }
  ];

  const handleSubmit = async () => {
    if (!subject || !message) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.post(`/complaint`, {
        subject: `[${category}] ${subject}`,
        message
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
      <ImageBackground 
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwh0-xrfxazGkYOpzEBppvGzemwy7d0S1nV1Bq37-IUtOnirXySeoK0UysPVXPeUdvkkyerPil9rM1dPgs3yM4yOaNm5d2BxcoqGyIbDYlxHOC8KK7oCzcfOLpPh7e43HbHyYnyiEifHFR3rfei7gs-TBa7vtCLYmkVO6lcNMCj2DOKkZx4bIk9GTS45Ghkz1MYvXNoArjxUBPv8a16QH-VpUTy-10eDsGlrct6lUmpxVeCbkP41pCXF4wDEBYf3XxdhzHIlHH3nLU' }} 
        style={styles.backgroundMap}
        imageStyle={{ opacity: 0.3 }}
      >
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={28} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.appTitle}>Support</Text>
          <View style={styles.profileAvatarBtn}>
            <Icon name="person" size={20} color="#0b1c30" />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.historyBtn} 
            onPress={() => navigation.navigate('MyComplaints')}
          >
            <Icon name="history" size={24} color="#000000" style={{ marginRight: 12 }} />
            <Text style={styles.historyBtnText}>View My Ticket History</Text>
            <Icon name="chevron-right" size={24} color="#76777d" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Icon name="help-circle-outline" size={32} color="#000000" style={styles.helpIcon} />
              <View>
                <Text style={styles.sheetTitle}>How can we help?</Text>
                <Text style={styles.sheetSubtitle}>Submit a ticket and we'll respond within 24 hours.</Text>
              </View>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>SUBJECT</Text>
              <View style={styles.inputContainer}>
                <Icon name="list-outline" size={20} color="#76777d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Issue with recent trip"
                  placeholderTextColor="#76777d"
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              <Text style={styles.label}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = category === cat.value;
                  return (
                    <TouchableOpacity 
                      key={cat.value}
                      style={[styles.categoryBtn, isSelected && styles.categoryBtnSelected]}
                      onPress={() => setCategory(cat.value)}
                    >
                      <Icon 
                        name={cat.icon} 
                        size={18} 
                        color={isSelected ? '#ffffff' : '#000000'} 
                        style={styles.categoryIcon} 
                      />
                      <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>DETAILS</Text>
              <TextInput
                style={[styles.inputContainer, styles.textArea]}
                placeholder="Please provide as much detail as possible..."
                placeholderTextColor="#76777d"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Submit Request</Text>
                    <Icon name="send-outline" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#d3e4fe',
  },
  backgroundMap: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#d3e4fe',
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
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  profileAvatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.5)',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  historyBtn: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  sheet: {
    backgroundColor: '#f8f9ff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.3)',
    paddingBottom: 20,
    marginBottom: 20,
  },
  helpIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b1c30',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#45464d',
    paddingRight: 32,
  },
  form: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#45464d',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0b1c30',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    backgroundColor: '#eff4ff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 12,
  },
  categoryBtnSelected: {
    backgroundColor: '#131b2e',
    borderColor: '#131b2e',
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    fontFamily: 'JetBrains Mono',
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  textArea: {
    alignItems: 'flex-start',
    paddingVertical: 16,
    height: 120,
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
});

export default SupportScreen;

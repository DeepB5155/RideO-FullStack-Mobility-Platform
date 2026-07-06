import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  ScrollView, SafeAreaView, StatusBar, Image, TextInput 
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const localColors = {
  surfaceContainerLow: '#eff4ff',
  surface: '#f8f9ff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  primary: '#000000',
  onPrimary: '#ffffff',
  secondaryContainer: '#86f2e4',
  onSecondaryContainer: '#006f66',
  errorContainer: '#ffdad6',
  error: '#ba1a1a',
  onError: '#ffffff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  tertiaryFixedDim: '#ffb599',
  inverseSurface: 'rgba(33, 49, 69, 0.4)', // backdrop
};

const ModalsShowcaseScreen = ({ navigation }: any) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2533" />
      
      {/* Top Nav for Showcase */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>RideO Modal System</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Component Showcase</Text>
          <Text style={styles.headerSubtitle}>Interaction Patterns</Text>
        </View>

        {/* 1. Success Popup */}
        <View style={styles.modalCard}>
          <View style={[styles.iconCircle, { backgroundColor: localColors.secondaryContainer }]}>
            <MaterialIcons name="check-circle" size={32} color={localColors.onSecondaryContainer} />
          </View>
          <Text style={styles.modalTitle}>Ride Booked!</Text>
          <Text style={styles.modalText}>
            Your driver, Sarah, is 4 minutes away. A white Toyota Prius (XYZ 1234).
          </Text>
          
          <View style={styles.infoBox}>
            <View>
              <Text style={styles.infoLabel}>ETA</Text>
              <Text style={styles.infoValue}>14:32</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoLabel}>COST</Text>
              <Text style={styles.infoValue}>$12.50</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Track Ride</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Error/Alert Popup */}
        <View style={styles.modalCard}>
          <View style={[styles.iconCircle, { backgroundColor: localColors.errorContainer }]}>
            <MaterialIcons name="warning" size={32} color={localColors.error} />
          </View>
          <Text style={styles.modalTitle}>Payment Failed</Text>
          <Text style={styles.modalText}>
            We couldn't process the payment for your last ride. Please update your payment method to book a new ride.
          </Text>
          
          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.outlineBtnRow}>
              <Text style={styles.outlineBtnText}>Dismiss</Text>
            </TouchableOpacity>
            <View style={{ width: 16 }} />
            <TouchableOpacity style={styles.errorBtnRow}>
              <Text style={styles.errorBtnText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Confirmation Dialog */}
        <View style={[styles.modalCard, { alignItems: 'flex-start' }]}>
          <View style={styles.inlineHeader}>
            <MaterialIcons name="cancel" size={24} color={localColors.onSurfaceVariant} />
            <Text style={[styles.modalTitle, { marginBottom: 0, marginLeft: 8 }]}>Cancel Trip?</Text>
          </View>
          <Text style={[styles.modalText, { textAlign: 'left' }]}>
            Are you sure you want to cancel? Your driver is already on the way. A cancellation fee of 
            <Text style={{ fontWeight: '600', color: localColors.primary, fontSize: 18 }}> $5.00 </Text> 
            may apply.
          </Text>
          
          <View style={styles.colBtns}>
            <TouchableOpacity style={styles.outlineBtnCol}>
              <Text style={styles.outlineBtnText}>No, Keep Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostErrorBtn}>
              <Text style={styles.ghostErrorBtnText}>Yes, Cancel Trip</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Rating Prompt */}
        <View style={styles.modalCard}>
          <View style={styles.avatarWrap}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBafFc0UCTpg_k8RjEOLxEuqF8vlxCEHd35W_0PrrC2JublIwGJup--ynd1qpbcPZRv-8ndV_D9vlAdOvcFrNOmmA78o4m1NqFkNkFIuJRfgYmz8K1W0WKlj3BIagRnpJrvccQYPM_0LNJMPalE-x78Xkr0jrFTkjkApvVTdW-E0xt2MZ57zet3PE1LDPtQGGy9hIVzW9JeUfNcVJLX9e-cu1Rw8YOkZSqyz_cTFdX_Vk-A4cd9UR3pzI-TfxWPWxCd8UilI9ix0M8s' }} 
              style={styles.avatarImage} 
            />
          </View>
          <Text style={styles.modalTitle}>Rate your trip</Text>
          <Text style={styles.modalText}>How was your ride with Michael?</Text>
          
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <MaterialIcons 
                  name="star" 
                  size={36} 
                  color={star <= rating ? localColors.tertiaryFixedDim : localColors.outlineVariant} 
                />
              </TouchableOpacity>
            ))}
          </View>
          
          <TextInput
            style={styles.ratingInput}
            placeholder="Leave a compliment..."
            placeholderTextColor="rgba(69, 70, 77, 0.5)"
            multiline
            value={review}
            onChangeText={setReview}
          />
          
          <TouchableOpacity 
            style={[styles.primaryBtn, rating === 0 && { opacity: 0.5 }]} 
            disabled={rating === 0}
          >
            <Text style={styles.primaryBtnText}>Submit</Text>
          </TouchableOpacity>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a2533', // Simulating the backdrop-blur overlay
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: localColors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoBox: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: localColors.surfaceContainer,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: '600',
    color: localColors.primary,
    fontFamily: 'JetBrains Mono',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: localColors.primary,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onPrimary,
  },
  rowBtns: {
    flexDirection: 'row',
    width: '100%',
  },
  outlineBtnRow: {
    flex: 1,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  errorBtnRow: {
    flex: 1,
    backgroundColor: localColors.error,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.primary,
  },
  errorBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onError,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  colBtns: {
    width: '100%',
    gap: 12,
  },
  outlineBtnCol: {
    width: '100%',
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  ghostErrorBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  ghostErrorBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.error,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: localColors.surfaceContainerHigh,
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  ratingInput: {
    width: '100%',
    height: 96,
    backgroundColor: localColors.surfaceContainer,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: localColors.onSurface,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
});

export default ModalsShowcaseScreen;

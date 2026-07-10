import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, StatusBar, Modal } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';
import * as signalR from '@microsoft/signalr';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/Ionicons';

// Local colors matching HTML mockup
const localColors = {
  background: '#f8f9ff',
  primary: '#000000',
  primaryContainer: '#131b2e',
  onPrimaryFixedVariant: '#3f465c',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainer: '#e5eeff',
  outlineVariant: '#c6c6cd',
  secondaryContainer: '#86f2e4',
  onSecondaryContainer: '#006f66',
  outline: '#76777d',
  secondary: '#006a61',
  surface: '#f8f9ff',
  onPrimary: '#ffffff',
  onBackground: '#0b1c30',
};

const KYCScreen = ({ route, navigation }: any) => {
  const fromProfile = route?.params?.fromProfile;
  const { user, updateUser } = useContext(AuthContext);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Document states
  const [licenseUrl, setLicenseUrl] = useState('');
  const [rcUrl, setRcUrl] = useState('');
  const [insuranceUrl, setInsuranceUrl] = useState('');
  const [vehicleImageUrl, setVehicleImageUrl] = useState('');
  const [driverFaceUrl, setDriverFaceUrl] = useState('');

  // Processing states for simulated upload
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [isUploadingRc, setIsUploadingRc] = useState(false);
  const [isUploadingInsurance, setIsUploadingInsurance] = useState(false);
  const [isUploadingVehicle, setIsUploadingVehicle] = useState(false);
  const [isUploadingFace, setIsUploadingFace] = useState(false);

  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await axiosInstance.get('/kyc/status');
      setStatus(res.data.status);
      if (res.data.rejectionReason) {
        setRejectionReason(res.data.rejectionReason);
      }
    } catch (e) {
      console.log('Failed to check KYC status', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    let connection: signalR.HubConnection | null = null;
    
    const setupSignalR = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token || status !== 'Pending') return;
        
        const hubUrl = axiosInstance.defaults.baseURL?.replace('/api', '/rideHub') || 'http://localhost:5000/rideHub';
        
        connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, { accessTokenFactory: () => token })
          .withAutomaticReconnect()
          .build();

        connection.on("KYCStatusUpdated", (newStatus: string) => {
          setStatus(newStatus);
        });

        await connection.start();
      } catch (err) {
        console.log("SignalR Connection Error:", err);
      }
    };

    setupSignalR();

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [status]);

  const simulateUpload = (setter: any, loadingSetter: any) => {
    loadingSetter(true);
    setTimeout(() => {
      setter('https://lh3.googleusercontent.com/dummy_url'); // Dummy URL
      loadingSetter(false);
    }, 1200);
  };

  const submitKYC = async () => {
    try {
      setIsSubmitting(true);
      
      const vDetails = route?.params?.vehicleDetails || {};
      
      await axiosInstance.post('/kyc/submit', {
        licenseNumber: 'DL-DEFAULT',
        make: vDetails.make || 'Mock Make',
        model: vDetails.model || 'Mock Model',
        year: vDetails.year || 2023,
        color: vDetails.color || 'White',
        licensePlate: vDetails.licensePlate || 'ABC-1234',
        vehicleType: vDetails.vehicleType || 'Sedan',
        totalSeats: vDetails.totalSeats || 4,
        licenseFrontUrl: licenseUrl,
        licenseBackUrl: licenseUrl,
        rcUrl: rcUrl || licenseUrl,
        vehicleImageUrl: vehicleImageUrl,
        driverFaceUrl: driverFaceUrl
      });
      
      setShowSuccessModal(true);
    } catch (e: any) {
      console.log('Failed to submit KYC', e);
      alert('Failed to submit KYC');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = async () => {
    setShowSuccessModal(false);
    setIsLoading(true);
    await checkStatus();
  };

  useEffect(() => {
    if (status === 'Approved' && !fromProfile) {
      setTimeout(() => {
        updateUser({ isVerified: true });
      }, 500);
    }
  }, [status, fromProfile, updateUser]);

  const allRequiredApproved = licenseUrl && rcUrl && insuranceUrl && vehicleImageUrl && driverFaceUrl;

  const DocumentSlot = ({ title, desc, iconName, url, isUploading, onPress, fileName }: any) => {
    const isUploaded = !!url;

    return (
      <TouchableOpacity 
        style={[
          styles.uploadSlot, 
          isUploaded ? styles.uploadSlotSuccess : null,
          isUploading ? { opacity: 0.5 } : null
        ]} 
        onPress={onPress}
        disabled={isUploaded || isUploading}
        activeOpacity={0.9}
      >
        <View style={styles.slotContent}>
          <View style={[styles.slotIconWrap, isUploaded ? styles.slotIconWrapSuccess : null]}>
            <MaterialIcons name={iconName} size={32} color={isUploaded ? localColors.onPrimary : localColors.primary} />
          </View>
          <View style={styles.slotTextWrap}>
            <Text style={styles.slotTitle}>{title}</Text>
            <Text style={styles.slotDesc}>{desc}</Text>
            {!isUploaded && (
              <View style={styles.tapToUploadWrap}>
                <MaterialIcons name={iconName === 'badge' ? "add-a-photo" : iconName === 'description' ? "upload-file" : "add-a-photo"} size={20} color={localColors.primary} />
                <Text style={styles.tapToUploadText}>{isUploading ? 'Uploading...' : 'Tap to upload'}</Text>
              </View>
            )}
          </View>
        </View>

        {isUploaded && (
          <View style={styles.uploadedPreviewBox}>
            <MaterialIcons name="check-circle" size={20} color={localColors.onSecondaryContainer} />
            <Text style={styles.uploadedFileName} numberOfLines={1}>{fileName}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={localColors.primary} />
      </View>
    );
  }

  if (status === 'Approved') {
    return (
      <View style={styles.center}>
        {!fromProfile && <ActivityIndicator size="large" color={localColors.secondary} />}
        <Text style={[styles.statusTitle, { marginTop: 15, color: localColors.secondary }]}>
          Verified!
        </Text>
        <Text style={styles.statusSubtitle}>
          {fromProfile ? 'Your documents and account are fully approved.' : 'Loading Dashboard...'}
        </Text>
        {fromProfile && (
          <TouchableOpacity style={styles.buttonOutline} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonOutlineText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (status === 'Pending') {
    return (
      <View style={styles.center}>
        <Text style={styles.statusTitle}>Under Review ⏳</Text>
        <Text style={styles.statusSubtitle}>Your documents are currently being verified by an admin.</Text>
        <TouchableOpacity style={styles.buttonOutline} onPress={checkStatus}>
          <Text style={styles.buttonOutlineText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(248, 249, 255, 0.8)" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={styles.progressBarFill} />
        </View>

        {status === 'Rejected' && (
          <View style={{ backgroundColor: '#ffe5e5', padding: 16, borderRadius: 8, marginBottom: 24, borderWidth: 1, borderColor: '#ff4d4f' }}>
            <Text style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>KYC Rejected</Text>
            <Text style={{ color: '#ff4d4f' }}>{rejectionReason || 'Your documents were rejected. Please check and upload valid documents again.'}</Text>
          </View>
        )}

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainHeading}>Upload Documents</Text>
          <Text style={styles.headerDesc}>We need a few legal documents to verify your profile and vehicle eligibility.</Text>
        </View>

        {/* Document Slots */}
        <View style={styles.slotsContainer}>
          <DocumentSlot 
            title="Driving License"
            desc="Front and back of your valid permit"
            iconName="badge"
            url={licenseUrl}
            isUploading={isUploadingLicense}
            onPress={() => simulateUpload(setLicenseUrl, setIsUploadingLicense)}
            fileName="license_front_v2.jpg"
          />
          <DocumentSlot 
            title="Vehicle Registration (RC)"
            desc="Certificate of registration for your vehicle"
            iconName="description"
            url={rcUrl}
            isUploading={isUploadingRc}
            onPress={() => simulateUpload(setRcUrl, setIsUploadingRc)}
            fileName="registration_cert.pdf"
          />
          <DocumentSlot 
            title="Vehicle Insurance"
            desc="Active third-party or comprehensive policy"
            iconName="verified-user"
            url={insuranceUrl}
            isUploading={isUploadingInsurance}
            onPress={() => simulateUpload(setInsuranceUrl, setIsUploadingInsurance)}
            fileName="insurance_policy.pdf"
          />
          <DocumentSlot 
            title="Vehicle Image"
            desc="Clear photo of your vehicle"
            iconName="directions-car"
            url={vehicleImageUrl}
            isUploading={isUploadingVehicle}
            onPress={() => simulateUpload(setVehicleImageUrl, setIsUploadingVehicle)}
            fileName="vehicle_photo.jpg"
          />
          <DocumentSlot 
            title="Driver Photo"
            desc="Clear selfie of your face"
            iconName="face"
            url={driverFaceUrl}
            isUploading={isUploadingFace}
            onPress={() => simulateUpload(setDriverFaceUrl, setIsUploadingFace)}
            fileName="driver_selfie.jpg"
          />
        </View>

        {/* Helper Text */}
        <View style={styles.helperCard}>
          <MaterialIcons name="info" size={20} color={localColors.secondary} style={{ marginTop: 2 }} />
          <Text style={styles.helperText}>
            Please ensure photos are clear and all text is readable. PDF, JPG, or PNG formats are accepted (Max 5MB per file).
          </Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.submitBtn, !allRequiredApproved && styles.submitBtnDisabled]} 
            onPress={submitKYC}
            disabled={!allRequiredApproved || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={localColors.onPrimary} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>{allRequiredApproved ? 'Finish Registration' : 'Submit Application'}</Text>
                <MaterialIcons name={allRequiredApproved ? "check-circle" : "rocket-launch"} size={20} color={localColors.onPrimary} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backActionBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backActionText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="check-circle" size={48} color={localColors.onSecondaryContainer} />
            </View>
            <Text style={styles.modalTitle}>Application Sent!</Text>
            <Text style={styles.modalBody}>
              Our team will review your documents. Please wait for 3 working days. You'll be notified as soon as you're ready to hit the road.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleModalClose}>
              <Text style={styles.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: localColors.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: localColors.surface,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: localColors.primary,
  },
  statusSubtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: localColors.primary,
    padding: 16,
    borderRadius: 30,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  buttonOutlineText: {
    color: localColors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: 'rgba(248, 249, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.2)',
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: localColors.primary,
    letterSpacing: -0.5,
    marginLeft: 4,
  },
  stepBadge: {
    backgroundColor: localColors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onPrimaryFixedVariant,
    fontFamily: 'JetBrains Mono',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: localColors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 32,
  },
  progressBarFill: {
    width: '100%', // Step 3 of 3 is full
    height: '100%',
    backgroundColor: localColors.onSecondaryContainer,
  },
  titleSection: {
    marginBottom: 24,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 4,
  },
  headerDesc: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    lineHeight: 24,
  },
  slotsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  uploadSlot: {
    padding: 24,
    backgroundColor: localColors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: localColors.outline,
    borderStyle: 'dashed',
  },
  uploadSlotSuccess: {
    backgroundColor: 'rgba(134, 242, 228, 0.2)', // secondaryContainer with opacity
    borderColor: localColors.secondary,
    borderStyle: 'solid',
  },
  slotContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  slotIconWrap: {
    backgroundColor: localColors.surfaceContainerHigh,
    padding: 16,
    borderRadius: 12,
    marginRight: 16,
  },
  slotIconWrapSuccess: {
    backgroundColor: localColors.primary,
  },
  slotTextWrap: {
    flex: 1,
  },
  slotTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 4,
  },
  slotDesc: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: 'JetBrains Mono',
    marginBottom: 12,
  },
  tapToUploadWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapToUploadText: {
    fontSize: 12,
    fontWeight: '600',
    color: localColors.primary,
    marginLeft: 4,
  },
  uploadedPreviewBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainer,
  },
  uploadedFileName: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    marginLeft: 8,
    flex: 1,
  },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: localColors.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  helperText: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  bottomBar: {
    paddingTop: 32,
    paddingBottom: 24,
  },
  submitBtn: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: localColors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: localColors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  backActionBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  backActionText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.9)', // on-background/90
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: localColors.surface,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 384, // ~sm
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 96,
    height: 96,
    backgroundColor: localColors.secondaryContainer,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modalBtn: {
    width: '100%',
    backgroundColor: localColors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  modalBtnText: {
    color: localColors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
  }
});

export default KYCScreen;

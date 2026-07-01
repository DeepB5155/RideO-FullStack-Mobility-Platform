import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, SafeAreaView, Image } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';
import * as signalR from '@microsoft/signalr';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const KYCScreen = ({ route, navigation }: any) => {
  const fromProfile = route?.params?.fromProfile;
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Document states
  const [licenseUrl, setLicenseUrl] = useState('https://lh3.googleusercontent.com/aida-public/AB6AXuBEfVGJ6XZV_-ua9XJv9YDFUqj588ESdBkpT5DQ9qmJHOwX2jScyr_Dw58g2kHiuscmHzzo9woXuY4KGk42kSz5AiC0Hn5VqGcZcpDpf1TBgYC5ymHbik1H96p0yP6gVRxHRNeUC6-_k5Upq_SO0wtdz3nU_Tc0JJk-CSoNYXcRKHP7-40O_Ok567gby-vRYuH8eL-BqOR45I9ar0OHe88sXSR4Zowe7X3GwO9oPk8U4lSewDrIOfNnFnOYWZ3G7ujuTYtFy_8uSceD');
  const [rcUrl, setRcUrl] = useState('');
  const [insuranceUrl, setInsuranceUrl] = useState('https://lh3.googleusercontent.com/aida-public/AB6AXuAnZ_e1bl65mp6ZHB5uW_spC_Q_3PWz87Sz9_ybpr7_krj7Y48fB76YH-Yj9wtDi0IeHnqBKzsrYfVqa4junFNTmRd7vI0Wdszj6Cqk5CXJAECQVMRcd4KsdkgemKBVQtjT5WmGimLMMVVXssb5Al8a0HPlkllTXG-itl4AeRLvsMgM2e1xHCQrPk5QVkUqvHLq_IEwXY47MLOW70Iw-7dPpqFE5aOB4-rBLOQWz_zhhoy0l7vNFgp09gRsGJdFFLkz1hf4ZavQY9y9');
  const [bgCheckUrl, setBgCheckUrl] = useState('');

  // Processing state for insurance
  const [isInsuranceProcessing, setIsInsuranceProcessing] = useState(true);

  const checkStatus = async () => {
    try {
      const res = await axiosInstance.get('/kyc/status');
      setStatus(res.data.status);
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

  const simulateUploadRC = () => {
    // Simulate upload delay
    setTimeout(() => {
      setRcUrl('https://lh3.googleusercontent.com/aida-public/AB6AXuAnZ_e1bl65mp6ZHB5uW_spC_Q_3PWz87Sz9_ybpr7_krj7Y48fB76YH-Yj9wtDi0IeHnqBKzsrYfVqa4junFNTmRd7vI0Wdszj6Cqk5CXJAECQVMRcd4KsdkgemKBVQtjT5WmGimLMMVVXssb5Al8a0HPlkllTXG-itl4AeRLvsMgM2e1xHCQrPk5QVkUqvHLq_IEwXY47MLOW70Iw-7dPpqFE5aOB4-rBLOQWz_zhhoy0l7vNFgp09gRsGJdFFLkz1hf4ZavQY9y9');
    }, 500);
  };

  const simulateUploadBg = () => {
    setTimeout(() => {
      setBgCheckUrl('https://lh3.googleusercontent.com/aida-public/AB6AXuBEfVGJ6XZV_-ua9XJv9YDFUqj588ESdBkpT5DQ9qmJHOwX2jScyr_Dw58g2kHiuscmHzzo9woXuY4KGk42kSz5AiC0Hn5VqGcZcpDpf1TBgYC5ymHbik1H96p0yP6gVRxHRNeUC6-_k5Upq_SO0wtdz3nU_Tc0JJk-CSoNYXcRKHP7-40O_Ok567gby-vRYuH8eL-BqOR45I9ar0OHe88sXSR4Zowe7X3GwO9oPk8U4lSewDrIOfNnFnOYWZ3G7ujuTYtFy_8uSceD');
    }, 500);
  };

  const submitKYC = async () => {
    try {
      setIsLoading(true);
      await axiosInstance.post('/kyc/submit', {
        licenseNumber: 'DL-DEFAULT',
        make: 'Mock Make',
        model: 'Mock Model',
        year: 2023,
        color: 'White',
        licensePlate: 'ABC-1234',
        vehicleType: 'Sedan',
        totalSeats: 4,
        licenseFrontUrl: licenseUrl,
        licenseBackUrl: licenseUrl,
        rcUrl: rcUrl || licenseUrl
      });
      
      Alert.alert('Success', 'KYC Submitted successfully. Pending Admin review.');
      await checkStatus();
    } catch (e: any) {
      console.log('Failed to submit KYC', e);
      Alert.alert('Error', 'Failed to submit KYC');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'Approved' && !fromProfile) {
      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 500);
    }
  }, [status, navigation, fromProfile]);

  // Derived states
  let approvedCount = 0;
  if (licenseUrl) approvedCount++;
  if (rcUrl) approvedCount++;
  if (insuranceUrl && !isInsuranceProcessing) approvedCount++;
  
  const allRequiredApproved = licenseUrl && rcUrl && insuranceUrl && !isInsuranceProcessing;
  const canSubmit = allRequiredApproved && bgCheckUrl;

  const DocumentCard = ({ title, iconName, state, imageUrl, onPress }: any) => {
    const isApproved = state === 'Approved';
    const isRequired = state === 'Required';
    const isProcessing = state === 'Processing';
    const isLocked = state === 'Locked';

    let borderColor = 'rgba(198, 198, 205, 0.3)';
    let bgColor = 'rgba(248, 249, 255, 0.7)';
    let borderStyle = 'solid' as any;

    if (isRequired) {
      borderColor = 'rgba(198, 198, 205, 0.8)';
      borderStyle = 'dashed';
      bgColor = 'rgba(248, 249, 255, 0.5)';
    } else if (isProcessing) {
      borderColor = 'rgba(137, 245, 231, 0.5)';
      bgColor = 'rgba(137, 245, 231, 0.05)';
    }

    return (
      <TouchableOpacity 
        style={[styles.docCard, { borderColor, backgroundColor: bgColor, borderStyle, borderWidth: isRequired ? 2 : 1 }]} 
        onPress={onPress}
        disabled={isLocked || isApproved || isProcessing}
      >
        <View style={styles.docHeader}>
          <View style={styles.docTitleRow}>
            <View style={[styles.docIconWrap, isRequired ? styles.docIconReq : isLocked ? styles.docIconLocked : styles.docIconAppr]}>
              <MaterialIcons name={iconName} size={20} color={isRequired || isLocked ? '#45464d' : '#000000'} />
            </View>
            <View>
              <Text style={[styles.docTitle, isLocked && { color: '#45464d' }]}>{title}</Text>
              {isApproved && (
                <Text style={styles.statusApproved}><Icon name="checkmark-circle" size={12} /> Approved</Text>
              )}
              {isRequired && (
                <Text style={styles.statusRequired}><Icon name="hourglass-outline" size={12} /> Required</Text>
              )}
              {isProcessing && (
                <Text style={styles.statusProcessing}>Processing</Text>
              )}
              {isLocked && (
                <Text style={styles.statusLocked}>Unlock after documents</Text>
              )}
            </View>
          </View>
          {isApproved && <MaterialIcons name="more-vert" size={20} color="#45464d" />}
          {isLocked && <MaterialIcons name="lock" size={20} color="#c6c6cd" />}
        </View>

        <View style={[styles.docPreview, isRequired && styles.docPreviewReq, isLocked && styles.docPreviewLocked]}>
          {isApproved && imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.previewImage} />
          ) : isProcessing && imageUrl ? (
            <View style={styles.processingOverlay}>
              <Image source={{ uri: imageUrl }} style={[styles.previewImage, { opacity: 0.5 }]} />
              <ActivityIndicator size="large" color="#000" style={styles.spinner} />
            </View>
          ) : isRequired ? (
            <View style={styles.reqContent}>
              <MaterialIcons name="add-photo-alternate" size={32} color="#c6c6cd" />
              <Text style={styles.tapToUpload}>Tap to upload</Text>
            </View>
          ) : isLocked ? (
            <View style={styles.lockedLines}>
              <View style={styles.lockedLine1} />
              <View style={styles.lockedLine2} />
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  if (status === 'Approved') {
    return (
      <View style={styles.center}>
        {!fromProfile && <ActivityIndicator size="large" color="#006a61" />}
        <Text style={[styles.title, { marginTop: 15, color: '#006a61' }]}>
          Verified!
        </Text>
        <Text style={styles.subtitle}>
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
        <Text style={styles.title}>Under Review ⏳</Text>
        <Text style={styles.subtitle}>Your documents are currently being verified by an admin.</Text>
        <TouchableOpacity style={styles.buttonOutline} onPress={checkStatus}>
          <Text style={styles.buttonOutlineText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Icon name="close" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.appTitle}>RideO</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerArea}>
          <View style={styles.headerRow}>
            <Text style={styles.mainHeading}>Document Verification</Text>
            <View style={styles.pendingChip}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          </View>
          <Text style={styles.headerDesc}>Please upload clear photos of the required documents to activate your driver profile.</Text>
        </View>

        <View style={styles.grid}>
          <DocumentCard 
            title="Driving License"
            iconName="badge"
            state={licenseUrl ? 'Approved' : 'Required'}
            imageUrl={licenseUrl}
          />
          <DocumentCard 
            title="Vehicle Registration"
            iconName="directions-car"
            state={rcUrl ? 'Approved' : 'Required'}
            imageUrl={rcUrl}
            onPress={simulateUploadRC}
          />
          <DocumentCard 
            title="Vehicle Insurance"
            iconName="shield"
            state={isInsuranceProcessing ? 'Processing' : insuranceUrl ? 'Approved' : 'Required'}
            imageUrl={insuranceUrl}
            onPress={() => setIsInsuranceProcessing(false)}
          />
          <DocumentCard 
            title="Background Check"
            iconName="assignment-ind"
            state={allRequiredApproved ? (bgCheckUrl ? 'Approved' : 'Required') : 'Locked'}
            imageUrl={bgCheckUrl}
            onPress={simulateUploadBg}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomContent}>
          <View style={styles.infoRow}>
            <Icon name="information-circle-outline" size={16} color="#45464d" />
            <Text style={styles.infoText}>{approvedCount} of 3 documents approved</Text>
          </View>
          <TouchableOpacity 
            style={[styles.submitActionBtn, !canSubmit && styles.submitActionBtnDisabled]} 
            onPress={submitKYC}
            disabled={!canSubmit}
          >
            <Text style={styles.submitActionText}>Submit for Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9ff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    color: '#45464d',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 16,
    borderRadius: 30,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  buttonOutlineText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
  },
  closeBtn: {
    padding: 8,
    marginLeft: -8,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  headerArea: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0b1c30',
  },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 198, 205, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#76777d',
    marginRight: 6,
  },
  pendingText: {
    fontSize: 12,
    color: '#45464d',
    fontWeight: '500',
    fontFamily: 'JetBrains Mono',
  },
  headerDesc: {
    fontSize: 16,
    color: '#45464d',
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  docCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    zIndex: 10,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIconWrap: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  docIconReq: {
    backgroundColor: '#eff4ff',
  },
  docIconLocked: {
    backgroundColor: '#d3e4fe',
  },
  docIconAppr: {
    backgroundColor: '#e5eeff',
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
  },
  statusApproved: {
    fontSize: 12,
    color: '#006a61',
    fontWeight: '500',
    fontFamily: 'JetBrains Mono',
    marginTop: 4,
  },
  statusRequired: {
    fontSize: 12,
    color: '#45464d',
    fontWeight: '500',
    fontFamily: 'JetBrains Mono',
    marginTop: 4,
  },
  statusProcessing: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
    fontFamily: 'JetBrains Mono',
    marginTop: 4,
  },
  statusLocked: {
    fontSize: 12,
    color: '#45464d',
    fontWeight: '500',
    fontFamily: 'JetBrains Mono',
    marginTop: 4,
  },
  docPreview: {
    width: '100%',
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eff4ff',
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.2)',
  },
  docPreviewReq: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 0,
  },
  docPreviewLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 0,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  processingOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  spinner: {
    position: 'absolute',
  },
  reqContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToUpload: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
    marginTop: 8,
  },
  lockedLines: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedLine1: {
    width: 60,
    height: 8,
    backgroundColor: 'rgba(198, 198, 205, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  lockedLine2: {
    width: 90,
    height: 8,
    backgroundColor: 'rgba(198, 198, 205, 0.2)',
    borderRadius: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 198, 205, 0.2)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32, // Safe area
  },
  bottomContent: {
    flexDirection: 'column',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#45464d',
    fontFamily: 'JetBrains Mono',
  },
  submitActionBtn: {
    width: '100%',
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  submitActionBtnDisabled: {
    backgroundColor: '#c6c6cd',
    opacity: 0.8,
  },
  submitActionText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  }
});

export default KYCScreen;

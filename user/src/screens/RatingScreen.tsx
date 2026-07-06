import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, SafeAreaView, ScrollView, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../api/axios';

const localColors = {
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#131b2e',
  onPrimaryContainer: '#7c839b',
  secondary: '#006a61',
  secondaryContainer: '#86f2e4',
  onSecondaryContainer: '#006f66',
  tertiaryContainer: '#370e00',
  onTertiaryContainer: '#e45405',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHigh: '#dce9ff',
  onBackground: '#0b1c30',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
};

const RatingScreen = ({ route, navigation }: any) => {
  // Using fallback params so screen can be viewed directly if needed
  const { targetUserId, targetRole, routeId, targetName } = route.params || { targetUserId: '1', targetRole: 'driver', routeId: '1', targetName: 'Michael' };
  
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTip, setSelectedTip] = useState<number | null>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const comment = selectedTags.join(', ');
      const compliment = selectedTags.length > 0 ? selectedTags[0] : undefined;
      
      await api.post('/rating', {
        bookingId: routeId,  // routeId used as bookingId fallback when navigating from ride flow
        revieweeId: targetUserId,
        score: rating,
        comment,
        compliment
      });
      
      navigation.navigate('Home');
    } catch (e: any) {
      // Allow navigation even if api fails in mockup mode
      navigation.navigate('Home');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7} style={styles.starBtn}>
            <MaterialIcons 
              name={star <= rating ? "star" : "star-border"} 
              size={42} 
              color={star <= rating ? localColors.onTertiaryContainer : localColors.primary} 
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.iconBtn}>
            <MaterialIcons name="close" size={24} color={localColors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RideO</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        
        {/* Success Icon */}
        <View style={styles.successIconWrapper}>
          <View style={styles.pulseCircle} />
          <View style={styles.checkIconContainer}>
            <MaterialIcons name="check-circle" size={32} color={localColors.onSecondaryContainer} />
          </View>
        </View>

        <Text style={styles.pageTitle}>Rate Your Ride</Text>
        <Text style={styles.pageSubtitle}>How was your ride with {targetName}?</Text>

        {/* Driver Card */}
        <View style={styles.driverCard}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfJ0VnnutHduknFroeu4HcJ8n_WtDSv8-bowXo9n_lxFeRfg8Q7bI1KyGmc95gf-iKH2JSJ5uZCsueIbDl75hbaV8sYkiM2q1bEudJ_7XNgZy3hbfVYBDESLCDEQrsRS2VpTSG9WcmJvv0f9ymThkAuK6WOK6BatmwbPT0ANaBb5bnHLBTZxshod-AgqU3vfm5z5RQ9vQV2ykP2IQLLVdxZbUlmvru3pQMH4-WFDB-bwuQyiyN42yLrtAKeXFaONOCA140EtvtHtP3' }} 
              style={styles.avatar} 
            />
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>4.9</Text>
              <MaterialIcons name="star" size={12} color={localColors.onSecondaryContainer} />
            </View>
          </View>
          <Text style={styles.driverName}>{targetName}</Text>
          <Text style={styles.driverCar}>Toyota Camry • ABC-1234</Text>
        </View>

        {/* Interactive Rating */}
        {renderStars()}

        {/* Tags */}
        <View style={styles.tagsContainer}>
          {['Cleanliness', 'Driving', 'Navigation'].map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <TouchableOpacity 
                key={tag} 
                style={[styles.tag, isSelected && styles.tagSelected]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{tag}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Tip Section */}
        <View style={styles.tipSection}>
          <Text style={styles.tipTitle}>Add a tip?</Text>
          <View style={styles.tipButtonsRow}>
            {[1, 3, 5].map(amount => {
              const isSelected = selectedTip === amount;
              return (
                <TouchableOpacity 
                  key={amount}
                  style={[styles.tipBtn, isSelected && styles.tipBtnSelected]}
                  onPress={() => setSelectedTip(amount)}
                >
                  <Text style={[styles.tipBtnText, isSelected && styles.tipBtnTextSelected]}>${amount}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Area */}
      <SafeAreaView style={styles.bottomSafe}>
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={localColors.onPrimary} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit Feedback</Text>
                <MaterialIcons name="arrow-forward" size={20} color={localColors.onPrimary} />
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: localColors.primary,
    letterSpacing: -0.5,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingTop: 32,
    alignItems: 'center',
  },
  successIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: 64,
    height: 64,
  },
  pulseCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: localColors.secondaryContainer,
    borderRadius: 32,
    opacity: 0.5,
  },
  checkIconContainer: {
    backgroundColor: localColors.secondary,
    padding: 12,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: localColors.primary,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    marginBottom: 32,
  },
  driverCard: {
    width: '100%',
    backgroundColor: localColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: localColors.surface,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    backgroundColor: localColors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: localColors.surface,
    gap: 2,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: localColors.onSecondaryContainer,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.onBackground,
    marginBottom: 4,
  },
  driverCar: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  starBtn: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    backgroundColor: 'transparent',
  },
  tagSelected: {
    backgroundColor: localColors.surfaceContainerHigh,
    borderColor: localColors.onSurfaceVariant,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
  },
  tagTextSelected: {
    color: localColors.onBackground,
  },
  tipSection: {
    width: '100%',
    marginBottom: 24,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onBackground,
    textAlign: 'center',
    marginBottom: 16,
  },
  tipButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  tipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    alignItems: 'center',
  },
  tipBtnSelected: {
    backgroundColor: localColors.primary,
    borderColor: localColors.primary,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: localColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tipBtnTextSelected: {
    color: localColors.onPrimary,
  },
  bottomSafe: {
    backgroundColor: localColors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomActions: {
    padding: 16,
    gap: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: localColors.primary,
    borderRadius: 24,
    paddingVertical: 16,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onPrimary,
  },
  skipBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: localColors.onSurfaceVariant,
  }
});

export default RatingScreen;

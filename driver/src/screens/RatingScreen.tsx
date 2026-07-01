import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, SafeAreaView } from 'react-native';
import axiosInstance from '../api/axios';
import Icon from 'react-native-vector-icons/Ionicons';

const RatingScreen = ({ route, navigation }: any) => {
  const { targetUserId, targetRole, routeId, targetName } = route?.params || { targetName: 'Passenger' };
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tags = ["Polite", "Ready on time", "Great conversation"];

  const handleTagPress = (tag: string) => {
    if (comment.includes(tag)) {
      setComment(comment.replace(tag, '').replace(/,\s*$/, '').trim());
    } else {
      setComment(comment ? `${comment}, ${tag}` : tag);
    }
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Invalid Rating', 'Rating must be between 1 and 5');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await axiosInstance.post('/rating', {
        targetUserId,
        targetRole,
        routeId,
        score: rating,
        comment
      });
      
      Alert.alert('Success', 'Thank you for your feedback!');
      navigation.navigate('Home');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit rating');
      navigation.navigate('Home');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Icon 
              name={star <= rating ? 'star' : 'star-outline'} 
              size={40} 
              color={star <= rating ? '#006a61' : '#c6c6cd'} 
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#45464d" />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Trip Rating</Text>
        <TouchableOpacity style={styles.skipButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainContainer}>
        {/* Passenger Avatar & Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMf-uh9fotpwNtb1xU-a-lCmqZ2CPq6anDyEc1FV35bCuTEsyar8o7KBU9CuAUpAF3r6MI2m2Iqch-OjIDhzcXJnh---w__3FFGpCmY1uihu64yNR7WNbd9_ZRCHmA4dPS9etj_1bGKy69psGYd-3mWD-1vaeWlwgfVe_g-xEw7TVyWwt2138HZvcvo6YT3BmGZk6GSh55cBcngfOqn9p_whZpjee0MfUK9cac5jZC-OFF3q_QWDfcM0nVLfNMf2yKbiGoIp7GpTQ7' }} 
              style={styles.avatar} 
            />
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={12} color="#ffffff" />
            </View>
          </View>
          <Text style={styles.rateTitle}>Rate {targetName}</Text>
          <Text style={styles.rateSubtitle}>Drop-off completed</Text>

          {/* Earnings Pill */}
          <View style={styles.earningsPill}>
            <Icon name="cash" size={18} color="#006a61" style={{ marginRight: 6 }} />
            <Text style={styles.earningsText}>₹18.50</Text>
          </View>
        </View>

        {/* Rating Container */}
        <View style={styles.ratingCard}>
          <Text style={styles.questionText}>How was your passenger?</Text>
          
          {renderStars()}

          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>ADD A COMMENT (OPTIONAL)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Was the passenger polite? Ready on time?"
                placeholderTextColor="#c6c6cd"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Icon name="create-outline" size={20} color="#c6c6cd" style={styles.inputIcon} />
            </View>
          </View>

          {/* Pre-defined Tags */}
          <View style={styles.tagsContainer}>
            {tags.map((tag) => {
              const isSelected = comment.includes(tag);
              return (
                <TouchableOpacity 
                  key={tag} 
                  style={[styles.tag, isSelected && styles.tagSelected]}
                  onPress={() => handleTagPress(tag)}
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit Rating</Text>
                <Icon name="arrow-forward" size={20} color="#ffffff" />
              </>
            )}
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
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#45464d',
    fontFamily: 'JetBrains Mono',
    letterSpacing: 1,
  },
  mainContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#e5eeff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#006a61',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  rateSubtitle: {
    fontSize: 16,
    color: '#45464d',
  },
  earningsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
  },
  earningsText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'JetBrains Mono',
  },
  ratingCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.2)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  commentContainer: {
    width: '100%',
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 12,
    color: '#45464d',
    fontFamily: 'JetBrains Mono',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    height: 80,
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    width: '100%',
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.5)',
    backgroundColor: '#ffffff',
  },
  tagSelected: {
    backgroundColor: '#86f2e4',
    borderColor: '#86f2e4',
  },
  tagText: {
    fontSize: 12,
    color: '#45464d',
    fontFamily: 'JetBrains Mono',
  },
  tagTextSelected: {
    color: '#006f66',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default RatingScreen;

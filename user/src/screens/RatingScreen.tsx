import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import api from '../api/axios';
import { theme } from '../theme/theme';

const RatingScreen = ({ route, navigation }: any) => {
  const { targetUserId, targetRole, routeId, targetName } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Invalid Rating', 'Rating must be between 1 and 5');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post('/rating', {
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
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, { color: star <= rating ? theme.colors.warning : theme.colors.border }]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate your driver</Text>
      <Text style={styles.subtitle}>How was your ride with {targetName}?</Text>
      
      {renderStars()}
      
      <TextInput
        style={styles.input}
        placeholder="Leave a comment (optional)"
        placeholderTextColor={theme.colors.text.muted}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
      />
      
      <TouchableOpacity 
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.submitBtnText}>Submit Rating</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.skipBtnText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.main,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  star: {
    fontSize: 48,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    color: theme.colors.text.main,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: theme.colors.text.light,
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  skipBtnText: {
    color: theme.colors.text.muted,
    fontSize: 16,
    fontWeight: '600',
  }
});

export default RatingScreen;

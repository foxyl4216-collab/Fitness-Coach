import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const { dayIndex } = useLocalSearchParams<{ dayIndex: string }>();
  const { plan } = useFitCoach();

  const idx = parseInt(dayIndex || '0', 10);
  const workout = plan?.workouts[idx];

  if (!workout) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <Text style={styles.errorText}>Workout not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerDay}>{workout.dayName}</Text>
          <Text style={styles.headerTitle}>{workout.title}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="barbell-outline" size={18} color={Colors.primary} />
            <Text style={styles.summaryText}>{workout.exercises.length} exercises</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="time-outline" size={18} color={Colors.secondary} />
            <Text style={styles.summaryText}>~{workout.exercises.length * 8} min</Text>
          </View>
        </View>

        {workout.exercises.map((exercise, i) => (
          <View key={i} style={styles.exerciseCard}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>{i + 1}</Text>
            </View>
            <View style={styles.exerciseContent}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <View style={styles.exerciseDetails}>
                <View style={styles.exerciseDetail}>
                  <Text style={styles.detailLabel}>Sets</Text>
                  <Text style={styles.detailValue}>{exercise.sets}</Text>
                </View>
                <View style={styles.exerciseDetailDivider} />
                <View style={styles.exerciseDetail}>
                  <Text style={styles.detailLabel}>Reps</Text>
                  <Text style={styles.detailValue}>{exercise.reps}</Text>
                </View>
                <View style={styles.exerciseDetailDivider} />
                <View style={styles.exerciseDetail}>
                  <Text style={styles.detailLabel}>Rest</Text>
                  <Text style={styles.detailValue}>{exercise.rest}</Text>
                </View>
              </View>
              {exercise.notes && (
                <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
              )}
            </View>
          </View>
        ))}

        {workout.cardio && (
          <View style={styles.cardioCard}>
            <Ionicons name="walk" size={20} color={Colors.secondary} />
            <View style={styles.cardioContent}>
              <Text style={styles.cardioTitle}>Cardio</Text>
              <Text style={styles.cardioText}>{workout.cardio}</Text>
            </View>
          </View>
        )}

        <View style={styles.tipsSection}>
          <Text style={styles.tipsSectionTitle}>Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="water-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.tipText}>Stay hydrated throughout your workout</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="body-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.tipText}>Focus on form over speed or weight</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="timer-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.tipText}>Rest between sets as specified</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerDay: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  exerciseCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  exerciseNumberText: {
    fontSize: 14,
    fontFamily: 'Rubik_700Bold',
    color: Colors.primary,
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginBottom: 10,
  },
  exerciseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseDetail: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginTop: 2,
  },
  exerciseDetailDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  exerciseNotes: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  cardioCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(13,148,136,0.1)',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  cardioContent: {
    flex: 1,
  },
  cardioTitle: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.secondary,
  },
  cardioText: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tipsSection: {
    marginHorizontal: 20,
    gap: 12,
  },
  tipsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginBottom: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
  },
});

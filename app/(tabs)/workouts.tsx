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
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const { plan, weekNumber, profile } = useFitCoach();

  if (!plan || !profile) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <Text style={styles.emptyText}>Complete onboarding to see your workouts</Text>
      </View>
    );
  }

  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
        paddingBottom: Platform.OS === 'web' ? 34 : 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Week {weekNumber} Plan</Text>
      <Text style={styles.subtitle}>
        {plan.workouts.filter(w => !w.isRestDay).length} workout days ·{' '}
        {plan.workouts.filter(w => w.isRestDay).length} rest days
      </Text>

      {plan.workouts.map((workout, i) => {
        const isToday = i === dayIndex;
        const isPast = i < dayIndex;

        return (
          <Pressable
            key={i}
            onPress={() => {
              if (!workout.isRestDay) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/workout-detail', params: { dayIndex: String(i) } });
              }
            }}
            style={({ pressed }) => [
              styles.workoutCard,
              isToday && styles.workoutCardToday,
              pressed && !workout.isRestDay && styles.pressed,
            ]}
          >
            <View style={styles.dayIndicator}>
              <View style={[
                styles.dayDot,
                isToday && styles.dayDotToday,
                isPast && !workout.isRestDay && styles.dayDotDone,
                workout.isRestDay && styles.dayDotRest,
              ]} />
              {i < 6 && <View style={styles.dayLine} />}
            </View>

            <View style={styles.workoutContent}>
              <View style={styles.workoutHeader}>
                <Text style={[styles.workoutDay, isToday && styles.workoutDayToday]}>
                  {workout.dayName}
                  {isToday && '  ·  Today'}
                </Text>
              </View>
              <Text style={styles.workoutTitle}>{workout.title}</Text>
              {!workout.isRestDay && (
                <View style={styles.workoutMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="barbell-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{workout.exercises.length} exercises</Text>
                  </View>
                  {workout.cardio && (
                    <View style={styles.metaItem}>
                      <Ionicons name="walk-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.metaText}>Cardio</Text>
                    </View>
                  )}
                </View>
              )}
              {workout.isRestDay && (
                <Text style={styles.restNote}>Recovery & light movement</Text>
              )}
            </View>

            {!workout.isRestDay && (
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  workoutCardToday: {
    backgroundColor: 'rgba(74,222,128,0.06)',
  },
  pressed: {
    opacity: 0.7,
  },
  dayIndicator: {
    alignItems: 'center',
    width: 24,
    marginRight: 16,
  },
  dayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.cardLight,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  dayDotToday: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayDotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  dayDotRest: {
    backgroundColor: Colors.surface,
    borderColor: Colors.textMuted,
  },
  dayLine: {
    width: 2,
    height: 48,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  workoutContent: {
    flex: 1,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutDay: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workoutDayToday: {
    color: Colors.primary,
  },
  workoutTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginTop: 2,
  },
  workoutMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  restNote: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

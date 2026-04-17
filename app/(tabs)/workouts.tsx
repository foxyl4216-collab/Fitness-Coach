import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const { plan, weekNumber, profile, regenerateDayWorkout } = useFitCoach();
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);

  const handleRegenerate = async (dayIndex: number) => {
    if (regeneratingDay !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRegeneratingDay(dayIndex);
    try {
      await regenerateDayWorkout(dayIndex);
    } finally {
      setRegeneratingDay(null);
    }
  };

  if (!plan || !profile) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <Text style={styles.emptyText}>Complete onboarding to see your workouts</Text>
      </View>
    );
  }

  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const workoutDays = plan.workouts.filter(w => !w.isRestDay).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
        paddingBottom: Platform.OS === 'web' ? 34 : 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerArea}>
        <Text style={styles.title}>Week {weekNumber}</Text>
        <View style={styles.subtitleRow}>
          <View style={styles.pill}>
            <Ionicons name="barbell-outline" size={13} color={Colors.primary} />
            <Text style={styles.pillText}>{workoutDays} workouts</Text>
          </View>
          <View style={[styles.pill, styles.pillMuted]}>
            <Ionicons name="bed-outline" size={13} color={Colors.textMuted} />
            <Text style={[styles.pillText, { color: Colors.textMuted }]}>{7 - workoutDays} rest</Text>
          </View>
        </View>
      </View>

      <View style={styles.timeline}>
        {plan.workouts.map((workout, i) => {
          const isToday = i === dayIndex;
          const isPast = i < dayIndex;
          const isFuture = i > dayIndex;

          return (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineIndicator}>
                <View style={[
                  styles.timelineDot,
                  isToday && styles.timelineDotToday,
                  isPast && !workout.isRestDay && styles.timelineDotDone,
                  isPast && workout.isRestDay && styles.timelineDotPastRest,
                  workout.isRestDay && !isPast && !isToday && styles.timelineDotRest,
                ]}>
                  {isToday && (
                    <View style={styles.timelineDotInner} />
                  )}
                  {isPast && !workout.isRestDay && (
                    <Ionicons name="checkmark" size={8} color={Colors.background} />
                  )}
                </View>
                {i < 6 && (
                  <View style={[
                    styles.timelineLine,
                    isToday && styles.timelineLineToday,
                    isPast && !workout.isRestDay && styles.timelineLineDone,
                  ]} />
                )}
              </View>

              <Pressable
                onPress={() => {
                  if (!workout.isRestDay) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/workout-detail', params: { dayIndex: String(i) } });
                  }
                }}
                style={({ pressed }) => [
                  styles.workoutCard,
                  isToday && styles.workoutCardToday,
                  workout.isRestDay && !isToday && styles.workoutCardRest,
                  isFuture && !workout.isRestDay && styles.workoutCardFuture,
                  pressed && !workout.isRestDay && styles.pressed,
                ]}
              >
                {isToday && (
                  <LinearGradient
                    colors={['rgba(74,222,128,0.08)', 'rgba(0,0,0,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                {isToday && <View style={styles.workoutCardAccent} />}
                <View style={styles.workoutCardInner}>
                  <View style={[
                    styles.workoutIconWrap,
                    isToday && styles.workoutIconWrapToday,
                    workout.isRestDay && styles.workoutIconWrapRest,
                    isPast && !workout.isRestDay && styles.workoutIconWrapDone,
                  ]}>
                    <Ionicons
                      name={workout.isRestDay ? 'bed-outline' : isPast ? 'checkmark-circle-outline' : 'barbell-outline'}
                      size={18}
                      color={
                        isToday ? Colors.primary
                        : isPast && !workout.isRestDay ? Colors.success
                        : workout.isRestDay ? Colors.textMuted
                        : Colors.textSecondary
                      }
                    />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={[
                      styles.workoutDay,
                      isToday && styles.workoutDayToday,
                      workout.isRestDay && !isToday && styles.workoutDayRest,
                    ]}>
                      {workout.dayName}{isToday ? '  ·  Today' : ''}
                    </Text>
                    <Text style={[
                      styles.workoutTitle,
                      workout.isRestDay && !isToday && styles.workoutTitleRest,
                    ]}>
                      {workout.title}
                    </Text>
                    {!workout.isRestDay && (
                      <View style={styles.workoutMetaRow}>
                        <Ionicons name="barbell-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.workoutMetaText}>{workout.exercises.length} exercises</Text>
                        {workout.cardio && (
                          <>
                            <View style={styles.metaDot} />
                            <Text style={styles.workoutMetaText}>Cardio</Text>
                          </>
                        )}
                      </View>
                    )}
                    {workout.isRestDay && (
                      <Text style={styles.restNote}>Recovery & mobility</Text>
                    )}
                  </View>
                  {!workout.isRestDay && (
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleRegenerate(i);
                        }}
                        style={({ pressed }) => [
                          styles.shuffleBtn,
                          pressed && { opacity: 0.6 },
                        ]}
                        hitSlop={8}
                      >
                        {regeneratingDay === i ? (
                          <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                          <Ionicons name="shuffle-outline" size={17} color={isToday ? Colors.primary : Colors.textMuted} />
                        )}
                      </Pressable>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={isToday ? Colors.primary : Colors.textMuted}
                      />
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerArea: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  pillMuted: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
  },
  pillText: {
    fontSize: 12,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  timeline: {
    paddingHorizontal: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 20,
    paddingTop: 20,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotToday: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderColor: Colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  timelineDotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  timelineDotPastRest: {
    backgroundColor: Colors.surface,
    borderColor: Colors.textMuted,
    opacity: 0.5,
  },
  timelineDotRest: {
    backgroundColor: Colors.surface,
    borderColor: Colors.textMuted,
    opacity: 0.7,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 2,
    minHeight: 32,
  },
  timelineLineToday: {
    backgroundColor: 'rgba(74,222,128,0.3)',
  },
  timelineLineDone: {
    backgroundColor: 'rgba(16,185,129,0.3)',
  },
  workoutCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  workoutCardToday: {
    backgroundColor: Colors.card,
    borderColor: 'rgba(74,222,128,0.35)',
  },
  workoutCardRest: {
    opacity: 0.45,
  },
  workoutCardFuture: {
    opacity: 0.7,
  },
  workoutCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.primary,
  },
  workoutCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 18,
    gap: 12,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  workoutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutIconWrapToday: {
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  workoutIconWrapRest: {
    backgroundColor: Colors.surface,
    opacity: 0.7,
  },
  workoutIconWrapDone: {
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutDay: {
    fontSize: 11,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workoutDayToday: {
    color: Colors.primary,
    fontFamily: 'Rubik_700Bold',
  },
  workoutDayRest: {
    color: Colors.textMuted,
  },
  workoutTitle: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginTop: 2,
  },
  workoutTitleRest: {
    color: Colors.textSecondary,
  },
  workoutMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  workoutMetaText: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  },
  restNote: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shuffleBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

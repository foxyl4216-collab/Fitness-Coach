import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';

function CalorieRing({ progress, eaten, remaining, isOver }: {
  progress: number;
  eaten: number;
  remaining: number;
  isOver: boolean;
}) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const strokeColor = isOver ? Colors.error : Colors.primary;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={isOver ? Colors.error : Colors.primary} />
            <Stop offset="100%" stopColor={isOver ? '#FF6B6B' : Colors.accent} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={Colors.surface}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.ringValue, isOver && { color: Colors.error }]}>
          {isOver ? '+' + (eaten - (eaten - remaining === 0 ? 0 : Math.abs(remaining))) : remaining}
        </Text>
        <Text style={styles.ringLabel}>{isOver ? 'over' : 'left'}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, plan, isOnboarded, isLoading, foodLog, weekNumber, checkIns } = useFitCoach();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!isOnboarded) {
      router.replace('/onboarding');
    }
  }, [isLoading, isOnboarded, isAuthenticated, authLoading]);

  if (authLoading || isLoading || !isAuthenticated || !isOnboarded || !profile || !plan) {
    return <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]} />;
  }

  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const todayWorkout = plan.workouts[dayIndex];

  const todayStr = today.toISOString().split('T')[0];
  const todayFoods = foodLog.filter(f => f.date === todayStr);
  const caloriesEaten = todayFoods.reduce((sum, f) => sum + f.calories, 0);
  const caloriesRemaining = Math.max(0, plan.dailyCalories - caloriesEaten);
  const calorieProgress = Math.min(1, caloriesEaten / plan.dailyCalories);
  const isOver = caloriesEaten > plan.dailyCalories;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
        paddingBottom: Platform.OS === 'web' ? 34 : 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Week {weekNumber}</Text>
          <Text style={styles.goalLabel}>
            {profile.goal === 'fat_loss' ? 'Fat Loss' : 'Muscle Gain'}
            {profile.focusTrack !== 'none' && (
              ` · ${profile.focusTrack === 'belly_fat' ? 'Belly Focus' : 'Glute Focus'}`
            )}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/check-in');
          }}
          style={styles.checkInButton}
        >
          <Ionicons name="clipboard-outline" size={20} color={Colors.text} />
        </Pressable>
      </View>

      <View style={styles.calorieCard}>
        <View style={styles.calorieCardRow}>
          <CalorieRing
            progress={calorieProgress}
            eaten={caloriesEaten}
            remaining={caloriesRemaining}
            isOver={isOver}
          />
          <View style={styles.calorieMeta}>
            <Text style={styles.calorieCardTitle}>Daily Calories</Text>
            <View style={styles.calorieMetaItem}>
              <View style={[styles.metaDot, { backgroundColor: Colors.primary }]} />
              <View>
                <Text style={styles.calorieMetaValue}>{caloriesEaten}</Text>
                <Text style={styles.calorieMetaLabel}>eaten</Text>
              </View>
            </View>
            <View style={styles.calorieMetaItem}>
              <View style={[styles.metaDot, { backgroundColor: Colors.accent }]} />
              <View>
                <Text style={styles.calorieMetaValue}>{plan.dailyCalories}</Text>
                <Text style={styles.calorieMetaLabel}>target</Text>
              </View>
            </View>
            <View style={styles.calorieMetaItem}>
              <View style={[styles.metaDot, { backgroundColor: Colors.violet }]} />
              <View>
                <Text style={styles.calorieMetaValue}>{plan.proteinGrams}g</Text>
                <Text style={styles.calorieMetaLabel}>protein</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.calorieBarBg}>
          <View
            style={[
              styles.calorieBarFill,
              {
                width: `${calorieProgress * 100}%` as any,
                backgroundColor: isOver ? Colors.error : Colors.primary,
              },
            ]}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today's Workout</Text>
      <Pressable
        onPress={() => {
          if (!todayWorkout.isRestDay) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: '/workout-detail', params: { dayIndex: String(dayIndex) } });
          }
        }}
        style={({ pressed }) => [
          styles.todayCard,
          !todayWorkout.isRestDay && styles.todayCardActive,
          pressed && !todayWorkout.isRestDay && styles.pressed,
        ]}
      >
        {!todayWorkout.isRestDay && <View style={styles.todayCardAccent} />}
        <View style={styles.todayCardContent}>
          <View style={[styles.dayBadge, todayWorkout.isRestDay && styles.restBadge]}>
            <Ionicons
              name={todayWorkout.isRestDay ? 'bed-outline' : 'barbell-outline'}
              size={20}
              color={todayWorkout.isRestDay ? Colors.textMuted : Colors.primary}
            />
          </View>
          <View style={styles.todayInfo}>
            <Text style={styles.todayDayName}>{todayWorkout.dayName}</Text>
            <Text style={styles.todayTitle}>{todayWorkout.title}</Text>
            {!todayWorkout.isRestDay && (
              <Text style={styles.todayExCount}>
                {todayWorkout.exercises.length} exercises{todayWorkout.cardio ? ' + cardio' : ''}
              </Text>
            )}
          </View>
          {!todayWorkout.isRestDay && (
            <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </View>
          )}
        </View>
      </Pressable>

      <Text style={styles.sectionTitle}>This Week</Text>
      <View style={styles.weekGrid}>
        {plan.workouts.map((w, i) => {
          const isToday = i === dayIndex;
          const isPast = i < dayIndex;
          return (
            <Pressable
              key={i}
              onPress={() => {
                if (!w.isRestDay) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/workout-detail', params: { dayIndex: String(i) } });
                }
              }}
              style={[
                styles.weekDayCard,
                isToday && styles.weekDayToday,
                w.isRestDay && !isToday && styles.weekDayRest,
              ]}
            >
              <Text style={[styles.weekDayName, isToday && styles.weekDayNameToday, w.isRestDay && !isToday && styles.weekDayNameRest]}>
                {w.dayName.slice(0, 3)}
              </Text>
              <Ionicons
                name={w.isRestDay ? 'bed-outline' : isPast ? 'checkmark-circle' : 'barbell-outline'}
                size={15}
                color={isToday ? Colors.primary : isPast && !w.isRestDay ? Colors.success : w.isRestDay ? Colors.textMuted : Colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>

      {plan.explanation ? (
        <>
          <Text style={styles.sectionTitle}>Coach Notes</Text>
          <View style={styles.notesCard}>
            <View style={styles.notesIconWrap}>
              <MaterialCommunityIcons name="robot-happy-outline" size={18} color={Colors.accent} />
            </View>
            <Text style={styles.notesText}>{plan.explanation}</Text>
          </View>
        </>
      ) : null}

      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          General fitness guidance only. Not medical advice. Consult a professional before starting any program.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  goalLabel: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
    marginTop: 2,
  },
  checkInButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calorieCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  calorieMeta: {
    flex: 1,
    gap: 10,
  },
  calorieCardTitle: {
    fontSize: 13,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  calorieMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calorieMetaValue: {
    fontSize: 16,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    lineHeight: 18,
  },
  calorieMetaLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  ringValue: {
    fontSize: 22,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    lineHeight: 24,
  },
  ringLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  calorieBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  calorieBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  todayCardActive: {
    borderColor: 'rgba(74,222,128,0.2)',
  },
  todayCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  todayCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
  },
  dayBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  restBadge: {
    backgroundColor: Colors.surface,
  },
  todayInfo: {
    flex: 1,
  },
  todayDayName: {
    fontSize: 11,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginTop: 2,
  },
  todayExCount: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(74,222,128,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 5,
    marginBottom: 28,
  },
  weekDayCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.card,
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekDayToday: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderColor: Colors.primary,
  },
  weekDayRest: {
    opacity: 0.45,
  },
  weekDayName: {
    fontSize: 10,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  weekDayNameToday: {
    color: Colors.primary,
  },
  weekDayNameRest: {
    color: Colors.textMuted,
  },
  notesCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  notesIconWrap: {
    marginTop: 1,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  disclaimerContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  disclaimerText: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
  },
});

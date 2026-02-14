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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';

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

  const workoutDays = plan.workouts.filter(w => !w.isRestDay).length;
  const restDays = 7 - workoutDays;

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
          <Ionicons name="clipboard" size={18} color={Colors.white} />
        </Pressable>
      </View>

      <LinearGradient
        colors={['#4ADE80', '#22C55E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.calorieCard}
      >
        <View style={styles.calorieHeader}>
          <Text style={styles.calorieTitle}>Daily Calories</Text>
          <Text style={styles.calorieTarget}>{plan.dailyCalories} kcal target</Text>
        </View>
        <View style={styles.calorieBarContainer}>
          <View style={styles.calorieBarBg}>
            <View style={[styles.calorieBarFill, { width: `${calorieProgress * 100}%` }]} />
          </View>
        </View>
        <View style={styles.calorieStats}>
          <View style={styles.calorieStat}>
            <Text style={styles.calorieStatValue}>{caloriesEaten}</Text>
            <Text style={styles.calorieStatLabel}>eaten</Text>
          </View>
          <View style={styles.calorieStat}>
            <Text style={styles.calorieStatValue}>{caloriesRemaining}</Text>
            <Text style={styles.calorieStatLabel}>remaining</Text>
          </View>
          <View style={styles.calorieStat}>
            <Text style={styles.calorieStatValue}>{plan.proteinGrams}g</Text>
            <Text style={styles.calorieStatLabel}>protein</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Today's Workout</Text>
      <Pressable
        onPress={() => {
          if (!todayWorkout.isRestDay) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: '/workout-detail', params: { dayIndex: String(dayIndex) } });
          }
        }}
        style={({ pressed }) => [styles.todayCard, pressed && !todayWorkout.isRestDay && styles.pressed]}
      >
        <View style={styles.todayCardContent}>
          <View style={[styles.dayBadge, todayWorkout.isRestDay && styles.restBadge]}>
            <Ionicons
              name={todayWorkout.isRestDay ? 'bed' : 'barbell'}
              size={20}
              color={todayWorkout.isRestDay ? Colors.secondary : Colors.primary}
            />
          </View>
          <View style={styles.todayInfo}>
            <Text style={styles.todayDayName}>{todayWorkout.dayName}</Text>
            <Text style={styles.todayTitle}>{todayWorkout.title}</Text>
            {!todayWorkout.isRestDay && (
              <Text style={styles.todayExCount}>
                {todayWorkout.exercises.length} exercises
                {todayWorkout.cardio ? ' + cardio' : ''}
              </Text>
            )}
          </View>
          {!todayWorkout.isRestDay && (
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          )}
        </View>
      </Pressable>

      <Text style={styles.sectionTitle}>This Week</Text>
      <View style={styles.weekGrid}>
        {plan.workouts.map((w, i) => {
          const isToday = i === dayIndex;
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
                w.isRestDay && styles.weekDayRest,
              ]}
            >
              <Text style={[styles.weekDayName, isToday && styles.weekDayNameToday]}>
                {w.dayName.slice(0, 3)}
              </Text>
              <Ionicons
                name={w.isRestDay ? 'bed-outline' : 'barbell-outline'}
                size={16}
                color={isToday ? Colors.primary : w.isRestDay ? Colors.textMuted : Colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>

      {plan.explanation ? (
        <>
          <Text style={styles.sectionTitle}>Coach Notes</Text>
          <View style={styles.notesCard}>
            <MaterialCommunityIcons name="robot-happy" size={20} color={Colors.secondary} />
            <Text style={styles.notesText}>{plan.explanation}</Text>
          </View>
        </>
      ) : null}

      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          This app provides general fitness guidance only. Not medical advice. Results are not guaranteed. Consult a professional before starting any fitness program.
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
  },
  goalLabel: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
    marginTop: 2,
  },
  checkInButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calorieTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_600SemiBold',
    color: '#052e16',
  },
  calorieTarget: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: 'rgba(0,0,0,0.6)',
  },
  calorieBarContainer: {
    marginBottom: 16,
  },
  calorieBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  calorieBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#052e16',
  },
  calorieStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calorieStat: {
    alignItems: 'center',
  },
  calorieStatValue: {
    fontSize: 20,
    fontFamily: 'Rubik_700Bold',
    color: '#052e16',
  },
  calorieStatLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  todayCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  todayCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  restBadge: {
    backgroundColor: 'rgba(13,148,136,0.15)',
  },
  todayInfo: {
    flex: 1,
  },
  todayDayName: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
  },
  todayTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginTop: 2,
  },
  todayExCount: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  weekGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 24,
  },
  weekDayCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.card,
    gap: 6,
  },
  weekDayToday: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  weekDayRest: {
    opacity: 0.6,
  },
  weekDayName: {
    fontSize: 11,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  weekDayNameToday: {
    color: Colors.primary,
  },
  notesCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
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

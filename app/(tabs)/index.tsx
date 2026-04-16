import React, { useEffect, useMemo } from 'react';
import type { ComponentProps } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type McIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CalorieRing({ progress, eaten, remaining, isOver }: {
  progress: number;
  eaten: number;
  remaining: number;
  isOver: boolean;
}) {
  const size = 156;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeColor = isOver ? Colors.error : Colors.primary;

  const animValue = useSharedValue(0);
  useEffect(() => {
    animValue.value = withTiming(clampedProgress, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animValue.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isOver ? Colors.error : Colors.primary} />
            <Stop offset="100%" stopColor={isOver ? '#FF6B6B' : Colors.accent} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ringGrad)`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.ringValue, isOver && { color: Colors.error }]}>
          {isOver ? '+' + (caloriesOver(eaten, remaining)) : remaining}
        </Text>
        <Text style={styles.ringLabel}>{isOver ? 'over today' : 'kcal left'}</Text>
      </View>
    </View>
  );
}

function caloriesOver(eaten: number, remaining: number) {
  return eaten - (eaten - remaining);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, plan, isOnboarded, isLoading, foodLog, weekNumber, checkIns } = useFitCoach();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

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
  const overAmount = isOver ? caloriesEaten - plan.dailyCalories : 0;

  const displayName = useMemo(() => {
    if (user?.displayName) return user.displayName.split(' ')[0];
    if (user?.email) {
      const local = user.email.split('@')[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return '';
  }, [user]);

  const hourOfDay = today.getHours();
  const greeting = hourOfDay < 12 ? 'Good morning' : hourOfDay < 17 ? 'Good afternoon' : 'Good evening';

  const streak = useMemo(() => {
    if (!checkIns.length) return 0;
    const uniqueWeeks = Array.from(new Set(checkIns.map(c => c.weekNumber))).sort((a, b) => b - a);
    let count = 1;
    for (let i = 1; i < uniqueWeeks.length; i++) {
      if (uniqueWeeks[i - 1] - uniqueWeeks[i] === 1) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [checkIns]);

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
          <Text style={styles.greeting}>{displayName ? `${greeting}, ${displayName}` : `Week ${weekNumber}`}</Text>
          <Text style={styles.goalLabel}>
            {displayName ? `Week ${weekNumber} · ` : ''}
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
          <Ionicons name="clipboard-outline" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.calorieCardOuter}>
        <LinearGradient
          colors={isOver
            ? ['rgba(239,68,68,0.12)', 'rgba(0,0,0,0)']
            : ['rgba(74,222,128,0.1)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.calorieCardGradient}
        >
          <View style={styles.calorieCardRow}>
            <CalorieRing
              progress={calorieProgress}
              eaten={caloriesEaten}
              remaining={isOver ? overAmount : caloriesRemaining}
              isOver={isOver}
            />
            <View style={styles.calorieMeta}>
              <Text style={styles.calorieCardTitle}>Today's Calories</Text>
              <View style={styles.calorieMetaItem}>
                <View style={[styles.metaDot, { backgroundColor: isOver ? Colors.error : Colors.primary }]} />
                <View>
                  <Text style={[styles.calorieMetaValue, isOver && { color: Colors.error }]}>{caloriesEaten}</Text>
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
                  width: `${Math.min(100, Math.round(calorieProgress * 100))}%` as DimensionValue,
                  backgroundColor: isOver ? Colors.error : Colors.primary,
                },
              ]}
            />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.metricTiles}>
        {(([
          { icon: 'arm-flex' as McIconName, iconLib: 'mc' as const, value: `${plan.proteinGrams}g`, label: 'protein', color: Colors.violet, bg: 'rgba(167,139,250,0.15)' },
          { icon: 'calendar-outline' as IoniconName, iconLib: 'ion' as const, value: String(weekNumber), label: 'week', color: Colors.accent, bg: 'rgba(0,212,255,0.15)' },
          { icon: 'flame' as IoniconName, iconLib: 'ion' as const, value: String(streak), label: 'streak', color: Colors.primary, bg: 'rgba(74,222,128,0.15)' },
        ] as (
          | { icon: McIconName; iconLib: 'mc'; value: string; label: string; color: string; bg: string }
          | { icon: IoniconName; iconLib: 'ion'; value: string; label: string; color: string; bg: string }
        )[])).map((tile) => (
          <View key={tile.label} style={styles.metricTile}>
            <View style={[styles.metricTileIcon, { backgroundColor: tile.bg }]}>
              {tile.iconLib === 'mc'
                ? <MaterialCommunityIcons name={tile.icon} size={18} color={tile.color} />
                : <Ionicons name={tile.icon} size={18} color={tile.color} />
              }
            </View>
            <Text style={[styles.metricTileValue, { color: tile.color }]}>{tile.value}</Text>
            <Text style={styles.metricTileLabel}>{tile.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>Today's Workout</Text>
      </View>
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
        {!todayWorkout.isRestDay && (
          <LinearGradient
            colors={['rgba(74,222,128,0.07)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {!todayWorkout.isRestDay && <View style={styles.todayCardAccent} />}
        <View style={styles.todayCardContent}>
          <View style={[styles.dayBadge, todayWorkout.isRestDay && styles.restBadge]}>
            <Ionicons
              name={todayWorkout.isRestDay ? 'bed-outline' : 'barbell-outline'}
              size={22}
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

      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>This Week</Text>
      </View>
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
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: Colors.accent }]} />
            <Text style={styles.sectionTitle}>Coach Notes</Text>
          </View>
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
    fontSize: 24,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  goalLabel: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
    marginTop: 3,
  },
  checkInButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieCardOuter: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.18)',
    backgroundColor: Colors.card,
  },
  calorieCardGradient: {
    padding: 20,
  },
  calorieCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  calorieMeta: {
    flex: 1,
    gap: 12,
  },
  calorieCardTitle: {
    fontSize: 11,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
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
    fontSize: 17,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    lineHeight: 19,
  },
  calorieMetaLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  ringValue: {
    fontSize: 24,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    lineHeight: 26,
    textAlign: 'center',
  },
  ringLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  calorieBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  calorieBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  metricTiles: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  metricTile: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricTileValue: {
    fontSize: 19,
    fontFamily: 'Rubik_700Bold',
    lineHeight: 21,
  },
  metricTileLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Rubik_700Bold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  todayCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  todayCardActive: {
    borderColor: 'rgba(74,222,128,0.3)',
  },
  todayCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  todayCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingLeft: 22,
  },
  dayBadge: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  restBadge: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  todayInfo: {
    flex: 1,
  },
  todayDayName: {
    fontSize: 11,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayTitle: {
    fontSize: 17,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginTop: 2,
  },
  todayExCount: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginTop: 3,
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
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
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: Colors.card,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekDayToday: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderColor: Colors.primary,
  },
  weekDayRest: {
    opacity: 0.4,
  },
  weekDayName: {
    fontSize: 10,
    fontFamily: 'Rubik_700Bold',
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

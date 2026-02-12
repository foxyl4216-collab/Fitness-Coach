import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import { router } from 'expo-router';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { profile, plan, checkIns, weekNumber, resetApp } = useFitCoach();

  const weightData = useMemo(() => {
    if (!profile) return [];
    const data = [{ week: 0, weight: profile.weightKg }];
    checkIns.forEach(c => {
      data.push({ week: c.weekNumber, weight: c.weightKg });
    });
    return data;
  }, [profile, checkIns]);

  const weightChange = useMemo(() => {
    if (weightData.length < 2) return 0;
    return weightData[weightData.length - 1].weight - weightData[0].weight;
  }, [weightData]);

  const avgAdherence = useMemo(() => {
    if (checkIns.length === 0) return 0;
    return Math.round(checkIns.reduce((s, c) => s + c.adherencePercent, 0) / checkIns.length);
  }, [checkIns]);

  const maxWeight = useMemo(() => Math.max(...weightData.map(d => d.weight), 0), [weightData]);
  const minWeight = useMemo(() => Math.min(...weightData.map(d => d.weight), maxWeight), [weightData, maxWeight]);
  const weightRange = maxWeight - minWeight || 5;

  const handleReset = () => {
    Alert.alert(
      'Start Over',
      'This will erase all your data and plans. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: async () => {
            await resetApp();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  if (!profile || !plan) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <Text style={styles.emptyText}>Complete onboarding to see your progress</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
        paddingBottom: Platform.OS === 'web' ? 34 : 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Progress</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.weightKg}</Text>
          <Text style={styles.statLabel}>start kg</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[
            styles.statValue,
            weightChange < 0 && profile.goal === 'fat_loss' && styles.statPositive,
            weightChange > 0 && profile.goal === 'muscle_gain' && styles.statPositive,
          ]}>
            {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>kg change</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{avgAdherence}%</Text>
          <Text style={styles.statLabel}>adherence</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{weekNumber}</Text>
          <Text style={styles.statLabel}>week</Text>
        </View>
      </View>

      {weightData.length > 1 && (
        <>
          <Text style={styles.sectionTitle}>Weight Trend</Text>
          <View style={styles.chartCard}>
            <View style={styles.chart}>
              {weightData.map((d, i) => {
                const normalizedHeight = ((d.weight - minWeight) / weightRange) * 100;
                return (
                  <View key={i} style={styles.chartBarContainer}>
                    <Text style={styles.chartBarValue}>{d.weight}</Text>
                    <View style={[
                      styles.chartBar,
                      { height: Math.max(normalizedHeight, 10) },
                      i === weightData.length - 1 && styles.chartBarCurrent,
                    ]} />
                    <Text style={styles.chartBarLabel}>W{d.week}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Check-in History</Text>
      {checkIns.length === 0 ? (
        <View style={styles.emptyCheckins}>
          <Ionicons name="clipboard-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.emptyCheckinsText}>No check-ins yet</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/check-in');
            }}
            style={styles.firstCheckInBtn}
          >
            <Text style={styles.firstCheckInText}>Submit First Check-in</Text>
          </Pressable>
        </View>
      ) : (
        checkIns.slice().reverse().map((c, i) => (
          <View key={i} style={styles.checkInCard}>
            <View style={styles.checkInHeader}>
              <Text style={styles.checkInWeek}>Week {c.weekNumber}</Text>
              <Text style={styles.checkInDate}>
                {new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.checkInStats}>
              <View style={styles.checkInStat}>
                <Ionicons name="scale-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.checkInStatText}>{c.weightKg} kg</Text>
              </View>
              <View style={styles.checkInStat}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.checkInStatText}>{c.adherencePercent}%</Text>
              </View>
              <View style={styles.checkInStat}>
                <Ionicons name="flash-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.checkInStatText}>{c.energyLevel}</Text>
              </View>
              {c.waistCm ? (
                <View style={styles.checkInStat}>
                  <MaterialCommunityIcons name="tape-measure" size={16} color={Colors.textMuted} />
                  <Text style={styles.checkInStatText}>{c.waistCm} cm</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))
      )}

      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Goal</Text>
            <Text style={styles.profileValue}>
              {profile.goal === 'fat_loss' ? 'Fat Loss' : 'Muscle Gain'}
            </Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Focus</Text>
            <Text style={styles.profileValue}>
              {profile.focusTrack === 'none' ? 'General' : profile.focusTrack === 'belly_fat' ? 'Belly Fat' : 'Glute Gain'}
            </Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Daily Calories</Text>
            <Text style={styles.profileValue}>{plan.dailyCalories} kcal</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Protein Target</Text>
            <Text style={styles.profileValue}>{plan.proteinGrams}g</Text>
          </View>
        </View>

        <Pressable onPress={handleReset} style={styles.resetButton}>
          <Ionicons name="refresh" size={18} color={Colors.error} />
          <Text style={styles.resetText}>Start Over</Text>
        </Pressable>
      </View>
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
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  statPositive: {
    color: Colors.success,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  chartCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarValue: {
    fontSize: 10,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  chartBar: {
    width: 20,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    opacity: 0.6,
  },
  chartBarCurrent: {
    backgroundColor: Colors.primary,
    opacity: 1,
  },
  chartBarLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
  },
  emptyCheckins: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
    marginBottom: 24,
  },
  emptyCheckinsText: {
    fontSize: 15,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  firstCheckInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  firstCheckInText: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.white,
  },
  checkInCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  checkInWeek: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  checkInDate: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  checkInStats: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  checkInStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkInStatText: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  profileSection: {
    marginTop: 16,
  },
  profileCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileLabel: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
  },
  profileValue: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  resetText: {
    fontSize: 15,
    fontFamily: 'Rubik_500Medium',
    color: Colors.error,
  },
});

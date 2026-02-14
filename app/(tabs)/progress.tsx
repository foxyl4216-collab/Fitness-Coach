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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, plan, checkIns, weekNumber, resetApp } = useFitCoach();
  const { logout, user } = useAuth();

  const displayName = useMemo(() => {
    if (user?.email) {
      const local = user.email.split('@')[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return 'User';
  }, [user]);

  const initials = useMemo(() => {
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

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

  const handleLogout = async () => {
    await resetApp();
    await logout();
    router.replace('/login');
  };

  if (!profile || !plan) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <Text style={styles.emptyText}>Complete onboarding to see your profile</Text>
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
      <View style={styles.profileHeader}>
        <LinearGradient
          colors={['#4ADE80', '#22C55E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        <Text style={styles.userName}>{displayName}</Text>
        {user?.email && (
          <Text style={styles.userEmail}>{user.email}</Text>
        )}
        <View style={styles.goalBadge}>
          <Ionicons
            name={profile.goal === 'fat_loss' ? 'flame' : 'barbell'}
            size={14}
            color={Colors.primary}
          />
          <Text style={styles.goalBadgeText}>
            {profile.goal === 'fat_loss' ? 'Fat Loss' : 'Muscle Gain'}
            {profile.focusTrack !== 'none' && (
              ` · ${profile.focusTrack === 'belly_fat' ? 'Belly Focus' : 'Glute Focus'}`
            )}
          </Text>
        </View>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.detailLabel}>Current Week</Text>
          <Text style={styles.detailValue}>{weekNumber}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="flame-outline" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.detailLabel}>Daily Calories</Text>
          <Text style={styles.detailValue}>{plan.dailyCalories} kcal</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <MaterialCommunityIcons name="food-drumstick-outline" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.detailLabel}>Protein Target</Text>
          <Text style={styles.detailValue}>{plan.proteinGrams}g</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="scale-outline" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.detailLabel}>Starting Weight</Text>
          <Text style={styles.detailValue}>{profile.weightKg} kg</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="body-outline" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.detailLabel}>Experience</Text>
          <Text style={styles.detailValue}>
            {profile.experience === 'beginner' ? 'Beginner' : profile.experience === 'some' ? 'Intermediate' : 'Experienced'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{displayName}'s Progress</Text>

      <View style={styles.statsRow}>
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
          <Text style={styles.statValue}>{checkIns.length}</Text>
          <Text style={styles.statLabel}>check-ins</Text>
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

      <View style={styles.actionsSection}>
        <Pressable onPress={handleReset} style={styles.actionButton}>
          <Ionicons name="refresh" size={18} color={Colors.error} />
          <Text style={styles.actionTextDanger}>Start Over</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable onPress={handleLogout} style={styles.actionButton}>
          <Ionicons name="log-out-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.actionText}>Sign Out</Text>
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
  emptyText: {
    fontSize: 16,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Rubik_700Bold',
    color: '#052e16',
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  goalBadgeText: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
  },
  detailsCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 4,
    marginBottom: 28,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(74,222,128,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
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
    color: Colors.black,
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
  actionsSection: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  actionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  actionTextDanger: {
    fontSize: 15,
    fontFamily: 'Rubik_500Medium',
    color: Colors.error,
  },
  actionText: {
    fontSize: 15,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
});

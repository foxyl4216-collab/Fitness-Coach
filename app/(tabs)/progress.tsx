import React, { useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { router } from 'expo-router';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, plan, checkIns, weekNumber, resetApp } = useFitCoach();
  const { logout, user, updateProfile } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const displayName = useMemo(() => {
    if (user?.displayName) return user.displayName;
    if (user?.email) {
      const local = user.email.split('@')[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return 'User';
  }, [user]);

  const initials = useMemo(() => {
    const name = user?.displayName || displayName;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [user, displayName]);

  const weightData = useMemo(() => {
    if (!profile) return [];
    const data = [{ week: 0, weight: profile.weightKg }];
    checkIns.forEach(c => { data.push({ week: c.weekNumber, weight: c.weightKg }); });
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

  const openEditModal = () => {
    setEditName(user?.displayName || displayName);
    setEditEmail(user?.email || '');
    setEditError(null);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    if (!trimmedName) { setEditError('Name is required'); return; }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setEditError('Valid email is required'); return; }
    setSaving(true);
    setEditError(null);
    try {
      await updateProfile({ displayName: trimmedName, email: trimmedEmail !== user?.email ? trimmedEmail : undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditModal(false);
    } catch (e: any) {
      const msg = e?.message || 'Failed to update profile';
      setEditError(msg.includes(':') ? msg.split(':').slice(1).join(':').trim() : msg);
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    Alert.alert('Start Over', 'This will erase all your data and plans. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Over', style: 'destructive', onPress: async () => {
        await resetApp();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.replace('/onboarding');
      }},
    ]);
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) { await logout(); router.replace('/login'); }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: async () => { await logout(); router.replace('/login'); } },
      ]);
    }
  };

  if (!profile || !plan) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top, justifyContent: 'space-between' }]}>
        <Text style={styles.emptyText}>Complete onboarding to see your profile</Text>
        <Pressable onPress={handleLogout} style={[styles.logoutButton, { marginBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20) }]}>
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  const isGoalMet = (weightChange < 0 && profile.goal === 'fat_loss') || (weightChange > 0 && profile.goal === 'muscle_gain');

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
          paddingBottom: Platform.OS === 'web' ? 100 : 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <Pressable style={styles.editBtn} onPress={openEditModal}>
            <Ionicons name="create-outline" size={18} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.avatarRing}>
            <LinearGradient colors={['#4ADE80', '#00D4FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarGradient}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
          <View style={styles.goalBadge}>
            <Ionicons name={profile.goal === 'fat_loss' ? 'flame' : 'barbell'} size={13} color={Colors.primary} />
            <Text style={styles.goalBadgeText}>
              {profile.goal === 'fat_loss' ? 'Fat Loss' : 'Muscle Gain'}
              {profile.focusTrack !== 'none' && ` · ${profile.focusTrack === 'belly_fat' ? 'Belly Focus' : 'Glute Focus'}`}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, isGoalMet && styles.statCardPositive]}>
            <Text style={[styles.statValue, isGoalMet && { color: Colors.success }]}>
              {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>kg change</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgAdherence}%</Text>
            <Text style={styles.statLabel}>avg adherence</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{checkIns.length}</Text>
            <Text style={styles.statLabel}>check-ins</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Fitness Details</Text>
        <View style={styles.detailsCard}>
          {(([
            { icon: 'calendar-outline', label: 'Current Week', value: `Week ${weekNumber}` },
            { icon: 'flame-outline', label: 'Daily Calories', value: `${plan.dailyCalories} kcal` },
            { icon: 'barbell-outline', label: 'Protein Target', value: `${plan.proteinGrams}g` },
            { icon: 'scale-outline', label: 'Starting Weight', value: `${profile.weightKg} kg` },
            { icon: 'body-outline', label: 'Experience', value: profile.experience === 'beginner' ? 'Beginner' : profile.experience === 'some' ? 'Intermediate' : 'Advanced' },
          ] as { icon: IoniconName; label: string; value: string }[])).map((row, i, arr) => (
            <View key={row.label}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name={row.icon} size={15} color={Colors.primary} />
                </View>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.detailDivider} />}
            </View>
          ))}
        </View>

        {weightData.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Weight Trend</Text>
            <View style={styles.chartCard}>
              <View style={styles.chart}>
                {weightData.map((d, i) => {
                  const normalizedHeight = ((d.weight - minWeight) / weightRange) * 100;
                  const isCurrent = i === weightData.length - 1;
                  return (
                    <View key={i} style={styles.chartBarContainer}>
                      <Text style={styles.chartBarValue}>{d.weight}</Text>
                      <View style={[
                        styles.chartBar,
                        { height: Math.max(normalizedHeight, 8), backgroundColor: isCurrent ? Colors.primary : Colors.surface },
                        isCurrent && styles.chartBarCurrent,
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
            <Ionicons name="clipboard-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyCheckinsText}>No check-ins yet</Text>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/check-in'); }} style={styles.firstCheckInBtn}>
              <Text style={styles.firstCheckInText}>Submit First Check-in</Text>
            </Pressable>
          </View>
        ) : (
          checkIns.slice().reverse().map((c, i) => (
            <View key={i} style={styles.checkInCard}>
              <View style={styles.checkInHeader}>
                <Text style={styles.checkInWeek}>Week {c.weekNumber}</Text>
                <Text style={styles.checkInDate}>{new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
              <View style={styles.checkInStats}>
                {(([
                  { icon: 'scale-outline', value: `${c.weightKg} kg` },
                  { icon: 'checkmark-circle-outline', value: `${c.adherencePercent}%` },
                  { icon: 'flash-outline', value: c.energyLevel },
                ] as { icon: IoniconName; value: string }[])).map((s, si) => (
                  <View key={si} style={styles.checkInStat}>
                    <Ionicons name={s.icon} size={14} color={Colors.textMuted} />
                    <Text style={styles.checkInStatText}>{s.value}</Text>
                  </View>
                ))}
                {c.waistCm ? (
                  <View style={styles.checkInStat}>
                    <MaterialCommunityIcons name="tape-measure" size={14} color={Colors.textMuted} />
                    <Text style={styles.checkInStatText}>{c.waistCm} cm</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}

        <View style={styles.actionButtons}>
          <Pressable onPress={handleReset} style={styles.resetButton}>
            <Ionicons name="refresh-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.resetText}>Start Over</Text>
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={16} color={Colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => !saving && setShowEditModal(false)} />
          <View style={[styles.modalContent, { paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => !saving && setShowEditModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={Colors.textMuted} autoCapitalize="words" editable={!saving} />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="your@email.com" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" editable={!saving} />
            {editError && (
              <View style={styles.editErrorRow}>
                <Ionicons name="alert-circle" size={15} color={Colors.error} />
                <Text style={styles.editErrorText}>{editError}</Text>
              </View>
            )}
            <Pressable onPress={handleSaveProfile} disabled={saving} style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, saving && styles.saveBtnDisabled]}>
              {saving ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  editBtn: {
    position: 'absolute',
    top: 0,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 2,
    marginBottom: 14,
  },
  avatarGradient: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontFamily: 'Rubik_700Bold',
    color: Colors.primary,
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 3,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  goalBadgeText: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statCardPositive: {
    borderColor: 'rgba(16,185,129,0.3)',
    backgroundColor: 'rgba(16,185,129,0.05)',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
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
  detailsCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 18,
    paddingVertical: 4,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
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
    fontSize: 13,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  chartCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarValue: {
    fontSize: 9,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  chartBar: {
    width: 18,
    borderRadius: 5,
    backgroundColor: Colors.surface,
  },
  chartBarCurrent: {
    backgroundColor: Colors.primary,
  },
  chartBarLabel: {
    fontSize: 9,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
  },
  emptyCheckins: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
    marginBottom: 24,
  },
  emptyCheckinsText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  firstCheckInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginTop: 8,
  },
  firstCheckInText: {
    fontSize: 13,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.black,
  },
  checkInCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  checkInWeek: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  checkInDate: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  checkInStats: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  checkInStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkInStatText: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
  },
  logoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: Colors.cardElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.borderStrong,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Rubik_400Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  editErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  editErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.error,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnPressed: {
    opacity: 0.85,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.black,
  },
});

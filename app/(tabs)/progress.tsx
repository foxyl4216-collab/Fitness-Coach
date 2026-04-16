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
import Svg, {
  Path,
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { router } from 'expo-router';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const CHART_H = 110;
const CHART_W = 280;

function WeightAreaChart({
  data, minWeight, maxWeight, weightRange,
}: {
  data: { week: number; weight: number }[];
  minWeight: number;
  maxWeight: number;
  weightRange: number;
}) {
  const pts = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * CHART_W,
    y: CHART_H - 10 - ((d.weight - minWeight) / weightRange) * (CHART_H - 20),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = linePath
    + ` L${pts[pts.length - 1].x.toFixed(1)},${CHART_H} L0,${CHART_H} Z`;

  return (
    <View>
      <Svg width="100%" height={CHART_H + 20} viewBox={`0 0 ${CHART_W} ${CHART_H + 20}`} preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaFill)" />
        <Path d={linePath} stroke={Colors.primary} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <SvgCircle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === pts.length - 1 ? 5 : 3.5}
            fill={i === pts.length - 1 ? Colors.primary : Colors.cardElevated}
            stroke={Colors.primary}
            strokeWidth="2"
          />
        ))}
      </Svg>
      <View style={styles.chartLabels}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.chartLabel, i === data.length - 1 && { color: Colors.primary, fontFamily: 'Rubik_600SemiBold' }]}>
            W{d.week}
          </Text>
        ))}
      </View>
    </View>
  );
}

const STAT_CONFIGS = [
  { icon: 'trending-down-outline' as IoniconName, color: Colors.success, bg: 'rgba(16,185,129,0.15)', grad: ['rgba(16,185,129,0.30)', 'rgba(16,185,129,0.08)'] as const },
  { icon: 'checkmark-circle-outline' as IoniconName, color: Colors.accent, bg: 'rgba(0,212,255,0.15)', grad: ['rgba(0,212,255,0.30)', 'rgba(0,212,255,0.08)'] as const },
  { icon: 'clipboard-outline' as IoniconName, color: Colors.violet, bg: 'rgba(167,139,250,0.15)', grad: ['rgba(167,139,250,0.30)', 'rgba(167,139,250,0.08)'] as const },
  { icon: 'calendar-outline' as IoniconName, color: Colors.amber, bg: 'rgba(245,158,11,0.15)', grad: ['rgba(245,158,11,0.30)', 'rgba(245,158,11,0.08)'] as const },
];

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

  const statsData = [
    { value: `${weightChange >= 0 ? '+' : ''}${weightChange.toFixed(1)} kg`, label: 'weight change', configIdx: 0, highlight: isGoalMet },
    { value: `${avgAdherence}%`, label: 'adherence', configIdx: 1, highlight: false },
    { value: String(checkIns.length), label: 'check-ins', configIdx: 2, highlight: false },
    { value: `Wk ${weekNumber}`, label: 'current week', configIdx: 3, highlight: false },
  ];

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
            <Ionicons name="create-outline" size={17} color={Colors.textSecondary} />
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
          {statsData.map((stat, i) => {
            const cfg = STAT_CONFIGS[stat.configIdx];
            return (
              <View key={i} style={[styles.statCard, stat.highlight && styles.statCardPositive]}>
                <LinearGradient
                  colors={stat.highlight ? ['rgba(16,185,129,0.35)', 'rgba(16,185,129,0.10)'] : cfg.grad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.statIconWrap}
                >
                  <Ionicons name={stat.highlight ? 'trending-down' as IoniconName : cfg.icon} size={16} color={stat.highlight ? Colors.success : cfg.color} />
                </LinearGradient>
                <Text style={[styles.statValue, stat.highlight && { color: Colors.success }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>Fitness Details</Text>
        </View>
        <View style={styles.detailsCard}>
          {(([
            { icon: 'flame-outline', label: 'Daily Calories', value: `${plan.dailyCalories} kcal`, color: Colors.primary, bg: 'rgba(74,222,128,0.1)' },
            { icon: 'barbell-outline', label: 'Protein Target', value: `${plan.proteinGrams}g`, color: Colors.accent, bg: 'rgba(0,212,255,0.1)' },
            { icon: 'scale-outline', label: 'Starting Weight', value: `${profile.weightKg} kg`, color: Colors.violet, bg: 'rgba(167,139,250,0.1)' },
            { icon: 'calendar-outline', label: 'Current Week', value: `Week ${weekNumber}`, color: Colors.amber, bg: 'rgba(245,158,11,0.1)' },
            { icon: 'body-outline', label: 'Experience', value: profile.experience === 'beginner' ? 'Beginner' : profile.experience === 'some' ? 'Intermediate' : 'Advanced', color: Colors.textSecondary, bg: Colors.surface },
          ] as { icon: IoniconName; label: string; value: string; color: string; bg: string }[])).map((row, i, arr) => (
            <View key={row.label}>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconWrap, { backgroundColor: row.bg }]}>
                  <Ionicons name={row.icon} size={15} color={row.color} />
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
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: Colors.primary }]} />
              <Text style={styles.sectionTitle}>Weight Trend</Text>
              <Text style={styles.sectionSubLabel}>
                {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)} kg total
              </Text>
            </View>
            <View style={styles.chartCard}>
              <WeightAreaChart data={weightData} minWeight={minWeight} maxWeight={maxWeight} weightRange={weightRange} />
            </View>
          </>
        )}

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, { backgroundColor: Colors.violet }]} />
          <Text style={styles.sectionTitle}>Check-in History</Text>
        </View>
        {checkIns.length === 0 ? (
          <View style={styles.emptyCheckins}>
            <View style={styles.emptyCheckinIcon}>
              <Ionicons name="clipboard-outline" size={28} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyCheckinsText}>No check-ins yet</Text>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/check-in'); }} style={styles.firstCheckInBtn}>
              <Text style={styles.firstCheckInText}>Submit First Check-in</Text>
            </Pressable>
          </View>
        ) : (
          checkIns.slice().reverse().map((c, i) => (
            <View key={i} style={styles.checkInCard}>
              <View style={styles.checkInHeader}>
                <View style={styles.checkInWeekBadge}>
                  <Text style={styles.checkInWeek}>Week {c.weekNumber}</Text>
                </View>
                <Text style={styles.checkInDate}>{new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
              <View style={styles.checkInStats}>
                {(([
                  { icon: 'scale-outline', value: `${c.weightKg} kg`, color: Colors.primary },
                  { icon: 'checkmark-circle-outline', value: `${c.adherencePercent}%`, color: Colors.accent },
                  { icon: 'flash-outline', value: c.energyLevel, color: Colors.amber },
                ] as { icon: IoniconName; value: string; color: string }[])).map((s, si) => (
                  <View key={si} style={styles.checkInStat}>
                    <Ionicons name={s.icon} size={14} color={s.color} />
                    <Text style={styles.checkInStatText}>{s.value}</Text>
                  </View>
                ))}
                {c.waistCm ? (
                  <View style={styles.checkInStat}>
                    <MaterialCommunityIcons name="tape-measure" size={14} color={Colors.violet} />
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
              <Pressable onPress={() => !saving && setShowEditModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
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
    marginBottom: 28,
  },
  editBtn: {
    position: 'absolute',
    top: 0,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 2,
    marginBottom: 14,
  },
  avatarGradient: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
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
    marginTop: 4,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  goalBadgeText: {
    fontSize: 12,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statCardPositive: {
    borderColor: 'rgba(16,185,129,0.3)',
    backgroundColor: 'rgba(16,185,129,0.04)',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
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
    flex: 1,
  },
  sectionSubLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
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
    width: 32,
    height: 32,
    borderRadius: 10,
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
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  chartLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  emptyCheckins: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  emptyCheckinIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  emptyCheckinsText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  firstCheckInBtn: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  firstCheckInText: {
    fontSize: 13,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.primary,
  },
  checkInCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInWeekBadge: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  checkInWeek: {
    fontSize: 12,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.primary,
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
    gap: 5,
  },
  checkInStatText: {
    fontSize: 13,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.borderStrong,
  },
  modalHandle: {
    width: 40,
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
    fontSize: 20,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textMuted,
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
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
    paddingVertical: 15,
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
    fontFamily: 'Rubik_700Bold',
    color: Colors.black,
  },
});

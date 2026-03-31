import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const { submitCheckIn, weekNumber, plan } = useFitCoach();
  const [weight, setWeight] = useState('');
  const [adherence, setAdherence] = useState('80');
  const [energy, setEnergy] = useState<'low' | 'normal' | 'high'>('normal');
  const [waist, setWaist] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!weight.trim()) {
      Alert.alert('Required', 'Please enter your current weight');
      return;
    }
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) {
      Alert.alert('Invalid', 'Please enter a valid weight');
      return;
    }
    setSubmitting(true);
    try {
      await submitCheckIn({
        weekNumber,
        weightKg: w,
        adherencePercent: parseInt(adherence, 10) || 80,
        energyLevel: energy,
        waistCm: waist ? parseFloat(waist) : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to submit check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <LinearGradient colors={['rgba(74,222,128,0.2)', 'rgba(74,222,128,0.05)']} style={styles.successIconGradient}>
              <Ionicons name="checkmark-circle" size={56} color={Colors.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.successTitle}>Check-in Complete</Text>
          <Text style={styles.successText}>
            Your plan has been updated for Week {weekNumber}. Head to the home screen to see your new adjustments.
          </Text>
          {plan?.explanation ? (
            <View style={styles.explanationCard}>
              <Ionicons name="bulb-outline" size={16} color={Colors.accent} />
              <Text style={styles.explanationText}>{plan.explanation}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient colors={['#4ADE80', '#22C55E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.doneBtnGradient}>
              <Text style={styles.doneBtnText}>Back to Home</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const adherenceVal = parseInt(adherence, 10) || 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={styles.headerBtn}
          >
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Weekly Check-in</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.weekBadge}>
                <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                <Text style={styles.weekBadgeText}>Week {weekNumber}</Text>
              </View>
            </View>
            <Text style={styles.title}>How did it go?</Text>
            <Text style={styles.subtitle}>Track your progress so we can adapt your plan</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Weight</Text>
              <View style={styles.largeInputWrapper}>
                <TextInput
                  style={styles.largeNumInput}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="0.0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                <Text style={styles.largeInputUnit}>kg</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Plan Adherence</Text>
                <Text style={styles.adherenceValue}>{adherence}%</Text>
              </View>
              <View style={styles.adherenceBarBg}>
                <View style={[styles.adherenceBarFill, { width: `${adherenceVal}%` }]} />
              </View>
              <View style={styles.adherenceButtons}>
                {['40', '60', '80', '90', '100'].map(val => (
                  <Pressable
                    key={val}
                    onPress={() => { setAdherence(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.adherenceBtn, adherence === val && styles.adherenceBtnActive]}
                  >
                    <Text style={[styles.adherenceBtnText, adherence === val && styles.adherenceBtnTextActive]}>{val}%</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Energy Level</Text>
              <View style={styles.energyRow}>
                {([
                  { key: 'low' as const, label: 'Low', icon: 'battery-dead-outline' as const },
                  { key: 'normal' as const, label: 'Normal', icon: 'battery-half-outline' as const },
                  { key: 'high' as const, label: 'High', icon: 'battery-full-outline' as const },
                ]).map(opt => (
                  <Pressable
                    key={opt.key}
                    onPress={() => { setEnergy(opt.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.energyOption, energy === opt.key && styles.energyOptionActive]}
                  >
                    <Ionicons name={opt.icon} size={20} color={energy === opt.key ? Colors.primary : Colors.textMuted} />
                    <Text style={[styles.energyText, energy === opt.key && styles.energyTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Waist Measurement <Text style={styles.optionalTag}>(optional)</Text></Text>
              <View style={styles.largeInputWrapper}>
                <TextInput
                  style={styles.largeNumInput}
                  value={waist}
                  onChangeText={setWaist}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                <Text style={styles.largeInputUnit}>cm</Text>
              </View>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9 }, submitting && { opacity: 0.5 }]}
            >
              <LinearGradient colors={['#4ADE80', '#22C55E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtnGradient}>
                <Text style={styles.submitBtnText}>{submitting ? 'Updating Plan...' : 'Submit Check-in'}</Text>
                {!submitting && <Ionicons name="arrow-forward" size={18} color={Colors.black} />}
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: 20,
    marginTop: 8,
  },
  cardHeaderRow: {
    marginBottom: 12,
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  weekBadgeText: {
    fontSize: 12,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.primary,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalTag: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    textTransform: 'none',
  },
  largeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 8,
  },
  largeNumInput: {
    fontSize: 40,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  largeInputUnit: {
    fontSize: 18,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
    alignSelf: 'flex-end',
    paddingBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Rubik_400Regular',
    color: Colors.text,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adherenceValue: {
    fontSize: 18,
    fontFamily: 'Rubik_700Bold',
    color: Colors.primary,
  },
  adherenceBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    marginBottom: 12,
  },
  adherenceBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  adherenceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  adherenceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adherenceBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(74,222,128,0.1)',
  },
  adherenceBtnText: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
  },
  adherenceBtnTextActive: {
    color: Colors.primary,
  },
  energyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  energyOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.card,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  energyOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  energyText: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
  },
  energyTextActive: {
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    flexDirection: 'row',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.black,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successIconWrap: {
    marginBottom: 20,
  },
  successIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  successText: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  explanationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    width: '100%',
  },
  explanationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  doneBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  doneBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.black,
  },
});

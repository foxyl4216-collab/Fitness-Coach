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
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Check-in Complete</Text>
          <Text style={styles.successText}>
            Your plan has been updated for Week {weekNumber}. Head to the home screen to see your new adjustments.
          </Text>
          {plan?.explanation ? (
            <View style={styles.explanationCard}>
              <Ionicons name="bulb" size={18} color={Colors.accent} />
              <Text style={styles.explanationText}>{plan.explanation}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.doneBtn}
          >
            <Text style={styles.doneBtnText}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const adherenceVal = parseInt(adherence, 10) || 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
          >
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Weekly Check-in</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.weekLabel}>Week {weekNumber} Check-in</Text>
          <Text style={styles.subtitle}>Track your progress so we can adapt your plan</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Weight (kg) *</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 68.5"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Plan Adherence</Text>
              <Text style={styles.adherenceValue}>{adherence}%</Text>
            </View>
            <View style={styles.adherenceBar}>
              <View style={[styles.adherenceFill, { width: `${adherenceVal}%` }]} />
            </View>
            <View style={styles.adherenceButtons}>
              {['40', '60', '80', '90', '100'].map(val => (
                <Pressable
                  key={val}
                  onPress={() => {
                    setAdherence(val);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.adherenceBtn,
                    adherence === val && styles.adherenceBtnActive,
                  ]}
                >
                  <Text style={[
                    styles.adherenceBtnText,
                    adherence === val && styles.adherenceBtnTextActive,
                  ]}>{val}%</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Energy Level</Text>
            <View style={styles.energyRow}>
              {([
                { key: 'low' as const, label: 'Low', icon: 'battery-dead' as const },
                { key: 'normal' as const, label: 'Normal', icon: 'battery-half' as const },
                { key: 'high' as const, label: 'High', icon: 'battery-full' as const },
              ]).map(opt => (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setEnergy(opt.key);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.energyOption,
                    energy === opt.key && styles.energyOptionActive,
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={energy === opt.key ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[
                    styles.energyText,
                    energy === opt.key && styles.energyTextActive,
                  ]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Waist Measurement (cm) - optional</Text>
            <TextInput
              style={styles.input}
              value={waist}
              onChangeText={setWaist}
              placeholder="e.g. 80"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16 }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9 }, submitting && { opacity: 0.5 }]}
          >
            <LinearGradient
              colors={['#4ADE80', '#22C55E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtnGradient}
            >
              <Text style={[styles.submitBtnText, { color: Colors.black }]}>
                {submitting ? 'Updating Plan...' : 'Submit Check-in'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  weekLabel: {
    fontSize: 24,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
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
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Rubik_400Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
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
  adherenceBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    marginBottom: 12,
  },
  adherenceFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  adherenceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  adherenceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adherenceBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(74,222,128,0.12)',
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
    fontSize: 13,
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
  },
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 17,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.white,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  explanationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 32,
  },
  explanationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.white,
  },
});

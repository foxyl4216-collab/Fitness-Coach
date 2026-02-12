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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import type { UserProfile } from '@/lib/storage';

type Step = 'goal' | 'focus' | 'details' | 'lifestyle';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setOnboarded } = useFitCoach();
  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState<'fat_loss' | 'muscle_gain'>('fat_loss');
  const [focusTrack, setFocusTrack] = useState<'none' | 'belly_fat' | 'glute_gain'>('none');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('25');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('70');
  const [experience, setExperience] = useState<'beginner' | 'some' | 'experienced'>('beginner');
  const [dietPref, setDietPref] = useState<'anything' | 'vegetarian' | 'vegan'>('anything');
  const [equipment, setEquipment] = useState<'none' | 'basic' | 'full_gym'>('basic');
  const [daysPerWeek, setDaysPerWeek] = useState('4');
  const [injuries, setInjuries] = useState('');
  const [saving, setSaving] = useState(false);

  const steps: Step[] = ['goal', 'focus', 'details', 'lifestyle'];
  const currentIndex = steps.indexOf(step);
  const progress = (currentIndex + 1) / steps.length;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const profile: UserProfile = {
        goal,
        focusTrack,
        age: parseInt(age, 10) || 25,
        heightCm: parseInt(height, 10) || 170,
        weightKg: parseInt(weight, 10) || 70,
        gender,
        experience,
        dietPreference: dietPref,
        equipment,
        daysPerWeek: parseInt(daysPerWeek, 10) || 4,
        injuries,
      };
      await setOnboarded(profile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const OptionCard = ({
    selected,
    onPress,
    icon,
    title,
    subtitle,
  }: {
    selected: boolean;
    onPress: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
  }) => (
    <Pressable
      onPress={onPress}
      style={[styles.optionCard, selected && styles.optionCardSelected]}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        {icon}
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      <View style={[styles.optionRadio, selected && styles.optionRadioSelected]}>
        {selected && <View style={styles.optionRadioDot} />}
      </View>
    </Pressable>
  );

  const SmallOption = ({
    selected,
    onPress,
    label,
  }: {
    selected: boolean;
    onPress: () => void;
    label: string;
  }) => (
    <Pressable
      onPress={onPress}
      style={[styles.smallOption, selected && styles.smallOptionSelected]}
    >
      <Text style={[styles.smallOptionText, selected && styles.smallOptionTextSelected]}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16 }]}>
        <View style={styles.header}>
          {currentIndex > 0 ? (
            <Pressable onPress={goBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'goal' && (
            <>
              <Text style={styles.stepTitle}>What's your goal?</Text>
              <Text style={styles.stepSubtitle}>Choose your primary fitness objective</Text>

              <OptionCard
                selected={goal === 'fat_loss'}
                onPress={() => setGoal('fat_loss')}
                icon={<Ionicons name="flame" size={24} color={goal === 'fat_loss' ? Colors.primary : Colors.textMuted} />}
                title="Fat Loss"
                subtitle="Lose body fat with structured training and a calorie deficit"
              />
              <OptionCard
                selected={goal === 'muscle_gain'}
                onPress={() => setGoal('muscle_gain')}
                icon={<Ionicons name="barbell" size={24} color={goal === 'muscle_gain' ? Colors.primary : Colors.textMuted} />}
                title="Muscle Gain"
                subtitle="Build lean muscle with progressive overload and a calorie surplus"
              />
            </>
          )}

          {step === 'focus' && (
            <>
              <Text style={styles.stepTitle}>Focus Track</Text>
              <Text style={styles.stepSubtitle}>Optional area of emphasis for your training</Text>

              <OptionCard
                selected={focusTrack === 'none'}
                onPress={() => setFocusTrack('none')}
                icon={<Ionicons name="fitness" size={24} color={focusTrack === 'none' ? Colors.primary : Colors.textMuted} />}
                title="General Fitness"
                subtitle="Balanced full-body approach"
              />
              <OptionCard
                selected={focusTrack === 'belly_fat'}
                onPress={() => setFocusTrack('belly_fat')}
                icon={<MaterialCommunityIcons name="stomach" size={24} color={focusTrack === 'belly_fat' ? Colors.primary : Colors.textMuted} />}
                title="Reduce Belly Fat"
                subtitle="Extra core work and activity circuits"
              />
              <OptionCard
                selected={focusTrack === 'glute_gain'}
                onPress={() => setFocusTrack('glute_gain')}
                icon={<MaterialCommunityIcons name="human-female-dance" size={24} color={focusTrack === 'glute_gain' ? Colors.primary : Colors.textMuted} />}
                title="Glute Growth"
                subtitle="Lower body emphasis with glute hypertrophy"
              />

              {focusTrack === 'belly_fat' && (
                <View style={styles.disclaimer}>
                  <Ionicons name="information-circle" size={16} color={Colors.warning} />
                  <Text style={styles.disclaimerText}>
                    Spot fat reduction is not guaranteed. Overall fat loss naturally reduces belly fat.
                  </Text>
                </View>
              )}
            </>
          )}

          {step === 'details' && (
            <>
              <Text style={styles.stepTitle}>About You</Text>
              <Text style={styles.stepSubtitle}>Help us personalize your plan</Text>

              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.optionRow}>
                <SmallOption selected={gender === 'male'} onPress={() => setGender('male')} label="Male" />
                <SmallOption selected={gender === 'female'} onPress={() => setGender('female')} label="Female" />
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Training Experience</Text>
              <View style={styles.optionRow}>
                <SmallOption selected={experience === 'beginner'} onPress={() => setExperience('beginner')} label="Beginner" />
                <SmallOption selected={experience === 'some'} onPress={() => setExperience('some')} label="Some" />
                <SmallOption selected={experience === 'experienced'} onPress={() => setExperience('experienced')} label="Advanced" />
              </View>
            </>
          )}

          {step === 'lifestyle' && (
            <>
              <Text style={styles.stepTitle}>Lifestyle</Text>
              <Text style={styles.stepSubtitle}>Almost done - just a few more details</Text>

              <Text style={styles.fieldLabel}>Diet Preference</Text>
              <View style={styles.optionRow}>
                <SmallOption selected={dietPref === 'anything'} onPress={() => setDietPref('anything')} label="Non-veg" />
                <SmallOption selected={dietPref === 'vegetarian'} onPress={() => setDietPref('vegetarian')} label="Vegetarian" />
                <SmallOption selected={dietPref === 'vegan'} onPress={() => setDietPref('vegan')} label="Vegan" />
              </View>

              <Text style={styles.fieldLabel}>Available Equipment</Text>
              <View style={styles.optionRow}>
                <SmallOption selected={equipment === 'none'} onPress={() => setEquipment('none')} label="None" />
                <SmallOption selected={equipment === 'basic'} onPress={() => setEquipment('basic')} label="Basic" />
                <SmallOption selected={equipment === 'full_gym'} onPress={() => setEquipment('full_gym')} label="Full Gym" />
              </View>

              <Text style={styles.fieldLabel}>Workout Days per Week</Text>
              <View style={styles.optionRow}>
                {['2', '3', '4', '5', '6'].map(d => (
                  <SmallOption key={d} selected={daysPerWeek === d} onPress={() => setDaysPerWeek(d)} label={d} />
                ))}
              </View>

              <Text style={styles.fieldLabel}>Injuries or Limitations (optional)</Text>
              <TextInput
                style={[styles.fieldInput, { minHeight: 60 }]}
                value={injuries}
                onChangeText={setInjuries}
                placeholder="e.g. lower back pain, knee issues..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16 }]}>
          {step === 'lifestyle' ? (
            <Pressable
              onPress={handleFinish}
              disabled={saving}
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.9 }, saving && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={['#FF6B35', '#E55A25']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtnGradient}
              >
                <Text style={styles.nextBtnText}>{saving ? 'Creating Plan...' : 'Generate My Plan'}</Text>
                {!saving && <Ionicons name="arrow-forward" size={20} color={Colors.white} />}
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={goNext}
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.9 }]}
            >
              <LinearGradient
                colors={['#FF6B35', '#E55A25']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtnGradient}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
              </LinearGradient>
            </Pressable>
          )}
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
    marginBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: 28,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 15,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,107,53,0.08)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionIconSelected: {
    backgroundColor: 'rgba(255,107,53,0.15)',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  optionSubtitle: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  optionRadioSelected: {
    borderColor: Colors.primary,
  },
  optionRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.warning,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  smallOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smallOptionSelected: {
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderColor: Colors.primary,
  },
  smallOptionText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  smallOptionTextSelected: {
    color: Colors.primary,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldCol: {
    flex: 1,
  },
  fieldInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Rubik_400Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
  },
  nextBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextBtnText: {
    fontSize: 17,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.white,
  },
});

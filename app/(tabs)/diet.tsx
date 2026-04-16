import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import { useSubscription } from '@/lib/subscription-context';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const MEAL_ACCENTS: Record<string, string> = {
  'Breakfast': Colors.accent,
  'Mid-Morning Snack': Colors.amber,
  'Lunch': Colors.primary,
  'Evening Snack': Colors.amber,
  'Dinner': Colors.violet,
  'Bedtime Snack': Colors.violet,
};

const MEAL_ICONS: Record<string, IoniconName> = {
  'Breakfast': 'sunny-outline',
  'Mid-Morning Snack': 'cafe-outline',
  'Lunch': 'restaurant-outline',
  'Evening Snack': 'nutrition-outline',
  'Dinner': 'moon-outline',
  'Bedtime Snack': 'bed-outline',
};

interface MealCardProps {
  meal: {
    meal: string;
    time: string;
    foods: { name: string; quantity: string; calories: number; protein: number }[];
    total_calories: number;
    total_protein: number;
  };
  index: number;
}

function MealCard({ meal, index }: MealCardProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const accentColor = MEAL_ACCENTS[meal.meal] || Colors.primary;
  const iconName = MEAL_ICONS[meal.meal] || 'restaurant-outline';

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext({
      duration: 280,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setExpanded(!expanded);
  };

  return (
    <Pressable
      onPress={handleToggle}
      style={({ pressed }) => [styles.mealCard, pressed && { opacity: 0.95 }]}
    >
      <View style={[styles.mealTopBorder, { backgroundColor: accentColor }]} />
      <View style={styles.mealCardInner}>
        <View style={styles.mealHeader}>
          <View style={[styles.mealIconContainer, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name={iconName} size={18} color={accentColor} />
          </View>
          <View style={styles.mealHeaderInfo}>
            <Text style={styles.mealName}>{meal.meal}</Text>
            <Text style={styles.mealTime}>{meal.time}</Text>
          </View>
          <View style={styles.mealMacros}>
            <Text style={[styles.mealCalories, { color: accentColor }]}>{meal.total_calories}</Text>
            <Text style={styles.mealCaloriesLabel}>kcal</Text>
          </View>
          <View style={[styles.chevronWrap, expanded && styles.chevronWrapExpanded]}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={expanded ? accentColor : Colors.textMuted}
            />
          </View>
        </View>

        {expanded && (
          <View style={styles.foodsList}>
            {meal.foods.map((food, fi) => (
              <View key={fi} style={styles.foodItem}>
                <View style={[styles.foodDot, { backgroundColor: accentColor }]} />
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodQuantity}>{food.quantity}</Text>
                </View>
                <View style={styles.foodMacros}>
                  <Text style={styles.foodCalText}>{food.calories} kcal</Text>
                  <Text style={styles.foodProtText}>{food.protein}g prot</Text>
                </View>
              </View>
            ))}
            <View style={styles.mealTotalRow}>
              <Text style={styles.mealTotalLabel}>Meal Total</Text>
              <Text style={styles.mealTotalValue}>
                {meal.total_calories} kcal  ·  {meal.total_protein}g protein
              </Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function DietScreen() {
  const insets = useSafeAreaInsets();
  const { dietPlan, dietLoading, generateDietPlan, profile, isOnboarded } = useFitCoach();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!isPremium) {
      router.push('/upgrade');
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await generateDietPlan();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg = e?.message || 'Failed to generate diet plan';
      setError(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Generation Failed', 'Could not generate your diet plan. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const isWorking = generating || dietLoading;

  if (!isOnboarded || !profile) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="leaf-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Complete Onboarding</Text>
          <Text style={styles.emptySubtitle}>Set up your profile first to get a personalized diet plan</Text>
        </View>
      </View>
    );
  }

  if (subLoading) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isPremium) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Diet Plan</Text>
        </View>
        <View style={styles.paywallContainer}>
          <View style={styles.paywallIconWrap}>
            <LinearGradient
              colors={['rgba(74,222,128,0.2)', 'rgba(74,222,128,0.05)']}
              style={styles.paywallIconGradient}
            >
              <Ionicons name="lock-closed" size={32} color={Colors.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.paywallTitle}>Premium Feature</Text>
          <Text style={styles.paywallSubtitle}>
            AI-generated diet plans with macro targets and personalized meal schedules are available on Premium.
          </Text>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/upgrade'); }}
            style={({ pressed }) => [styles.paywallBtn, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient colors={['#4ADE80', '#22C55E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.paywallBtnGradient}>
              <Ionicons name="flash" size={18} color={Colors.black} />
              <Text style={styles.paywallBtnText}>Upgrade to Premium</Text>
            </LinearGradient>
          </Pressable>
          <Text style={styles.paywallNote}>Workouts and manual calorie tracking are always free</Text>
        </View>
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
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Diet Plan</Text>
          {dietPlan && (
            <Text style={styles.subtitle}>Week {dietPlan.weekNumber}</Text>
          )}
        </View>
        <Pressable
          onPress={handleGenerate}
          disabled={isWorking}
          style={[styles.generateBtn, isWorking && { opacity: 0.6 }]}
        >
          {isWorking ? (
            <ActivityIndicator size="small" color={Colors.black} />
          ) : (
            <Ionicons
              name={!isPremium ? 'lock-closed' : dietPlan ? 'refresh' : 'sparkles'}
              size={18}
              color={Colors.black}
            />
          )}
        </Pressable>
      </View>

      {isWorking && !dietPlan && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Crafting your meal plan...</Text>
          <Text style={styles.loadingSubtext}>This may take a moment</Text>
        </View>
      )}

      {error && !dietPlan && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!dietPlan && !isWorking && !error && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <MaterialCommunityIcons name="food-apple-outline" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Diet Plan Yet</Text>
          <Text style={styles.emptySubtitle}>
            Generate an AI-powered personalized meal plan based on your goals and preferences
          </Text>
          <Pressable
            onPress={handleGenerate}
            style={({ pressed }) => [styles.generateLargeBtn, pressed && styles.pressed]}
          >
            <LinearGradient colors={['#4ADE80', '#22C55E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.generateLargeBtnGradient}>
              <Ionicons name="sparkles" size={18} color={Colors.black} />
              <Text style={styles.generateLargeBtnText}>Generate My Plan</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {dietPlan && (
        <>
          <View style={styles.macroRow}>
            {[
              { label: 'Calories', value: String(dietPlan.dailyTotals.calories), color: Colors.primary, icon: 'flame-outline' as IoniconName, bg: 'rgba(74,222,128,0.12)' },
              { label: 'Protein', value: `${dietPlan.dailyTotals.protein}g`, color: Colors.accent, icon: 'fitness-outline' as IoniconName, bg: 'rgba(0,212,255,0.12)' },
              { label: 'Carbs', value: `${dietPlan.dailyTotals.carbs}g`, color: Colors.amber, icon: 'leaf-outline' as IoniconName, bg: 'rgba(245,158,11,0.12)' },
              { label: 'Fat', value: `${dietPlan.dailyTotals.fat}g`, color: Colors.violet, icon: 'water-outline' as IoniconName, bg: 'rgba(167,139,250,0.12)' },
            ].map((item) => (
              <View key={item.label} style={styles.macroPill}>
                <View style={[styles.macroPillIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={14} color={item.color} />
                </View>
                <Text style={[styles.macroPillValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.macroPillLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Meals</Text>
          </View>
          {dietPlan.meals.map((meal, i) => (
            <MealCard key={i} meal={meal} index={i} />
          ))}

          {dietPlan.notes && dietPlan.notes.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionAccent, { backgroundColor: Colors.accent }]} />
                <Text style={styles.sectionTitle}>Tips</Text>
              </View>
              <View style={styles.notesCard}>
                {dietPlan.notes.map((note, i) => (
                  <View key={i} style={styles.noteRow}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    <Text style={styles.noteText}>{note}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {isWorking && (
            <View style={styles.refreshingBar}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.refreshingText}>Regenerating plan...</Text>
            </View>
          )}
        </>
      )}
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
  title: {
    fontSize: 30,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
    marginTop: 3,
  },
  generateBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Rubik_500Medium',
    color: Colors.text,
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 8,
  },
  errorCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.error,
  },
  paywallContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 60,
  },
  paywallIconWrap: {
    marginBottom: 24,
  },
  paywallIconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  paywallTitle: {
    fontSize: 22,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  paywallSubtitle: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  paywallBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  paywallBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 28,
  },
  paywallBtnText: {
    fontSize: 16,
    fontFamily: 'Rubik_700Bold',
    color: Colors.black,
  },
  paywallNote: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(74,222,128,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  generateLargeBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 24,
    alignSelf: 'stretch',
  },
  generateLargeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  generateLargeBtnText: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.black,
  },
  macroRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 28,
  },
  macroPill: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  macroPillIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  macroPillValue: {
    fontSize: 15,
    fontFamily: 'Rubik_700Bold',
    lineHeight: 17,
  },
  macroPillLabel: {
    fontSize: 10,
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
  },
  mealCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  mealTopBorder: {
    height: 3,
  },
  mealCardInner: {
    padding: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealHeaderInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  mealTime: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 1,
  },
  mealMacros: {
    alignItems: 'flex-end',
  },
  mealCalories: {
    fontSize: 16,
    fontFamily: 'Rubik_700Bold',
  },
  mealCaloriesLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronWrapExpanded: {
    backgroundColor: 'rgba(74,222,128,0.1)',
  },
  foodsList: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  foodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.text,
  },
  foodQuantity: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 1,
  },
  foodMacros: {
    alignItems: 'flex-end',
  },
  foodCalText: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  foodProtText: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  mealTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  mealTotalLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealTotalValue: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  notesCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  refreshingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 24,
  },
  refreshingText: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
});

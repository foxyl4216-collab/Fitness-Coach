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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpanded(!expanded);
      }}
      style={styles.mealCard}
    >
      <View style={[styles.mealAccent, { backgroundColor: accentColor }]} />
      <View style={styles.mealCardInner}>
        <View style={styles.mealHeader}>
          <View style={[styles.mealIconContainer, { backgroundColor: accentColor + '18' }]}>
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
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textMuted}
            style={{ marginLeft: 8 }}
          />
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

      {!isPremium && !subLoading && (
        <Pressable onPress={() => router.push('/upgrade')} style={styles.premiumGate}>
          <View style={styles.premiumGateLeft}>
            <View style={styles.premiumIconWrap}>
              <Ionicons name="flash" size={16} color="#FFD700" />
            </View>
            <View>
              <Text style={styles.premiumGateTitle}>Premium Feature</Text>
              <Text style={styles.premiumGateSub}>AI diet plans require premium</Text>
            </View>
          </View>
          <View style={styles.upgradePill}>
            <Text style={styles.upgradePillText}>Upgrade</Text>
          </View>
        </Pressable>
      )}

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
            <Ionicons name="sparkles" size={18} color={Colors.black} />
            <Text style={styles.generateLargeBtnText}>Generate My Plan</Text>
          </Pressable>
        </View>
      )}

      {dietPlan && (
        <>
          <View style={styles.macroRow}>
            {[
              { label: 'Calories', value: String(dietPlan.dailyTotals.calories), color: Colors.primary },
              { label: 'Protein', value: `${dietPlan.dailyTotals.protein}g`, color: Colors.accent },
              { label: 'Carbs', value: `${dietPlan.dailyTotals.carbs}g`, color: Colors.amber },
              { label: 'Fat', value: `${dietPlan.dailyTotals.fat}g`, color: Colors.violet },
            ].map((item) => (
              <View key={item.label} style={styles.macroPill}>
                <View style={[styles.macroPillDot, { backgroundColor: item.color }]} />
                <Text style={[styles.macroPillValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.macroPillLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Meals</Text>
          {dietPlan.meals.map((meal, i) => (
            <MealCard key={i} meal={meal} index={i} />
          ))}

          {dietPlan.notes && dietPlan.notes.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Tips</Text>
              <View style={styles.notesCard}>
                {dietPlan.notes.map((note, i) => (
                  <View key={i} style={styles.noteRow}>
                    <Ionicons name="checkmark-circle" size={15} color={Colors.primary} />
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
    fontSize: 28,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
    marginTop: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
    marginTop: 24,
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
    marginBottom: 24,
  },
  macroPill: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  macroPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroPillValue: {
    fontSize: 14,
    fontFamily: 'Rubik_700Bold',
  },
  macroPillLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
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
  mealCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  mealAccent: {
    width: 3,
  },
  mealCardInner: {
    flex: 1,
    padding: 14,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealHeaderInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
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
    fontSize: 15,
    fontFamily: 'Rubik_700Bold',
  },
  mealCaloriesLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  foodsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
  },
  foodDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
    marginTop: 4,
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
    gap: 10,
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
  premiumGate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  premiumGateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  premiumIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumGateTitle: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  premiumGateSub: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  upgradePill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  upgradePillText: {
    fontSize: 12,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.black,
  },
});

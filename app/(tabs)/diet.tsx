import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';

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

  const mealIcons: Record<string, string> = {
    'Breakfast': 'sunny-outline',
    'Mid-Morning Snack': 'cafe-outline',
    'Lunch': 'restaurant-outline',
    'Evening Snack': 'nutrition-outline',
    'Dinner': 'moon-outline',
    'Bedtime Snack': 'bed-outline',
  };

  const iconName = mealIcons[meal.meal] || 'restaurant-outline';

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpanded(!expanded);
      }}
      style={styles.mealCard}
    >
      <View style={styles.mealHeader}>
        <View style={styles.mealIconContainer}>
          <Ionicons name={iconName as any} size={20} color={Colors.primary} />
        </View>
        <View style={styles.mealHeaderInfo}>
          <Text style={styles.mealName}>{meal.meal}</Text>
          <Text style={styles.mealTime}>{meal.time}</Text>
        </View>
        <View style={styles.mealMacros}>
          <Text style={styles.mealCalories}>{meal.total_calories}</Text>
          <Text style={styles.mealCaloriesLabel}>kcal</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </View>

      {expanded && (
        <View style={styles.foodsList}>
          {meal.foods.map((food, fi) => (
            <View key={fi} style={styles.foodItem}>
              <View style={styles.foodDot} />
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.foodQuantity}>{food.quantity}</Text>
              </View>
              <View style={styles.foodMacros}>
                <Text style={styles.foodCalText}>{food.calories} kcal</Text>
                <Text style={styles.foodProtText}>{food.protein}g protein</Text>
              </View>
            </View>
          ))}
          <View style={styles.mealTotalRow}>
            <Text style={styles.mealTotalLabel}>Meal Total</Text>
            <Text style={styles.mealTotalValue}>
              {meal.total_calories} kcal  |  {meal.total_protein}g protein
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function DietScreen() {
  const insets = useSafeAreaInsets();
  const { dietPlan, dietLoading, generateDietPlan, profile, isOnboarded } = useFitCoach();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
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
          <Text style={styles.emptySubtitle}>
            Set up your profile first to get a personalized diet plan
          </Text>
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
          style={[styles.generateBtn, isWorking && styles.generateBtnDisabled]}
        >
          {isWorking ? (
            <ActivityIndicator size="small" color={Colors.black} />
          ) : (
            <Ionicons
              name={dietPlan ? 'refresh' : 'sparkles'}
              size={20}
              color={Colors.black}
            />
          )}
        </Pressable>
      </View>

      {isWorking && !dietPlan && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Creating your personalized meal plan...</Text>
          <Text style={styles.loadingSubtext}>This may take a moment</Text>
        </View>
      )}

      {error && !dietPlan && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={24} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!dietPlan && !isWorking && !error && (
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={['rgba(74,222,128,0.15)', 'rgba(74,222,128,0.05)']}
            style={styles.emptyIconBg}
          >
            <MaterialCommunityIcons name="food-apple-outline" size={48} color={Colors.primary} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Diet Plan Yet</Text>
          <Text style={styles.emptySubtitle}>
            Generate an AI-powered personalized meal plan based on your goals and preferences
          </Text>
          <Pressable
            onPress={handleGenerate}
            style={({ pressed }) => [styles.generateLargeBtn, pressed && styles.pressed]}
          >
            <Ionicons name="sparkles" size={20} color={Colors.black} />
            <Text style={styles.generateLargeBtnText}>Generate My Plan</Text>
          </Pressable>
        </View>
      )}

      {dietPlan && (
        <>
          <LinearGradient
            colors={['#4ADE80', '#22C55E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.macroCard}
          >
            <Text style={styles.macroTitle}>Daily Targets</Text>
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dietPlan.dailyTotals.calories}</Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dietPlan.dailyTotals.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dietPlan.dailyTotals.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dietPlan.dailyTotals.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </LinearGradient>

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
    fontSize: 28,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
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
  generateBtnDisabled: {
    opacity: 0.6,
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
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginTop: 8,
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
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 24,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  generateLargeBtnText: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.black,
  },
  macroCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  macroTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: '#052e16',
    marginBottom: 16,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  macroValue: {
    fontSize: 18,
    fontFamily: 'Rubik_700Bold',
    color: '#052e16',
  },
  macroLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  mealCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(74,222,128,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 1,
  },
  mealMacros: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  mealCalories: {
    fontSize: 16,
    fontFamily: 'Rubik_700Bold',
    color: Colors.primary,
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
    paddingVertical: 8,
  },
  foodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.text,
  },
  foodQuantity: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 1,
  },
  foodMacros: {
    alignItems: 'flex-end',
  },
  foodCalText: {
    fontSize: 13,
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
    fontSize: 12,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
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
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
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

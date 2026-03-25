import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscription } from '@/lib/subscription-context';

const FEATURES_FREE = [
  { label: 'Workout plans (fat loss & muscle gain)', included: true },
  { label: 'Manual calorie entry', included: true },
  { label: 'Weekly check-ins', included: true },
  { label: 'AI diet plan generation', included: false },
  { label: 'AI camera food scan', included: false },
  { label: 'Adaptive weekly diet updates', included: false },
];

const FEATURES_PREMIUM = [
  { label: 'Everything in Free', included: true },
  { label: 'AI diet plan generation', included: true },
  { label: 'AI camera food scan', included: true },
  { label: 'Adaptive weekly diet updates', included: true },
  { label: 'Personalized macro targets', included: true },
  { label: 'Priority support', included: true },
];

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium, plan_type, end_date, subscribe, cancelSubscription } = useSubscription();
  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = await subscribe(selected);
    setLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Welcome to Premium!', result.message, [
        { text: 'Get Started', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription? You will be downgraded to the free plan immediately.',
      [
        { text: 'Keep Premium', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await cancelSubscription();
            setLoading(false);
            if (result.success) {
              Alert.alert('Cancelled', 'You are now on the free plan.');
            }
          },
        },
      ]
    );
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (isPremium) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 32 }]}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={36} color="#FFD700" />
            <Text style={styles.premiumTitle}>You're Premium!</Text>
            <Text style={styles.premiumPlanLabel}>
              {plan_type === 'monthly' ? 'Monthly Plan · $9/mo' : 'Yearly Plan · $99/yr'}
            </Text>
            {end_date && (
              <Text style={styles.premiumExpiry}>
                Renews {new Date(end_date).toLocaleDateString()}
              </Text>
            )}
          </View>

          <View style={styles.featureList}>
            {FEATURES_PREMIUM.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Go Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 32 }]}>
        <View style={styles.heroSection}>
          <Ionicons name="flash" size={48} color={Colors.primary} />
          <Text style={styles.heroTitle}>Unlock Full Potential</Text>
          <Text style={styles.heroSubtitle}>
            AI-powered diet plans and calorie scanning to supercharge your results
          </Text>
        </View>

        <View style={styles.plansRow}>
          <Pressable
            style={[styles.planCard, selected === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelected('monthly')}
          >
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>$9</Text>
            <Text style={styles.planPer}>/month</Text>
          </Pressable>

          <Pressable
            style={[styles.planCard, selected === 'yearly' && styles.planCardSelected]}
            onPress={() => setSelected('yearly')}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>BEST VALUE</Text>
            </View>
            <Text style={styles.planName}>Yearly</Text>
            <Text style={styles.planPrice}>$99</Text>
            <Text style={styles.planPer}>/year</Text>
            <Text style={styles.planSavings}>Save $9</Text>
          </Pressable>
        </View>

        <View style={styles.comparisonSection}>
          <Text style={styles.comparisonTitle}>What you get</Text>
          {FEATURES_PREMIUM.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.freeNote}>Free plan includes:</Text>
        {FEATURES_FREE.filter(f => f.included).map((f, i) => (
          <View key={i} style={[styles.featureRow, { marginBottom: 6 }]}>
            <Ionicons name="checkmark" size={16} color={Colors.textSecondary} />
            <Text style={[styles.featureText, { color: Colors.textSecondary }]}>{f.label}</Text>
          </View>
        ))}

        <Pressable
          style={[styles.subscribeBtn, loading && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.subscribeBtnText}>
              Start {selected === 'monthly' ? 'Monthly' : 'Yearly'} Plan
            </Text>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          Cancel anytime from your subscription settings.
        </Text>
      </ScrollView>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  plansRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  saveBadgeText: {
    fontSize: 9,
    fontFamily: 'Rubik_700Bold',
    color: '#000',
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  planPrice: {
    fontSize: 36,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    marginTop: 4,
  },
  planPer: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
  },
  planSavings: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
    marginTop: 4,
  },
  comparisonSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  comparisonTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.text,
    flex: 1,
  },
  freeNote: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 4,
  },
  subscribeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  subscribeBtnDisabled: {
    opacity: 0.6,
  },
  subscribeBtnText: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: '#000',
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  premiumBadge: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFD700' + '40',
  },
  premiumTitle: {
    fontSize: 24,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    marginTop: 10,
  },
  premiumPlanLabel: {
    fontSize: 15,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
    marginTop: 6,
  },
  premiumExpiry: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  featureList: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.error || '#FF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.error || '#FF4444',
  },
});

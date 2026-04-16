import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetch } from 'expo/fetch';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useFitCoach } from '@/lib/context';
import { useSubscription } from '@/lib/subscription-context';
import { getApiUrl } from '@/lib/query-client';
import { getStoredToken } from '@/lib/auth-token';

function CalorieRingSvg({ progress, remaining, isOver }: {
  progress: number;
  remaining: number;
  isOver: boolean;
}) {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  const strokeColor = isOver ? Colors.error : Colors.primary;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="trackerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isOver ? Colors.error : Colors.primary} />
            <Stop offset="100%" stopColor={isOver ? '#FF6B6B' : Colors.accent} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <Circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="url(#trackerRingGrad)" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.ringValue, isOver && { color: Colors.error }]}>{remaining}</Text>
        <Text style={styles.ringLabel}>{isOver ? 'over today' : 'kcal left'}</Text>
      </View>
    </View>
  );
}

export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const { plan, foodLog, savedFoods, addFoodEntry, removeFoodEntry, saveFavoriteFood } = useFitCoach();
  const { isPremium } = useSubscription();
  const [showAddModal, setShowAddModal] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const selectedDate = new Date().toISOString().split('T')[0];
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [, requestCameraPermission] = useCameraPermissions();

  const slideY = useRef(new Animated.Value(0)).current;

  const nativeDriver = Platform.OS !== 'web';

  const openModal = () => {
    slideY.setValue(600);
    setShowAddModal(true);
    Animated.spring(slideY, { toValue: 0, useNativeDriver: nativeDriver, tension: 65, friction: 11 }).start();
  };

  const closeModal = () => {
    Animated.timing(slideY, { toValue: 600, duration: 220, useNativeDriver: nativeDriver }).start(() => {
      setShowAddModal(false);
      slideY.setValue(0);
    });
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
    onPanResponderMove: (_, g) => { if (g.dy > 0) slideY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy >= 80) closeModal();
      else Animated.spring(slideY, { toValue: 0, useNativeDriver: nativeDriver }).start();
    },
  }), []);

  const todayFoods = useMemo(
    () => foodLog.filter(f => f.date === selectedDate).sort((a, b) => b.timestamp - a.timestamp),
    [foodLog, selectedDate]
  );

  const totalCalories = useMemo(() => todayFoods.reduce((s, f) => s + f.calories, 0), [todayFoods]);
  const totalProtein = useMemo(() => todayFoods.reduce((s, f) => s + (f.protein || 0), 0), [todayFoods]);
  const dailyTarget = plan?.dailyCalories || 2000;
  const remaining = Math.max(0, dailyTarget - totalCalories);
  const progress = totalCalories / dailyTarget;
  const isOver = totalCalories > dailyTarget;
  const overAmount = isOver ? totalCalories - dailyTarget : 0;

  const handleAdd = async () => {
    if (!foodName.trim() || !foodCalories.trim()) return;
    const cal = parseInt(foodCalories, 10);
    if (isNaN(cal) || cal <= 0) return;
    const prot = foodProtein ? parseInt(foodProtein, 10) : undefined;
    await addFoodEntry({ name: foodName.trim(), calories: cal, protein: prot && !isNaN(prot) ? prot : undefined, date: selectedDate });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFoodName(''); setFoodCalories(''); setFoodProtein('');
    setShowAddModal(false);
  };

  const handleQuickAdd = async (food: { name: string; calories: number; protein?: number }) => {
    await addFoodEntry({ name: food.name, calories: food.calories, protein: food.protein, date: selectedDate });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(false);
  };

  const handleSaveFood = () => {
    if (!foodName.trim() || !foodCalories.trim()) return;
    const cal = parseInt(foodCalories, 10);
    if (isNaN(cal)) return;
    const prot = foodProtein ? parseInt(foodProtein, 10) : undefined;
    saveFavoriteFood({ name: foodName.trim(), calories: cal, protein: prot && !isNaN(prot) ? prot : undefined });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Entry', 'Remove this food entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { removeFoodEntry(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

  const handleShowScanOptions = () => {
    if (!isPremium) { router.push('/upgrade'); return; }
    if (Platform.OS !== 'web') {
      Alert.alert('Scan Food', 'Choose a method', [
        { text: 'Take Photo', onPress: async () => {
          const status = await requestCameraPermission();
          if (status?.granted) { setShowCamera(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
          else Alert.alert('Camera Permission', 'Camera access is required to take photos.');
        }},
        { text: 'Choose from Library', onPress: () => handlePickImage() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      handlePickImage();
    }
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      setIsScanning(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      setShowCamera(false);
      if (photo?.base64) await processFoodImage(photo.base64, (photo as any).mimeType || 'image/jpeg');
    } catch {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      setIsScanning(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const libStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libStatus.status !== 'granted') { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) { Alert.alert('Error', 'Could not read image. Please try again.'); return; }
      setIsScanning(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await processFoodImage(asset.base64, asset.mimeType || 'image/jpeg');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const processFoodImage = async (base64: string, mimeType: string) => {
    try {
      const token = getStoredToken();
      const url = new URL('/api/calorie-log/scan', getApiUrl()).toString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ image_base64: base64, mime_type: mimeType }),
          signal: controller.signal,
        });
      } finally { clearTimeout(timeout); }
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 422) Alert.alert('Could not detect food', data.message || 'Please retake photo with better lighting.');
        else if (response.status === 429) Alert.alert('Limit reached', data.error || 'Daily scan limit reached.');
        else Alert.alert('Scan failed', data.error || 'Failed to analyze image. Please try again.');
        return;
      }
      const calories = data.analysis?.total_estimated_calories || 0;
      const foodLabel = data.log?.food_name || 'Scanned Food';
      const confidence = Math.round(data.analysis?.confidence_score || 0);
      await addFoodEntry({ name: foodLabel, calories: Math.round(calories), date: new Date().toISOString().split('T')[0] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Food Logged!', `${foodLabel}\n${Math.round(calories)} kcal (${confidence}% confidence)`, [{ text: 'OK' }]);
    } catch (err: any) {
      if (err.name === 'AbortError') Alert.alert('Timeout', 'Scan took too long. Please try again.');
      else Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;
  const canAdd = !!foodName.trim() && !!foodCalories.trim();

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View>
          <Text style={styles.title}>Tracker</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>
        <Pressable onPress={handleShowScanOptions} style={[styles.scanBtn]} disabled={isScanning}>
          {isScanning ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View>
              <Ionicons name="camera-outline" size={22} color={Colors.primary} />
              {!isPremium && (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={7} color={Colors.black} />
                </View>
              )}
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={isOver
              ? ['rgba(239,68,68,0.08)', 'rgba(0,0,0,0)']
              : ['rgba(74,222,128,0.08)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <CalorieRingSvg progress={progress} remaining={isOver ? overAmount : remaining} isOver={isOver} />
            <View style={styles.summaryStatsRow}>
              {[
                { value: String(totalCalories), label: 'eaten', color: isOver ? Colors.error : Colors.primary },
                { value: String(dailyTarget), label: 'target', color: Colors.accent },
                { value: `${totalProtein}g`, label: 'protein', color: Colors.violet },
              ].map((stat) => (
                <View key={stat.label} style={styles.summaryStat}>
                  <Text style={[styles.summaryStatValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.summaryStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.foodLogSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Food Log</Text>
            </View>
            {todayFoods.length > 0 && (
              <Text style={styles.sectionCount}>{todayFoods.length} item{todayFoods.length !== 1 ? 's' : ''}</Text>
            )}
          </View>

          {todayFoods.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="restaurant-outline" size={32} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyText}>Nothing logged yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add your first meal</Text>
            </View>
          ) : (
            todayFoods.map((item) => (
              <View key={item.id} style={styles.foodItemRow}>
                <View style={[styles.foodSourceBadge, {
                  backgroundColor: item.source === 'camera' ? 'rgba(0,212,255,0.12)' : 'rgba(74,222,128,0.1)',
                }]}>
                  <Ionicons
                    name={item.source === 'camera' ? 'camera-outline' : 'restaurant-outline'}
                    size={14}
                    color={item.source === 'camera' ? Colors.accent : Colors.primary}
                  />
                </View>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{item.name}</Text>
                  {item.protein ? <Text style={styles.foodProtein}>{item.protein}g protein</Text> : null}
                </View>
                <View style={styles.foodItemRight}>
                  <Text style={[styles.foodCal, isOver && item === todayFoods[0] && { color: Colors.error }]}>{item.calories}</Text>
                  <Text style={styles.foodCalLabel}>kcal</Text>
                </View>
                <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.fab, { bottom: bottomPad + 16 }]}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openModal(); }}
          style={({ pressed }) => [styles.fabBtn, pressed && { transform: [{ scale: 0.93 }] }]}
        >
          <LinearGradient colors={['#4ADE80', '#22C55E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
            <Ionicons name="add" size={28} color={Colors.black} />
          </LinearGradient>
        </Pressable>
      </View>

      <Modal visible={showAddModal} animationType="none" transparent>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { paddingBottom: bottomPad + 8, transform: [{ translateY: slideY }] }]}>
            <View style={styles.modalHandleArea} {...panResponder.panHandlers}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Food</Text>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {savedFoods.length > 0 && (
              <>
                <Text style={styles.quickAddLabel}>Favorites</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAddRow}>
                  {savedFoods.map((food, i) => (
                    <Pressable key={i} onPress={() => handleQuickAdd(food)} style={styles.quickAddChip}>
                      <Text style={styles.quickAddName}>{food.name}</Text>
                      <Text style={styles.quickAddCal}>{food.calories} kcal</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Food Name</Text>
              <TextInput style={styles.input} value={foodName} onChangeText={setFoodName} placeholder="e.g. Chicken Rice" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Calories</Text>
                <TextInput style={styles.input} value={foodCalories} onChangeText={setFoodCalories} placeholder="kcal" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput style={styles.input} value={foodProtein} onChangeText={setFoodProtein} placeholder="optional" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
              </View>
            </View>
            <View style={styles.modalButtons}>
              <Pressable onPress={handleSaveFood} style={[styles.saveBtn, !canAdd && styles.btnDisabled]} disabled={!canAdd}>
                <Ionicons name="heart-outline" size={16} color={Colors.secondary} />
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
              <Pressable onPress={handleAdd} disabled={!canAdd} style={({ pressed }) => [styles.addBtnWrap, pressed && { opacity: 0.9 }, !canAdd && styles.btnDisabled]}>
                <LinearGradient colors={['#4ADE80', '#22C55E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGradient}>
                  <Text style={styles.addBtnText}>Add Entry</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {Platform.OS !== 'web' && (
        <Modal visible={showCamera} animationType="slide">
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={[styles.cameraControls, { paddingBottom: bottomPad + 8 }]}>
              <Pressable onPress={() => setShowCamera(false)} style={styles.cameraCancelBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
              <Pressable onPress={handleCapturePhoto} style={styles.cameraCaptureBtn} disabled={isScanning}>
                {isScanning ? <ActivityIndicator size="large" color={Colors.background} /> : <View style={styles.cameraCaptureDot} />}
              </Pressable>
              <View style={{ width: 48 }} />
            </View>
          </View>
        </Modal>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 3,
  },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: Colors.primary,
    borderRadius: 5,
    width: 11,
    height: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  summaryCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.15)',
    backgroundColor: Colors.card,
  },
  summaryGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 20,
  },
  ringValue: {
    fontSize: 26,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    lineHeight: 28,
    textAlign: 'center',
  },
  ringLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
    gap: 4,
  },
  summaryStatValue: {
    fontSize: 18,
    fontFamily: 'Rubik_700Bold',
  },
  summaryStatLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  foodLogSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  sectionCount: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  foodSourceBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodInfo: { flex: 1 },
  foodName: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.text,
  },
  foodProtein: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  foodItemRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  foodCal: {
    fontSize: 16,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  foodCalLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
  },
  fabBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 58,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: Colors.cardElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.borderStrong,
  },
  modalHandleArea: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
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
  quickAddLabel: {
    fontSize: 11,
    fontFamily: 'Rubik_700Bold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickAddRow: { marginBottom: 20 },
  quickAddChip: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickAddName: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.text,
  },
  quickAddCal: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.primary,
    marginTop: 2,
  },
  inputGroup: { marginBottom: 14 },
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
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.secondary,
  },
  addBtnWrap: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  addBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  addBtnText: {
    fontSize: 15,
    fontFamily: 'Rubik_700Bold',
    color: Colors.black,
  },
  btnDisabled: { opacity: 0.4 },
  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: { flex: 1 },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 20,
    backgroundColor: Colors.background,
  },
  cameraCancelBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  cameraCaptureDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.black,
  },
});

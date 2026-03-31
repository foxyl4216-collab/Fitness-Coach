import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
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
  const size = 120;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const strokeColor = isOver ? Colors.error : Colors.primary;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={Colors.surface} strokeWidth={strokeWidth} />
        <Circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={strokeColor} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.ringValue, isOver && { color: Colors.error }]}>{remaining}</Text>
        <Text style={styles.ringLabel}>{isOver ? 'over' : 'left'}</Text>
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const todayFoods = useMemo(
    () => foodLog.filter(f => f.date === selectedDate).sort((a, b) => b.timestamp - a.timestamp),
    [foodLog, selectedDate]
  );

  const totalCalories = useMemo(() => todayFoods.reduce((s, f) => s + f.calories, 0), [todayFoods]);
  const totalProtein = useMemo(() => todayFoods.reduce((s, f) => s + (f.protein || 0), 0), [todayFoods]);

  const dailyTarget = plan?.dailyCalories || 2000;
  const remaining = Math.max(0, dailyTarget - totalCalories);
  const progress = Math.min(1, totalCalories / dailyTarget);
  const isOver = totalCalories > dailyTarget;

  const handleAdd = async () => {
    if (!foodName.trim() || !foodCalories.trim()) return;
    const cal = parseInt(foodCalories, 10);
    if (isNaN(cal) || cal <= 0) return;
    const prot = foodProtein ? parseInt(foodProtein, 10) : undefined;
    await addFoodEntry({
      name: foodName.trim(),
      calories: cal,
      protein: prot && !isNaN(prot) ? prot : undefined,
      date: selectedDate,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFoodName('');
    setFoodCalories('');
    setFoodProtein('');
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
      if (photo?.base64) await processFoodImage(photo.base64, photo.mimeType || 'image/jpeg');
    } catch (err) {
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
      const baseUrl = getApiUrl();
      const url = new URL('/api/calorie-log/scan', baseUrl).toString();
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
    }
  };

  const dateLabels = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (selectedDate === today) return 'Today';
    if (selectedDate === yesterday) return 'Yesterday';
    return selectedDate;
  }, [selectedDate]);

  const navigateDate = (direction: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(d.toISOString().split('T')[0]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16 }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Tracker</Text>
        <View style={styles.topActions}>
          <Pressable onPress={handleShowScanOptions} style={[styles.iconBtn, styles.iconBtnOutline]} disabled={isScanning}>
            {isScanning ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View>
                <Ionicons name="camera-outline" size={19} color={Colors.primary} />
                {!isPremium && (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={7} color={Colors.black} />
                  </View>
                )}
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddModal(true); }}
            style={[styles.iconBtn, styles.iconBtnPrimary]}
          >
            <Ionicons name="add" size={22} color={Colors.black} />
          </Pressable>
        </View>
      </View>

      <View style={styles.dateNav}>
        <Pressable onPress={() => navigateDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.dateLabel}>{dateLabels}</Text>
        <Pressable onPress={() => navigateDate(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <CalorieRingSvg progress={progress} remaining={isOver ? totalCalories - dailyTarget : remaining} isOver={isOver} />
        <View style={styles.summaryStats}>
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
      </View>

      <Text style={styles.listTitle}>Food Log</Text>

      <FlatList
        data={todayFoods}
        keyExtractor={item => item.id}
        scrollEnabled={!!todayFoods.length}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 110 : 120, paddingHorizontal: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No food logged</Text>
            <Text style={styles.emptySubtext}>Tap + to add your meals</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.foodItemRow}>
            <View style={styles.foodItemLeft}>
              <View style={[styles.foodDot, { backgroundColor: item.source === 'camera' ? Colors.accent : Colors.primary }]} />
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{item.name}</Text>
                {item.protein ? <Text style={styles.foodProtein}>{item.protein}g protein</Text> : null}
              </View>
            </View>
            <View style={styles.foodItemRight}>
              <Text style={styles.foodCal}>{item.calories}</Text>
              <Text style={styles.foodCalLabel}>kcal</Text>
            </View>
            <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
            </Pressable>
          </View>
        )}
      />

      <View style={[styles.floatingBar, {
        bottom: Platform.OS === 'web' ? 34 : insets.bottom + 16,
      }]}>
        <Pressable
          onPress={handleShowScanOptions}
          style={[styles.floatingBarBtn, styles.floatingBarScan]}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera-outline" size={20} color={Colors.accent} />
              {!isPremium && (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={7} color={Colors.black} />
                </View>
              )}
            </View>
          )}
          <Text style={styles.floatingBarScanText}>Scan</Text>
        </Pressable>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddModal(true); }}
          style={[styles.floatingBarBtn, styles.floatingBarAdd]}
        >
          <Ionicons name="add" size={22} color={Colors.black} />
          <Text style={styles.floatingBarAddText}>Add Food</Text>
        </Pressable>
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Food</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {savedFoods.length > 0 && (
              <>
                <Text style={styles.quickAddLabel}>Favorites</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAddRow}>
                  {savedFoods.map((food, i) => (
                    <Pressable key={i} onPress={() => handleQuickAdd(food)} style={styles.quickAddChip}>
                      <Text style={styles.quickAddName}>{food.name}</Text>
                      <Text style={styles.quickAddCal}>{food.calories}</Text>
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
              <Pressable
                onPress={handleSaveFood}
                style={[styles.saveBtn, (!foodName.trim() || !foodCalories.trim()) && styles.btnDisabled]}
                disabled={!foodName.trim() || !foodCalories.trim()}
              >
                <Ionicons name="heart-outline" size={16} color={Colors.secondary} />
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
              <Pressable
                onPress={handleAdd}
                style={[styles.addBtn, (!foodName.trim() || !foodCalories.trim()) && styles.btnDisabled]}
                disabled={!foodName.trim() || !foodCalories.trim()}
              >
                <Text style={styles.addBtnText}>Add Entry</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS !== 'web' && (
        <Modal visible={showCamera} animationType="slide">
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={[styles.cameraControls, { paddingBottom: insets.bottom + 16 }]}>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnOutline: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
  },
  iconBtnPrimary: {
    backgroundColor: Colors.primary,
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
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 14,
  },
  dateArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ringValue: {
    fontSize: 20,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    lineHeight: 22,
  },
  ringLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  summaryStats: {
    flex: 1,
    gap: 12,
  },
  summaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryStatValue: {
    fontSize: 16,
    fontFamily: 'Rubik_700Bold',
    width: 60,
  },
  summaryStatLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  listTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 6,
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
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  foodItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  foodDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.text,
  },
  foodProtein: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 1,
  },
  foodItemRight: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  foodCal: {
    fontSize: 15,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  foodCalLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  deleteButton: {
    padding: 4,
  },
  floatingBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
    zIndex: 100,
  },
  floatingBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  floatingBarScan: {
    flex: 1,
    backgroundColor: Colors.card,
    borderColor: Colors.accent + '40',
  },
  floatingBarScanText: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.accent,
  },
  floatingBarAdd: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  floatingBarAddText: {
    fontSize: 15,
    fontFamily: 'Rubik_700Bold',
    color: Colors.black,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: Colors.cardElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
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
    fontSize: 18,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  quickAddLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  quickAddRow: {
    marginBottom: 20,
  },
  quickAddChip: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
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
  inputGroup: {
    marginBottom: 14,
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
    paddingVertical: 12,
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
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.secondary,
  },
  addBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  addBtnText: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.black,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
  },
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

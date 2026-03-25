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
    await addFoodEntry({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      date: selectedDate,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(false);
  };

  const handleSaveFood = () => {
    if (!foodName.trim() || !foodCalories.trim()) return;
    const cal = parseInt(foodCalories, 10);
    if (isNaN(cal)) return;
    const prot = foodProtein ? parseInt(foodProtein, 10) : undefined;
    saveFavoriteFood({
      name: foodName.trim(),
      calories: cal,
      protein: prot && !isNaN(prot) ? prot : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Entry', 'Remove this food entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeFoodEntry(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const handleShowScanOptions = () => {
    if (!isPremium) {
      router.push('/upgrade');
      return;
    }
    if (Platform.OS !== 'web') {
      Alert.alert('Scan Food', 'Choose a method', [
        {
          text: 'Take Photo',
          onPress: async () => {
            const status = await requestCameraPermission();
            if (status?.granted) {
              setShowCamera(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
              Alert.alert('Camera Permission', 'Camera access is required to take photos.');
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: () => handlePickImage(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
      
      if (photo?.base64) {
        await processFoodImage(photo.base64, photo.mimeType || 'image/jpeg');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      setIsScanning(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const libStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libStatus.status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Could not read image. Please try again.');
        return;
      }

      setIsScanning(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await processFoodImage(asset.base64, asset.mimeType || 'image/jpeg');
    } catch (err: any) {
      console.error('[tracker] Image picker error:', err);
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
      const timeout = setTimeout(() => controller.abort(), 90000); // 90 second timeout for large image uploads

      let response: Response;
      try {
        console.log('[tracker] Sending food scan...');
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            image_base64: base64,
            mime_type: mimeType,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      console.log('[tracker] Response status:', response.status);
      const data = await response.json();
      console.log('[tracker] Response data:', data);

      if (!response.ok) {
        if (response.status === 422) {
          Alert.alert('Could not detect food', data.message || 'Please retake photo with better lighting.');
        } else if (response.status === 429) {
          Alert.alert('Limit reached', data.error || 'Daily scan limit reached.');
        } else {
          Alert.alert('Scan failed', data.error || 'Failed to analyze image. Please try again.');
        }
        return;
      }

      const calories = data.analysis?.total_estimated_calories || 0;
      const foodLabel = data.log?.food_name || 'Scanned Food';
      const confidence = Math.round(data.analysis?.confidence_score || 0);

      // Add to local food log
      await addFoodEntry({
        name: foodLabel,
        calories: Math.round(calories),
        date: new Date().toISOString().split('T')[0],
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Food Logged!',
        `${foodLabel}\n${Math.round(calories)} kcal (${confidence}% confidence)`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      console.error('[tracker] Image processing error:', err);
      if (err.name === 'AbortError') {
        Alert.alert('Timeout', 'Scan took too long. Please try again.');
      } else {
        Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
      }
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
      <Text style={styles.title}>Calorie Tracker</Text>

      <View style={styles.dateNav}>
        <Pressable onPress={() => navigateDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.dateLabel}>{dateLabels}</Text>
        <Pressable onPress={() => navigateDate(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.ringContainer}>
          <View style={styles.ringOuter}>
            <View style={[
              styles.ringProgress,
              {
                transform: [{ rotate: `${progress * 360}deg` }],
                borderTopColor: isOver ? Colors.error : Colors.primary,
                borderRightColor: progress > 0.25 ? (isOver ? Colors.error : Colors.primary) : 'transparent',
                borderBottomColor: progress > 0.5 ? (isOver ? Colors.error : Colors.primary) : 'transparent',
                borderLeftColor: progress > 0.75 ? (isOver ? Colors.error : Colors.primary) : 'transparent',
              },
            ]} />
            <View style={styles.ringInner}>
              <Text style={[styles.ringValue, isOver && styles.ringValueOver]}>{remaining}</Text>
              <Text style={styles.ringLabel}>remaining</Text>
            </View>
          </View>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{totalCalories}</Text>
            <Text style={styles.summaryStatLabel}>eaten</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{dailyTarget}</Text>
            <Text style={styles.summaryStatLabel}>target</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{totalProtein}g</Text>
            <Text style={styles.summaryStatLabel}>protein</Text>
          </View>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Food Log</Text>
        <View style={styles.listActions}>
          <Pressable
            onPress={handleShowScanOptions}
            style={[styles.scanButton, isScanning && styles.scanButtonActive]}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View style={{ position: 'relative' }}>
                <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                {!isPremium && (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={8} color="#000" />
                  </View>
                )}
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddModal(true);
            }}
            style={styles.addButton}
          >
            <Ionicons name="add" size={22} color={Colors.white} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={todayFoods}
        keyExtractor={item => item.id}
        scrollEnabled={todayFoods.length > 0}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No food logged yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your meals</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.foodItemContainer}>
            <Pressable
              onLongPress={() => handleDelete(item.id)}
              style={styles.foodItem}
            >
              <View style={styles.foodDot} />
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{item.name}</Text>
                {item.protein ? (
                  <Text style={styles.foodProtein}>{item.protein}g protein</Text>
                ) : null}
              </View>
              <Text style={styles.foodCal}>{item.calories} kcal</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDelete(item.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </Pressable>
          </View>
        )}
      />

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Food</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {savedFoods.length > 0 && (
              <>
                <Text style={styles.quickAddLabel}>Quick Add</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAddRow}>
                  {savedFoods.map((food, i) => (
                    <Pressable
                      key={i}
                      onPress={() => handleQuickAdd(food)}
                      style={styles.quickAddChip}
                    >
                      <Text style={styles.quickAddName}>{food.name}</Text>
                      <Text style={styles.quickAddCal}>{food.calories} kcal</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Food Name</Text>
              <TextInput
                style={styles.input}
                value={foodName}
                onChangeText={setFoodName}
                placeholder="e.g. Chicken Rice"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Calories</Text>
                <TextInput
                  style={styles.input}
                  value={foodCalories}
                  onChangeText={setFoodCalories}
                  placeholder="kcal"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Protein (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={foodProtein}
                  onChangeText={setFoodProtein}
                  placeholder="grams"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleSaveFood}
                style={[styles.saveBtn, (!foodName.trim() || !foodCalories.trim()) && styles.btnDisabled]}
                disabled={!foodName.trim() || !foodCalories.trim()}
              >
                <Ionicons name="heart-outline" size={18} color={Colors.secondary} />
                <Text style={styles.saveBtnText}>Save to Favorites</Text>
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
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
            />
            <View style={[styles.cameraControls, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                onPress={() => setShowCamera(false)}
                style={styles.cameraCancelBtn}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
              <Pressable
                onPress={handleCapturePhoto}
                style={styles.cameraCaptureBtn}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator size="large" color={Colors.background} />
                ) : (
                  <View style={styles.cameraCaptureDot} />
                )}
              </Pressable>
              <View style={{ width: 56 }} />
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
  title: {
    fontSize: 28,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    paddingHorizontal: 20,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  dateArrow: {
    padding: 8,
  },
  dateLabel: {
    fontSize: 15,
    fontFamily: 'Rubik_500Medium',
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
    alignItems: 'center',
  },
  ringContainer: {
    marginBottom: 16,
  },
  ringOuter: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringProgress: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: 'transparent',
  },
  ringInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.surface,
  },
  ringValue: {
    fontSize: 20,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  ringValueOver: {
    color: Colors.error,
  },
  ringLabel: {
    fontSize: 10,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 18,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  summaryStatLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  summaryStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.text,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonActive: {
    opacity: 0.6,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
  },
  foodItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  foodItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  foodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontFamily: 'Rubik_500Medium',
    color: Colors.text,
  },
  foodProtein: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  foodCal: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.primaryLight,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
    fontSize: 20,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
  },
  quickAddLabel: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  quickAddRow: {
    marginBottom: 16,
  },
  quickAddChip: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  quickAddName: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.text,
  },
  quickAddCal: {
    fontSize: 11,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textSecondary,
    marginBottom: 6,
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
    gap: 12,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: 'Rubik_500Medium',
    color: Colors.secondary,
  },
  addBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.white,
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
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: Colors.background,
  },
  cameraCancelBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
  },
});

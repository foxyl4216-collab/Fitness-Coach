import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import Colors from '@/constants/colors';

export function OfflineBanner() {
  const status = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(-60)).current;
  const prevStatus = useRef(status);

  const isOffline = status === 'offline';

  useEffect(() => {
    if (prevStatus.current === status) return;
    prevStatus.current = status;

    Animated.spring(slideY, {
      toValue: isOffline ? 0 : -60,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [isOffline]);

  if (status === 'unknown') return null;

  const topOffset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <Animated.View
      style={[
        styles.banner,
        { top: topOffset, transform: [{ translateY: slideY }] },
      ]}
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
  },
});

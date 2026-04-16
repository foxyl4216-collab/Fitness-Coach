import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'confirm' | null>(null);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/onboarding');
    } catch (e: any) {
      const msg = e.message || 'Signup failed';
      const cleaned = msg.replace(/^\d+:\s*/, '').replace(/^{?"?error"?:?\s*"?/, '').replace(/"?\}?$/, '');
      setError(cleaned);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <Svg style={StyleSheet.absoluteFillObject as object} viewBox="0 0 375 812">
          <Defs>
            <RadialGradient id="bg" cx="50%" cy="35%" r="60%" fx="50%" fy="35%">
              <Stop offset="0%" stopColor="#0A1F2A" stopOpacity="1" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="375" height="812" fill="url(#bg)" />
        </Svg>

        <ScrollView
          contentContainerStyle={{
            paddingTop: Platform.OS === 'web' ? 67 : insets.top + 32,
            paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandSection}>
            <View style={styles.logoRing}>
              <LinearGradient
                colors={['rgba(0,212,255,0.25)', 'rgba(74,222,128,0.2)']}
                style={styles.logoRingGradient}
              >
                <View style={styles.logoInner}>
                  <Ionicons name="fitness" size={36} color={Colors.accent} />
                </View>
              </LinearGradient>
            </View>
            <Text style={styles.brandTitle}>Join FitCoach</Text>
            <Text style={styles.brandSubtitle}>Start your fitness journey today</Text>
          </View>

          <View style={styles.cardWrapper}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={30} tint="dark" style={styles.blurCard}>
                <FormContent
                  error={error}
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                  showPassword={showPassword} setShowPassword={setShowPassword}
                  loading={loading} onSubmit={handleSignup}
                  focusedField={focusedField} setFocusedField={setFocusedField}
                />
              </BlurView>
            ) : (
              <View style={styles.card}>
                <FormContent
                  error={error}
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                  showPassword={showPassword} setShowPassword={setShowPassword}
                  loading={loading} onSubmit={handleSignup}
                  focusedField={focusedField} setFocusedField={setFocusedField}
                />
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function FormContent({
  error, email, setEmail, password, setPassword,
  confirmPassword, setConfirmPassword,
  showPassword, setShowPassword, loading, onSubmit,
  focusedField, setFocusedField,
}: {
  error: string;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  loading: boolean; onSubmit: () => void;
  focusedField: 'email' | 'password' | 'confirm' | null;
  setFocusedField: (v: 'email' | 'password' | 'confirm' | null) => void;
}) {
  const emailGlow = useRef(new Animated.Value(0)).current;
  const passwordGlow = useRef(new Animated.Value(0)).current;
  const confirmGlow = useRef(new Animated.Value(0)).current;

  const animIn = (anim: Animated.Value) =>
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  const animOut = (anim: Animated.Value) =>
    Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: false }).start();

  const mkBorder = (anim: Animated.Value) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [Colors.border, Colors.primary] });
  const mkBg = (anim: Animated.Value) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(74,222,128,0)', 'rgba(74,222,128,0.05)'] });

  return (
    <>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <Animated.View style={[styles.inputContainer, { borderColor: mkBorder(emailGlow), backgroundColor: mkBg(emailGlow) }]}>
          <Ionicons
            name="mail-outline"
            size={17}
            color={focusedField === 'email' ? Colors.primary : Colors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            onFocus={() => { setFocusedField('email'); animIn(emailGlow); }}
            onBlur={() => { setFocusedField(null); animOut(emailGlow); }}
          />
        </Animated.View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <Animated.View style={[styles.inputContainer, { borderColor: mkBorder(passwordGlow), backgroundColor: mkBg(passwordGlow) }]}>
          <Ionicons
            name="lock-closed-outline"
            size={17}
            color={focusedField === 'password' ? Colors.primary : Colors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 characters"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry={!showPassword}
            editable={!loading}
            onFocus={() => { setFocusedField('password'); animIn(passwordGlow); }}
            onBlur={() => { setFocusedField(null); animOut(passwordGlow); }}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <Animated.View style={[styles.inputContainer, { borderColor: mkBorder(confirmGlow), backgroundColor: mkBg(confirmGlow) }]}>
          <Ionicons
            name="lock-closed-outline"
            size={17}
            color={focusedField === 'confirm' ? Colors.primary : Colors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry={!showPassword}
            editable={!loading}
            onFocus={() => { setFocusedField('confirm'); animIn(confirmGlow); }}
            onBlur={() => { setFocusedField(null); animOut(confirmGlow); }}
          />
        </Animated.View>
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={({ pressed }) => [styles.signupBtn, pressed && { opacity: 0.85 }, loading && { opacity: 0.6 }]}
      >
        <LinearGradient
          colors={['#4ADE80', '#22C55E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.signupBtnGradient}
        >
          {loading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <Text style={styles.signupBtnText}>Create Account</Text>
          )}
        </LinearGradient>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.2)',
  },
  logoRingGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  brandTitle: {
    fontSize: 28,
    fontFamily: 'Rubik_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  cardWrapper: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  blurCard: {
    padding: 24,
    backgroundColor: 'rgba(17,17,24,0.6)',
  },
  card: {
    padding: 24,
    backgroundColor: Colors.card,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: Colors.error,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
    color: Colors.textMuted,
    marginBottom: 7,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(74,222,128,0.04)',
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Rubik_400Regular',
    color: Colors.text,
  },
  eyeBtn: {
    padding: 12,
  },
  signupBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  signupBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  signupBtnText: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.black,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.primary,
  },
});

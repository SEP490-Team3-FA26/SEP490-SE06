import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Colors adjusted to Neon Purple theme as requested
const COLORS = {
  primary: '#B026FF', // Neon Purple
  gradientStart: '#B026FF',
  gradientEnd: '#7000FF',
  navy: '#121225',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  textMain: '#FFFFFF',
  textMuted: '#A0A0A0',
  error: '#FF4B4B',
  inputBg: '#1A1A2E',
};

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const emailTranslateY = useRef(new Animated.Value(30)).current;
  const passwordTranslateY = useRef(new Animated.Value(30)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entry Animation Trigger (Stagger)
    Animated.sequence([
      // Logo & Title Slide up and Fade in
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoTranslateY, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Staggered components
      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(formOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(emailTranslateY, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
        ]),
        Animated.spring(passwordTranslateY, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
        Animated.spring(buttonTranslateY, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const validate = () => {
    let valid = true;
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setEmailError('Invalid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    } else {
      setPasswordError('');
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);

    try {
      const success = await login(email.trim(), password);
      
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Đăng nhập thành công',
          text2: 'Chào mừng bạn quay trở lại 👋',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Đăng nhập thất bại',
          text2: 'Email hoặc mật khẩu không chính xác.',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: err.message || 'Đã xảy ra lỗi không xác định.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AnimatedBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <Animated.View
            style={[
              styles.header,
              { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] },
            ]}
          >
            <View style={styles.logoContainer}>
              <Ionicons name="ticket-outline" size={50} color={COLORS.primary} />
            </View>
            <Text style={styles.brandName}>TicketVibe</Text>
            <Text style={styles.subtitle}>Unlock your next experience</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={[styles.formContainer, { opacity: formOpacity }]}>
            {/* Email Input */}
            <Animated.View style={{ transform: [{ translateY: emailTranslateY }] }}>
              <View
                style={[
                  styles.inputWrapper,
                  emailError ? { borderColor: COLORS.error } : { borderColor: 'transparent' },
                ]}
              >
                <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError('');
                  }}
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </Animated.View>

            {/* Password Input */}
            <Animated.View style={{ transform: [{ translateY: passwordTranslateY }], marginTop: 20 }}>
              <View
                style={[
                  styles.inputWrapper,
                  passwordError ? { borderColor: COLORS.error } : { borderColor: 'transparent' },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </Animated.View>

            {/* Login Button */}
            <Animated.View style={{ transform: [{ translateY: buttonTranslateY }], marginTop: 30 }}>
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.textMain} />
                  ) : (
                    <Text style={styles.buttonText}>LOGIN</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
              <Text style={[styles.footerText, { color: COLORS.primary, fontWeight: '700' }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(176, 38, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(176, 38, 255, 0.3)',
  },
  brandName: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textMain,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 5,
    letterSpacing: 1,
  },
  formContainer: {
    backgroundColor: COLORS.glass,
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    // Glassmorphism effect usually needs backdrop-filter in web, 
    // in mobile we simulate with low opacity and borders.
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.textMain,
    fontSize: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  button: {
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  forgotPassword: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});

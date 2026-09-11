// FlatInput.tsx - Glassmorphism & Modern Input Field for React Native
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface FlatInputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  clearable?: boolean;
  onClear?: () => void;
  containerStyle?: ViewStyle;
  inputWrapperStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  glassIntensity?: 'light' | 'medium';
}

export type GlassInputProps = FlatInputProps;

export const FlatInput: React.FC<FlatInputProps> = ({
  label,
  required = false,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  clearable = false,
  onClear,
  containerStyle,
  inputWrapperStyle,
  inputStyle,
  labelStyle,
  value,
  onChangeText,
  onFocus,
  onBlur,
  editable = true,
  glassIntensity = 'medium',
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, labelStyle]}>
            {label}
            {required && <Text style={styles.requiredStar}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: glassIntensity === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.78)',
          },
          isFocused && styles.inputWrapperFocused,
          hasError && styles.inputWrapperError,
          !editable && styles.inputWrapperDisabled,
          inputWrapperStyle,
        ]}
      >
        {/* Specular top sheen line */}
        <View style={styles.sheenLine} />

        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={hasError ? '#EF4444' : isFocused ? '#059669' : '#64748B'}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          {...rest}
        />

        {clearable && Boolean(value) && editable && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" style={styles.rightIcon} />
          </TouchableOpacity>
        )}

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={hasError ? '#EF4444' : isFocused ? '#059669' : '#64748B'}
              style={styles.rightIcon}
            />
          </TouchableOpacity>
        )}
      </View>

      {hasError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

export const GlassInput = FlatInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    marginBottom: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  requiredStar: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 52,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sheenLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  inputWrapperFocused: {
    borderColor: '#059669',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    ...Platform.select({
      ios: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(254, 242, 242, 0.85)',
  },
  inputWrapperDisabled: {
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    borderColor: 'rgba(226, 232, 240, 0.4)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 0,
  },
  leftIcon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 10,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});

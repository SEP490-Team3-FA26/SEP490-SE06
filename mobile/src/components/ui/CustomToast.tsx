/**
 * CustomToast.tsx - Giao Diện Thông Báo Toast To Rõ, Thân Thiện Y Tế
 * Chuẩn hóa kích thước lớn, màu sắc tương phản cao, dễ nhìn cho ứng dụng ABC Pharmacy
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ToastConfigParams } from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CustomToastViewProps {
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message?: string;
  onClose?: () => void;
}

export const CustomToastView: React.FC<CustomToastViewProps> = ({
  type,
  title,
  message,
  onClose,
}) => {
  const config = {
    success: {
      icon: 'checkmark-circle' as const,
      iconColor: '#0284C7',
      bgColor: '#F0F9FF',
      borderColor: '#0284C7',
      defaultTitle: 'Thành công',
    },
    error: {
      icon: 'close-circle' as const,
      iconColor: '#DC2626',
      bgColor: '#FEF2F2',
      borderColor: '#EF4444',
      defaultTitle: 'Thông báo lỗi',
    },
    info: {
      icon: 'information-circle' as const,
      iconColor: '#0284C7',
      bgColor: '#F0F9FF',
      borderColor: '#0284C7',
      defaultTitle: 'Thông tin',
    },
    warning: {
      icon: 'warning' as const,
      iconColor: '#D97706',
      bgColor: '#FFFBEB',
      borderColor: '#F59E0B',
      defaultTitle: 'Cảnh báo',
    },
  }[type];

  return (
    <View style={[styles.container, { borderLeftColor: config.borderColor }]}>
      {/* Icon Badge To Tròn */}
      <View style={[styles.iconBox, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={28} color={config.iconColor} />
      </View>

      {/* Nội Dung Thông Báo To Rõ */}
      <View style={styles.textContainer}>
        <Text style={styles.titleText} numberOfLines={2}>
          {title || config.defaultTitle}
        </Text>
        {message ? (
          <Text style={styles.messageText} numberOfLines={3}>
            {message}
          </Text>
        ) : null}
      </View>

      {/* Nút Đóng 'X' Tiện Lợi */}
      {onClose && (
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={styles.closeCircle}>
            <Ionicons name="close" size={16} color="#64748B" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Cấu hình toastConfig truyền vào <Toast config={toastConfig} /> của react-native-toast-message
 */
export const toastConfig = {
  success: (props: ToastConfigParams<any>) => (
    <CustomToastView
      type="success"
      title={props.text1}
      message={props.text2}
      onClose={props.hide}
    />
  ),
  error: (props: ToastConfigParams<any>) => (
    <CustomToastView
      type="error"
      title={props.text1}
      message={props.text2}
      onClose={props.hide}
    />
  ),
  info: (props: ToastConfigParams<any>) => (
    <CustomToastView
      type="info"
      title={props.text1}
      message={props.text2}
      onClose={props.hide}
    />
  ),
  warning: (props: ToastConfigParams<any>) => (
    <CustomToastView
      type="warning"
      title={props.text1}
      message={props.text2}
      onClose={props.hide}
    />
  ),
};

const styles = StyleSheet.create({
  container: {
    width: Math.min(SCREEN_WIDTH - 28, 440),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderLeftWidth: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 21,
  },
  messageText: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 19,
    marginTop: 3,
  },
  closeBtn: {
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


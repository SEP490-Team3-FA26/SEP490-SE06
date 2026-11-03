// FlatModal.tsx - Glassmorphism & High-End Dialog Modal for React Native
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlatButton, FlatButtonVariant } from './FlatButton';

export interface FlatModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  confirmText?: string;
  confirmVariant?: FlatButtonVariant;
  onConfirm?: () => void;
  cancelText?: string;
  onCancel?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
  contentStyle?: ViewStyle;
}

export type GlassModalProps = FlatModalProps;

export const FlatModal: React.FC<FlatModalProps> = ({
  visible,
  onClose,
  title,
  message,
  icon,
  iconColor = '#0284C7',
  confirmText = 'Xác nhận',
  confirmVariant = 'primary',
  onConfirm,
  cancelText = 'Hủy bỏ',
  onCancel,
  loading = false,
  children,
  contentStyle,
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalCard, contentStyle]}>
              {/* Top Specular Line */}
              <View style={styles.topSheen} />

              {/* Close 'X' button top right */}
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={styles.closeCircle}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </View>
              </TouchableOpacity>

              {/* Optional Glass Icon Circle */}
              {icon && (
                <View style={[styles.iconBox, { backgroundColor: `${iconColor}15`, borderColor: `${iconColor}35` }]}>
                  <Ionicons name={icon} size={34} color={iconColor} />
                </View>
              )}

              {/* Title & Description */}
              <Text style={styles.title}>{title}</Text>
              {message && <Text style={styles.message}>{message}</Text>}

              {/* Custom Child Content */}
              {children && <View style={styles.childContainer}>{children}</View>}

              {/* Actions Footer */}
              <View style={styles.actionsRow}>
                {cancelText && (
                  <FlatButton
                    title={cancelText}
                    variant="ghost"
                    size="md"
                    onPress={handleCancel}
                    style={styles.actionBtn}
                  />
                )}
                {onConfirm && (
                  <FlatButton
                    title={confirmText}
                    variant={confirmVariant}
                    size="md"
                    onPress={onConfirm}
                    loading={loading}
                    style={styles.actionBtn}
                  />
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export const GlassModal = FlatModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    padding: 26,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.28,
        shadowRadius: 36,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(241, 245, 249, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    alignSelf: 'center',
  },
  title: {
    fontSize: 21.5,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 15.5,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 18,
  },
  childContainer: {
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 22,
  },
  actionBtn: {
    flex: 1,
  },
});

// BranchLocationModal.tsx - Modal cho Quản lý cơ sở cài đặt vị trí GPS & bán kính Geofencing điểm danh
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ApiService } from '../../services/api.service';
import { GradientButton } from '../ui/GradientButton';
import { AnimatedTouchable } from '../ui/AnimatedTouchable';
import { showToast } from '../ui/toastHelper';
import { Branch } from '../../types/pharmacy.types';

interface BranchLocationModalProps {
  visible: boolean;
  onClose: () => void;
  branch: Branch | null;
  onSuccess?: () => void;
}

export const BranchLocationModal: React.FC<BranchLocationModalProps> = ({
  visible,
  onClose,
  branch,
  onSuccess,
}) => {
  const [latitudeStr, setLatitudeStr] = useState<string>('10.7769');
  const [longitudeStr, setLongitudeStr] = useState<string>('106.7009');
  const [radiusMeters, setRadiusMeters] = useState<number>(200);
  const [address, setAddress] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (branch) {
      if (branch.latitude !== undefined && branch.latitude !== null) {
        setLatitudeStr(branch.latitude.toString());
      }
      if (branch.longitude !== undefined && branch.longitude !== null) {
        setLongitudeStr(branch.longitude.toString());
      }
      if (branch.checkInRadiusMeters) {
        setRadiusMeters(branch.checkInRadiusMeters);
      }
      if (branch.address) {
        setAddress(branch.address);
      }
    }
  }, [branch, visible]);

  const handleGetCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast.error('Từ chối quyền', 'Vui lòng cấp quyền truy cập vị trí trong cài đặt máy để lấy tọa độ');
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      setLatitudeStr(loc.coords.latitude.toFixed(6));
      setLongitudeStr(loc.coords.longitude.toFixed(6));
      showToast.success(
        'Đã lấy tọa độ GPS',
        `Vĩ độ: ${loc.coords.latitude.toFixed(6)}, Kinh độ: ${loc.coords.longitude.toFixed(6)}`
      );
    } catch (err: any) {
      showToast.error('Lỗi định vị', err.message || 'Không thể lấy tọa độ hiện tại');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = async () => {
    const lat = parseFloat(latitudeStr);
    const lng = parseFloat(longitudeStr);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      showToast.error('Tọa độ sai', 'Vĩ độ không hợp lệ (-90 đến 90)');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      showToast.error('Tọa độ sai', 'Kinh độ không hợp lệ (-180 đến 180)');
      return;
    }

    if (isNaN(radiusMeters) || radiusMeters < 20 || radiusMeters > 5000) {
      showToast.error('Bán kính sai', 'Bán kính hợp lệ từ 20m đến 5000m');
      return;
    }

    const branchTargetId = branch?._id || branch?.id || (branch as any)?.branchCode || '';

    try {
      setIsSaving(true);
      await ApiService.updateBranchLocation(branchTargetId, {
        latitude: lat,
        longitude: lng,
        checkInRadiusMeters: radiusMeters,
        address: address.trim() || undefined,
      });

      showToast.success('Cập nhật thành công', 'Vị trí GPS cơ sở đã được cập nhật cho hệ thống điểm danh');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast.error('Lưu thất bại', err.message || 'Có lỗi xảy ra khi lưu vị trí');
    } finally {
      setIsSaving(false);
    }
  };

  const radiusPresets = [50, 100, 200, 300, 500];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <Ionicons name="location" size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.title}>Cài Đặt Vị Trí Chi Nhánh</Text>
                <Text style={styles.subtitle}>
                  {branch?.name || 'Chi nhánh hiện tại'} ({branch?.branchCode || branch?.id || 'Cơ sở'})
                </Text>
              </View>
            </View>
            <AnimatedTouchable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </AnimatedTouchable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#0284C7" />
              <Text style={styles.infoText}>
                Tọa độ này là tâm Geofencing để Dược sĩ và nhân sự điểm danh khi đến ca trực. Quản lý cơ sở toàn quyền tự quyết và chịu trách nhiệm vị trí điểm danh tại chi nhánh mình.
              </Text>
            </View>

            {/* Quick GPS Button */}
            <AnimatedTouchable
              onPress={handleGetCurrentLocation}
              disabled={isLocating}
              style={styles.gpsAutoBtn}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.gpsAutoText}>
                {isLocating ? 'Đang đọc tọa độ thiết bị...' : 'Lấy Vị Trí GPS Thiết Bị Hiện Tại'}
              </Text>
            </AnimatedTouchable>

            {/* Coordinates Input */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Vĩ Độ (Latitude)</Text>
                <TextInput
                  style={styles.input}
                  value={latitudeStr}
                  onChangeText={setLatitudeStr}
                  keyboardType="numeric"
                  placeholder="10.776900"
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Kinh Độ (Longitude)</Text>
                <TextInput
                  style={styles.input}
                  value={longitudeStr}
                  onChangeText={setLongitudeStr}
                  keyboardType="numeric"
                  placeholder="106.700900"
                />
              </View>
            </View>

            {/* Radius Presets */}
            <View style={styles.fieldGroup}>
              <View style={styles.radiusHeader}>
                <Text style={styles.label}>Bán Kính Cho Phép Điểm Danh</Text>
                <Text style={styles.radiusValue}>{radiusMeters} mét</Text>
              </View>

              <View style={styles.presetRow}>
                {radiusPresets.map((r) => {
                  const isSelected = radiusMeters === r;
                  return (
                    <AnimatedTouchable
                      key={r}
                      onPress={() => setRadiusMeters(r)}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {r}m
                      </Text>
                    </AnimatedTouchable>
                  );
                })}
              </View>
            </View>

            {/* Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Địa Chỉ Cơ Sở</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                placeholder="Số nhà, tên đường, phường, quận..."
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <AnimatedTouchable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </AnimatedTouchable>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <GradientButton
                title={isSaving ? 'Đang lưu...' : 'Lưu Vị Trí Chi Nhánh'}
                onPress={handleSave}
                loading={isSaving}
                gradientVariant="primary"
                icon={<Ionicons name="save-outline" size={18} color="#FFFFFF" />}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  gpsAutoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  gpsAutoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  radiusValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  presetChipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});

// FlatComponentsShowcase.tsx - Interactive Showcase for Glassmorphism & Modern UI Components
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FlatButton,
  FlatInput,
  FlatCard,
  FlatBadge,
  FlatModal,
  FlatEmptyState,
} from '../../components/flat';
import { HeaderBar } from '../../components/ui/HeaderBar';

export const FlatComponentsShowcase: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchVal, setSearchVal] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <HeaderBar
        title="Glassmorphism UI Kit"
        subtitle="Reusable Glass & Modern Components"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section: Badges */}
        <FlatCard title="GlassBadges (Status Chips)" headerIcon="pricetag-outline">
          <Text style={styles.sectionDesc}>Viên nang kính bán trong suốt với viền phản quang và quầng sáng nhẹ:</Text>
          <View style={styles.badgeRow}>
            <FlatBadge label="Đang Hoạt Động" status="success" variant="glass" icon="checkmark-circle" />
            <FlatBadge label="Cảnh Báo Hết Hạn" status="warning" variant="glass" icon="alert-circle" />
            <FlatBadge label="Đã Hết Hàng" status="danger" variant="glass" icon="close-circle" />
            <FlatBadge label="Chờ Phê Duyệt" status="info" variant="glass" icon="time-outline" />
            <FlatBadge label="Solid Mode" status="purple" variant="solid" pill />
            <FlatBadge label="Outline Pill" status="success" variant="outline" pill />
          </View>
        </FlatCard>

        {/* Section: Buttons */}
        <FlatCard title="GlassButtons (Các Biến Thể & Kích Cỡ)" headerIcon="radio-button-on-outline">
          <Text style={styles.sectionDesc}>Nút bấm hiệu ứng kính, gradient đa tầng và specular highlight:</Text>
          <View style={styles.buttonCol}>
            <FlatButton
              title="Primary Emerald (Lưu / Đặt Hàng)"
              variant="primary"
              size="md"
              icon="checkmark-outline"
              onPress={() => {}}
            />
            <FlatButton
              title="Secondary Slate (Quản Lý)"
              variant="secondary"
              size="md"
              icon="settings-outline"
              onPress={() => {}}
            />
            <FlatButton
              title="Outline Glass (Chi Tiết / Xem Thêm)"
              variant="outline"
              size="md"
              icon="open-outline"
              onPress={() => {}}
            />
            <FlatButton
              title="Danger Glass (Xóa / Hủy Bỏ)"
              variant="danger"
              size="sm"
              icon="trash-outline"
              onPress={() => {}}
            />
            <FlatButton
              title="Mở Thử Nghiệm Glass Modal"
              variant="success"
              size="lg"
              icon="layers-outline"
              onPress={() => setModalVisible(true)}
            />
          </View>
        </FlatCard>

        {/* Section: Inputs */}
        <FlatCard title="GlassInputs (Ô Nhập Liệu Pha Lê)" headerIcon="create-outline">
          <FlatInput
            label="Tên Thuốc / Hoạt Chất"
            required
            placeholder="Ví dụ: Paracetamol 500mg"
            leftIcon="search-outline"
            clearable
            value={searchVal}
            onChangeText={setSearchVal}
            helperText="Nhập từ khóa để tra cứu kho thuốc hoặc tương tác thuốc"
          />

          <FlatInput
            label="Số Lượng Nhập Kho"
            required
            placeholder="Ví dụ: 100"
            leftIcon="cube-outline"
            keyboardType="numeric"
            value={inputValue}
            onChangeText={setInputValue}
            error={Number(inputValue) < 0 ? 'Số lượng không được âm' : undefined}
          />
        </FlatCard>

        {/* Section: Empty State */}
        <FlatCard title="GlassEmptyState" headerIcon="cube-outline">
          <FlatEmptyState
            icon="receipt-outline"
            title="Chưa Có Đơn Chuyển Kho Nào"
            description="Hiện tại không có phiếu yêu cầu chuyển kho hoặc xuất kho đang chờ xử lý."
            actionTitle="Tạo Yêu Cầu Mới"
            onAction={() => {}}
          />
        </FlatCard>
      </ScrollView>

      {/* Glass Modal Component */}
      <FlatModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Xác Nhận Xuất Kho Dược Phẩm"
        message="Hành động này sẽ tạo phiếu xuất kho và đồng bộ sự kiện qua Kafka vào MongoDB của Microservice."
        icon="cube"
        iconColor="#059669"
        confirmText="Đồng Ý Xuất Kho"
        confirmVariant="primary"
        onConfirm={() => setModalVisible(false)}
        cancelText="Hủy"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  buttonCol: {
    gap: 12,
  },
});

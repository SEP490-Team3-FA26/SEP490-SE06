/**
 * CatalogFilterModal.tsx - Modal Bộ Lọc Dược Phẩm Toàn Diện Cho Khách Hàng
 * Thiết kế chuẩn Modal y tế:
 * 1. Phân loại theo nhóm sản phẩm (OTC, Thực phẩm chức năng, Thiết bị y tế).
 * 2. Lọc theo khoảng giá linh hoạt.
 * 3. Sắp xếp kết quả (Phổ biến, Giá tăng/giảm, Tên A-Z).
 * 4. Tùy chọn chỉ hiển thị sản phẩm còn hàng.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClinicalModalSheet } from '../../../components/clinical/ClinicalModalSheet';
import { styles } from '../ProductCatalogScreen.styles';

export interface CatalogFilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedProductType: 'ALL' | 'OTC' | 'SUPPLEMENT' | 'DEVICE';
  setSelectedProductType: (val: 'ALL' | 'OTC' | 'SUPPLEMENT' | 'DEVICE') => void;
  selectedPriceFilter: 'ALL' | 'UNDER_100' | '100_300' | '300_500' | 'OVER_500';
  setSelectedPriceFilter: (val: 'ALL' | 'UNDER_100' | '100_300' | '300_500' | 'OVER_500') => void;
  sortBy: 'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC';
  setSortBy: (val: 'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC') => void;
  selectedInStockOnly: boolean;
  setSelectedInStockOnly: (updater: (prev: boolean) => boolean) => void;
  filteredCount: number;
  onResetFilters: () => void;
}

export const CatalogFilterModal: React.FC<CatalogFilterModalProps> = ({
  visible,
  onClose,
  selectedProductType,
  setSelectedProductType,
  selectedPriceFilter,
  setSelectedPriceFilter,
  sortBy,
  setSortBy,
  selectedInStockOnly,
  setSelectedInStockOnly,
  filteredCount,
  onResetFilters,
}) => {
  return (
    <ClinicalModalSheet
      visible={visible}
      onClose={onClose}
      title="Bộ Lọc Dược Phẩm"
      subtitle="Lọc theo mức giá, loại sản phẩm và tình trạng tồn kho"
      maxHeight={Dimensions.get('window').height * 0.85}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterModalScroll}>
        {/* Nhóm 1: Loại sản phẩm không kê đơn */}
        <Text style={styles.filterSectionTitle}>Nhóm sản phẩm</Text>
        <View style={styles.filterOptionsGrid}>
          {[
            { id: 'ALL', label: 'Tất cả sản phẩm', icon: 'apps-outline' },
            { id: 'OTC', label: 'Thuốc không kê đơn (OTC)', icon: 'bandage-outline' },
            { id: 'SUPPLEMENT', label: 'Thực phẩm chức năng & Vitamin', icon: 'nutrition-outline' },
            { id: 'DEVICE', label: 'Thiết bị & Vật tư y tế', icon: 'medkit-outline' },
          ].map((item) => {
            const active = selectedProductType === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedProductType(item.id as any)}
                style={[styles.filterOptionChip, active && styles.filterOptionChipActive]}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={15} color={active ? '#0284C7' : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.filterOptionChipText, active && styles.filterOptionChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ghi chú tuân thủ y tế GPP */}
        <View style={styles.complianceNoteBox}>
          <Ionicons name="information-circle-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
          <Text style={styles.complianceNoteText}>
            Theo quy định Bộ Y Tế: Toàn bộ thuốc kê đơn (Rx) đã được tự động loại bỏ khỏi danh mục mua sắm trực tuyến.
          </Text>
        </View>

        {/* Nhóm 2: Khoảng giá */}
        <Text style={[styles.filterSectionTitle, { marginTop: 14 }]}>Khoảng giá</Text>
        <View style={styles.filterOptionsGrid}>
          {[
            { id: 'ALL', label: 'Tất cả mức giá' },
            { id: 'UNDER_100', label: 'Dưới 100.000 ₫' },
            { id: '100_300', label: '100.000 ₫ – 300.000 ₫' },
            { id: '300_500', label: '300.000 ₫ – 500.000 ₫' },
            { id: 'OVER_500', label: 'Trên 500.000 ₫' },
          ].map((item) => {
            const active = selectedPriceFilter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedPriceFilter(item.id as any)}
                style={[styles.filterOptionChip, active && styles.filterOptionChipActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={14}
                  color={active ? '#0284C7' : '#94A3B8'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.filterOptionChipText, active && styles.filterOptionChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nhóm 3: Sắp xếp kết quả */}
        <Text style={[styles.filterSectionTitle, { marginTop: 14 }]}>Sắp xếp theo</Text>
        <View style={styles.filterOptionsGrid}>
          {[
            { id: 'DEFAULT', label: 'Phổ biến nhất' },
            { id: 'PRICE_ASC', label: 'Giá tăng dần (Thấp → Cao)' },
            { id: 'PRICE_DESC', label: 'Giá giảm dần (Cao → Thấp)' },
            { id: 'NAME_ASC', label: 'Tên sản phẩm (A → Z)' },
          ].map((item) => {
            const active = sortBy === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSortBy(item.id as any)}
                style={[styles.filterOptionChip, active && styles.filterOptionChipActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={active ? '#0284C7' : '#94A3B8'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.filterOptionChipText, active && styles.filterOptionChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nhóm 4: Tình trạng tồn kho */}
        <Text style={[styles.filterSectionTitle, { marginTop: 14 }]}>Tình trạng hàng</Text>
        <TouchableOpacity
          onPress={() => setSelectedInStockOnly((prev) => !prev)}
          style={[styles.inStockToggleRow, selectedInStockOnly && styles.inStockToggleRowActive]}
          activeOpacity={0.7}
        >
          <View style={styles.inStockToggleLeft}>
            <Ionicons
              name={selectedInStockOnly ? 'checkbox' : 'square-outline'}
              size={20}
              color={selectedInStockOnly ? '#0284C7' : '#94A3B8'}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.inStockToggleText}>Chỉ hiển thị sản phẩm còn hàng trong kho</Text>
          </View>
          <View style={[styles.stockStatusBadge, { backgroundColor: selectedInStockOnly ? '#DCFCE7' : '#F1F5F9' }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: selectedInStockOnly ? '#16A34A' : '#64748B' }}>
              {selectedInStockOnly ? 'Đang bật' : 'Tất cả'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Thanh Nút Hành Động Ở Chân Modal */}
        <View style={styles.filterModalFooterRow}>
          <TouchableOpacity
            onPress={onResetFilters}
            style={styles.filterResetBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.filterResetBtnText}>Thiết lập lại</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={styles.filterApplyBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.filterApplyBtnText}>
              Xem {filteredCount} sản phẩm
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ClinicalModalSheet>
  );
};


/**
 * WarehouseMap3D.tsx
 * Sơ Đồ Kho 3D Đa Chiều Tương Tác Chuẩn GSP Dành Cho Thiết Bị Di Động (Mobile Expo)
 * Tích hợp Phối cảnh Không gian 3D Isometric, Tầng Kệ Đa Chiều, Định Vị Thuốc Phát Sáng & Tối Ưu Tải 60fps.
 * Tuân thủ chuẩn WDP301/SEP490 Playbook v2.0 - Chú thích Tiếng Việt 100%.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WarehouseZone } from '../../types/pharmacy.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WarehouseMap3DProps {
  zones: WarehouseZone[];
  selectedZoneFilter: string;
  onSelectZoneFilter: (zoneKey: string) => void;
  highlightedTarget: string; // Định dạng "Zone-Rack-Shelf", vd: "A-A1-2"
  onSelectShelf: (location: { zone: string; rack: string; shelf: number }) => void;
  onClearHighlight?: () => void;
}

const ZONE_METAS: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
  A: { bg: 'rgba(2, 132, 199, 0.12)', border: '#0284C7', text: '#0284C7', label: 'Kháng sinh', icon: '💊' },
  B: { bg: 'rgba(245, 158, 11, 0.12)', border: '#F59E0B', text: '#D97706', label: 'Hạ sốt & Giảm đau', icon: '🌡️' },
  C: { bg: 'rgba(239, 68, 68, 0.12)', border: '#EF4444', text: '#DC2626', label: 'Tim mạch', icon: '❤️' },
  D: { bg: 'rgba(2, 132, 199, 0.12)', border: '#0284C7', text: '#0369A1', label: 'Tiêu hóa', icon: '🫀' },
  E: { bg: 'rgba(139, 92, 246, 0.12)', border: '#8B5CF6', text: '#7C3AED', label: 'Thực phẩm chức năng', icon: '🌿' },
  F: { bg: 'rgba(100, 116, 139, 0.12)', border: '#64748B', text: '#475569', label: 'Vật tư y tế', icon: '🩺' },
};

// =========================================================================
// Component Tầng Kệ 3D (Shelf Tier 3D Block) - Đã tối ưu hóa Memoization
// =========================================================================
interface ShelfTier3DProps {
  zoneKey: string;
  rackId: string;
  shelfNum: number;
  totalStock: number;
  batchCount: number;
  status: string;
  isHighlighted: boolean;
  onPress: () => void;
}

const ShelfTier3D = React.memo<ShelfTier3DProps>(({
  zoneKey,
  rackId,
  shelfNum,
  totalStock,
  batchCount,
  status,
  isHighlighted,
  onPress,
}) => {
  const isWarning = status === 'NEAR_EXPIRY';
  const isExpired = status === 'EXPIRED';

  let tierColor = '#0284C7';
  let tierBg = '#F0F9FF';
  let tierBorder = '#BAE6FD';

  if (isHighlighted) {
    tierColor = '#0284C7';
    tierBg = '#E0F2FE';
    tierBorder = '#0284C7';
  } else if (isExpired) {
    tierColor = '#DC2626';
    tierBg = '#FEF2F2';
    tierBorder = '#FCA5A5';
  } else if (isWarning) {
    tierColor = '#D97706';
    tierBg = '#FFFBEB';
    tierBorder = '#FDE68A';
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.shelf3DBox,
        {
          backgroundColor: tierBg,
          borderColor: tierBorder,
          transform: isHighlighted ? [{ scale: 1.03 }] : [{ scale: 1 }],
        },
        isHighlighted && styles.shelf3DHighlighted,
      ]}
    >
      {/* Ghim định vị 3D khi thuốc được tìm thấy */}
      {isHighlighted && (
        <View style={styles.pin3DBadge}>
          <Ionicons name="location" size={11} color="#FFFFFF" />
          <Text style={styles.pin3DText}>TẦNG {shelfNum}</Text>
        </View>
      )}

      {/* Mặt trên 3D giả lập chiều sâu Isometric (Top Face) */}
      <View style={[styles.shelf3DTopFace, { backgroundColor: isHighlighted ? '#38BDF8' : '#CBD5E1' }]} />

      <View style={styles.shelf3DContent}>
        <View style={styles.shelf3DLeft}>
          <View style={[styles.shelfNumPill, { backgroundColor: isHighlighted ? '#0284C7' : '#E2E8F0' }]}>
            <Text style={[styles.shelfNumPillText, isHighlighted && { color: '#FFFFFF' }]}>T{shelfNum}</Text>
          </View>
          <View>
            <Text style={[styles.shelf3DTitle, { color: tierColor }]}>
              Tầng {shelfNum}
            </Text>
            <Text style={styles.shelf3DSub}>
              {batchCount} lô · {totalStock} đơn vị
            </Text>
          </View>
        </View>

        <View style={styles.shelf3DRight}>
          {isWarning && (
            <View style={styles.warningPill}>
              <Ionicons name="alert-circle" size={12} color="#D97706" />
              <Text style={styles.warningPillText}>Cận Date</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// =========================================================================
// Component Kệ Hàng 3D (Rack 3D Stand)
// =========================================================================
interface Rack3DProps {
  zoneKey: string;
  rack: any;
  highlightedTarget: string;
  onSelectShelf: (loc: { zone: string; rack: string; shelf: number }) => void;
}

const Rack3D = React.memo<Rack3DProps>(({
  zoneKey,
  rack,
  highlightedTarget,
  onSelectShelf,
}) => {
  const rackId = rack.rackId;
  const isRackTargeted = highlightedTarget.startsWith(`${zoneKey}-${rackId}`);

  return (
    <View style={[styles.rack3DContainer, isRackTargeted && styles.rack3DTargeted]}>
      {/* Cột trụ 3D đỉnh kệ */}
      <View style={styles.rack3DHeader}>
        <View style={styles.rack3DTitleRow}>
          <Ionicons name="server" size={16} color={isRackTargeted ? '#0284C7' : '#64748B'} />
          <Text style={[styles.rack3DTitleText, isRackTargeted && { color: '#0284C7', fontWeight: 'bold' }]}>
            KỆ {rackId}
          </Text>
        </View>
        <Text style={styles.rack3DCapacity}>4 Tầng GSP</Text>
      </View>

      {/* 4 Tầng kệ xếp chồng theo chiều thẳng đứng không gian 3D */}
      <View style={styles.rack3DStack}>
        {rack.shelves?.map((shelf: any) => {
          const targetId = `${zoneKey}-${rackId}-${shelf.shelf}`;
          const isHighlighted = highlightedTarget === targetId;

          return (
            <ShelfTier3D
              key={`shelf_3d_${targetId}`}
              zoneKey={zoneKey}
              rackId={rackId}
              shelfNum={shelf.shelf}
              totalStock={shelf.totalStock}
              batchCount={shelf.batchCount}
              status={shelf.status}
              isHighlighted={isHighlighted}
              onPress={() =>
                onSelectShelf({
                  zone: zoneKey,
                  rack: rackId,
                  shelf: shelf.shelf,
                })
              }
            />
          );
        })}
      </View>
    </View>
  );
});

// =========================================================================
// Component Sơ Đồ Kho 3D Trung Tâm (WarehouseMap3D)
// =========================================================================
export const WarehouseMap3D: React.FC<WarehouseMap3DProps> = ({
  zones,
  selectedZoneFilter,
  onSelectZoneFilter,
  highlightedTarget,
  onSelectShelf,
  onClearHighlight,
}) => {
  const [cameraMode, setCameraMode] = useState<'3D_ISOMETRIC' | '3D_FRONT'>('3D_ISOMETRIC');

  // Lọc phân khu hiển thị
  const filteredZones = useMemo(() => {
    if (selectedZoneFilter === 'ALL') return zones;
    return zones.filter((z) => (z.zoneId || '').toUpperCase() === selectedZoneFilter.toUpperCase());
  }, [zones, selectedZoneFilter]);

  // Phân tích vị trí đích đang highlight
  const targetInfo = useMemo(() => {
    if (!highlightedTarget) return null;
    const parts = highlightedTarget.split('-');
    if (parts.length >= 3) {
      return {
        zone: parts[0],
        rack: parts[1],
        shelf: parts[2],
      };
    }
    return null;
  }, [highlightedTarget]);

  return (
    <View style={styles.container}>
      {/* 3D Camera Controls Bar */}
      <View style={styles.cameraControlBar}>
        <View style={styles.cameraModes}>
          <TouchableOpacity
            onPress={() => setCameraMode('3D_ISOMETRIC')}
            style={[styles.cameraModeBtn, cameraMode === '3D_ISOMETRIC' && styles.cameraModeBtnActive]}
          >
            <Ionicons
              name="cube"
              size={13}
              color={cameraMode === '3D_ISOMETRIC' ? '#0284C7' : '#64748B'}
            />
            <Text
              style={[
                styles.cameraModeBtnText,
                cameraMode === '3D_ISOMETRIC' && styles.cameraModeBtnTextActive,
              ]}
            >
              3D Không Gian
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCameraMode('3D_FRONT')}
            style={[styles.cameraModeBtn, cameraMode === '3D_FRONT' && styles.cameraModeBtnActive]}
          >
            <Ionicons
              name="layers"
              size={13}
              color={cameraMode === '3D_FRONT' ? '#0284C7' : '#64748B'}
            />
            <Text
              style={[
                styles.cameraModeBtnText,
                cameraMode === '3D_FRONT' && styles.cameraModeBtnTextActive,
              ]}
            >
              3D Trục Đứng
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.badgeGsp}>
          <Text style={styles.badgeGspText}>GSP 6 Zones</Text>
        </View>
      </View>

      {/* Thông báo Ghim Vị Trí Highlight Đang Nhắm Tới */}
      {targetInfo && (
        <View style={styles.targetBanner}>
          <View style={styles.targetBannerLeft}>
            <View style={styles.targetPulseDot} />
            <Text style={styles.targetBannerText}>
              Đang định vị: <Text style={{ fontWeight: 'bold' }}>Khu {targetInfo.zone} · Kệ {targetInfo.rack} · Tầng {targetInfo.shelf}</Text>
            </Text>
          </View>
          {onClearHighlight && (
            <TouchableOpacity onPress={onClearHighlight} style={styles.clearHighlightBtn}>
              <Ionicons name="close-circle" size={18} color="#0284C7" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bộ Lọc Zone Cuộn Ngang Nhanh */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.zoneFilterScroll}>
        <TouchableOpacity
          onPress={() => onSelectZoneFilter('ALL')}
          style={[styles.zonePill, selectedZoneFilter === 'ALL' && styles.zonePillActive]}
        >
          <Text style={[styles.zonePillText, selectedZoneFilter === 'ALL' && styles.zonePillTextActive]}>
            Tất cả khu (A-F)
          </Text>
        </TouchableOpacity>
        {['A', 'B', 'C', 'D', 'E', 'F'].map((zKey) => {
          const zMeta = ZONE_METAS[zKey] || ZONE_METAS['A'];
          const isActive = selectedZoneFilter === zKey;
          return (
            <TouchableOpacity
              key={`zone_btn_${zKey}`}
              onPress={() => onSelectZoneFilter(zKey)}
              style={[
                styles.zonePill,
                isActive && { backgroundColor: zMeta.border, borderColor: zMeta.border },
              ]}
            >
              <Text style={[styles.zonePillText, isActive && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                {zMeta.icon} Khu {zKey}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Không Gian Kho 3D Isometric View */}
      <View style={[styles.isometricCanvas, cameraMode === '3D_ISOMETRIC' && styles.isometricPerspective]}>
        {/* Lưới mặt sàn kho 3D (Floor Grid Aisles) */}
        <View style={styles.aisleGuide}>
          <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
          <Text style={styles.aisleGuideText}>Lối Đi Xe Nâng / Thủ Kho · Hành Lang Chuẩn GSP</Text>
        </View>

        {filteredZones.map((zone, zIdx) => {
          const zoneKey = zone.zoneId || `Z${zIdx}`;
          const meta = ZONE_METAS[zone.zoneId] || ZONE_METAS['A'];

          return (
            <View key={`3d_zone_${zoneKey}_${zIdx}`} style={[styles.zone3DWrapper, { borderColor: meta.border }]}>
              {/* Header Phân Khu 3D */}
              <View style={[styles.zone3DHeader, { backgroundColor: meta.bg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>{meta.icon}</Text>
                  <Text style={[styles.zone3DTitle, { color: meta.text }]}>
                    {zone.name || `Khu ${zone.zoneId || zoneKey} - ${meta.label}`}
                  </Text>
                </View>
                <View style={[styles.zone3DTag, { borderColor: meta.border }]}>
                  <Text style={[styles.zone3DTagText, { color: meta.text }]}>{zone.category}</Text>
                </View>
              </View>

              {/* Danh sách các Kệ 3D trong khu */}
              <View style={styles.racks3DGrid}>
                {zone.racks?.map((rack: any) => (
                  <Rack3D
                    key={`rack_card_${zoneKey}_${rack.rackId}`}
                    zoneKey={zoneKey}
                    rack={rack}
                    highlightedTarget={highlightedTarget}
                    onSelectShelf={onSelectShelf}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  cameraControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cameraModes: {
    flexDirection: 'row',
    gap: 6,
  },
  cameraModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  cameraModeBtnActive: {
    backgroundColor: '#E0F2FE',
  },
  cameraModeBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  cameraModeBtnTextActive: {
    color: '#0284C7',
    fontWeight: 'bold',
  },
  badgeGsp: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  badgeGspText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  targetBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  targetBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
  },
  targetBannerText: {
    fontSize: 13,
    color: '#0369A1',
  },
  clearHighlightBtn: {
    padding: 2,
  },
  zoneFilterScroll: {
    marginBottom: 12,
  },
  zonePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  zonePillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  zonePillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  zonePillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  isometricCanvas: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  isometricPerspective: {
    // Hiệu ứng phối cảnh isometric nhẹ nhàng
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  aisleGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aisleGuideText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  zone3DWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 14,
    overflow: 'hidden',
  },
  zone3DHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  zone3DTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  zone3DTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  zone3DTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  racks3DGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 10,
  },
  rack3DContainer: {
    width: (SCREEN_WIDTH - 64) / 2,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rack3DTargeted: {
    borderColor: '#0284C7',
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
  },
  rack3DHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  rack3DTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rack3DTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  rack3DCapacity: {
    fontSize: 9,
    color: '#94A3B8',
  },
  rack3DStack: {
    gap: 6,
  },
  shelf3DBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  shelf3DHighlighted: {
    borderWidth: 2,
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  pin3DBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderBottomLeftRadius: 6,
    zIndex: 10,
  },
  pin3DText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  shelf3DTopFace: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    marginBottom: 4,
  },
  shelf3DContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shelf3DLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shelfNumPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelfNumPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  shelf3DTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  shelf3DSub: {
    fontSize: 9,
    color: '#64748B',
  },
  shelf3DRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warningPillText: {
    fontSize: 8,
    color: '#D97706',
    fontWeight: 'bold',
  },
});


// PickingScreen.tsx - Màn hình Quét Mã Liên Hoàn Nhặt Thuốc Giữ Chỗ (Split-Screen PDA UX)
// Thiết kế: Camera giữ mở liên tục nửa trên + Thẻ hướng dẫn nhặt hàng nửa dưới
// Chuẩn màu: Zero Green (Auth Blue #0284C7 cho khớp, Amber #D97706 cho cảnh báo/override, Rose #DC2626 cho sai/hết hạn)

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../components/ui/toastHelper';
import { ToteManagerModal } from '../../components/warehouse/ToteManagerModal';
import { useDispatchOrder } from '../../hooks/useDispatchOrder';
import {
  parseBinQRCode,
  parseGS1DataMatrix,
  parseToteQRCode,
} from '../../utils/gs1Parser';
import { DispatchPickingLine } from '../../types/pharmacy.types';

type ScanStep = 'SCAN_TOTE' | 'SCAN_BIN' | 'SCAN_BOX' | 'RETURN_RESTOCK_BIN';
type FeedbackTone = 'IDLE' | 'MATCH' | 'WARN' | 'ERROR';

const OVERRIDE_REASONS = ['Hàng hỏng bao bì', 'Lô thực tế không đủ', 'Khác'];
const MANUAL_REASONS = [
  { key: 'BARCODE_DAMAGED', label: 'Tem mã vạch bị rách / mờ' },
  { key: 'NO_DATAMATRIX_ON_PACK', label: 'Hộp thuốc không có DataMatrix' },
  { key: 'SCANNER_FAILURE', label: 'Camera khó đọc trong góc tối' },
];

export const PickingScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const orderId: string = route?.params?.orderId || '';
  const [permission, requestPermission] = useCameraPermissions();

  // Yêu cầu quyền truy cập Camera (Tự động hoặc khi người dùng bấm nút)
  const handleRequestPermission = useCallback(async () => {
    try {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Quyền truy cập Camera',
          'Ứng dụng cần quyền Camera để quét mã QR Khay & GS1 Hộp thuốc. Vui lòng cho phép Camera trong Cài đặt thiết bị để tiếp tục nhặt hàng.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Mở Cài Đặt',
              onPress: () => {
                Linking.openSettings().catch(() => {
                  showToast.error('Lỗi', 'Không thể mở cài đặt thiết bị.');
                });
              },
            },
          ]
        );
      }
    } catch (err: any) {
      console.warn('[PickingScreen] Lỗi xin quyền camera:', err);
    }
  }, [requestPermission]);

  // Tự động yêu cầu quyền Camera ngay khi vừa mở màn hình PickingScreen
  useEffect(() => {
    if (!permission) {
      void requestPermission();
    } else if (!permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const {
    order,
    loading,
    submitting,
    pickItem,
    returnItem,
    markShortage,
    reload,
  } = useDispatchOrder(orderId, (fb) => {
    if (fb.type === 'error') showToast.error('Lỗi thao tác', fb.message);
    else if (fb.type === 'success') showToast.success('Thành công', fb.message);
    else showToast.info('Thông báo', fb.message);
  });

  // Trạng thái điều khiển Camera liên hoàn
  const [torch, setTorch] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(0); // 0 = 1x, 0.25 = 2x cho kệ cao tầng 4
  const [cameraPaused, setCameraPaused] = useState<boolean>(false);
  const lastScanRef = useRef<{ data: string; at: number }>({ data: '', at: 0 });

  // Trạng thái bước quét & phiên nhặt hiện tại
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [activeToteCode, setActiveToteCode] = useState<string>('');
  const [verifiedBinCode, setVerifiedBinCode] = useState<string>('');
  const [verifiedBoxBatchNo, setVerifiedBoxBatchNo] = useState<string>('');
  const [lastRawBarcode, setLastRawBarcode] = useState<string>('');
  const [pickQty, setPickQty] = useState<number>(1);
  const [scanStep, setScanStep] = useState<ScanStep>('SCAN_TOTE');

  // Phản hồi trực quan 60fps trên GPU (Chỉ animate transform theo chuẩn Reanimated)
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('Sẵn sàng quét mã');
  const shakeX = useSharedValue(0);
  const reticleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Modals / Bottom sheets xử lý ngoại lệ thực tế kho
  const [showToteModal, setShowToteModal] = useState<boolean>(false);
  const [showManualInputModal, setShowManualInputModal] = useState<boolean>(false);
  const [manualBatchNo, setManualBatchNo] = useState<string>('');
  const [manualExpDate, setManualExpDate] = useState<string>('');
  const [manualReason, setManualReason] = useState<string>('NO_DATAMATRIX_ON_PACK');
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('Lô thực tế không đủ');
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [selectedPickIdToReturn, setSelectedPickIdToReturn] = useState<string>('');
  const [returnOutcome, setReturnOutcome] = useState<'RESTOCK' | 'DAMAGED' | 'QUARANTINE'>('RESTOCK');
  const [returnQtyInput, setReturnQtyInput] = useState<string>('1');
  const [returnTargetBin, setReturnTargetBin] = useState<string>('');
  const [returnReason, setReturnReason] = useState<string>('');
  const [manualCodeInput, setManualCodeInput] = useState<string>('');

  // Tự động chọn Tote sẵn có trên đơn & dòng PENDING đầu tiên
  useEffect(() => {
    if (!order) return;
    if (order.toteCode && !activeToteCode) {
      setActiveToteCode(order.toteCode);
    }
    const list = order.pickingList || [];
    const currentExists = list.find((l) => l.lineId === selectedLineId && l.itemStatus === 'PENDING');
    if (!currentExists) {
      const nextPending = list.find((l) => l.itemStatus === 'PENDING') || list[0];
      if (nextPending) {
        setSelectedLineId(nextPending.lineId);
        setVerifiedBinCode('');
        setVerifiedBoxBatchNo('');
        setPickQty(Math.max(1, nextPending.requestedQty - nextPending.pickedQty));
      }
    }
  }, [order, selectedLineId, activeToteCode]);

  // Đồng bộ bước quét tự động theo trạng thái hiện tại
  useEffect(() => {
    if (scanStep === 'RETURN_RESTOCK_BIN') return;
    if (!activeToteCode) {
      setScanStep('SCAN_TOTE');
    } else if (!verifiedBinCode) {
      setScanStep('SCAN_BIN');
    } else {
      setScanStep('SCAN_BOX');
    }
  }, [activeToteCode, verifiedBinCode, scanStep]);

  const activeLine: DispatchPickingLine | undefined = useMemo(() => {
    if (!order?.pickingList?.length) return undefined;
    return order.pickingList.find((l) => l.lineId === selectedLineId) || order.pickingList[0];
  }, [order, selectedLineId]);

  const allLinesResolved = useMemo(() => {
    const list = order?.pickingList || [];
    return list.length > 0 && list.every((l) => l.itemStatus === 'PICKED' || l.itemStatus === 'SHORTAGE');
  }, [order]);

  const triggerShakeError = useCallback(
    (msg: string) => {
      setFeedbackTone('ERROR');
      setFeedbackMsg(msg);
      try {
        Vibration.vibrate([0, 120, 80, 120]);
      } catch {}
      shakeX.value = withSequence(
        withTiming(-10, { duration: 55 }),
        withTiming(10, { duration: 55 }),
        withTiming(-8, { duration: 55 }),
        withTiming(8, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
    },
    [shakeX],
  );

  const triggerMatchFeedback = useCallback((msg: string) => {
    setFeedbackTone('MATCH');
    setFeedbackMsg(msg);
    try {
      Vibration.vibrate(55);
    } catch {}
  }, []);

  // Hàm xử lý chung cho cả Camera lẫn nhập mã thử nhanh
  const processScannedCode = useCallback(
    (rawCode: string) => {
      const trimmed = String(rawCode || '').trim();
      if (!trimmed) return;

      // 1. Trường hợp đang quét khay đích để trả hàng tốt RESTOCK
      if (scanStep === 'RETURN_RESTOCK_BIN') {
        const binParsed = parseBinQRCode(trimmed);
        if (!binParsed.valid || !binParsed.binCode) {
          triggerShakeError('Mã khay đích không đúng chuẩn BIN-{Zone}-{Rack}-S{Shelf}-B{Bin}');
          return;
        }
        setReturnTargetBin(binParsed.binCode);
        setScanStep(verifiedBinCode ? 'SCAN_BOX' : 'SCAN_BIN');
        setShowReturnModal(true);
        triggerMatchFeedback(`Đã quét khay trả hàng: ${binParsed.binCode}`);
        return;
      }

      // 2. Tự động nhận diện hoặc đổi nhanh giỏ Tote nếu quét đúng mã TOTE-...
      const maybeTote = parseToteQRCode(trimmed);
      if (maybeTote.valid && maybeTote.toteCode) {
        setActiveToteCode(maybeTote.toteCode);
        triggerMatchFeedback(`Đã gắn giỏ ${maybeTote.toteCode}`);
        return;
      }

      // Đảm bảo luôn có giỏ Tote đồng hành
      if (!activeToteCode) {
        const autoTote = order?.toteCode || 'TOTE-01';
        setActiveToteCode(autoTote);
      }

      if (!activeLine) {
        triggerShakeError('Không tìm thấy dòng thuốc cần nhặt trên phiếu.');
        return;
      }

      // 3. Nhận diện mã Khay Kệ dán tại vị trí (Tem khay định danh thuốc đang đựng trong khay)
      const binParsed = parseBinQRCode(trimmed);
      if (binParsed.valid && binParsed.binCode) {
        const expectedBin = activeLine.suggestedLocation?.binCode;
        if (expectedBin && binParsed.binCode !== expectedBin) {
          triggerShakeError(`Sai khay! Thuốc này ở ${expectedBin}, bạn vừa quét ${binParsed.binCode}`);
          return;
        }

        // Tem khay đã định danh đúng khay và loại thuốc đang đựng -> Khớp toàn bộ 1 chạm!
        setVerifiedBinCode(binParsed.binCode);
        setVerifiedBoxBatchNo(activeLine.batchNo || 'DEFAULT');
        setLastRawBarcode(trimmed);
        setPickQty(Math.max(1, activeLine.requestedQty - activeLine.pickedQty));
        triggerMatchFeedback(`Đã khớp khay & thuốc ${activeLine.medicineName}! Sẵn sàng bỏ vào giỏ.`);
        return;
      }

      // 4. Nhận diện mã GS1 DataMatrix / Barcode hộp thuốc
      const gs1 = parseGS1DataMatrix(trimmed);
      if (gs1.valid) {
        const expectedCode = String(activeLine.medicineBarcode || '').trim();
        if (expectedCode) {
          const scannedCandidates = [gs1.gtin13, gs1.gtin14, gs1.raw].filter(Boolean);
          const isMedMatch = scannedCandidates.some((c) => c === expectedCode || expectedCode === `0${c}` || c.includes(expectedCode));
          if (!isMedMatch && !trimmed.includes(expectedCode)) {
            triggerShakeError(`Sai loại thuốc! Không khớp mã vạch của ${activeLine.medicineName}`);
            return;
          }
        }

        // Kiểm tra hạn dùng (Chặn cứng nếu đã hết hạn cho đơn TRANSFER)
        if (order?.type === 'TRANSFER' && gs1.isExpired) {
          triggerShakeError(`CẢNH BÁO ĐỎ: Hộp thuốc vừa quét ĐÃ HẾT HẠN (${gs1.expDateISO})! Tuyệt đối không bỏ vào giỏ.`);
          return;
        }

        setLastRawBarcode(trimmed);
        setVerifiedBinCode(activeLine.suggestedLocation?.binCode || 'BIN-AUTO');

        // Kiểm tra số lô có khớp với gợi ý FEFO hay không
        if (gs1.batchNo && gs1.batchNo !== activeLine.batchNo) {
          setFeedbackTone('WARN');
          setFeedbackMsg(`Lô quét (${gs1.batchNo}) khác gợi ý FEFO (${activeLine.batchNo})`);
          setVerifiedBoxBatchNo(gs1.batchNo);
          setShowOverrideModal(true);
          try {
            Vibration.vibrate([0, 90, 60, 90]);
          } catch {}
          return;
        }

        setVerifiedBoxBatchNo(gs1.batchNo || activeLine.batchNo || 'DEFAULT');
        setPickQty(Math.max(1, activeLine.requestedQty - activeLine.pickedQty));
        triggerMatchFeedback(`Khớp chuẩn GS1 (${gs1.batchNo || activeLine.batchNo})! Sẵn sàng bỏ vào giỏ.`);
        return;
      }

      triggerShakeError('Mã quét không hợp lệ. Vui lòng quét mã QR tem dán tại khay hoặc mã vạch thuốc.');
    },
    [scanStep, activeLine, order?.type, verifiedBinCode, triggerMatchFeedback, triggerShakeError],
  );

  const handleCameraBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (cameraPaused || submitting) return;
      const rawData = result.data ? String(result.data).trim() : '';
      if (!rawData) return;

      const now = Date.now();
      if (lastScanRef.current.data === rawData && now - lastScanRef.current.at < 1200) {
        return;
      }
      lastScanRef.current = { data: rawData, at: now };
      processScannedCode(rawData);
    },
    [cameraPaused, submitting, processScannedCode],
  );

  const handleConfirmPick = async (options?: { gs1Scanned?: boolean; manualReason?: string; overrideReason?: string }) => {
    if (!order || !activeLine) return;
    if (!activeToteCode) {
      showToast.error('Thiếu giỏ Tote', 'Vui lòng quét hoặc chọn mã Tote trước.');
      return;
    }
    if (!verifiedBinCode) {
      showToast.error('Chưa quét khay', 'Vui lòng quét QR khay thuốc ở Bước 1 trước.');
      return;
    }

    const remaining = Math.max(0, activeLine.requestedQty - activeLine.pickedQty);
    if (pickQty <= 0 || pickQty > remaining) {
      showToast.error('Số lượng không hợp lệ', `Chỉ được nhặt tối đa ${remaining} ${activeLine.unit}.`);
      return;
    }

    const ok = await pickItem(
      {
        lineId: activeLine.lineId,
        scannedBinCode: verifiedBinCode,
        toteCode: activeToteCode,
        quantity: pickQty,
        overrideReason: options?.overrideReason,
        gs1Scanned: options?.gs1Scanned ?? true,
        manualReason: options?.manualReason,
        rawBarcodeScanned: lastRawBarcode || verifiedBoxBatchNo,
        expectedVersion: order.version,
      },
      (prev) => {
        // Optimistic UI: cập nhật ngay số lượng đã giữ chỗ trên màn hình
        const updatedList = prev.pickingList.map((item) => {
          if (item.lineId !== activeLine.lineId) return item;
          const nextPicked = item.pickedQty + pickQty;
          return {
            ...item,
            pickedQty: nextPicked,
            itemStatus: nextPicked >= item.requestedQty ? ('PICKED' as const) : ('PENDING' as const),
          };
        });
        return {
          ...prev,
          status: 'PICKING',
          toteCode: activeToteCode,
          totalPicked: prev.totalPicked + pickQty,
          pickingList: updatedList,
        };
      },
    );

    if (ok) {
      showToast.success('Đã giữ chỗ vào giỏ', `+${pickQty} ${activeLine.unit} vào ${activeToteCode}`);
      setVerifiedBoxBatchNo('');
      setLastRawBarcode('');
      if (pickQty >= remaining) {
        setVerifiedBinCode('');
      }
    }
  };

  const handleConfirmManualSubmit = () => {
    if (!manualBatchNo.trim() || !manualExpDate.trim()) {
      showToast.error('Thiếu thông tin', 'Vui lòng nhập đầy đủ số lô và hạn dùng (YYYY-MM-DD).');
      return;
    }
    setVerifiedBoxBatchNo(manualBatchNo.trim());
    setShowManualInputModal(false);
    void handleConfirmPick({ gs1Scanned: false, manualReason });
  };

  const handleReportShortage = () => {
    if (!activeLine) return;
    Alert.alert(
      'Xác Nhận Báo Thiếu Hàng',
      `Xác nhận khay ${activeLine.suggestedLocation.binCode} và khu dự trữ đã hết "${activeLine.medicineName}"?\n\nHệ thống sẽ đánh dấu SHORTAGE và tự lập đề xuất nhập hàng nháp (DRAFT).`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Báo Thiếu Hàng',
          style: 'destructive',
          onPress: async () => {
            await markShortage(activeLine.lineId, 'Hết hàng thực tế trên khay & khu dự trữ');
            setVerifiedBinCode('');
            setVerifiedBoxBatchNo('');
          },
        },
      ],
    );
  };

  const handleExecuteReturn = async () => {
    if (!selectedPickIdToReturn) {
      showToast.error('Chưa chọn lần nhặt', 'Vui lòng chọn bản ghi đã nhặt muốn hoàn trả.');
      return;
    }
    const qty = parseInt(returnQtyInput, 10) || 0;
    if (qty <= 0) {
      showToast.error('Số lượng sai', 'Số lượng trả phải lớn hơn 0.');
      return;
    }
    if (returnOutcome === 'RESTOCK' && !returnTargetBin.trim()) {
      // Đóng modal tạm để thủ kho quét lại QR khay đích
      setShowReturnModal(false);
      setScanStep('RETURN_RESTOCK_BIN');
      showToast.info('Quét khay trả hàng', 'Vui lòng hướng camera vào mã QR khay đích để cất lại thuốc.');
      return;
    }

    const ok = await returnItem({
      pickId: selectedPickIdToReturn,
      quantity: qty,
      outcome: returnOutcome,
      targetBinCode: returnOutcome === 'RESTOCK' ? returnTargetBin.trim() : undefined,
      reason: returnReason.trim() || undefined,
    });

    if (ok) {
      setShowReturnModal(false);
      setReturnTargetBin('');
      setReturnReason('');
      setSelectedPickIdToReturn('');
    }
  };

  const reticleColor =
    feedbackTone === 'MATCH'
      ? '#0284C7'
      : feedbackTone === 'WARN'
      ? '#D97706'
      : feedbackTone === 'ERROR'
      ? '#DC2626'
      : '#38BDF8';

  const activeReturnablePicks = (order?.picks || []).filter((p) => p.qty - (p.returnedQty || 0) > 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ========================================================= */}
      {/* NỬA TRÊN (42%): CAMERA QUÉT MÃ LIÊN HOÀN PDA               */}
      {/* ========================================================= */}
      <View style={styles.cameraDeck}>
        {!permission?.granted ? (
          <View style={styles.permissionOverlay}>
            <Ionicons name="camera-outline" size={38} color="#38BDF8" />
            <Text style={styles.permissionText}>Cấp quyền Camera để quét QR Khay & GS1 Hộp thuốc</Text>
            <TouchableOpacity onPress={handleRequestPermission} style={styles.grantBtn}>
              <Text style={styles.grantBtnText}>CẤP QUYỀN CAMERA</Text>
            </TouchableOpacity>
          </View>
        ) : !cameraPaused ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            autofocus="on"
            enableTorch={torch}
            zoom={zoomLevel}
            barcodeScannerSettings={{
              barcodeTypes: ['datamatrix', 'qr', 'code128', 'ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
            onBarcodeScanned={handleCameraBarcodeScanned}
          />
        ) : (
          <View style={styles.pausedOverlay}>
            <Ionicons name="pause-circle-outline" size={44} color="#94A3B8" />
            <Text style={styles.pausedText}>Camera đang tạm dừng khi di chuyển</Text>
          </View>
        )}

        {/* Thanh điều khiển nổi trên Camera */}
        <View style={styles.topHud}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hudCircleBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.orderChip}>
            <Text style={styles.orderChipText}>{order?.dispatchCode || 'Đang tải...'}</Text>
          </View>

          <View style={styles.hudRightGroup}>
            <TouchableOpacity
              onPress={() => setZoomLevel((z) => (z === 0 ? 0.25 : 0))}
              style={[styles.hudPillBtn, zoomLevel > 0 ? styles.hudPillActive : null]}
            >
              <Text style={styles.hudPillText}>{zoomLevel > 0 ? '2x' : '1x'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTorch((prev) => !prev)}
              style={[styles.hudCircleBtn, torch ? styles.hudTorchActive : null]}
            >
              <Ionicons name={torch ? 'flash' : 'flash-off'} size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCameraPaused((p) => !p)}
              style={styles.hudCircleBtn}
            >
              <Ionicons name={cameraPaused ? 'play' : 'pause'} size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Khung ngắm trung tâm có Reanimated Shake */}
        <Animated.View style={[styles.reticleBox, { borderColor: reticleColor }, reticleAnimStyle]}>
          <Text style={[styles.stepTag, { backgroundColor: reticleColor }]}>
            {scanStep === 'SCAN_TOTE'
              ? 'BƯỚC 0: QUÉT MÃ TOTE'
              : scanStep === 'SCAN_BIN'
              ? `BƯỚC 1: QUÉT KHAY ${activeLine?.suggestedLocation?.binCode || ''}`
              : scanStep === 'RETURN_RESTOCK_BIN'
              ? 'QUÉT QR KHAY ĐÍCH ĐỂ TRẢ HÀNG'
              : 'BƯỚC 2: QUÉT GS1 / MÃ VẠCH HỘP THUỐC'}
          </Text>
        </Animated.View>

        {/* Thanh phản hồi trạng thái quét (Auth Blue / Amber / Rose - Zero Green) */}
        <View
          style={[
            styles.feedbackBar,
            {
              backgroundColor:
                feedbackTone === 'MATCH'
                  ? 'rgba(2, 132, 199, 0.92)'
                  : feedbackTone === 'WARN'
                  ? 'rgba(217, 119, 6, 0.92)'
                  : feedbackTone === 'ERROR'
                  ? 'rgba(220, 38, 38, 0.92)'
                  : 'rgba(15, 23, 42, 0.82)',
            },
          ]}
        >
          <Ionicons
            name={
              feedbackTone === 'MATCH'
                ? 'checkmark-circle'
                : feedbackTone === 'WARN'
                ? 'alert-circle'
                : feedbackTone === 'ERROR'
                ? 'close-circle'
                : 'scan-outline'
            }
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.feedbackText} numberOfLines={2}>
            {feedbackMsg}
          </Text>
        </View>
      </View>

      {/* ========================================================= */}
      {/* NỬA DƯỚI (58%): BẢNG ĐIỀU KHIỂN NHẶT HÀNG & GIỎ TOTE       */}
      {/* ========================================================= */}
      <ScrollView style={styles.bottomDeck} contentContainerStyle={styles.bottomDeckContent}>
        {/* Sticky Tote Bar */}
        <View style={styles.toteBanner}>
          <View style={styles.toteLeft}>
            <View style={styles.toteIconBox}>
              <Ionicons name="basket" size={18} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.toteTitle}>
                {activeToteCode ? `Đang gom vào: ${activeToteCode}` : 'Chưa gắn giỏ gom hàng'}
              </Text>
              <Text style={styles.toteSub}>
                Tổng trong giỏ: {order?.totalPicked ?? 0} hộp • {order?.pickingList?.length ?? 0} dòng
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowToteModal(true)} style={styles.changeToteBtn}>
            <Text style={styles.changeToteText}>{activeToteCode ? 'Đổi Tote' : 'Chọn Tote'}</Text>
          </TouchableOpacity>
        </View>

        {/* Thanh nhập/test mã nhanh phòng trường hợp ánh sáng yếu */}
        <View style={styles.quickTestRow}>
          <TextInput
            style={styles.quickInput}
            placeholder="Nhập mã quét dự phòng (BIN-... / TOTE-01 / GS1...)"
            placeholderTextColor="#94A3B8"
            value={manualCodeInput}
            onChangeText={setManualCodeInput}
          />
          <TouchableOpacity
            onPress={() => {
              if (!manualCodeInput.trim()) return;
              processScannedCode(manualCodeInput);
              setManualCodeInput('');
            }}
            style={styles.quickSendBtn}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading && !order ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={styles.loadingLabel}>Đang đồng bộ danh sách nhặt hàng...</Text>
          </View>
        ) : activeLine ? (
          <View style={styles.activeCard}>
            {/* Tọa độ khay 4 cấp nổi bật */}
            <View style={styles.locationRow}>
              <View style={styles.binLocationPill}>
                <Ionicons name="location" size={15} color="#0369A1" />
                <Text style={styles.binLocationText}>
                  {`KHU ${activeLine.suggestedLocation.zone} • KỆ ${activeLine.suggestedLocation.rack} • T${activeLine.suggestedLocation.shelf} • THÙNG ${activeLine.suggestedLocation.bin}`}
                </Text>
              </View>
              <View
                style={[
                  styles.verifyChip,
                  { backgroundColor: verifiedBinCode ? '#F0F9FF' : '#FFFBEB' },
                ]}
              >
                <Text
                  style={[
                    styles.verifyChipText,
                    { color: verifiedBinCode ? '#0284C7' : '#D97706' },
                  ]}
                >
                  {verifiedBinCode ? 'ĐÃ KHỚP KHAY' : 'CHỜ QUÉT KHAY'}
                </Text>
              </View>
            </View>

            <Text style={styles.medTitle}>{activeLine.medicineName}</Text>
            <View style={styles.batchMetaRow}>
              <Text style={styles.batchMetaText}>Lô FEFO: {activeLine.batchNo}</Text>
              <Text style={styles.batchMetaText}>
                HSD: {new Date(activeLine.expDate).toLocaleDateString('vi-VN')}
              </Text>
            </View>

            {/* Tiến độ nhặt của dòng */}
            <View style={styles.progressSection}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressLabel}>Tiến độ dòng này</Text>
                <Text style={styles.progressCount}>
                  {`${activeLine.pickedQty} / ${activeLine.requestedQty} ${activeLine.unit}`}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, Math.round((activeLine.pickedQty / Math.max(1, activeLine.requestedQty)) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Vùng xác nhận số lượng khi đã quét khay & hộp */}
            {activeLine.itemStatus === 'PENDING' ? (
              <View style={styles.qtyControlArea}>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    onPress={() => setPickQty((q) => Math.max(1, q - 1))}
                    style={styles.stepBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyDisplay}>{pickQty}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setPickQty((q) =>
                        Math.min(activeLine.requestedQty - activeLine.pickedQty, q + 1),
                      )
                    }
                    style={styles.stepBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPickQty(Math.max(1, activeLine.requestedQty - activeLine.pickedQty))}
                    style={styles.fillAllBtn}
                  >
                    <Text style={styles.fillAllText}>Lấy đủ</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  disabled={submitting || !verifiedBinCode || !verifiedBoxBatchNo}
                  onPress={() => void handleConfirmPick()}
                  style={[
                    styles.confirmPickBtn,
                    (!verifiedBinCode || !verifiedBoxBatchNo || submitting) ? styles.disabledBtn : null,
                  ]}
                >
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmPickText}>
                    {verifiedBoxBatchNo
                      ? `BỎ ${pickQty} ${activeLine.unit} VÀO ${activeToteCode || 'TOTE'}`
                      : 'QUÉT HỘP GS1 ĐỂ MỞ KHÓA'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.completedLineBox}>
                <Text style={styles.completedLineText}>
                  {activeLine.itemStatus === 'PICKED'
                    ? 'Dòng thuốc này đã nhặt đủ!'
                    : 'Dòng thuốc này đã chốt báo thiếu (SHORTAGE).'}
                </Text>
              </View>
            )}

            {/* Hàng nút xử lý ngoại lệ thực tế kho */}
            <View style={styles.exceptionRow}>
              <TouchableOpacity
                onPress={() => {
                  setManualBatchNo(activeLine.batchNo);
                  setManualExpDate(new Date(activeLine.expDate).toISOString().slice(0, 10));
                  setShowManualInputModal(true);
                }}
                style={styles.exceptionPill}
              >
                <Ionicons name="create-outline" size={14} color="#0369A1" />
                <Text style={styles.exceptionPillText}>Tem mờ / Nhập tay</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleReportShortage} style={styles.exceptionWarnPill}>
                <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
                <Text style={styles.exceptionWarnText}>Báo thiếu kệ</Text>
              </TouchableOpacity>

              {activeReturnablePicks.length > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPickIdToReturn(activeReturnablePicks[0].pickId);
                    setReturnQtyInput(String(activeReturnablePicks[0].qty - (activeReturnablePicks[0].returnedQty || 0)));
                    setShowReturnModal(true);
                  }}
                  style={styles.exceptionDangerPill}
                >
                  <Ionicons name="return-up-back-outline" size={14} color="#DC2626" />
                  <Text style={styles.exceptionDangerText}>Trả hàng</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Danh sách các dòng trong lộ trình Picking List */}
        <Text style={styles.listHeader}>
          {`Lộ Trình Nhặt Theo Kệ (${order?.pickingList?.length || 0} dòng)`}
        </Text>
        {(order?.pickingList || []).map((line) => {
          const isSelected = line.lineId === activeLine?.lineId;
          const statusColor =
            line.itemStatus === 'PICKED'
              ? '#0284C7'
              : line.itemStatus === 'SHORTAGE'
              ? '#D97706'
              : '#64748B';
          return (
            <TouchableOpacity
              key={line.lineId}
              onPress={() => {
                setSelectedLineId(line.lineId);
                setVerifiedBinCode('');
                setVerifiedBoxBatchNo('');
                setPickQty(Math.max(1, line.requestedQty - line.pickedQty));
              }}
              style={[styles.routeCard, isSelected ? styles.routeCardSelected : null]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.routeBinCode}>{line.suggestedLocation.binCode}</Text>
                <Text style={styles.routeMedName} numberOfLines={1}>
                  {line.medicineName}
                </Text>
                <Text style={styles.routeBatch}>
                  {`Lô ${line.batchNo} • Đã nhặt ${line.pickedQty}/${line.requestedQty}`}
                </Text>
              </View>
              <View style={[styles.routeStatusPill, { backgroundColor: '#F8FAFC' }]}>
                <Text style={[styles.routeStatusText, { color: statusColor }]}>
                  {line.itemStatus}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Nút chuyển sang Khu Bàn Giao (StagingScreen) khi nhặt xong */}
        {allLinesResolved && Number(order?.totalPicked || 0) > 0 ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('StagingScreen', { orderId })}
            style={styles.goStageBtn}
          >
            <Ionicons name="cube-outline" size={20} color="#FFFFFF" />
            <Text style={styles.goStageBtnText}>ĐI TỚI KHU BÀN GIAO (TẬP KẾT TOTE)</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={() => void reload()} style={styles.refreshLink}>
          <Text style={styles.refreshLinkText}>Làm mới trạng thái phiếu</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal quản lý & chọn Tote */}
      <ToteManagerModal
        visible={showToteModal}
        onClose={() => setShowToteModal(false)}
        onSelectTote={(code) => {
          setActiveToteCode(code);
          triggerMatchFeedback(`Đã chọn giỏ ${code}`);
        }}
      />

      {/* Modal nhập tay GS1 khi tem mờ / không có DataMatrix */}
      <Modal visible={showManualInputModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheetCard}>
            <Text style={styles.modalTitle}>Nhập Tay Thông Tin Lô (gs1Scanned = false)</Text>
            <Text style={styles.modalSub}>Chỉ dùng khi mã vạch bị rách/mờ hoặc hộp chưa in DataMatrix.</Text>

            <Text style={styles.inputLabel}>Số lô trên vỏ hộp</Text>
            <TextInput
              style={styles.modalInput}
              value={manualBatchNo}
              onChangeText={setManualBatchNo}
              placeholder="VD: LOT-01"
            />

            <Text style={styles.inputLabel}>Hạn sử dụng (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={manualExpDate}
              onChangeText={setManualExpDate}
              placeholder="VD: 2027-12-31"
            />

            <Text style={styles.inputLabel}>Lý do bắt buộc</Text>
            {MANUAL_REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                onPress={() => setManualReason(r.key)}
                style={[styles.reasonOption, manualReason === r.key ? styles.reasonOptionActive : null]}
              >
                <Text style={styles.reasonOptionText}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity onPress={() => setShowManualInputModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmManualSubmit} style={styles.primaryModalBtn}>
                <Text style={styles.primaryModalBtnText}>Xác Nhận Nhặt Tay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal chọn lý do đổi lô ngoài gợi ý FEFO */}
      <Modal visible={showOverrideModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheetCard}>
            <Text style={styles.modalTitle}>Cảnh Báo Đổi Lô Ngoài FEFO</Text>
            <Text style={styles.modalSub}>
              {`Hệ thống gợi ý lô ${activeLine?.batchNo}, nhưng bạn vừa quét lô ${verifiedBoxBatchNo}. Vui lòng chọn lý do:`}
            </Text>

            {OVERRIDE_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setOverrideReason(r)}
                style={[styles.reasonOption, overrideReason === r ? styles.reasonOptionActive : null]}
              >
                <Text style={styles.reasonOptionText}>{r}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => {
                  setShowOverrideModal(false);
                  setVerifiedBoxBatchNo('');
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Quét Lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowOverrideModal(false);
                  void handleConfirmPick({ overrideReason });
                }}
                style={[styles.primaryModalBtn, { backgroundColor: '#D97706' }]}
              >
                <Text style={styles.primaryModalBtnText}>Chấp Nhận Đổi Lô</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Trả Hàng 3 Kết Cục (RESTOCK / DAMAGED / QUARANTINE) */}
      <Modal visible={showReturnModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheetCard}>
            <Text style={styles.modalTitle}>Trả Hàng Từ Giỏ Gom (return-item)</Text>

            <Text style={styles.inputLabel}>Chọn phân loại xử lý</Text>
            <View style={styles.outcomeRow}>
              {(['RESTOCK', 'DAMAGED', 'QUARANTINE'] as const).map((out) => (
                <TouchableOpacity
                  key={out}
                  onPress={() => setReturnOutcome(out)}
                  style={[styles.outcomeChip, returnOutcome === out ? styles.outcomeChipActive : null]}
                >
                  <Text
                    style={[
                      styles.outcomeChipText,
                      returnOutcome === out ? { color: '#FFFFFF' } : null,
                    ]}
                  >
                    {out === 'RESTOCK' ? 'Cất lại kệ' : out === 'DAMAGED' ? 'Hỏng/Rách' : 'Biệt trữ'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Số lượng trả</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={returnQtyInput}
              onChangeText={setReturnQtyInput}
            />

            {returnOutcome === 'RESTOCK' ? (
              <View>
                <Text style={styles.inputLabel}>Khay đích cất lại (Quét QR khay)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    value={returnTargetBin}
                    onChangeText={setReturnTargetBin}
                    placeholder="VD: BIN-A-A1-S1-B2"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowReturnModal(false);
                      setScanStep('RETURN_RESTOCK_BIN');
                    }}
                    style={styles.scanTargetBtn}
                  >
                    <Ionicons name="qr-code" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Ghi chú / Lý do</Text>
            <TextInput
              style={styles.modalInput}
              value={returnReason}
              onChangeText={setReturnReason}
              placeholder="VD: Nhặt dư hoặc rách vỏ hộp..."
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity onPress={() => setShowReturnModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleExecuteReturn()} style={styles.primaryModalBtn}>
                <Text style={styles.primaryModalBtnText}>Xác Nhận Trả Hàng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  cameraDeck: {
    height: Platform.OS === 'web' ? 280 : 300,
    backgroundColor: '#0F172A',
    position: 'relative',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  permissionOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
  },
  permissionText: {
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 14,
    fontSize: 13,
  },
  grantBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  grantBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  pausedText: { color: '#94A3B8', marginTop: 8, fontSize: 13, fontWeight: '600' },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    zIndex: 10,
  },
  hudCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudTorchActive: { backgroundColor: '#D97706' },
  hudPillBtn: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudPillActive: { backgroundColor: '#0284C7' },
  hudPillText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  hudRightGroup: { flexDirection: 'row', gap: 8 },
  orderChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  orderChipText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  reticleBox: {
    alignSelf: 'center',
    width: 245,
    height: 120,
    borderWidth: 2.5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  stepTag: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  feedbackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
  },
  feedbackText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', flex: 1 },
  bottomDeck: { flex: 1, backgroundColor: '#F8FAFC' },
  bottomDeckContent: { padding: 14, paddingBottom: 32 },
  toteBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  toteLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  toteIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toteTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  toteSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  changeToteBtn: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  changeToteText: { color: '#0284C7', fontWeight: '700', fontSize: 12 },
  quickTestRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  quickSendBtn: {
    backgroundColor: '#0284C7',
    width: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: { alignItems: 'center', paddingVertical: 30 },
  loadingLabel: { marginTop: 8, color: '#64748B', fontSize: 14 },
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  binLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    flexShrink: 1,
  },
  binLocationText: { color: '#0369A1', fontSize: 12, fontWeight: '800' },
  verifyChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  verifyChipText: { fontSize: 11, fontWeight: '800' },
  medTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  batchMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  batchMetaText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  progressSection: { marginBottom: 14 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  progressCount: { fontSize: 13, color: '#0284C7', fontWeight: '800' },
  progressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#0284C7', borderRadius: 4 },
  qtyControlArea: { gap: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  qtyDisplay: { fontSize: 20, fontWeight: '800', color: '#0F172A', minWidth: 36, textAlign: 'center' },
  fillAllBtn: {
    marginLeft: 'auto',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  fillAllText: { color: '#0284C7', fontWeight: '800', fontSize: 13 },
  confirmPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  disabledBtn: { backgroundColor: '#94A3B8' },
  confirmPickText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  completedLineBox: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  completedLineText: { color: '#0284C7', fontWeight: '700', fontSize: 13 },
  exceptionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  exceptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  exceptionPillText: { color: '#0369A1', fontSize: 12, fontWeight: '700' },
  exceptionWarnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  exceptionWarnText: { color: '#D97706', fontSize: 12, fontWeight: '700' },
  exceptionDangerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  exceptionDangerText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  listHeader: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeCardSelected: { backgroundColor: '#F0F9FF' },
  routeBinCode: { fontSize: 12, fontWeight: '800', color: '#0284C7' },
  routeMedName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  routeBatch: { fontSize: 12, color: '#64748B', marginTop: 2 },
  routeStatusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  routeStatusText: { fontSize: 11, fontWeight: '800' },
  goStageBtn: {
    marginTop: 12,
    backgroundColor: '#0369A1',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  goStageBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  refreshLink: { alignItems: 'center', marginTop: 14 },
  refreshLinkText: { color: '#0284C7', fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 8, marginBottom: 4 },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  reasonOption: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 6,
  },
  reasonOptionActive: { backgroundColor: '#E0F2FE' },
  reasonOptionText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#475569', fontWeight: '700', fontSize: 14 },
  primaryModalBtn: {
    flex: 1.5,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryModalBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  outcomeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  outcomeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  outcomeChipActive: { backgroundColor: '#0284C7' },
  outcomeChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  scanTargetBtn: {
    width: 46,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

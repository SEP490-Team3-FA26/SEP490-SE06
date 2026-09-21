// BarcodeScannerModal.tsx - Unified Camera Scanner for Barcodes & QR Codes (GSP Standard)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned?: (code: string, type?: string) => void;
  onScanSuccess?: (code: string, type?: string) => void;
  title?: string;
  subtitle?: string;
  mode?: 'BARCODE' | 'QR' | 'ALL';
  demoCodes?: Array<{ label: string; code: string; sub?: string }>;
}

const DEFAULT_DEMO_CODES = [
  { label: 'Panadol Extra Đỏ', code: '8935006530010', sub: 'GS1 VN (15 vỉ x 12v)' },
  { label: 'Salonpas 140s (Nhật)', code: '4987188100325', sub: 'JAN Hisamitsu Japan' },
  { label: 'Salonpas 20s (VN)', code: '8935001701118', sub: 'Hisamitsu Chính hãng' },
  { label: 'Efferalgan 500mg', code: '3400932567577', sub: 'UPSA SAS Pháp (Sủi)' },
  { label: 'Hapacol 650', code: '8935061600109', sub: 'Dược Hậu Giang DHG' },
  { label: 'Dầu Gió Con Ó', code: '8888062001010', sub: 'Borden Singapore (24ml)' },
  { label: 'Natri Clorid 0.9%', code: '8934658002012', sub: 'Pharmedic Lọ 10ml' },
  { label: 'Berberin 100mg', code: '8934812003039', sub: 'Domesco Lọ 100v' },
  { label: 'Strepsils Cool', code: '8850360000045', sub: 'Reckitt Thái Lan' },
];

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  onScanSuccess,
  title = 'Quét Mã Vạch / QR Code',
  subtitle = 'Đưa mã vạch hoặc mã QR vào khung ngắm để nhận diện',
  mode = 'ALL',
  demoCodes = DEFAULT_DEMO_CODES,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<'BARCODE' | 'QR' | 'ALL'>(mode);

  // Animated Laser Line
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsProcessing(false);
      setManualCode('');
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, laserAnim]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (isProcessing) return;
    const rawData = result.data ? String(result.data).trim() : '';
    if (!rawData) return;

    setIsProcessing(true);
    let extractedCode = rawData;

    // Try parsing JSON if QR contains structured object
    if (rawData.startsWith('{') && rawData.endsWith('}')) {
      try {
        const parsed = JSON.parse(rawData);
        extractedCode = parsed.transferCode || parsed.barcode || parsed.code || parsed.ticketId || parsed.orderCode || rawData;
      } catch {
        extractedCode = rawData;
      }
    }

    if (onScanned) onScanned(extractedCode, result.type);
    if (onScanSuccess) onScanSuccess(extractedCode, result.type);
    onClose();
  };

  const handleManualSubmit = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    setIsProcessing(true);
    if (onScanned) onScanned(trimmed, 'MANUAL');
    if (onScanSuccess) onScanSuccess(trimmed, 'MANUAL');
    onClose();
  };

  const handleSelectDemo = (code: string) => {
    setIsProcessing(true);
    if (onScanned) onScanned(code, 'DEMO_QUICK');
    if (onScanSuccess) onScanSuccess(code, 'DEMO_QUICK');
    onClose();
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 210],
  });

  const barcodeTypes: any =
    scanMode === 'BARCODE'
      ? ['ean13', 'code128', 'ean8', 'upc_a', 'upc_e']
      : scanMode === 'QR'
      ? ['qr']
      : ['ean13', 'code128', 'qr', 'ean8', 'upc_a', 'upc_e'];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setTorch((prev) => !prev)}
            style={[styles.headerBtn, torch && styles.headerBtnActive]}
          >
            <Ionicons name={torch ? 'flash' : 'flash-off'} size={20} color={torch ? '#F59E0B' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        {/* Mode Selector */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            onPress={() => setScanMode('ALL')}
            style={[styles.modeTab, scanMode === 'ALL' && styles.activeModeTab]}
          >
            <Ionicons name="scan-outline" size={14} color={scanMode === 'ALL' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.modeTabText, scanMode === 'ALL' && styles.activeModeTabText]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setScanMode('BARCODE')}
            style={[styles.modeTab, scanMode === 'BARCODE' && styles.activeModeTab]}
          >
            <Ionicons name="barcode-outline" size={14} color={scanMode === 'BARCODE' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.modeTabText, scanMode === 'BARCODE' && styles.activeModeTabText]}>Mã Vạch EAN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setScanMode('QR')}
            style={[styles.modeTab, scanMode === 'QR' && styles.activeModeTab]}
          >
            <Ionicons name="qr-code-outline" size={14} color={scanMode === 'QR' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.modeTabText, scanMode === 'QR' && styles.activeModeTabText]}>Mã QR</Text>
          </TouchableOpacity>
        </View>

        {/* Camera View Area */}
        <View style={styles.cameraWrapper}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-reverse-outline" size={48} color="#38BDF8" />
              <Text style={styles.permissionText}>Ứng dụng cần quyền Camera để quét mã vạch và QR code.</Text>
              <TouchableOpacity onPress={() => requestPermission()} style={styles.grantBtn}>
                <Text style={styles.grantBtnText}>CẤP QUYỀN CAMERA</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes,
              }}
              onBarcodeScanned={isProcessing ? undefined : handleBarcodeScanned}
            />
          )}

          {/* Scanner Optical Viewfinder Frame */}
          <View style={styles.viewfinder}>
            {/* 4 Corner brackets */}
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />

            {/* Laser animated line */}
            <Animated.View
              style={[
                styles.laserLine,
                {
                  transform: [{ translateY: laserTranslateY }],
                },
              ]}
            />
          </View>

          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.processingText}>Đang nhận diện mã...</Text>
            </View>
          )}
        </View>

        {/* Bottom Control & Manual Input Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.sectionLabel}>Hoặc nhập mã trực tiếp:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập mã Barcode (893...) hoặc QR (ST-...)"
              placeholderTextColor="#64748B"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              onSubmitEditing={handleManualSubmit}
            />
            <TouchableOpacity onPress={handleManualSubmit} style={styles.submitBtn}>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Demo Quick Barcode Buttons */}
          <Text style={styles.demoLabel}>Mã test nhanh (Demo):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.demoScroll}>
            {demoCodes.map((item, idx) => (
              <TouchableOpacity
                key={`demo-${idx}`}
                onPress={() => handleSelectDemo(item.code)}
                style={styles.demoPill}
              >
                <Text style={styles.demoPillTitle}>{item.label}</Text>
                <Text style={styles.demoPillCode}>{item.code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    gap: 6,
  },
  activeModeTab: {
    backgroundColor: '#0284C7',
  },
  modeTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeModeTabText: {
    color: '#FFFFFF',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  permissionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  permissionText: {
    color: '#E2E8F0',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
  grantBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  viewfinder: {
    width: 250,
    height: 230,
    position: 'relative',
    borderRadius: 16,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#38BDF8',
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  laserLine: {
    width: '100%',
    height: 2.5,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#38BDF8',
    marginTop: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSection: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  submitBtn: {
    backgroundColor: '#0284C7',
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 6,
  },
  demoScroll: {
    flexDirection: 'row',
  },
  demoPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoPillTitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  demoPillCode: {
    color: '#38BDF8',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
});

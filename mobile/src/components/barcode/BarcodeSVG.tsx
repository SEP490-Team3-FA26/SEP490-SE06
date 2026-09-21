// BarcodeSVG.tsx - Crisp Vector GS1 EAN-13 Barcode Renderer for React Native
import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { getEAN13BarRects } from '../../utils/barcodeGenerator';

interface BarcodeSVGProps {
  barcode: string;
  width?: number;
  height?: number;
  barColor?: string;
  bgColor?: string;
  showText?: boolean;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

export const BarcodeSVG: React.FC<BarcodeSVGProps> = ({
  barcode,
  width = 220,
  height = 70,
  barColor = '#0F172A',
  bgColor = '#FFFFFF',
  showText = true,
  fontSize = 12,
  style,
}) => {
  const barcodeData = useMemo(() => {
    return getEAN13BarRects(barcode || '893000000000', width, height, showText, fontSize);
  }, [barcode, width, height, showText, fontSize]);

  const { rects, displayCode, totalWidth, totalHeight } = barcodeData;

  // Format display code: 8 930000 000000 for standard GS1 readability
  const formattedText = useMemo(() => {
    if (displayCode.length === 13) {
      return `${displayCode[0]} ${displayCode.slice(1, 7)} ${displayCode.slice(7)}`;
    }
    return displayCode;
  }, [displayCode]);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }, style]}>
      <Svg width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`}>
        {/* Background */}
        <Rect x="0" y="0" width={totalWidth} height={totalHeight} fill={bgColor} />

        {/* Barcode rect bars */}
        {rects.map((r, idx) => (
          <Rect
            key={`bar-${idx}`}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            fill={barColor}
          />
        ))}

        {/* EAN-13 Human Readable Text */}
        {showText && (
          <SvgText
            x={totalWidth / 2}
            y={totalHeight - 2}
            fill={barColor}
            fontSize={fontSize}
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
            letterSpacing={2}
          >
            {formattedText}
          </SvgText>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
});

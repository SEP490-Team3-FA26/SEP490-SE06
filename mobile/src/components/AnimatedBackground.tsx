import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface OrbProps {
  size: number;
  color: [string, string];
  duration: number;
  delay: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const FloatingOrb = ({ size, color, duration, delay, startX, startY, endX, endY }: OrbProps) => {
  const moveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim, {
          toValue: 1,
          duration: duration,
          delay: delay,
          easing: Easing.sin,
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim, {
          toValue: 0,
          duration: duration,
          easing: Easing.sin,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [moveAnim, duration, delay]);

  const translateX = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, endX],
  });

  const translateY = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, endY],
  });

  const opacity = moveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ translateX }, { translateY }],
          opacity,
        },
      ]}
    >
      <LinearGradient
        colors={color}
        style={{ flex: 1, borderRadius: size / 2 }}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
};

export const AnimatedBackground = () => {
  return (
    <View style={styles.container}>
      {/* Deep Navy Background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#121225' }]} />
      
      {/* Floating Orbs */}
      <FloatingOrb
        size={300}
        color={['#B026FF66', '#B026FF00']}
        duration={8000}
        delay={0}
        startX={-50}
        startY={height * 0.1}
        endX={width * 0.2}
        endY={height * 0.4}
      />
      <FloatingOrb
        size={200}
        color={['#00D2FF55', '#00D2FF00']}
        duration={10000}
        delay={1000}
        startX={width * 0.7}
        startY={height * 0.7}
        endX={width * 0.5}
        endY={height * 0.5}
      />
      <FloatingOrb
        size={150}
        color={['#7000FF55', '#7000FF00']}
        duration={7000}
        delay={500}
        startX={width * 0.1}
        startY={height * 0.8}
        endX={width * 0.3}
        endY={height * 0.7}
      />
      <FloatingOrb
        size={100}
        color={['#00FFD144', '#00FFD100']}
        duration={6000}
        delay={2000}
        startX={width * 0.8}
        startY={height * 0.2}
        endX={width * 0.6}
        endY={height * 0.3}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
});

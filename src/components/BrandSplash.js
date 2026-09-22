import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import { colors } from '../theme';

/**
 * Full-screen branded intro shown right after the JS bundle mounts. Renders the real logo
 * image directly, so branding shows every launch regardless of how the host caches icons.
 */
export default function BrandSplash({ onFinish }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }).start(({ finished }) => finished && onFinish());
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.container, { opacity }]}>
      <Animated.Image
        source={require('../../assets/icon.png')}
        style={[styles.logo, { transform: [{ scale }] }]}
        resizeMode="contain"
      />
      <Text style={styles.title}>Asistente Bíblico</Text>
      <Text style={styles.subtitle}>en Debates · Reina-Valera 1960</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 220,
    borderRadius: 110,
    marginBottom: 22,
  },
  title: {
    color: colors.goldBright,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
});

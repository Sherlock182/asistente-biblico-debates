import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

const BAR_COUNT = 5;
const BAR_DELAYS = [0, 120, 240, 90, 180];

function Bar({ delay }) {
  const scale = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.35,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay]);

  return <Animated.View style={[styles.bar, { transform: [{ scaleY: scale }] }]} />;
}

/** Live "recording" strip shown above the composer while the debate is being captured. */
export default function ListeningIndicator({ windowSeconds, analysisMode, lastHeard }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.bars}>
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <Bar key={i} delay={BAR_DELAYS[i]} />
          ))}
        </View>
        <Text style={styles.text}>
          {analysisMode === 'onStop'
            ? 'Transcribiendo · analiza al detener'
            : `Escuchando · analiza cada ~${windowSeconds}s`}
        </Text>
      </View>

      {lastHeard ? (
        <Text style={styles.heard} numberOfLines={2}>
          “{lastHeard}”
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  heard: {
    ...type.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 16,
  },
  bar: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.danger,
  },
  text: {
    ...type.caption,
    color: colors.opponentText,
  },
});

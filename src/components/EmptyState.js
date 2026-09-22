import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, type } from '../theme';

const EXAMPLES = [
  'La salvación es por obras',
  'El alma es inmortal',
  'Hay que guardar el sábado',
];

export default function EmptyState({ onPickExample, verseCount }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconRing}>
        <Ionicons name="book" size={26} color={colors.gold} />
      </View>

      <Text style={styles.title}>Listo para el debate</Text>
      <Text style={styles.subtitle}>
        Activa el micrófono para verificar en vivo lo que dice tu oponente, o escribe una afirmación
        para comprobarla contra la Reina-Valera 1960.
      </Text>

      <View style={styles.statRow}>
        <Ionicons name="shield-checkmark" size={13} color={colors.textMuted} />
        <Text style={styles.statText}>
          {verseCount.toLocaleString('es')} versículos indexados sin conexión
        </Text>
      </View>

      <Text style={styles.examplesLabel}>Prueba con</Text>
      <View style={styles.examples}>
        {EXAMPLES.map((example) => (
          <Pressable key={example} style={styles.chip} onPress={() => onPickExample(example)}>
            <Text style={styles.chipText}>{example}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  iconRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.gold,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    ...type.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.md,
  },
  statText: {
    ...type.caption,
    color: colors.textMuted,
  },
  examplesLabel: {
    ...type.label,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  examples: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
});

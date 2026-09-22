import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadow, spacing, type } from '../theme';

const AUTO_SPEAK_OPTIONS = [
  { value: 'never', label: 'Nunca', icon: 'volume-mute-outline' },
  { value: 'headset', label: 'Audífonos', icon: 'headset-outline' },
  { value: 'always', label: 'Siempre', icon: 'volume-high-outline' },
];

const WINDOW_OPTIONS = [
  { value: 15, hint: 'Ágil' },
  { value: 30, hint: 'Normal' },
  { value: 45, hint: 'Amplio' },
  { value: 60, hint: 'Discurso' },
  { value: 90, hint: 'Sermón' },
];

export default function SettingsModal({
  visible,
  onClose,
  apiKey,
  onSaveApiKey,
  windowSeconds,
  onChangeWindowSeconds,
  discreetMode,
  onToggleDiscreet,
  analysisMode,
  onChangeAnalysisMode,
  autoSpeak,
  onChangeAutoSpeak,
}) {
  const [draftKey, setDraftKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setDraftKey(apiKey || '');
    setShowKey(false);
  }, [apiKey, visible]);

  const connected = !!apiKey;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>Ajustes</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
              <Ionicons name="close" size={19} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.statusCard}>
            <View style={[styles.statusDot, { backgroundColor: connected ? colors.success : colors.warning }]} />
            <Text style={styles.statusText}>
              {connected ? 'Conectado a Groq' : 'Falta configurar la API key'}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>API key de Groq</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draftKey}
              onChangeText={setDraftKey}
              placeholder="gsk_..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showKey}
            />
            <Pressable onPress={() => setShowKey((v) => !v)} style={styles.eyeButton} hitSlop={10}>
              <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Gratis en{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://console.groq.com/keys')}>
              console.groq.com/keys
            </Text>
            . Se guarda cifrada solo en este dispositivo.
          </Text>

          <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Cuándo analizar</Text>
          <View style={styles.modeGroup}>
            <Pressable
              style={[styles.modeOption, analysisMode === 'live' && styles.modeOptionActive]}
              onPress={() => onChangeAnalysisMode('live')}
            >
              <Ionicons
                name="flash"
                size={15}
                color={analysisMode === 'live' ? colors.primary : colors.textMuted}
              />
              <View style={styles.modeTextGroup}>
                <Text style={styles.modeTitle}>En vivo</Text>
                <Text style={styles.modeHint}>Da el veredicto de cada frase mientras habla.</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.modeOption, analysisMode === 'onStop' && styles.modeOptionActive]}
              onPress={() => onChangeAnalysisMode('onStop')}
            >
              <Ionicons
                name="document-text"
                size={15}
                color={analysisMode === 'onStop' ? colors.primary : colors.textMuted}
              />
              <View style={styles.modeTextGroup}>
                <Text style={styles.modeTitle}>Al detener</Text>
                <Text style={styles.modeHint}>
                  Solo transcribe mientras escucha; al parar, analiza todo lo dicho.
                </Text>
              </View>
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Cuánto escuchar por análisis</Text>
          <View style={styles.chunkRow}>
            {WINDOW_OPTIONS.map((option) => {
              const active = windowSeconds === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.chunkOption, active && styles.chunkOptionActive]}
                  onPress={() => onChangeWindowSeconds(option.value)}
                >
                  <Text style={[styles.chunkValue, active && styles.chunkValueActive]}>{option.value}s</Text>
                  <Text style={[styles.chunkHint, active && styles.chunkHintActive]}>{option.hint}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Cuánto habla se junta antes de dar un veredicto. Ventanas largas capturan el argumento
            completo; las cortas responden antes. Si la persona hace una pausa, analiza sin esperar
            a que se cumpla el tiempo.
          </Text>

          <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Leer el veredicto en voz alta</Text>
          <View style={styles.chunkRow}>
            {AUTO_SPEAK_OPTIONS.map((option) => {
              const active = autoSpeak === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.speakOption, active && styles.chunkOptionActive]}
                  onPress={() => onChangeAutoSpeak(option.value)}
                >
                  <Ionicons
                    name={option.icon}
                    size={15}
                    color={active ? colors.textPrimary : colors.textMuted}
                  />
                  <Text style={[styles.speakLabel, active && styles.chunkValueActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Con “Audífonos” la app detecta los auriculares por su micrófono, así que funciona con
            manos libres y Bluetooth. Si los tuyos no llevan micrófono no se detectan: usa
            “Siempre”.
          </Text>

          <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Modo discreto</Text>
          <Pressable style={styles.toggleRow} onPress={onToggleDiscreet}>
            <View style={styles.toggleTextGroup}>
              <Text style={styles.toggleTitle}>Solo mostrar el veredicto</Text>
              <Text style={styles.toggleHint}>
                Oculta el texto y los versículos hasta que toques el veredicto. La vibración sigue
                avisándote si es falso o verdadero.
              </Text>
            </View>
            <View style={[styles.switch, discreetMode && styles.switchOn]}>
              <View style={[styles.knob, discreetMode && styles.knobOn]} />
            </View>
          </Pressable>

          <Pressable
            style={styles.saveButton}
            onPress={() => {
              onSaveApiKey(draftKey.trim());
              onClose();
            }}
          >
            <Text style={styles.saveText}>Guardar cambios</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: 40,
    ...shadow.floating,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.xl,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  sectionLabel: {
    ...type.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  hint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  link: {
    color: colors.gold,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  eyeButton: {
    padding: 6,
  },
  modeGroup: {
    gap: spacing.sm,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  modeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  modeTextGroup: {
    flex: 1,
  },
  modeTitle: {
    ...type.bodySm,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modeHint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  chunkRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chunkOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chunkOptionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  speakOption: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  speakLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chunkValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  chunkValueActive: {
    color: colors.textPrimary,
  },
  chunkHint: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  chunkHintActive: {
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleTextGroup: {
    flex: 1,
  },
  toggleTitle: {
    ...type.bodySm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  toggleHint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  switch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceHigh,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: colors.primary,
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textMuted,
  },
  knobOn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  saveText: {
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 15,
  },
});

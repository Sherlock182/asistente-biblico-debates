import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadow, spacing, type } from '../theme';

/** Lets the user fix a misheard transcription and re-run the analysis on the corrected text. */
export default function EditClaimModal({ visible, initialText, onCancel, onSave }) {
  const [draft, setDraft] = useState(initialText ?? '');

  useEffect(() => {
    setDraft(initialText ?? '');
  }, [initialText, visible]);

  const changed = draft.trim().length > 0 && draft.trim() !== (initialText ?? '').trim();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name="create-outline" size={17} color={colors.gold} />
            <Text style={styles.title}>Corregir lo que se escuchó</Text>
          </View>
          <Text style={styles.hint}>
            Si el micrófono entendió mal, corrige el texto y se analizará de nuevo.
          </Text>

          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            placeholder="Texto de la afirmación"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !changed && styles.saveButtonDisabled]}
              onPress={() => onSave(draft.trim())}
              disabled={!changed}
            >
              <Text style={[styles.saveText, !changed && { color: colors.textMuted }]}>
                Volver a analizar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadow.floating,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...type.title,
    color: colors.textPrimary,
  },
  hint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: spacing.lg,
    lineHeight: 17,
  },
  input: {
    minHeight: 96,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    padding: spacing.md,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cancelText: {
    ...type.bodySm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  saveText: {
    ...type.bodySm,
    color: colors.primaryText,
    fontWeight: '700',
  },
});

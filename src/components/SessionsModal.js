import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { deleteSession, listSessions } from '../services/sessionStore';
import { colors, radius, spacing, type } from '../theme';

function formatDate(ts) {
  return new Date(ts).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SessionsModal({ visible, onClose, onOpenSession, onNewSession, currentSessionId }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (visible) listSessions().then(setSessions);
  }, [visible]);

  async function handleDelete(id) {
    await deleteSession(id);
    setSessions(await listSessions());
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Debates guardados</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerButton}>
            <Ionicons name="close" size={19} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable style={styles.newButton} onPress={onNewSession}>
          <Ionicons name="add" size={17} color={colors.primaryText} />
          <Text style={styles.newButtonText}>Nuevo debate</Text>
        </Pressable>

        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={30} color={colors.textMuted} />
            <Text style={styles.emptyText}>Aún no hay debates guardados.</Text>
            <Text style={styles.emptyHint}>
              Cada sesión se guarda sola en este dispositivo mientras debates.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => onOpenSession(item.id)}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.rowMetaLine}>
                    <Text style={styles.rowMeta}>{formatDate(item.startedAt)}</Text>
                    <Text style={styles.rowMeta}>·</Text>
                    <Text style={styles.rowMeta}>{item.claimCount} afirmaciones</Text>
                    {item.id === currentSessionId ? (
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>En curso</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Pressable onPress={() => handleDelete(item.id)} hitSlop={10} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...type.title,
    color: colors.textPrimary,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  newButtonText: {
    ...type.bodySm,
    color: colors.primaryText,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowMain: {
    flex: 1,
  },
  rowTitle: {
    ...type.bodySm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  rowMeta: {
    ...type.caption,
    color: colors.textMuted,
  },
  activeTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.success,
  },
  deleteButton: {
    padding: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyHint: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

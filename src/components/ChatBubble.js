import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { colors, radius, shadow, spacing, type } from '../theme';
import { parseVerdictReply, speakableReference, splitVerseLine } from '../utils/parseVerdictReply';

const VERDICT_STYLES = {
  FALSO: { color: colors.danger, soft: colors.dangerSoft, border: colors.dangerBorder, icon: 'close-circle', label: 'FALSO' },
  VERDADERO: { color: colors.success, soft: colors.successSoft, border: colors.successBorder, icon: 'checkmark-circle', label: 'VERDADERO' },
  PARCIAL: { color: colors.warning, soft: colors.warningSoft, border: colors.warningBorder, icon: 'alert-circle', label: 'PARCIAL' },
  'SIN BASE': { color: colors.textSecondary, soft: colors.surfaceAlt, border: colors.border, icon: 'help-circle-outline', label: 'SIN BASE CLARA' },
};

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_META = {
  corrected: { icon: 'build', color: colors.warning, label: 'Cita ajustada al texto real' },
  invalid: { icon: 'alert-circle', color: colors.danger, label: 'Referencia no encontrada en RV1960' },
};

function VerseCard({ reference: ref, text, status, onOpenReference }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const statusMeta = STATUS_META[status];

  async function handleCopy() {
    await Clipboard.setStringAsync(ref ? `${ref} — ${text}` : text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function handleSpeak() {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    Speech.stop();
    setSpeaking(true);
    Speech.speak(ref ? `${speakableReference(ref)}. ${text}` : text, {
      language: 'es-ES',
      rate: 0.95,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  return (
    <View style={[styles.verseCard, status === 'invalid' && styles.verseCardInvalid]}>
      <View style={styles.verseHeader}>
        <Pressable
          onPress={() => ref && status !== 'invalid' && onOpenReference?.(ref)}
          hitSlop={6}
          style={styles.verseRefButton}
        >
          <Text style={[styles.verseRef, status === 'invalid' && { color: colors.danger }]}>
            {ref || 'Cita'}
          </Text>
          {ref && status !== 'invalid' ? (
            <Ionicons name="open-outline" size={11} color={colors.gold} />
          ) : null}
        </Pressable>
        <View style={styles.verseActions}>
          <Pressable onPress={handleSpeak} hitSlop={8}>
            <Ionicons
              name={speaking ? 'stop-circle' : 'volume-medium-outline'}
              size={15}
              color={speaking ? colors.gold : colors.textMuted}
            />
          </Pressable>
          <Pressable onPress={handleCopy} hitSlop={8}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={14}
              color={copied ? colors.success : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>
      <Text style={styles.verseText}>{text}</Text>
      {statusMeta ? (
        <View style={styles.statusRow}>
          <Ionicons name={statusMeta.icon} size={11} color={statusMeta.color} />
          <Text style={[styles.statusLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

function VerdictContent({ text, verses, showStance, onStance, discreet, onOpenReference }) {
  const parsed = parseVerdictReply(text);
  const [expanded, setExpanded] = useState(false);

  if (!parsed) {
    return <Text style={styles.assistantText}>{text}</Text>;
  }

  const style = VERDICT_STYLES[parsed.verdict] || VERDICT_STYLES.PARCIAL;
  const collapsed = discreet && !expanded;
  // Verified citations when available; otherwise fall back to the raw parsed lines.
  const shownVerses =
    verses?.length > 0
      ? verses
      : parsed.verses.map((line) => ({ ...splitVerseLine(line), status: 'unverified' }));

  return (
    <View style={{ gap: spacing.md }}>
      <Pressable
        onPress={() => discreet && setExpanded((v) => !v)}
        style={[styles.verdictBadge, { backgroundColor: style.soft, borderColor: style.border }]}
      >
        <Ionicons name={style.icon} size={15} color={style.color} />
        <Text style={[styles.verdictText, { color: style.color }]}>{style.label}</Text>
        {discreet ? (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={style.color}
            style={{ marginLeft: 2 }}
          />
        ) : null}
      </Pressable>

      {collapsed ? null : (
        <>
          {parsed.reason ? <Text style={styles.assistantText}>{parsed.reason}</Text> : null}

          {shownVerses.length ? (
            <View style={{ gap: spacing.sm }}>
              {shownVerses.map((verse, i) => (
                <VerseCard
                  key={i}
                  reference={verse.ref}
                  text={verse.text}
                  status={verse.status}
                  onOpenReference={onOpenReference}
                />
              ))}
            </View>
          ) : null}
        </>
      )}

      {showStance && !collapsed ? (
        <View style={styles.stanceRow}>
          <Pressable
            style={[styles.stanceButton, { borderColor: colors.dangerBorder, backgroundColor: colors.dangerSoft }]}
            onPress={() => onStance('contra')}
          >
            <Ionicons name="shield" size={13} color={colors.danger} />
            <Text style={[styles.stanceText, { color: colors.danger }]}>En contra</Text>
          </Pressable>
          <Pressable
            style={[styles.stanceButton, { borderColor: colors.successBorder, backgroundColor: colors.successSoft }]}
            onPress={() => onStance('favor')}
          >
            <Ionicons name="hand-left" size={13} color={colors.success} />
            <Text style={[styles.stanceText, { color: colors.success }]}>A favor</Text>
          </Pressable>
          <Pressable
            style={[styles.stanceButton, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
            onPress={() => onStance('counter')}
          >
            <Ionicons name="eye" size={13} color={colors.gold} />
            <Text style={[styles.stanceText, { color: colors.gold }]}>¿Qué me dirá?</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function ChatBubble({
  role,
  text,
  timestamp,
  verses,
  claimLabel,
  showStance,
  onStance,
  stance,
  discreet,
  onOpenReference,
  onEdit,
}) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };

  if (role === 'system') {
    return (
      <Animated.View style={[styles.systemRow, animatedStyle]}>
        <Text style={styles.systemText}>{text}</Text>
      </Animated.View>
    );
  }

  if (role === 'user') {
    return (
      <Animated.View style={[styles.row, { justifyContent: 'flex-end' }, animatedStyle]}>
        <View style={styles.userColumn}>
          <View style={[styles.bubble, styles.userBubble]}>
            <Text style={styles.userText}>{text}</Text>
          </View>
          <Text style={[styles.time, { textAlign: 'right' }]}>{formatTime(timestamp)}</Text>
        </View>
      </Animated.View>
    );
  }

  if (role === 'counter') {
    return (
      <Animated.View style={[styles.row, animatedStyle]}>
        <View style={styles.column}>
          <View style={[styles.bubble, styles.counterBubble]}>
            <View style={styles.labelRow}>
              <Ionicons name="eye" size={12} color={colors.gold} />
              <Text style={[styles.roleLabel, { color: colors.gold }]}>Anticipación</Text>
            </View>
            <Text style={styles.assistantText}>{text}</Text>
          </View>
          <Text style={styles.time}>{formatTime(timestamp)}</Text>
        </View>
      </Animated.View>
    );
  }

  if (role === 'stance') {
    const isFor = stance === 'favor';
    const accent = isFor ? colors.success : colors.danger;
    return (
      <Animated.View style={[styles.row, animatedStyle]}>
        <View style={styles.column}>
          <View style={[styles.bubble, styles.stanceBubble, { borderLeftColor: accent }]}>
            <View style={styles.labelRow}>
              <Ionicons name={isFor ? 'hand-left' : 'shield'} size={12} color={accent} />
              <Text style={[styles.roleLabel, { color: accent }]}>
                {isFor ? 'Argumento a favor' : 'Argumento en contra'}
              </Text>
            </View>
            <Text style={styles.assistantText}>{text}</Text>
          </View>
          <Text style={styles.time}>{formatTime(timestamp)}</Text>
        </View>
      </Animated.View>
    );
  }

  if (role === 'transcript') {
    return (
      <Animated.View style={[styles.row, animatedStyle]}>
        <View style={styles.column}>
          <View style={[styles.bubble, styles.transcriptBubble]}>
            <View style={styles.labelRow}>
              <Ionicons name="radio-button-on" size={11} color={colors.danger} />
              <Text style={[styles.roleLabel, { color: colors.danger }]}>Transcribiendo</Text>
            </View>
            <Text style={styles.transcriptText}>{text}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (role === 'contradiction') {
    return (
      <Animated.View style={[styles.row, animatedStyle]}>
        <View style={styles.column}>
          <View style={[styles.bubble, styles.contradictionBubble]}>
            <View style={styles.labelRow}>
              <Ionicons name="git-compare" size={12} color={colors.warning} />
              <Text style={[styles.roleLabel, { color: colors.warning }]}>Se contradice</Text>
            </View>
            <Text style={styles.assistantText}>{text}</Text>
          </View>
          <Text style={styles.time}>{formatTime(timestamp)}</Text>
        </View>
      </Animated.View>
    );
  }

  if (role === 'opponent') {
    return (
      <Animated.View style={[styles.row, animatedStyle]}>
        <View style={styles.column}>
          <View style={[styles.bubble, styles.opponentBubble]}>
            <View style={styles.labelRow}>
              <Ionicons name="mic" size={12} color={colors.opponentText} />
              <Text style={[styles.roleLabel, { color: colors.opponentText }]}>Oponente</Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={onEdit} hitSlop={8}>
                <Ionicons name="create-outline" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.opponentText}>{text}</Text>
          </View>
          <Text style={styles.time}>{formatTime(timestamp)}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <View style={styles.column}>
        <View style={[styles.bubble, styles.assistantBubble]}>
          <View style={styles.labelRow}>
            <Ionicons name="book" size={12} color={colors.gold} />
            <Text style={[styles.roleLabel, { color: colors.gold }]}>Reina-Valera 1960</Text>
          </View>
          {claimLabel ? <Text style={styles.claimLabel}>Sobre: “{claimLabel}”</Text> : null}
          <VerdictContent
            text={text}
            verses={verses}
            showStance={showStance}
            onStance={onStance}
            discreet={discreet}
            onOpenReference={onOpenReference}
          />
        </View>
        <Text style={styles.time}>{formatTime(timestamp)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 5,
    paddingHorizontal: spacing.lg,
  },
  column: {
    maxWidth: '92%',
  },
  userColumn: {
    maxWidth: '85%',
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  userText: {
    ...type.body,
    color: colors.primaryText,
  },
  opponentBubble: {
    backgroundColor: colors.opponentBg,
    borderWidth: 1,
    borderColor: colors.opponentBorder,
    borderBottomLeftRadius: 4,
  },
  opponentText: {
    ...type.body,
    color: colors.opponentText,
    fontStyle: 'italic',
  },
  assistantBubble: {
    backgroundColor: colors.assistantBg,
    borderWidth: 1,
    borderColor: colors.assistantBorder,
    borderBottomLeftRadius: 4,
  },
  assistantText: {
    ...type.body,
    color: colors.assistantText,
  },
  stanceBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  counterBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
  },
  roleLabel: {
    ...type.label,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  verdictText: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 1,
  },
  claimLabel: {
    ...type.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  transcriptBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dangerBorder,
    borderBottomLeftRadius: 4,
  },
  transcriptText: {
    ...type.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  contradictionBubble: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderBottomLeftRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  verseCardInvalid: {
    borderLeftColor: colors.danger,
    opacity: 0.75,
  },
  verseCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  verseRefButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verseRef: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 0.3,
  },
  verseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  verseText: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  stanceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  stanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  stanceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  time: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    marginHorizontal: 2,
  },
  systemRow: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.xl,
  },
  systemText: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { colors, radius, shadow, spacing, type } from '../theme';

const DEVELOPER = 'Ing. Oseas Nahun Montalvo Rogel';
const EMAIL = '4603642023@mail.utec.edu.sv';
const GITHUB = 'https://github.com/Sherlock182';

/** Opening a link throws when no app can handle it (e.g. no mail client configured). */
async function openLink(url) {
  try {
    await Linking.openURL(url);
  } catch {
    // Nothing to open it with; failing silently beats crashing the screen.
  }
}

function ContactRow({ icon, label, value, onPress }) {
  return (
    <Pressable style={styles.contactRow} onPress={onPress}>
      <View style={styles.contactIcon}>
        <Ionicons name={icon} size={17} color={colors.gold} />
      </View>
      <View style={styles.contactTextGroup}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="open-outline" size={15} color={colors.textMuted} />
    </Pressable>
  );
}

export default function AboutModal({ visible, onClose }) {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Acerca de</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerButton}>
            <Ionicons name="close" size={19} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brand}>
            <View style={styles.logoRing}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} />
            </View>
            <Text style={styles.appName}>Asistente Bíblico</Text>
            <Text style={styles.appTagline}>en Debates · Reina-Valera 1960</Text>
            <View style={styles.versionChip}>
              <Text style={styles.versionText}>Versión {version}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Desarrollado por</Text>
          <View style={styles.devCard}>
            <Ionicons name="person-circle-outline" size={22} color={colors.gold} />
            <Text style={styles.devName}>{DEVELOPER}</Text>
          </View>

          <Text style={styles.sectionLabel}>Contacto</Text>
          <View style={styles.contactGroup}>
            <ContactRow
              icon="mail-outline"
              label="Correo electrónico"
              value={EMAIL}
              onPress={() => openLink(`mailto:${EMAIL}`)}
            />
            <ContactRow
              icon="logo-github"
              label="GitHub"
              value="github.com/Sherlock182"
              onPress={() => openLink(GITHUB)}
            />
          </View>

          <Text style={styles.sectionLabel}>Acerca de la app</Text>
          <Text style={styles.paragraph}>
            Verifica en tiempo real las afirmaciones de un debate contra la Biblia Reina-Valera
            1960. El texto bíblico completo está incluido en el dispositivo, y cada cita se
            comprueba contra él antes de mostrarse.
          </Text>

          <Text style={styles.footer}>
            Transcripción y análisis mediante Groq. Tu clave de API se guarda cifrada únicamente en
            este dispositivo.
          </Text>
        </ScrollView>
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
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    ...shadow.floating,
  },
  logo: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  appName: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  appTagline: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  versionChip: {
    marginTop: spacing.md,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  sectionLabel: {
    ...type.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  devCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  devName: {
    ...type.bodySm,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  contactGroup: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  contactTextGroup: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  contactValue: {
    ...type.bodySm,
    color: colors.textPrimary,
    marginTop: 2,
  },
  paragraph: {
    ...type.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  footer: {
    ...type.caption,
    color: colors.textMuted,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

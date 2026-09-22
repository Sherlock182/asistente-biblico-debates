import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { getBookList, getChapter } from '../services/bible';
import { colors, radius, spacing, type } from '../theme';

// Android's TTS engine rejects very long utterances, so a chapter is queued in pieces.
const SPEECH_CHUNK = 2800;

function chunkText(text) {
  const chunks = [];
  let rest = text;
  while (rest.length > SPEECH_CHUNK) {
    const cut = rest.lastIndexOf(' ', SPEECH_CHUNK);
    const at = cut > 0 ? cut : SPEECH_CHUNK;
    chunks.push(rest.slice(0, at));
    rest = rest.slice(at).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

export default function BibleReaderModal({ visible, onClose, target }) {
  const books = useMemo(() => getBookList(), []);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const verseListRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedBook(target?.book ?? null);
    setSelectedChapter(target?.chapter ?? null);
  }, [visible, target]);

  useEffect(() => {
    if (!visible) {
      Speech.stop();
      setSpeaking(false);
    }
  }, [visible]);

  useEffect(() => () => Speech.stop(), []);

  // Jump to the cited verse once the chapter list has mounted.
  useEffect(() => {
    if (!visible || !target?.verse) return;
    if (target.book !== selectedBook || target.chapter !== selectedChapter) return;
    const timer = setTimeout(() => {
      verseListRef.current?.scrollToIndex({
        index: Math.max(0, target.verse - 2),
        animated: false,
        viewPosition: 0,
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [visible, target, selectedBook, selectedChapter]);

  const bookIndex = books.findIndex((b) => b.book === selectedBook);
  const bookMeta = bookIndex >= 0 ? books[bookIndex] : null;
  const chapter = selectedBook && selectedChapter ? getChapter(selectedBook, selectedChapter) : null;

  function stopSpeech() {
    Speech.stop();
    setSpeaking(false);
  }

  function goBack() {
    stopSpeech();
    if (selectedChapter) setSelectedChapter(null);
    else if (selectedBook) setSelectedBook(null);
    else onClose();
  }

  function goToChapter(book, chapterNumber) {
    stopSpeech();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBook(book);
    setSelectedChapter(chapterNumber);
    verseListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  function goPrevChapter() {
    if (!bookMeta) return;
    if (selectedChapter > 1) {
      goToChapter(selectedBook, selectedChapter - 1);
    } else if (bookIndex > 0) {
      const prev = books[bookIndex - 1];
      goToChapter(prev.book, prev.chapters);
    }
  }

  function goNextChapter() {
    if (!bookMeta) return;
    if (selectedChapter < bookMeta.chapters) {
      goToChapter(selectedBook, selectedChapter + 1);
    } else if (bookIndex < books.length - 1) {
      goToChapter(books[bookIndex + 1].book, 1);
    }
  }

  function toggleSpeech() {
    if (speaking) {
      stopSpeech();
      return;
    }
    if (!chapter) return;
    setSpeaking(true);
    const body = chapter.verses.map((v) => v.text).join(' ');
    const parts = chunkText(`${selectedBook}, capítulo ${selectedChapter}. ${body}`);
    parts.forEach((part, i) => {
      Speech.speak(part, {
        language: 'es-ES',
        rate: 0.95,
        onDone: i === parts.length - 1 ? () => setSpeaking(false) : undefined,
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    });
  }

  const isFirstChapter = bookIndex === 0 && selectedChapter === 1;
  const isLastChapter = bookIndex === books.length - 1 && selectedChapter === bookMeta?.chapters;

  let title = 'Reina-Valera 1960';
  if (selectedBook && selectedChapter) title = `${selectedBook} ${selectedChapter}`;
  else if (selectedBook) title = selectedBook;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={goBack}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={10} style={styles.headerButton}>
            <Ionicons name={selectedBook ? 'chevron-back' : 'close'} size={19} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => selectedChapter && setSelectedChapter(null)}
            style={styles.titleButton}
            disabled={!selectedChapter}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {selectedChapter ? <Ionicons name="chevron-down" size={13} color={colors.textMuted} /> : null}
          </Pressable>

          {chapter ? (
            <Pressable onPress={toggleSpeech} hitSlop={10} style={styles.headerButton}>
              <Ionicons name={speaking ? 'stop' : 'volume-high'} size={17} color={colors.gold} />
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {!selectedBook ? (
          <FlatList
            key="books"
            data={books}
            keyExtractor={(item) => item.book}
            renderItem={({ item }) => (
              <Pressable style={styles.bookRow} onPress={() => setSelectedBook(item.book)}>
                <Text style={styles.bookName}>{item.book}</Text>
                <View style={styles.bookMetaGroup}>
                  <Text style={styles.bookMeta}>
                    {item.chapters} {item.chapters === 1 ? 'capítulo' : 'capítulos'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </Pressable>
            )}
            contentContainerStyle={styles.listContent}
          />
        ) : !selectedChapter ? (
          <FlatList
            key="chapters"
            data={Array.from({ length: bookMeta?.chapters ?? 0 }, (_, i) => i + 1)}
            keyExtractor={(n) => String(n)}
            numColumns={5}
            ListHeaderComponent={
              <Text style={styles.gridHeader}>
                {bookMeta?.chapters} {bookMeta?.chapters === 1 ? 'capítulo' : 'capítulos'} · elige uno
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.chapterCell} onPress={() => goToChapter(selectedBook, item)}>
                <Text style={styles.chapterCellText}>{item}</Text>
              </Pressable>
            )}
            contentContainerStyle={styles.gridContent}
          />
        ) : (
          <>
            <FlatList
              key="verses"
              ref={verseListRef}
              data={chapter?.verses ?? []}
              keyExtractor={(item) => String(item.verse)}
              onScrollToIndexFailed={({ index, averageItemLength }) => {
                verseListRef.current?.scrollToOffset({
                  offset: index * (averageItemLength || 90),
                  animated: false,
                });
              }}
              ListHeaderComponent={
                <View style={styles.pageHeader}>
                  <Text style={styles.pageBook}>{selectedBook}</Text>
                  <Text style={styles.pageChapter}>Capítulo {selectedChapter}</Text>
                </View>
              }
              renderItem={({ item }) => {
                const highlighted =
                  target?.verse === item.verse &&
                  target?.book === selectedBook &&
                  target?.chapter === selectedChapter;
                return (
                  <View style={[styles.verseBlock, highlighted && styles.verseBlockActive]}>
                    <Text style={styles.verseParagraph}>
                      <Text style={styles.verseNumber}>{item.verse} </Text>
                      {item.text}
                    </Text>
                  </View>
                );
              }}
              contentContainerStyle={styles.pageContent}
            />

            <View style={styles.navBar}>
              <Pressable
                style={[styles.navButton, isFirstChapter && styles.navButtonDisabled]}
                onPress={goPrevChapter}
                disabled={isFirstChapter}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={isFirstChapter ? colors.textMuted : colors.textSecondary}
                />
                <Text style={[styles.navText, isFirstChapter && styles.navTextDisabled]}>Anterior</Text>
              </Pressable>

              <Pressable style={styles.navCenter} onPress={() => setSelectedChapter(null)}>
                <Text style={styles.navCenterText}>
                  {selectedChapter} / {bookMeta?.chapters}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.navButton, isLastChapter && styles.navButtonDisabled]}
                onPress={goNextChapter}
                disabled={isLastChapter}
              >
                <Text style={[styles.navText, isLastChapter && styles.navTextDisabled]}>Siguiente</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isLastChapter ? colors.textMuted : colors.textSecondary}
                />
              </Pressable>
            </View>
          </>
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
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  titleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    ...type.title,
    color: colors.textPrimary,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  bookName: {
    ...type.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  bookMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookMeta: {
    ...type.caption,
    color: colors.textMuted,
  },
  gridHeader: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  gridContent: {
    padding: spacing.lg,
  },
  chapterCell: {
    flex: 1 / 5,
    margin: 4,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterCellText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pageContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  pageHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  pageBook: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.goldBright,
    letterSpacing: 0.5,
  },
  pageChapter: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  verseBlock: {
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  verseBlockActive: {
    backgroundColor: colors.goldSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  verseParagraph: {
    fontSize: 16.5,
    lineHeight: 27,
    color: colors.assistantText,
  },
  verseNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.gold,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navText: {
    ...type.bodySm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  navTextDisabled: {
    color: colors.textMuted,
  },
  navCenter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navCenterText: {
    ...type.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
});

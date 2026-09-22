import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';

import AboutModal from './src/components/AboutModal';
import BibleReaderModal from './src/components/BibleReaderModal';
import BrandSplash from './src/components/BrandSplash';
import ChatBubble from './src/components/ChatBubble';
import EditClaimModal from './src/components/EditClaimModal';
import EmptyState from './src/components/EmptyState';
import ListeningIndicator from './src/components/ListeningIndicator';
import SessionsModal from './src/components/SessionsModal';
import SettingsModal from './src/components/SettingsModal';
import { getGroqApiKey, setGroqApiKey } from './src/services/secureStore';
import { transcribeAudio } from './src/services/groq';
import {
  FRAMEWORK_LABELS,
  analyzeStatement,
  argueStance,
  askAssistant,
  extractClaims,
  predictCounter,
  triageStatement,
} from './src/services/debateAssistant';
import { getVerseTotal, warmIndex } from './src/services/bible';
import { detectHeadsetFrom } from './src/services/audioOutput';
import { loadSession, saveSession } from './src/services/sessionStore';
import { buildSpokenVerdict, parseReference, parseVerdictReply } from './src/utils/parseVerdictReply';
import { colors, radius, shadow, spacing, type } from './src/theme';

// Audio is always captured in short takes because transcription is more accurate on them,
// but a take is only ~10s of speech — far too little to be a debate argument on its own.
// Takes are therefore accumulated until the user's chosen window is full.
const RECORD_TAKE_SECONDS = 10;

// Whisper punctuates every take, so "ends in a period" says nothing about whether the
// speaker finished a thought. These bounds decide when a window is worth analysing.
const MIN_ANALYSIS_CHARS = 80;
const HARD_CAP_CHARS = 1200;
const SILENT_TAKES_TO_FLUSH = 2;

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksComplete(text) {
  return /[.!?]["”]?\s*$/.test(text);
}

function verdictHaptic(reply) {
  const parsed = parseVerdictReply(reply);
  if (!parsed) return;
  if (parsed.verdict === 'FALSO') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } else if (parsed.verdict === 'VERDADERO') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

function AppContent() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [sessionsVisible, setSessionsVisible] = useState(false);
  const [readerVisible, setReaderVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [readerTarget, setReaderTarget] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [windowSeconds, setWindowSeconds] = useState(30);
  const [discreetMode, setDiscreetMode] = useState(false);
  const [framework, setFramework] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('live');
  const [autoSpeak, setAutoSpeak] = useState('never');

  const autoSpeakRef = useRef('never');
  const headsetRef = useRef(false);
  const analysisModeRef = useRef('live');
  const transcriptIdRef = useRef(null);
  const frameworkRef = useRef(null);
  const messagesRef = useRef(messages);
  const listeningRef = useRef(false);
  const windowSecondsRef = useRef(windowSeconds);
  const windowStartRef = useRef(0);
  const silentTakesRef = useRef(0);
  const bufferRef = useRef('');
  const sessionIdRef = useRef(newId());
  const sessionStartedRef = useRef(Date.now());
  const listRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    messagesRef.current = messages;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages]);

  useEffect(() => {
    windowSecondsRef.current = windowSeconds;
  }, [windowSeconds]);

  useEffect(() => {
    analysisModeRef.current = analysisMode;
  }, [analysisMode]);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
    if (autoSpeak === 'never') Speech.stop();
  }, [autoSpeak]);

  useEffect(() => {
    getGroqApiKey().then(setApiKey);
    const timer = setTimeout(warmIndex, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Persist the running debate so a crash or an accidental exit never loses it.
  useEffect(() => {
    if (!messages.length) return;
    const timer = setTimeout(() => {
      saveSession(sessionIdRef.current, sessionStartedRef.current, messages);
    }, 800);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    let loop;
    if (isListening) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => loop?.stop();
  }, [isListening]);

  /** Reads a verdict aloud when narration is on, or when a headset is detected. */
  function maybeSpeakVerdict(reply, verses) {
    const mode = autoSpeakRef.current;
    if (mode === 'never') return;
    if (mode === 'headset' && !headsetRef.current) return;

    const spoken = buildSpokenVerdict(reply, verses);
    if (!spoken) return;

    Speech.stop();
    Speech.speak(spoken, { language: 'es-ES', rate: 0.98 });
  }

  function addMessage(role, text, extra = {}) {
    setMessages((prev) => [...prev, { id: newId(), role, text, timestamp: Date.now(), ...extra }]);
  }

  function buildHistoryForApi() {
    return messagesRef.current
      .filter((m) => m.role !== 'system')
      .slice(-8)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.role === 'opponent' ? `[El oponente dijo]: ${m.text}` : m.text,
      }));
  }

  /** Runs a captured claim through triage, then verdict. Noise never reaches the chat. */
  async function processStatement(text, { fromMic, sourceId = null, force = false, asClaimOf = null }) {
    const previousClaims = messagesRef.current
      .filter((m) => (m.role === 'opponent' || m.role === 'user') && m.id !== sourceId)
      .slice(-10)
      .map((m) => m.text);

    const { isClaim, topic, terms, framework: detected, contradiction } = await triageStatement(
      text,
      previousClaims
    );
    if (fromMic && !isClaim && !force) return;

    if (detected) {
      frameworkRef.current = detected;
      setFramework(detected);
    }

    let claimId = sourceId ?? asClaimOf;
    if (fromMic && !sourceId && !asClaimOf) {
      claimId = newId();
      addMessage('opponent', text, { id: claimId });
    }

    if (contradiction) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      addMessage(
        'contradiction',
        `Antes dijo: "${contradiction.previousClaim}"\n\nAhora dice: "${text}"\n\n${contradiction.reason}`,
        { sourceId: claimId }
      );
    }

    const history = buildHistoryForApi();
    const analyze = fromMic ? analyzeStatement : askAssistant;
    const { reply, candidates, verses } = await analyze(
      text,
      history,
      terms,
      detected ?? frameworkRef.current,
      topic
    );
    addMessage('assistant', reply, {
      statement: text,
      candidates,
      verses,
      sourceId: claimId,
      claimLabel: asClaimOf ? text : undefined,
    });
    verdictHaptic(reply);
    maybeSpeakVerdict(reply, verses);
  }

  function handleEditClaim(message) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingMessage(message);
  }

  /** Replaces a misheard transcription and re-runs everything derived from it. */
  async function handleSaveEdit(newText) {
    const target = editingMessage;
    setEditingMessage(null);
    if (!target) return;

    setMessages((prev) =>
      prev
        .filter((m) => m.sourceId !== target.id)
        .map((m) => (m.id === target.id ? { ...m, text: newText } : m))
    );

    setIsThinking(true);
    try {
      await processStatement(newText, { fromMic: true, sourceId: target.id, force: true });
    } catch (e) {
      addMessage('system', `⚠️ ${e.message}`);
    } finally {
      setIsThinking(false);
    }
  }

  async function submitText(raw) {
    const text = raw.trim();
    if (!text) return;
    if (!apiKey) {
      setSettingsVisible(true);
      return;
    }
    setInputText('');
    addMessage('user', text);
    setIsThinking(true);
    try {
      await processStatement(text, { fromMic: false });
    } catch (e) {
      addMessage('system', `⚠️ ${e.message}`);
    } finally {
      setIsThinking(false);
    }
  }

  /** Grows the live transcript bubble in place while "analizar al detener" is active. */
  function appendTranscript(text) {
    bufferRef.current = `${bufferRef.current} ${text}`.trim();
    const full = bufferRef.current;

    setMessages((prev) => {
      if (transcriptIdRef.current) {
        return prev.map((m) => (m.id === transcriptIdRef.current ? { ...m, text: full } : m));
      }
      const id = newId();
      transcriptIdRef.current = id;
      return [...prev, { id, role: 'transcript', text: full, timestamp: Date.now() }];
    });
  }

  async function handleTranscribedChunk(uri) {
    try {
      const spoken = ((await transcribeAudio(uri)) || '').trim();

      if (analysisModeRef.current === 'onStop') {
        if (spoken.length >= 3) appendTranscript(spoken);
        return;
      }

      // A take that transcribes to nothing means the speaker stopped talking.
      if (spoken.length < 3) {
        silentTakesRef.current += 1;
        if (!bufferRef.current) return;
      } else {
        silentTakesRef.current = 0;
        bufferRef.current = `${bufferRef.current} ${spoken}`.trim();
      }

      const buffered = bufferRef.current;
      const elapsed = (Date.now() - windowStartRef.current) / 1000;
      const windowFull = elapsed >= windowSecondsRef.current;

      // The speaker clearly paused: a natural place to cut, even mid-window.
      const pausedAfterSpeaking =
        silentTakesRef.current >= SILENT_TAKES_TO_FLUSH && buffered.length >= MIN_ANALYSIS_CHARS;

      // Once the window is up, wait for the current sentence to close — but not forever.
      const readyToCut =
        windowFull && (looksComplete(buffered) || elapsed >= windowSecondsRef.current * 1.5);

      if (!readyToCut && !pausedAfterSpeaking && buffered.length < HARD_CAP_CHARS) return;
      if (buffered.length < MIN_ANALYSIS_CHARS) return;

      bufferRef.current = '';
      windowStartRef.current = Date.now();
      silentTakesRef.current = 0;
      await processStatement(buffered, { fromMic: true });
    } catch (e) {
      addMessage('system', `⚠️ ${e.message}`);
    }
  }

  async function handleStance(message, stance) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsThinking(true);
    try {
      const history = buildHistoryForApi();
      if (stance === 'counter') {
        const { reply } = await predictCounter(
          message.statement,
          message.candidates,
          history,
          frameworkRef.current
        );
        addMessage('counter', reply);
      } else {
        const { reply } = await argueStance(
          message.statement,
          stance,
          message.candidates,
          history,
          frameworkRef.current
        );
        addMessage('stance', reply, { stance });
      }
    } catch (e) {
      addMessage('system', `⚠️ ${e.message}`);
    } finally {
      setIsThinking(false);
    }
  }

  async function listenLoop() {
    while (listeningRef.current) {
      try {
        await recorder.prepareToRecordAsync();

        // Only queryable once a recording is prepared, so it's refreshed every take —
        // that way plugging headphones in mid-debate is picked up.
        try {
          headsetRef.current = detectHeadsetFrom(recorder.getAvailableInputs());
        } catch {
          // Input enumeration isn't available on this device; leave the last known value.
        }

        recorder.record();
        await sleep(RECORD_TAKE_SECONDS * 1000);
        if (!listeningRef.current) {
          await recorder.stop().catch(() => {});
          break;
        }
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          handleTranscribedChunk(uri);
        }
      } catch (e) {
        addMessage('system', `⚠️ Error de grabación: ${e.message}`);
        listeningRef.current = false;
        setIsListening(false);
        break;
      }
    }
  }

  async function startListening() {
    if (!apiKey) {
      setSettingsVisible(true);
      return;
    }
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      addMessage('system', 'Se necesita permiso de micrófono para escuchar el debate.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bufferRef.current = '';
    windowStartRef.current = Date.now();
    silentTakesRef.current = 0;
    listeningRef.current = true;
    setIsListening(true);
    listenLoop();
  }

  async function stopListening() {
    listeningRef.current = false;
    setIsListening(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recorder.stop();
    } catch {
      // not recording, nothing to stop
    }

    const leftover = bufferRef.current.trim();
    bufferRef.current = '';

    if (analysisModeRef.current === 'onStop') {
      await analyzeFullTranscript(leftover);
      return;
    }

    // Analyse whatever was still being held back mid-sentence.
    if (leftover.length >= 12) {
      setIsThinking(true);
      try {
        await processStatement(leftover, { fromMic: true });
      } catch {
        // already surfaced elsewhere
      } finally {
        setIsThinking(false);
      }
    }
  }

  /** "Analizar al detener": pulls the claims out of everything captured, then verifies each. */
  async function analyzeFullTranscript(transcript) {
    const transcriptId = transcriptIdRef.current;
    transcriptIdRef.current = null;

    if (transcript.length < 12) {
      if (transcriptId) setMessages((prev) => prev.filter((m) => m.id !== transcriptId));
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === transcriptId ? { ...m, role: 'opponent' } : m))
    );

    setIsThinking(true);
    try {
      const claims = await extractClaims(transcript);
      if (claims.length === 0) {
        addMessage('system', 'No encontré afirmaciones verificables en lo que se dijo.');
        return;
      }
      for (const claim of claims) {
        await processStatement(claim, { fromMic: true, force: true, asClaimOf: transcriptId });
      }
    } catch (e) {
      addMessage('system', `⚠️ ${e.message}`);
    } finally {
      setIsThinking(false);
    }
  }

  async function handleSaveApiKey(key) {
    await setGroqApiKey(key);
    setApiKey(key || null);
  }

  function handleNewSession() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Speech.stop();
    sessionIdRef.current = newId();
    sessionStartedRef.current = Date.now();
    bufferRef.current = '';
    frameworkRef.current = null;
    setFramework(null);
    setMessages([]);
    setSessionsVisible(false);
  }

  async function handleOpenSession(id) {
    const session = await loadSession(id);
    if (!session) return;
    sessionIdRef.current = session.id;
    sessionStartedRef.current = session.startedAt;
    setMessages(session.messages);
    setSessionsVisible(false);
  }

  function handleOpenReference(ref) {
    const parsed = parseReference(ref);
    if (!parsed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReaderTarget(parsed);
    setReaderVisible(true);
  }

  const hasMessages = messages.length > 0;
  const canSend = inputText.trim().length > 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoRing}>
              <Image source={require('./assets/icon.png')} style={styles.logo} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Asistente Bíblico
              </Text>
              <View style={styles.headerSubtitleRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isListening ? colors.danger : apiKey ? colors.success : colors.warning },
                  ]}
                />
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {isListening
                    ? 'Escuchando en vivo'
                    : !apiKey
                      ? 'Sin configurar'
                      : framework
                        ? `Oponente: ${FRAMEWORK_LABELS[framework]}`
                        : 'Reina-Valera 1960'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                setReaderTarget(null);
                setReaderVisible(true);
              }}
              hitSlop={8}
              style={styles.headerButton}
            >
              <Ionicons name="book-outline" size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => setSessionsVisible(true)} hitSlop={8} style={styles.headerButton}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => setSettingsVisible(true)} hitSlop={8} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => setAboutVisible(true)} hitSlop={8} style={styles.headerButton}>
              <Ionicons name="information-circle-outline" size={17} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {hasMessages ? (
          <FlatList
            ref={listRef}
            data={messages}
            extraData={`${isListening}-${discreetMode}`}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                role={item.role}
                text={item.text}
                timestamp={item.timestamp}
                verses={item.verses}
                claimLabel={item.claimLabel}
                stance={item.stance}
                discreet={discreetMode}
                showStance={!isListening && item.role === 'assistant' && !!item.statement}
                onStance={(stance) => handleStance(item, stance)}
                onOpenReference={handleOpenReference}
                onEdit={() => handleEditClaim(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        ) : (
          <EmptyState onPickExample={submitText} verseCount={getVerseTotal()} />
        )}

        {isThinking ? (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color={colors.gold} />
            <Text style={styles.thinkingText}>Consultando la Escritura...</Text>
          </View>
        ) : null}

        {isListening ? (
          <ListeningIndicator windowSeconds={windowSeconds} analysisMode={analysisMode} />
        ) : null}

        <SafeAreaView edges={['bottom']} style={styles.composerSafe}>
          <View style={styles.composer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                style={[styles.micButton, isListening && styles.micButtonActive]}
                onPress={isListening ? stopListening : startListening}
              >
                <Ionicons
                  name={isListening ? 'stop' : 'mic'}
                  size={20}
                  color={isListening ? '#fff' : colors.background}
                />
              </Pressable>
            </Animated.View>

            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe una afirmación para verificar..."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Pressable
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={() => submitText(inputText)}
              disabled={!canSend}
            >
              <Ionicons name="arrow-up" size={19} color={canSend ? colors.primaryText : colors.textMuted} />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        windowSeconds={windowSeconds}
        onChangeWindowSeconds={setWindowSeconds}
        discreetMode={discreetMode}
        onToggleDiscreet={() => setDiscreetMode((v) => !v)}
        analysisMode={analysisMode}
        onChangeAnalysisMode={setAnalysisMode}
        autoSpeak={autoSpeak}
        onChangeAutoSpeak={setAutoSpeak}
      />

      <SessionsModal
        visible={sessionsVisible}
        onClose={() => setSessionsVisible(false)}
        onOpenSession={handleOpenSession}
        onNewSession={handleNewSession}
        currentSessionId={sessionIdRef.current}
      />

      <BibleReaderModal
        visible={readerVisible}
        onClose={() => setReaderVisible(false)}
        target={readerTarget}
      />

      <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />

      <EditClaimModal
        visible={!!editingMessage}
        initialText={editingMessage?.text}
        onCancel={() => setEditingMessage(null)}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <SafeAreaProvider>
      <AppContent />
      {showSplash ? <BrandSplash onFinish={() => setShowSplash(false)} /> : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  headerSafe: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerTextGroup: {
    flex: 1,
  },
  logoRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    ...type.title,
    color: colors.textPrimary,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSubtitle: {
    ...type.caption,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 5,
  },
  headerButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  listContent: {
    paddingVertical: spacing.lg,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  thinkingText: {
    ...type.caption,
    color: colors.textMuted,
  },
  composerSafe: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
  },
  micButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  micButtonActive: {
    backgroundColor: colors.danger,
    ...shadow.floating,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
});

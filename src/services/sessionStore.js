import AsyncStorage from '@react-native-async-storage/async-storage';

const INDEX_KEY = 'debate_sessions_index';
const SESSION_PREFIX = 'debate_session:';
const MAX_SESSIONS = 40;

/** Lightweight list of past debates (newest first): id, date, title and message count. */
export async function listSessions() {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function loadSession(id) {
  try {
    const raw = await AsyncStorage.getItem(SESSION_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function deriveTitle(messages) {
  const firstClaim = messages.find((m) => m.role === 'opponent' || m.role === 'user');
  if (!firstClaim) return 'Debate sin afirmaciones';
  return firstClaim.text.length > 60 ? `${firstClaim.text.slice(0, 57)}...` : firstClaim.text;
}

/** Creates or updates a session. Called as the debate progresses, so nothing is lost. */
export async function saveSession(id, startedAt, messages) {
  if (!messages.length) return;

  const meta = {
    id,
    startedAt,
    updatedAt: Date.now(),
    title: deriveTitle(messages),
    claimCount: messages.filter((m) => m.role === 'opponent' || m.role === 'user').length,
  };

  try {
    await AsyncStorage.setItem(SESSION_PREFIX + id, JSON.stringify({ ...meta, messages }));

    const index = await listSessions();
    const next = [meta, ...index.filter((s) => s.id !== id)].slice(0, MAX_SESSIONS);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));

    const keptIds = new Set(next.map((s) => s.id));
    const dropped = index.filter((s) => !keptIds.has(s.id));
    if (dropped.length) {
      await AsyncStorage.multiRemove(dropped.map((s) => SESSION_PREFIX + s.id));
    }
  } catch {
    // Storage failures shouldn't interrupt a live debate.
  }
}

export async function deleteSession(id) {
  try {
    await AsyncStorage.removeItem(SESSION_PREFIX + id);
    const index = await listSessions();
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index.filter((s) => s.id !== id)));
  } catch {
    // ignore
  }
}

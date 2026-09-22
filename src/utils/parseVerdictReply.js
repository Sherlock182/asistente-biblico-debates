const VERDICT_REGEX = /VEREDICTO:\s*(FALSO|VERDADERO|PARCIAL|SIN\s+BASE)/i;

/**
 * Parses the compact "VEREDICTO: FALSO\nRazón breve.\n- Ref: "texto"" format used for
 * live debate verdicts. Returns null when the text doesn't follow that shape (e.g. a
 * stance-argument reply), so callers can fall back to plain text rendering.
 */
export function parseVerdictReply(text) {
  if (!text) return null;
  const match = text.match(VERDICT_REGEX);
  if (!match) return null;

  const verdict = match[1].toUpperCase().replace(/\s+/g, ' ');
  const rest = text.slice(match.index + match[0].length).trim();
  const lines = rest.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  const reasonLines = [];
  const verses = [];
  for (const line of lines) {
    if (line.startsWith('-')) {
      verses.push(line.replace(/^-\s*/, ''));
    } else if (verses.length === 0) {
      reasonLines.push(line);
    }
  }

  return { verdict, reason: reasonLines.join(' '), verses };
}

/**
 * Splits a citation line ("Efesios 2:8: "Porque por gracia..."") into its reference and
 * quoted text so each can be styled separately. Falls back to the whole line as the text.
 */
export function splitVerseLine(line) {
  const match = line.match(/^(.+?\d+:\d+[a-z]?)\s*[:\-–]\s*(.*)$/);
  if (!match) return { ref: null, text: line };
  return { ref: match[1].trim(), text: match[2].replace(/^["“]|["”]$/g, '').trim() };
}

/** Turns "1 Corintios 3:15" into the parts the in-app Bible reader needs to jump there. */
export function parseReference(ref) {
  if (!ref) return null;
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)/);
  if (!match) return null;
  return { book: match[1].trim(), chapter: Number(match[2]), verse: Number(match[3]) };
}

/**
 * Spells a reference out for text-to-speech. Spoken as-is, "Efesios 2:8" is read as a
 * clock time ("dos y ocho de la mañana") by the Spanish voice engine.
 */
const SPOKEN_VERDICT = {
  FALSO: 'Falso',
  VERDADERO: 'Verdadero',
  PARCIAL: 'Parcialmente verdadero',
  'SIN BASE': 'Sin base clara',
};

/** Builds the sentence read aloud when automatic narration is on. */
export function buildSpokenVerdict(reply, verses) {
  const parsed = parseVerdictReply(reply);
  if (!parsed) return null;

  // Each fragment is closed off so the voice pauses between them instead of running the
  // verse text straight into the next reference.
  const parts = [`${SPOKEN_VERDICT[parsed.verdict] ?? parsed.verdict}.`];
  const push = (fragment) => {
    const clean = fragment.trim();
    if (clean) parts.push(/[.!?;:]$/.test(clean) ? clean : `${clean}.`);
  };

  if (parsed.reason) push(parsed.reason);

  const citations = verses?.length
    ? verses
    : parsed.verses.map((line) => ({ ...splitVerseLine(line), status: 'unverified' }));

  for (const verse of citations.slice(0, 2)) {
    if (verse.status === 'invalid') continue;
    push(verse.ref ? `${speakableReference(verse.ref)}. ${verse.text}` : verse.text);
  }

  return parts.join(' ');
}

export function speakableReference(ref) {
  const parsed = parseReference(ref);
  if (!parsed) return (ref || '').replace(/:/g, ', versículo ');
  return `${parsed.book}, capítulo ${parsed.chapter}, versículo ${parsed.verse}`;
}

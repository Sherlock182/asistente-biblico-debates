import { getVerseText } from './bible';
import { parseReference, splitVerseLine } from '../utils/parseVerdictReply';

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word overlap between the model's quote and the authentic verse (0 to 1). */
function similarity(a, b) {
  const wordsA = new Set(normalize(a).split(' ').filter(Boolean));
  const wordsB = new Set(normalize(b).split(' ').filter(Boolean));
  if (!wordsA.size || !wordsB.size) return 0;
  let shared = 0;
  for (const word of wordsA) if (wordsB.has(word)) shared += 1;
  return shared / Math.max(wordsA.size, wordsB.size);
}

/**
 * Checks every citation the model produced against the RV1960 text bundled in the app.
 * The prompt asks it to quote verbatim, but nothing enforces that — so the displayed text
 * is always replaced with the authentic verse, and any mismatch is surfaced to the user.
 *
 * status: 'verified'  quote matched the real verse
 *         'corrected' reference exists but the quote was altered; text was replaced
 *         'invalid'   the reference doesn't exist in RV1960
 */
export function verifyCitations(verseLines) {
  return verseLines.map((line) => {
    const { ref, text } = splitVerseLine(line);
    const parsed = parseReference(ref);

    if (!parsed) {
      return { ref: ref ?? '', text, status: 'invalid' };
    }

    const canonical = getVerseText(parsed.book, parsed.chapter, parsed.verse);
    if (!canonical) {
      return { ref, text, status: 'invalid' };
    }

    const status = similarity(text, canonical.text) >= 0.8 ? 'verified' : 'corrected';
    return { ref: canonical.ref, text: canonical.text, status };
  });
}

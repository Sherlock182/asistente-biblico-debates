import rv1960 from '../data/rv1960.json';

let cachedIndex = null;

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const STOPWORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por',
  'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero',
  'sus', 'le', 'ya', 'o', 'este', 'si', 'porque', 'esta', 'entre', 'cuando',
  'muy', 'sin', 'sobre', 'tambien', 'me', 'hasta', 'hay', 'donde', 'quien',
  'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra',
  'otros', 'ese', 'eso', 'ante', 'ellos', 'esto', 'mi', 'antes', 'algunos',
  'unos', 'yo', 'otro', 'otras', 'otra', 'tanto', 'esa', 'estos', 'mucho',
  'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas',
  'algunas', 'algo', 'nosotros', 'creo', 'dice', 'dijo', 'pienso',
]);

// Crude Spanish stemmer: truncating to a short prefix collapses common inflections
// (salvación/salvo/salvos/salva/salvar/salvado -> "salv") without a full morphological
// analyzer, which isn't available in a React Native / Expo Go environment.
function stem(word) {
  return word.length > 4 ? word.slice(0, 4) : word;
}

function tokenize(str) {
  return normalize(str)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function stemsOf(str) {
  return tokenize(str).map(stem);
}

function buildIndex() {
  const flat = [];
  const docFreq = new Map();

  for (const book of rv1960) {
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        const stemSet = new Set(stemsOf(verse.text));
        for (const s of stemSet) {
          docFreq.set(s, (docFreq.get(s) || 0) + 1);
        }
        flat.push({
          book: book.book,
          chapter: chapter.chapter,
          verse: verse.verse,
          text: verse.text,
          ref: `${book.book} ${chapter.chapter}:${verse.verse}`,
          stems: stemSet,
          length: stemSet.size,
        });
      }
    }
  }

  const avgLength = flat.reduce((sum, e) => sum + e.length, 0) / (flat.length || 1);
  return { flat, docFreq, total: flat.length, avgLength };
}

function getIndex() {
  if (!cachedIndex) cachedIndex = buildIndex();
  return cachedIndex;
}

/**
 * Searches the full RV1960 text by stemmed keyword overlap, weighting rarer words
 * (e.g. "salvación") much higher than common ones (e.g. "obras") so the most
 * topically specific verses surface first instead of being buried under generic matches.
 */
const LENGTH_NORM = 0.35;

export function searchVerses(query, limit = 15, expansionTerms = []) {
  const { flat, docFreq, total, avgLength } = getIndex();

  const primary = [...new Set(stemsOf(query))];
  const primarySet = new Set(primary);
  const secondary = [...new Set(stemsOf(expansionTerms.join(' ')))].filter((s) => !primarySet.has(s));
  if (primary.length === 0 && secondary.length === 0) return [];

  // The claim's own words define the topic; expansion terms only widen the net, so they
  // count less — otherwise a generic synonym can outweigh what was actually said.
  const concepts = [
    ...primary.map((stem) => ({ stem, weight: 1, isPrimary: true })),
    ...secondary.map((stem) => ({ stem, weight: 0.55, isPrimary: false })),
  ];

  const scored = [];
  for (const entry of flat) {
    let score = 0;
    let matched = 0;
    let primaryMatched = 0;
    for (const { stem: s, weight, isPrimary } of concepts) {
      if (entry.stems.has(s)) {
        score += weight * Math.log((total + 1) / (docFreq.get(s) || 1));
        matched += 1;
        if (isPrimary) primaryMatched += 1;
      }
    }
    if (matched === 0) continue;

    // Long verses match more words simply by being long, so damp that advantage.
    const lengthPenalty = 1 - LENGTH_NORM + LENGTH_NORM * (entry.length / avgLength);

    // Covering more of what was actually claimed is what makes a verse on-topic; the
    // expansion synonyms are only a net, so they don't count toward coverage.
    const coverage = primary.length ? primaryMatched / primary.length : 0;

    scored.push({
      book: entry.book,
      chapter: entry.chapter,
      verse: entry.verse,
      text: entry.text,
      ref: entry.ref,
      score: (score / lengthPenalty) * (1 + coverage),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function getBookNames() {
  return rv1960.map((b) => b.book);
}

/** Books with their chapter counts, for the in-app reader's navigation. */
export function getBookList() {
  return rv1960.map((b) => ({ book: b.book, chapters: b.chapters.length }));
}

// This edition spells some books unusually ("San Márcos", "Los Actos", "Revelación"),
// while a model will normally write the common form. Both must resolve to the same book.
const BOOK_ALIASES = {
  apocalipsis: 'Revelación',
  hechos: 'Los Actos',
  'hechos de los apostoles': 'Los Actos',
  'los hechos': 'Los Actos',
  mateo: 'San Mateo',
  marcos: 'San Márcos',
  lucas: 'San Lúcas',
  juan: 'San Juan',
  judas: 'San Júdas',
  '1 juan': '1 San Juan',
  '2 juan': '2 San Juan',
  '3 juan': '3 San Juan',
  '1 pedro': '1 San Pedro',
  '2 pedro': '2 San Pedro',
  'cantar de los cantares': 'Cantares',
  'cantar de cantares': 'Cantares',
  eclesiastes: 'Eclesiástes',
  esdras: 'Ésdras',
  oseas: 'Oséas',
  miqueas: 'Miquéas',
  abdias: 'Abdías',
  hageo: 'Aggeo',
};

let bookLookup = null;

function getBookLookup() {
  if (!bookLookup) {
    bookLookup = new Map();
    for (const b of rv1960) bookLookup.set(normalize(b.book), b.book);
    for (const [alias, real] of Object.entries(BOOK_ALIASES)) bookLookup.set(normalize(alias), real);
  }
  return bookLookup;
}

/** Resolves a written book name (any common spelling) to this edition's exact name. */
export function resolveBookName(name) {
  if (!name) return null;
  return getBookLookup().get(normalize(name)) ?? null;
}

/** The authentic RV1960 text of one verse, or null if the reference doesn't exist. */
export function getVerseText(bookName, chapterNumber, verseNumber) {
  const resolved = resolveBookName(bookName);
  if (!resolved) return null;
  const book = rv1960.find((b) => b.book === resolved);
  const chapter = book?.chapters.find((c) => c.chapter === chapterNumber);
  const verse = chapter?.verses.find((v) => v.verse === verseNumber);
  if (!verse) return null;
  return { ref: `${resolved} ${chapterNumber}:${verseNumber}`, text: verse.text };
}

/** Every verse of one chapter, for the in-app reader. */
export function getChapter(bookName, chapterNumber) {
  const resolved = resolveBookName(bookName);
  const book = rv1960.find((b) => b.book === resolved);
  const chapter = book?.chapters.find((c) => c.chapter === chapterNumber);
  if (!chapter) return null;
  return { book: resolved, chapter: chapterNumber, verses: chapter.verses };
}

/**
 * Returns a verse plus its immediate neighbours, so the model can check a citation against
 * its surrounding passage instead of quoting it in isolation — the most common way a
 * proof-text gets challenged in a debate.
 */
export function getVerseContext(bookName, chapterNumber, verseNumber, window = 1) {
  const chapter = getChapter(bookName, chapterNumber);
  if (!chapter) return [];
  return chapter.verses
    .filter((v) => Math.abs(v.verse - verseNumber) <= window)
    .map((v) => ({
      ref: `${bookName} ${chapterNumber}:${v.verse}`,
      text: v.text,
      isTarget: v.verse === verseNumber,
    }));
}

let cachedTotal = null;

/** Cheap verse count that avoids building the (expensive) search index just to show a number. */
export function getVerseTotal() {
  if (cachedTotal === null) {
    cachedTotal = rv1960.reduce(
      (sum, book) => sum + book.chapters.reduce((n, chapter) => n + chapter.verses.length, 0),
      0
    );
  }
  return cachedTotal;
}

/**
 * Builds the search index ahead of time. Called shortly after launch so the first
 * verdict mid-debate isn't delayed by indexing 31k verses on the JS thread.
 */
export function warmIndex() {
  getIndex();
}

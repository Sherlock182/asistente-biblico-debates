import { getVerseContext, searchVerses } from './bible';
import { verifyCitations } from './citationCheck';
import { chatCompletion } from './groq';
import { parseVerdictReply } from '../utils/parseVerdictReply';

const VERDICT_SYSTEM_PROMPT = `Eres un verificador de afirmaciones en un debate cristiano en vivo. Tu única fuente de autoridad es la Biblia Reina-Valera 1960 (RV1960).

REGLAS ESTRICTAS:
1. NUNCA cites, inventes ni parafrasees un versículo que no aparezca en "VERSÍCULOS CANDIDATOS".
2. Cita el texto exacto y la referencia (Libro capítulo:versículo) tal como aparecen en los candidatos, palabra por palabra.
3. RELEVANCIA: prefiere los versículos que por sí solos hablan del tema en discusión. Entre varios, elige los que lo definan más claramente.
4. RESPALDO SÓLIDO: cita SIEMPRE 2 versículos, porque dos textos convencen más que uno. Usa 3 si se refuerzan entre sí. Cita solo 1 únicamente si de verdad no hay un segundo que aporte algo al punto.
5. Solo si NINGÚN candidato trata el tema, responde VEREDICTO: SIN BASE sin citar nada. No abuses de esta opción: úsala solo cuando los candidatos realmente no vienen al caso.
6. Si hay "CONTEXTO AMPLIADO", úsalo para confirmar que el versículo dice en su pasaje lo que parece decir suelto. NO cites líneas del contexto ampliado: solo cita candidatos.
7. Sé breve en la explicación: en un debate en vivo pueden pasar muchas afirmaciones seguidas.
8. Responde ÚNICAMENTE con este formato, sin nada antes ni después:
VEREDICTO: FALSO
Breve explicación de por qué es falso/verdadero/parcial (una sola frase, sin rodeos).
- Libro capítulo:versículo: "texto exacto"
- Libro capítulo:versículo: "texto exacto"

El VEREDICTO debe ser exactamente una de estas: FALSO, VERDADERO, PARCIAL o SIN BASE. La explicación es UNA sola frase corta. Normalmente 2 versículos, hasta 3 si refuerzan (ninguno si el veredicto es SIN BASE). No agregues nada más.`;

const TRIAGE_SYSTEM_PROMPT = `Analizas frases captadas por un micrófono durante un debate religioso.

Responde ÚNICAMENTE con estas cinco líneas, sin nada más:
TIPO: AFIRMACION
TEMA: la afirmación central en una frase corta y limpia
TERMINOS: palabra1, palabra2, palabra3, ...
CORRIENTE: indefinido
CONTRADICE: ninguna

TIPO es AFIRMACION solo si la frase sostiene algo sobre doctrina, Dios, la Biblia, salvación, fe, moral religiosa o historia bíblica que pueda verificarse contra la Escritura. Es IRRELEVANTE si es un saludo, muletilla, ruido, algo inaudible o cualquier cosa sin contenido doctrinal verificable.

TEMA: reescribe lo que el oponente sostiene, quitando muletillas, titubeos y relleno del habla. Ejemplo: de "bueno este yo creo que pues la salvación verdad es por las obras que uno hace" el TEMA es "la salvación se obtiene por las obras". Si TIPO es IRRELEVANTE, deja TEMA vacío.

TERMINOS: de 8 a 14 palabras en español que la Reina-Valera 1960 usaría para hablar de ese tema, incluyendo sinónimos y variantes antiguas. Si TIPO es IRRELEVANTE, deja TERMINOS vacío.

CORRIENTE: qué postura religiosa sugiere la frase. Usa exactamente una de estas: testigo de jehova, catolico, adventista, mormon, evangelico, pentecostal, ateo, judio, indefinido. Usa "indefinido" salvo que la frase tenga marcas claras de esa postura.

CONTRADICE: si en "AFIRMACIONES PREVIAS" hay alguna que esta frase contradiga, escribe su número seguido de " | " y el motivo en pocas palabras. Si ninguna se contradice, escribe exactamente "ninguna".
Sé MUY estricto: solo cuenta como contradicción una negación directa, donde lo que dice ahora no puede ser verdad al mismo tiempo que lo anterior. NO marques matices, aclaraciones, énfasis distintos ni frases que complementen lo anterior. Ante la menor duda, escribe "ninguna".
Ejemplo de lo que NO es contradicción: antes "la salvación es por fe" y ahora "la fe sin obras es muerta" (se complementan).
Ejemplo de lo que SÍ es contradicción: antes "el alma es inmortal y va al cielo al morir" y ahora "los muertos duermen y no saben nada".`;

const STANCE_SYSTEM_PROMPT = `Eres un asistente de apologética cristiana. Tu única fuente de autoridad es la Biblia Reina-Valera 1960 (RV1960).
Te piden un argumento breve A FAVOR o EN CONTRA de una afirmación. Responde ÚNICAMENTE con:
1. Un argumento sólido en máximo 2 frases.
2. Luego, en su propia línea, UNA cita exacta tomada solo de "VERSÍCULOS CANDIDATOS", en el formato: Libro capítulo:versículo: "texto exacto".
No agregues encabezados, ni análisis, ni nada más.`;

const COUNTER_SYSTEM_PROMPT = `Eres un estratega de debates bíblicos. Tu única fuente de autoridad es la Biblia Reina-Valera 1960 (RV1960).
Te dan una afirmación de un oponente. Anticipa su siguiente movimiento. Responde ÚNICAMENTE con este formato, sin nada más:

Te va a responder: (en una frase, el contraargumento más probable que usará)
Su versículo: Libro capítulo:versículo: "texto exacto" (tomado solo de los candidatos; si ninguno sirve, escribe "ninguno claro")
Tu réplica: (una o dos frases para desarmar ese contraargumento)

Sé breve y concreto. No inventes versículos fuera de los candidatos.`;

const FRAMEWORK_LABELS = {
  'testigo de jehova': 'Testigo de Jehová',
  catolico: 'Católico',
  adventista: 'Adventista',
  mormon: 'Mormón',
  evangelico: 'Evangélico',
  pentecostal: 'Pentecostal',
  ateo: 'Ateo / escéptico',
  judio: 'Judío',
};

/** Extra guidance so replies target the opponent's actual doctrinal framework. */
function frameworkHint(framework) {
  if (!framework || !FRAMEWORK_LABELS[framework]) return null;
  return `El oponente argumenta desde una postura ${FRAMEWORK_LABELS[framework]}. Enfoca la respuesta en los puntos que esa postura suele sostener, sin faltarle al respeto ni mencionar la etiqueta.`;
}

/**
 * Cheap local filter so obvious noise ("gracias", "¿qué?") never reaches the API.
 * Anything that passes still goes through model triage.
 */
function passesLocalFilter(text) {
  const clean = text.trim();
  if (clean.length < 12) return false;
  return clean.split(/\s+/).filter(Boolean).length >= 4;
}

function buildCandidateBlock(text, expansionTerms = [], limit = 16) {
  const candidates = searchVerses(text, limit, expansionTerms);
  const block = candidates.length
    ? candidates.map((c) => `- ${c.ref}: "${c.text}"`).join('\n')
    : 'Ninguno encontrado localmente.';
  return { block, candidates };
}

/** Surrounding verses for the strongest candidates, so citations get checked in context. */
function buildContextBlock(candidates, depth = 5) {
  const lines = [];
  for (const candidate of candidates.slice(0, depth)) {
    const context = getVerseContext(candidate.book, candidate.chapter, candidate.verse, 1);
    for (const entry of context) {
      lines.push(`${entry.ref}: "${entry.text}"${entry.isTarget ? '  <- candidato' : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

/**
 * One cheap call that filters out non-claims, expands the topic into biblical vocabulary,
 * reads the opponent's doctrinal leaning, and checks the claim against what they already
 * said earlier in the session — all before the (more expensive) verdict call.
 */
export async function triageStatement(text, previousClaims = []) {
  if (!passesLocalFilter(text)) {
    return { isClaim: false, topic: '', terms: [], framework: null, contradiction: null };
  }

  const previousBlock = previousClaims.length
    ? `AFIRMACIONES PREVIAS DEL OPONENTE:\n${previousClaims
        .map((claim, i) => `${i + 1}. "${claim}"`)
        .join('\n')}`
    : 'AFIRMACIONES PREVIAS DEL OPONENTE: ninguna.';

  try {
    const reply = await chatCompletion(
      [
        { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
        { role: 'user', content: `${previousBlock}\n\nFrase captada ahora: "${text}"` },
      ],
      { temperature: 0.2, maxTokens: 220 }
    );

    const isClaim = /TIPO:\s*AFIRMACION/i.test(reply);

    const topicMatch = reply.match(/TEMA:\s*(.+)/i);
    const topic = topicMatch ? topicMatch[1].trim() : '';

    const termsMatch = reply.match(/TERMINOS:\s*(.+)/i);
    const terms = termsMatch
      ? termsMatch[1].split(/[,;]/).map((t) => t.trim()).filter((t) => t.length > 2)
      : [];

    const frameworkMatch = reply.match(/CORRIENTE:\s*(.+)/i);
    const rawFramework = frameworkMatch ? frameworkMatch[1].trim().toLowerCase() : 'indefinido';
    const framework = FRAMEWORK_LABELS[rawFramework] ? rawFramework : null;

    let contradiction = null;
    const contradictionMatch = reply.match(/CONTRADICE:\s*(.+)/i);
    if (contradictionMatch && !/^ninguna/i.test(contradictionMatch[1].trim())) {
      const [indexPart, ...reasonParts] = contradictionMatch[1].split('|');
      const index = parseInt(indexPart.trim(), 10);
      if (Number.isInteger(index) && index >= 1 && index <= previousClaims.length) {
        contradiction = {
          previousClaim: previousClaims[index - 1],
          reason: reasonParts.join('|').trim() || 'Contradice lo que afirmó antes.',
        };
      }
    }

    return { isClaim, topic, terms, framework, contradiction };
  } catch {
    // If triage fails, don't silently drop a real claim — let it through unexpanded.
    return { isClaim: true, topic: '', terms: [], framework: null, contradiction: null };
  }
}

const SELECT_SYSTEM_PROMPT = `Eres un experto en la Biblia Reina-Valera 1960. Recibes una afirmación y una lista numerada de versículos candidatos encontrados por búsqueda de palabras.

Tu tarea: razonar cuáles de esos versículos tratan DIRECTAMENTE el tema de la afirmación y sirven para confirmarla o refutarla.

Criterio:
- Un versículo sirve si, leído por sí solo, habla del tema en discusión (a favor o en contra).
- Que comparta palabras con la afirmación no basta: la búsqueda es por palabras y arrastra coincidencias casuales, como un versículo que usa la palabra en otro sentido.
- Descarta solo los que se relacionan de forma vaga, lejana o anecdótica.

Elige entre 3 y 6 versículos, los mejores del tema. Es preferible incluir uno de más que dejar fuera un texto útil: quien los reciba hará la selección final.
Responde ÚNICAMENTE con los números separados por comas, ordenados del que MÁS CLARAMENTE define el tema al que menos.
Si de verdad ninguno toca el tema, responde exactamente: NINGUNO`;

/**
 * Re-ranks the lexical search hits by actual relevance. Word-overlap search always returns
 * something, so without this step the model is handed loosely related verses and ends up
 * citing whatever is closest instead of what truly addresses the claim.
 */
async function selectRelevantVerses(claim, candidates) {
  if (candidates.length <= 1) return candidates;

  try {
    const numbered = candidates.map((c, i) => `${i + 1}. ${c.ref}: "${c.text}"`).join('\n');
    const reply = await chatCompletion(
      [
        { role: 'system', content: SELECT_SYSTEM_PROMPT },
        { role: 'user', content: `Afirmación: "${claim}"\n\nCandidatos:\n${numbered}` },
      ],
      { temperature: 0.1, maxTokens: 80 }
    );

    if (/NINGUNO/i.test(reply)) return [];

    const picked = [];
    for (const part of reply.split(/[,\s]+/)) {
      const index = parseInt(part, 10);
      if (Number.isInteger(index) && index >= 1 && index <= candidates.length) {
        const candidate = candidates[index - 1];
        if (!picked.includes(candidate)) picked.push(candidate);
      }
    }
    // Never hand the verdict a single option: with only one candidate it has nothing to
    // choose from and ends up citing just that one, however weak it is.
    if (picked.length > 0 && picked.length < 3) {
      for (const candidate of candidates) {
        if (picked.length >= 3) break;
        if (!picked.includes(candidate)) picked.push(candidate);
      }
    }

    return picked.slice(0, 6);
  } catch {
    // If the ranking call fails, fall back to the top lexical hits.
    return candidates.slice(0, 6);
  }
}

function noBasisReply() {
  return 'VEREDICTO: SIN BASE\nNo encontré en la Reina-Valera 1960 un texto que trate directamente este punto, así que no cito nada para no forzar una cita fuera de lugar.';
}

async function verdictFor(promptIntro, text, history, expansionTerms, framework, topic) {
  // Search on the distilled claim: spoken language is full of filler that drags the
  // lexical search off topic ("bueno este yo creo que pues la salvación verdad...").
  const searchQuery = topic && topic.length > 3 ? topic : text;
  const { candidates: found } = buildCandidateBlock(searchQuery, expansionTerms, 18);

  // Keep only the verses that genuinely address the claim, best first.
  const candidates = await selectRelevantVerses(topic || text, found);
  if (candidates.length === 0) {
    return { reply: noBasisReply(), candidates: found.slice(0, 6), verses: [] };
  }

  const block = candidates.map((c) => `- ${c.ref}: "${c.text}"`).join('\n');
  const contextBlock = buildContextBlock(candidates, 4);
  const hint = frameworkHint(framework);

  const userContent = [
    `${promptIntro}\n"${text}"`,
    hint,
    `VERSÍCULOS CANDIDATOS (RV1960, ya filtrados por relevancia y ordenados del más claro al menos):\n${block}`,
    contextBlock ? `CONTEXTO AMPLIADO (solo para entender, no lo cites):\n${contextBlock}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const reply = await chatCompletion(
    [
      { role: 'system', content: VERDICT_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userContent },
    ],
    { maxTokens: 350 }
  );

  // Never show a quote we haven't checked against the bundled RV1960 text.
  const parsed = parseVerdictReply(reply);
  const verses = parsed ? verifyCitations(parsed.verses) : [];

  return { reply, candidates, verses };
}

/** Verifies a statement transcribed from the opponent during a live debate. */
export async function analyzeStatement(
  statement,
  history = [],
  expansionTerms = [],
  framework = null,
  topic = ''
) {
  return verdictFor('El oponente dijo:', statement, history, expansionTerms, framework, topic);
}

/** Verifies a statement or question typed directly by the user. */
export async function askAssistant(
  question,
  history = [],
  expansionTerms = [],
  framework = null,
  topic = ''
) {
  return verdictFor('Verifica esta afirmación:', question, history, expansionTerms, framework, topic);
}

const EXTRACT_SYSTEM_PROMPT = `Recibes la transcripción de lo que dijo alguien durante un debate religioso. Extrae las afirmaciones doctrinales que se puedan verificar contra la Biblia.

Responde ÚNICAMENTE con una lista, una afirmación por línea, empezando cada línea con "- ".
Máximo 3 afirmaciones, las más importantes.
Reescribe cada una en una frase corta y limpia, sin muletillas ni relleno del habla.
No repitas la misma idea dos veces.
Si la transcripción no contiene ninguna afirmación verificable, responde exactamente: NINGUNA`;

/** Pulls the distinct verifiable claims out of a long stretch of transcribed speech. */
export async function extractClaims(transcript) {
  if (!passesLocalFilter(transcript)) return [];

  try {
    const reply = await chatCompletion(
      [
        { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
        { role: 'user', content: `Transcripción:\n"${transcript}"` },
      ],
      { temperature: 0.2, maxTokens: 300 }
    );

    if (/^\s*NINGUNA/i.test(reply)) return [];

    return reply
      .split('\n')
      .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter((line) => line.length > 10)
      .slice(0, 3);
  } catch {
    return [];
  }
}

/** Generates one short argument (for/against) plus a supporting RV1960 citation. */
export async function argueStance(statement, stance, candidates = [], history = [], framework = null) {
  const block = candidates.length
    ? candidates.map((c) => `- ${c.ref}: "${c.text}"`).join('\n')
    : 'Ninguno encontrado localmente.';
  const stanceLabel = stance === 'favor' ? 'A FAVOR' : 'EN CONTRA';
  const hint = frameworkHint(framework);

  const reply = await chatCompletion(
    [
      { role: 'system', content: STANCE_SYSTEM_PROMPT },
      ...history,
      {
        role: 'user',
        content: [
          `Afirmación: "${statement}"`,
          hint,
          `Dame un argumento ${stanceLabel} de esta afirmación.`,
          `VERSÍCULOS CANDIDATOS (RV1960):\n${block}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ],
    { maxTokens: 250 }
  );

  return { reply };
}

/** Anticipates the opponent's likely comeback and prepares the reply to it. */
export async function predictCounter(statement, candidates = [], history = [], framework = null) {
  const block = candidates.length
    ? candidates.map((c) => `- ${c.ref}: "${c.text}"`).join('\n')
    : 'Ninguno encontrado localmente.';
  const hint = frameworkHint(framework);

  const reply = await chatCompletion(
    [
      { role: 'system', content: COUNTER_SYSTEM_PROMPT },
      ...history,
      {
        role: 'user',
        content: [
          `Afirmación del oponente: "${statement}"`,
          hint,
          `VERSÍCULOS CANDIDATOS (RV1960):\n${block}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ],
    { maxTokens: 300 }
  );

  return { reply };
}

export { FRAMEWORK_LABELS };

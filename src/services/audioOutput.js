// expo-audio exposes no API for the audio OUTPUT route, so headsets are inferred from the
// recording INPUTS: a wired/Bluetooth headset registers its own microphone. Headphones
// without a microphone can't be detected this way, which is why "Siempre" exists as an option.
const EXTERNAL_HINTS = [
  'head',
  'auric',
  'audifon',
  'bluetooth',
  'a2dp',
  'sco',
  'usb',
  'external',
  'externo',
  'wired',
  'earbud',
  'airpod',
];

// Careful: "phone" can't be used here — it also matches inside "microphone", which would
// rule out every genuine headset ("Wired Headset / External Microphone").
const BUILT_IN_HINTS = ['built', 'integrad', 'interno', 'internal', 'speaker', 'altavoz', 'handset'];

/** True when any available recording input looks like a headset rather than the phone itself. */
export function detectHeadsetFrom(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) return false;

  return inputs.some((input) => {
    const label = `${input?.name ?? ''} ${input?.type ?? ''}`.toLowerCase();
    if (!label.trim()) return false;
    if (BUILT_IN_HINTS.some((hint) => label.includes(hint))) return false;
    return EXTERNAL_HINTS.some((hint) => label.includes(hint));
  });
}

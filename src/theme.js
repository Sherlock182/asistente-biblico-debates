// Dark palette with gold accents, matching the app's black/gold branding.
// Dark also keeps the screen discreet when the phone is in hand during a live debate.
export const colors = {
  background: '#0A0C11',
  surface: '#141821',
  surfaceAlt: '#1B2130',
  surfaceHigh: '#232A3B',
  border: '#242B3A',
  borderSubtle: '#1A202C',

  textPrimary: '#F1F4F9',
  textSecondary: '#98A1B3',
  textMuted: '#5F6879',

  gold: '#D9B65C',
  goldBright: '#F0CE77',
  goldSoft: '#2A2416',

  primary: '#4C6FE7',
  primarySoft: '#161C2E',
  primaryText: '#FFFFFF',

  success: '#2BB673',
  successSoft: '#0E2419',
  successBorder: '#1C4733',

  danger: '#E5484D',
  dangerSoft: '#2A1215',
  dangerBorder: '#54222A',

  warning: '#E0A32E',
  warningSoft: '#2A2011',
  warningBorder: '#57411A',

  opponentBg: '#1C1518',
  opponentBorder: '#3A2429',
  opponentText: '#E8C4C6',

  assistantBg: '#10151F',
  assistantBorder: '#222C3E',
  assistantText: '#D5DCE8',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
};

export const type = {
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  bodySm: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
};

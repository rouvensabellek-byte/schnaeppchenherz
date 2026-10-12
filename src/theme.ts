// Mischung aus „Bonbon“ (Grundfarben, Navigation) und „Sorbet“ (Detail-Kacheln)
export const c = {
  bg: '#FFF6FA',
  // leicht durchscheinend, damit die Pastell-Wolken durchschimmern
  card: 'rgba(255,255,255,0.72)',
  ink: '#4A2340',
  inkSoft: '#7A5A70',
  plum: '#4A2340',
  rose: '#FFC8DC',
  roseSoft: '#FFE4EE',
  roseInk: '#A3305F',
  hot: '#D94F86',
  mint: '#E3F6EC',
  mintInk: '#2F6B4F',
  lavender: '#E4DCFF',
  lavenderSoft: '#ECE6FF',
  vanilla: '#FFF0B8',
  vanillaInk: '#6B5414',
  peach: '#FFE0D6',
  peachInk: '#8C3F2A',
  line: '#F3E3EA',
  navIcon: '#FFD9E6',
};

export const shopStyle = {
  eis: { label: 'eis.de', bg: '#FFD9E6', line: '#D94F86' },
  amo: { label: 'Amorelie', bg: '#E4DCFF', line: '#6C5BC7' },
} as const;

export const font = {
  display: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  body: 'Nunito_400Regular',
  semi: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_800ExtraBold',
};

// Hintergrund-Wolken hinter dem Glas
export const blobs = ['#FFC8DC', '#DCD0FF', '#C8F0DC', '#FFE1C2', '#CFE6FF'];

export const euro = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €';

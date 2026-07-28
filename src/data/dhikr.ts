/** Tasbih presets. Targets follow the well-known post-prayer counts. */

export interface DhikrPreset {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  target: number;
}

export const DHIKR_PRESETS: DhikrPreset[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubḥānAllāh',
    translation: 'Glory be to Allah',
    target: 33,
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alḥamdulillāh',
    translation: 'All praise is for Allah',
    target: 33,
  },
  {
    id: 'allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allāhu Akbar',
    translation: 'Allah is the Greatest',
    target: 34,
  },
  {
    id: 'tahlil',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ',
    transliteration: 'Lā ilāha illallāh',
    translation: 'There is no god but Allah',
    target: 100,
  },
  {
    id: 'istighfar',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullāh',
    translation: 'I seek forgiveness from Allah',
    target: 100,
  },
  {
    id: 'salawat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
    transliteration: 'Allāhumma ṣalli ʿalā Muḥammad',
    translation: 'O Allah, send blessings upon Muhammad',
    target: 100,
  },
];

export const DEFAULT_DHIKR_ID = DHIKR_PRESETS[0]!.id;

export function findDhikr(id: string): DhikrPreset {
  return DHIKR_PRESETS.find((d) => d.id === id) ?? DHIKR_PRESETS[0]!;
}

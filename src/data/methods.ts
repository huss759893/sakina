/**
 * Aladhan calculation methods. Different authorities use different solar
 * depression angles for Fajr and Isha, which can move those two prayers by
 * twenty minutes or more — so this has to be user-selectable, not assumed.
 */

export interface CalculationMethod {
  id: number;
  name: string;
  region: string;
}

export const CALCULATION_METHODS: CalculationMethod[] = [
  { id: 3, name: 'Muslim World League', region: 'Europe, Far East' },
  { id: 2, name: 'Islamic Society of North America', region: 'North America' },
  { id: 5, name: 'Egyptian General Authority', region: 'Africa, Syria, Iraq' },
  { id: 4, name: 'Umm al-Qura, Makkah', region: 'Arabian Peninsula' },
  { id: 1, name: 'University of Islamic Sciences, Karachi', region: 'Pakistan, India, Bangladesh' },
  { id: 7, name: 'Institute of Geophysics, Tehran', region: 'Iran' },
  { id: 0, name: 'Shia Ithna-Ashari', region: 'Ja‘fari' },
  { id: 8, name: 'Gulf Region', region: 'Gulf states' },
  { id: 9, name: 'Kuwait', region: 'Kuwait' },
  { id: 10, name: 'Qatar', region: 'Qatar' },
  { id: 11, name: 'Majlis Ugama Islam Singapura', region: 'Singapore' },
  { id: 12, name: 'Union des Organisations Islamiques de France', region: 'France' },
  { id: 13, name: 'Diyanet İşleri Başkanlığı', region: 'Turkey' },
  { id: 14, name: 'Spiritual Administration of Muslims of Russia', region: 'Russia' },
  { id: 15, name: 'Moonsighting Committee Worldwide', region: 'Worldwide' },
  { id: 16, name: 'Dubai', region: 'UAE' },
];

export const DEFAULT_METHOD_ID = 3;

export function findMethod(id: number): CalculationMethod {
  return (
    CALCULATION_METHODS.find((m) => m.id === id) ?? CALCULATION_METHODS[0]!
  );
}

/** Asr shadow-length rule. */
export type MadhabSchool = 0 | 1;

export const SCHOOLS: { id: MadhabSchool; name: string; detail: string }[] = [
  { id: 0, name: 'Standard', detail: 'Shāfiʿī, Mālikī, Ḥanbalī — shadow ×1' },
  { id: 1, name: 'Ḥanafī', detail: 'Shadow ×2 — later Asr' },
];

/** Recitations available on the AlQuran Cloud CDN, all freely distributed. */
export interface Reciter {
  id: string;
  name: string;
  style: string;
}

export const RECITERS: Reciter[] = [
  { id: 'ar.alafasy', name: 'Mishary Alafasy', style: 'Murattal' },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit', style: 'Murattal' },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', style: 'Murattal' },
  { id: 'ar.minshawi', name: 'Mohamed Siddiq Al-Minshawi', style: 'Murattal' },
  { id: 'ar.saoodshuraym', name: 'Saood Ash-Shuraym', style: 'Murattal' },
];

export const DEFAULT_RECITER = 'ar.alafasy';

/**
 * English editions — public domain only.
 *
 * Deliberately excluded, despite the API offering them:
 *   · Saheeh International — in copyright, Abul Qasim Publishing House.
 *   · Arberry — A. J. Arberry died 1969, so in copyright until 2040 in
 *     life+70 jurisdictions.
 *   · Hilali-Khan, Maududi, and most other modern renderings.
 *
 * An API making an edition *reachable* is not a licence to redistribute it in
 * a store-published app. Both editions below are safely out of copyright:
 * Pickthall died 1936 and Yusuf Ali in 1953.
 */
export interface Translation {
  id: string;
  name: string;
  note: string;
}

export const TRANSLATIONS: Translation[] = [
  { id: 'en.pickthall', name: 'Pickthall', note: 'Public domain · 1930' },
  { id: 'en.yusufali', name: 'Yusuf Ali', note: 'Public domain · 1934' },
];

export const DEFAULT_TRANSLATION = 'en.pickthall';

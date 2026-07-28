/**
 * Daily supplications. The Arabic texts are classical (Qur'anic verses and
 * supplications recorded in the canonical hadith collections) and long out of
 * any copyright; the English renderings here are written for this app.
 */

export interface Dua {
  id: string;
  title: string;
  occasion: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
}

export const DUAS: Dua[] = [
  {
    id: 'good-both-worlds',
    title: 'Good in Both Worlds',
    occasion: 'Anytime',
    arabic:
      'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration:
      'Rabbanā ātinā fid-dunyā ḥasanatan wa fil-ākhirati ḥasanatan wa qinā ʿadhāban-nār',
    translation:
      'Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
    reference: "Qur'an 2:201",
  },
  {
    id: 'increase-knowledge',
    title: 'Increase Me in Knowledge',
    occasion: 'Before study',
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: 'Rabbi zidnī ʿilmā',
    translation: 'My Lord, increase me in knowledge.',
    reference: "Qur'an 20:114",
  },
  {
    id: 'morning',
    title: 'Upon Waking',
    occasion: 'Morning',
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration:
      'Al-ḥamdu lillāhil-ladhī aḥyānā baʿda mā amātanā wa ilayhin-nushūr',
    translation:
      'All praise is for Allah, who gave us life after having caused us to die, and to Him is the return.',
    reference: 'Ṣaḥīḥ al-Bukhārī 6312',
  },
  {
    id: 'sleep',
    title: 'Before Sleeping',
    occasion: 'Night',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allāhumma amūtu wa aḥyā',
    translation: 'In Your name, O Allah, I die and I live.',
    reference: 'Ṣaḥīḥ al-Bukhārī 6324',
  },
  {
    id: 'before-eating',
    title: 'Before Eating',
    occasion: 'Meals',
    arabic:
      'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ',
    transliteration:
      'Allāhumma bārik lanā fīmā razaqtanā wa qinā ʿadhāban-nār',
    translation:
      'O Allah, bless for us what You have provided us, and protect us from the punishment of the Fire.',
    reference: 'Sunan Ibn Mājah 3265',
  },
  {
    id: 'after-eating',
    title: 'After Eating',
    occasion: 'Meals',
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
    transliteration:
      'Al-ḥamdu lillāhil-ladhī aṭʿamanā wa saqānā wa jaʿalanā muslimīn',
    translation:
      'All praise is for Allah, who fed us and gave us drink, and made us Muslims.',
    reference: 'Sunan Abī Dāwūd 3850',
  },
  {
    id: 'travel',
    title: 'When Travelling',
    occasion: 'Travel',
    arabic:
      'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    transliteration:
      'Subḥānal-ladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn, wa innā ilā rabbinā la-munqalibūn',
    translation:
      'Glory to Him who has subjected this to us, and we could never have accomplished it ourselves. And indeed, to our Lord we will surely return.',
    reference: "Qur'an 43:13-14",
  },
  {
    id: 'distress',
    title: 'In Times of Distress',
    occasion: 'Hardship',
    arabic:
      'لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
    transliteration:
      'Lā ilāha illallāhul-ʿAẓīmul-Ḥalīm, lā ilāha illallāhu Rabbul-ʿArshil-ʿAẓīm, lā ilāha illallāhu Rabbus-samāwāti wa Rabbul-arḍi wa Rabbul-ʿArshil-Karīm',
    translation:
      'There is no god but Allah, the Magnificent, the Forbearing. There is no god but Allah, Lord of the Mighty Throne. There is no god but Allah, Lord of the heavens, Lord of the earth, and Lord of the Noble Throne.',
    reference: 'Ṣaḥīḥ al-Bukhārī 6346',
  },
  {
    id: 'entering-mosque',
    title: 'Entering the Mosque',
    occasion: 'Mosque',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allāhummaftaḥ lī abwāba raḥmatik',
    translation: 'O Allah, open for me the gates of Your mercy.',
    reference: 'Ṣaḥīḥ Muslim 713',
  },
  {
    id: 'forgiveness',
    title: 'Seeking Forgiveness',
    occasion: 'Anytime',
    arabic:
      'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    transliteration:
      'Rabbighfir lī wa tub ʿalayya innaka Antat-Tawwābur-Raḥīm',
    translation:
      'My Lord, forgive me and accept my repentance. Indeed, You are the Ever-Relenting, the Most Merciful.',
    reference: 'Sunan Abī Dāwūd 1516',
  },
];

export const DUA_OCCASIONS: string[] = Array.from(
  new Set(DUAS.map((d) => d.occasion))
);

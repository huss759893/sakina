/**
 * Zakat al-mal. Pure functions, no network — metal prices are entered by the
 * user because every live spot-price API worth trusting is paywalled, and a
 * stale hardcoded price would be worse than an honest input field.
 */

export const ZAKAT_RATE = 0.025;

/** Classical nisab thresholds, in grams of the metal. */
export const NISAB_GOLD_GRAMS = 87.48;
export const NISAB_SILVER_GRAMS = 612.36;

export type NisabStandard = 'gold' | 'silver';

export interface ZakatInput {
  /** Liquid holdings. */
  cash: number;
  bank: number;
  /** Loans owed to the user that are expected to be repaid. */
  receivables: number;
  /** Precious metals, by weight. */
  goldGrams: number;
  goldPricePerGram: number;
  silverGrams: number;
  silverPricePerGram: number;
  /** Trade goods held for resale, valued at market. */
  businessAssets: number;
  /** Shares, funds, crypto — valued at market on the due date. */
  investments: number;
  /** Debts and bills due, deducted from the zakatable base. */
  liabilities: number;
}

export interface ZakatResult {
  goldValue: number;
  silverValue: number;
  totalAssets: number;
  liabilities: number;
  netWorth: number;
  nisabGrams: number;
  nisabValue: number;
  isEligible: boolean;
  zakatDue: number;
  /** How far below nisab, when not eligible. */
  shortfall: number;
}

export const EMPTY_ZAKAT_INPUT: ZakatInput = {
  cash: 0,
  bank: 0,
  receivables: 0,
  goldGrams: 0,
  goldPricePerGram: 0,
  silverGrams: 0,
  silverPricePerGram: 0,
  businessAssets: 0,
  investments: 0,
  liabilities: 0,
};

const safe = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

export function calculateZakat(
  input: ZakatInput,
  standard: NisabStandard
): ZakatResult {
  const goldValue = safe(input.goldGrams) * safe(input.goldPricePerGram);
  const silverValue = safe(input.silverGrams) * safe(input.silverPricePerGram);

  const totalAssets =
    safe(input.cash) +
    safe(input.bank) +
    safe(input.receivables) +
    goldValue +
    silverValue +
    safe(input.businessAssets) +
    safe(input.investments);

  const liabilities = safe(input.liabilities);
  const netWorth = totalAssets - liabilities;

  const nisabGrams =
    standard === 'gold' ? NISAB_GOLD_GRAMS : NISAB_SILVER_GRAMS;
  const pricePerGram =
    standard === 'gold'
      ? safe(input.goldPricePerGram)
      : safe(input.silverPricePerGram);
  const nisabValue = nisabGrams * pricePerGram;

  // With no price entered we cannot know the threshold, so we must not claim
  // eligibility either way.
  const canEvaluate = nisabValue > 0;
  const isEligible = canEvaluate && netWorth >= nisabValue;

  return {
    goldValue,
    silverValue,
    totalAssets,
    liabilities,
    netWorth,
    nisabGrams,
    nisabValue,
    isEligible,
    zakatDue: isEligible ? netWorth * ZAKAT_RATE : 0,
    shortfall: canEvaluate && !isEligible ? Math.max(nisabValue - netWorth, 0) : 0,
  };
}

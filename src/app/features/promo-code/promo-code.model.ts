/** Promo Code domain models (CF_MASTER_PROMOCODE). */

/** A Promo Code row. */
export interface PromoCode {
  id: number;
  promoCode: string | null;
  validFrom: string | null;
  validTo: string | null;
  amount: number | null;
  type: string | null; // Buy / Sell
}

/** Add/update payload (id = 0 → add). */
export interface SavePromoCode {
  id: number;
  promoCode: string;
  type: string | null;
  validFrom: string | null;
  validTo: string | null;
  amount: number | null;
}

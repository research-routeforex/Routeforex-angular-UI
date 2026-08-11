/**
 * Transaction-type-driven field visibility for the order forms — the single
 * source of truth shared by FTP Order Entry (+ Client Order / Trial Transaction)
 * and the Dealer Pad, so the same transaction type shows/hides the same controls
 * on every screen. Keyed off the TFTPO_Mast_TransType id (1..9) + the Window/Fix
 * selection.
 *
 *   1 Cash · 2 TOM · 3 SPOT · 4 Forward · 5 Forward Cancellation ·
 *   6 EEFC Conversion · 7 Bill Discount · 8 Utilization · 9 PCFC Disbursement
 */

/** Types that consume a parent Forward (open the deal picker): Cancellation / Utilization. */
export const TXN_FORWARD_CANCELLATION = 5;
export const TXN_UTILIZATION = 8;
/** EEFC Conversion (6), Bill Discount (7), PCFC Disbursement (9) — show Transaction Detail + Currency 2. */
export const TXN_CONVERSION_TYPES: readonly number[] = [6, 7, 9];
export const TXN_EEFC_CONVERSION = 6;
/** Bill Discount — its date behaviour follows the picked Transaction Detail, not the type. */
export const TXN_BILL_DISCOUNT = 7;
/** Maturity-only types (holiday-checked, no Window/Fix): Cash, TOM, SPOT, EEFC, PCFC. */
export const TXN_MATURITY_TYPES: readonly number[] = [1, 2, 3, 6, 9];
/** Window/Fix forward-date type: Forward (4). Bill Discount (7) is resolved via its detail. */
export const TXN_FORWARD_TYPES: readonly number[] = [4];

/**
 * Bill Discount's Transaction Detail is a subset of the transaction types
 * (Cash / TOM / SPOT / Forward). Map the picked detail to the equivalent type id
 * so its Window-Fix / date rules mirror that sub-type exactly.
 */
const BILL_DISCOUNT_DETAIL_TYPE: Readonly<Record<string, number>> = {
  cash: 1,
  tom: 2,
  spot: 3,
  forward: 4,
};

function billDiscountEffectiveTypeId(detail: string | null | undefined): number | null {
  return BILL_DISCOUNT_DETAIL_TYPE[(detail ?? '').trim().toLowerCase()] ?? null;
}

export interface OrderFieldVisibility {
  /** Forward Cancellation (5). */
  isForwardCancellation: boolean;
  /** Utilization (8). */
  isUtilization: boolean;
  /** 5 or 8 — links to a parent Forward via the picker. */
  consumesForward: boolean;
  /** 6/7/9 — show Transaction Detail + Currency 2. */
  showConversionFields: boolean;
  /** 1/2/3/6/9 — Maturity is the only date field. */
  isMaturityType: boolean;
  /** 4/7 — Window/Fix drives the date fields. */
  isForwardDated: boolean;
  showWindowFix: boolean;
  showFromTo: boolean;
  showMaturity: boolean;
  showBookingRate: boolean;
  /** Forward Cancellation only. */
  showForwardContact: boolean;
  /** Forward Cancellation only. */
  showOutstanding: boolean;
}

/**
 * Resolve which order fields are visible for a transaction type. Mirrors the
 * legacy FTP Order Entry rules exactly.
 */
export function orderFieldVisibility(
  txnId: number | null | undefined,
  windowFix: string | null | undefined,
  transactionDetail?: string | null | undefined,
): OrderFieldVisibility {
  const id = txnId ?? null;
  const isForwardCancellation = id === TXN_FORWARD_CANCELLATION;
  const isUtilization = id === TXN_UTILIZATION;
  const consumesForward = isForwardCancellation || isUtilization;
  const showConversionFields = id != null && TXN_CONVERSION_TYPES.includes(id);

  // Bill Discount (7): its date / Window-Fix rules follow the chosen Transaction
  // Detail (Cash / TOM / SPOT / Forward), not the type itself. Everything else
  // keys off the transaction type directly.
  const isBillDiscount = id === TXN_BILL_DISCOUNT;
  const effectiveId = isBillDiscount ? billDiscountEffectiveTypeId(transactionDetail) : id;

  const isMaturityType = effectiveId != null && TXN_MATURITY_TYPES.includes(effectiveId);
  const isForwardDated = effectiveId != null && TXN_FORWARD_TYPES.includes(effectiveId);

  // Bill Discount has no date context until a valid detail is picked; every other
  // type has one as soon as it's selected.
  const hasDateContext = isBillDiscount ? effectiveId != null : id != null;
  const usesForwardDates = isForwardDated || consumesForward;
  const isWindow = (windowFix ?? '') === 'Window';

  return {
    isForwardCancellation,
    isUtilization,
    consumesForward,
    showConversionFields,
    isMaturityType,
    isForwardDated,
    showWindowFix: usesForwardDates,
    showFromTo: usesForwardDates && isWindow,
    showMaturity: hasDateContext && !(usesForwardDates && isWindow),
    showBookingRate: hasDateContext && !isMaturityType && (consumesForward || !isForwardDated),
    showForwardContact: isForwardCancellation,
    showOutstanding: isForwardCancellation,
  };
}

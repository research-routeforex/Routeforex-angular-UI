/** Order Tracking domain models (CF_TXN_LEAD_TRACK). */

/** An order/lead option / list row (orderId = CF_TXN_LEAD_HEADER.LeadNo). */
export interface TrackingOrder {
  orderId: number;
  orderNumber: string | null;
  clientName: string | null;
  currencyCode: string | null;
  quantity: number | null;
}

/** One saved timeline step returned by the API. */
export interface TrackingStep {
  sno: number;
  orderStatus: string | null;
  orderDate: string | null;
  isActive: boolean;
  currentStatus: string | null;
  deliveryBoyID: number | null;
}

/** Save payload — replaces the whole timeline for one order. */
export interface SaveOrderTracking {
  orderId: number;
  currentStatus: string | null;
  deliveryBoyID: number | null;
  steps: SaveTrackingStep[];
}

/** One outgoing timeline step. */
export interface SaveTrackingStep {
  sno: number;
  orderStatus: string | null;
  orderDate: string | null;
  isActive: boolean;
}

/** Other Services master domain models (TPO_Mast_OtherServices). */

/** An Other Services row (joined to client + service). */
export interface OtherService {
  otherServiceId: number;
  productId: number;
  productName?: string | null; // ServiceName — the grid "Product" column
  clientId: number;
  clientName?: string | null;
  amount?: number | null;
  transactionDate?: string | null;
  createdDatetime?: string | null;
}

/** Add/update payload (otherServiceId = 0 → add). */
export interface SaveOtherService {
  otherServiceId: number;
  productId: number;
  clientId: number;
  amount: number | null;
  transactionDate: string | null;
}

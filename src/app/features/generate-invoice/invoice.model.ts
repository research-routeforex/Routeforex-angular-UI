/** One invoice line (order + matched contract charge) from the API. */
export interface InvoiceLine {
  recordId: number;
  orderNumber: string | null;
  transactionTypeID: number | null;
  transactionType: string | null;
  impExp: string | null;
  currencyCode: string | null;
  amount: number | null;
  createdDatetime: string | null;
  maturityDate: string | null;
  clientName: string | null;
  clientContractID: number | null;
  chargesType: string | null;
  chargesDetail: string | null;
  chargesValue: number | null;
  charge: number;
}

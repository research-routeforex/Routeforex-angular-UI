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

/** Payload to persist a generated invoice (base charges + billed order ids). Tax is computed server-side. */
export interface SaveInvoice {
  clientId: number;
  invoiceNumber: string;
  invoiceDate: string; // yyyy-MM-dd
  gstNumber: string;
  charges: number;
  orderIds: number[];
}

/** Header of a saved invoice, rebuilt for re-print. */
export interface InvoiceDocumentHeader {
  invoiceHdrId: number;
  invoiceNumber: string | null;
  invoiceGeneratedDate: string | null;
  clientId: number;
  clientName: string | null;
  clientAddress: string | null;
  clientStateName: string | null;
  clientStateCode: string | null;
  clientGstin: string | null;
  gstNumber: string | null;
  charges: number;
  sgst: number;
  cgst: number;
  igst: number;
  sgstPer: number;
  cgstPer: number;
  igstPer: number;
  totalAmount: number;
  taxType: string | null;
  periodFrom: string | null;
  periodTo: string | null;
}

/** Invoicing company details shown in the "From" block. */
export interface InvoiceCompany {
  address: string | null;
  contact1: string | null;
  cin: string | null;
}

/** A saved invoice reconstructed for re-print: header + billed lines + company. */
export interface InvoiceDocument {
  header: InvoiceDocumentHeader;
  lines: InvoiceLine[];
  company: InvoiceCompany | null;
}

/** A previously generated invoice row for the history grid. */
export interface GeneratedInvoice {
  invoiceHdrId: number;
  invoiceNumber: string | null;
  invoiceGeneratedDate: string | null;
  clientId: number;
  clientName: string | null;
  charges: number;
  sgst: number;
  cgst: number;
  igst: number;
  totalAmount: number;
  gstNumber: string | null;
  status: string | null;
  paymentStatus: boolean;
}

/** Bank + contact details printed in the invoice footer. */
export interface InvoiceFooter {
  bankName: string | null;
  accountNo: string | null;
  ifscCode: string | null;
  address: string | null;
  contactUsEmail: string | null;
  contactUsMobile: string | null;
}

/** Server-computed tax breakdown returned after saving an invoice. */
export interface SaveInvoiceResult {
  invoiceHdrId: number;
  charges: number;
  sgst: number;
  cgst: number;
  igst: number;
  sgstPer: number;
  cgstPer: number;
  igstPer: number;
  totalAmount: number;
  taxType: string | null; // 'IGST' | 'CGST_SGST'
}

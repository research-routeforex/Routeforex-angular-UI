/** LMS — Client Master models (TPO_LMS_ClientMaster + contact persons). */

/** One contact person row (add/remove). */
export interface LmsContact {
  contactName: string | null;
  email: string | null;
  contactNumber: string | null;
  designation: string | null;
}

/** An LMS client row (with joined City name + contact persons). */
export interface LmsClient {
  clientID: number;
  clientName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  regionCode: number | null;
  country: number | null;
  city: number | null;
  cityName: string | null;
  pin: string | null;
  exportFigure: number | null;
  importFigure: number | null;
  totalFigure: number | null;
  status: string | null;
  contacts: LmsContact[];
}

/** Add/update payload (clientID = 0 → add). */
export interface SaveLmsClient {
  clientID: number;
  clientName: string;
  regionCode: number | null;
  country: number | null;
  city: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  pin: string | null;
  exportFigure: number | null;
  importFigure: number | null;
  totalFigure: number | null;
  contacts: LmsContact[];
  status: string | null;
}

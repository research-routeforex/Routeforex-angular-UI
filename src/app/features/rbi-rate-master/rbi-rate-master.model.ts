/** A RBI Rate row (TPO_Mast_RBIRate). */
export interface RbiRate {
  recordID: number;
  date: string;
  currency: string;
  rbiRate: number;
  customRate: number;
  createdBy: string | null;
  createdDateTime: string | null;
  updatedBy: string | null;
  updatedDateTime: string | null;
}

/** Add/update payload (recordID = 0 → add). */
export interface SaveRbiRate {
  recordID: number;
  date: string;
  currency: string;
  rbiRate: number;
  customRate: number;
}

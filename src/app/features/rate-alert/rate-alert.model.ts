/** Rate Alert domain models (TFTPO_Txn_RateAlert). */

/** A Rate Alert row (joined to the validity master). */
export interface RateAlert {
  recordID: number;
  currency: string | null;
  alertMeWhen: string | null;
  rate: number | null;
  validityOfAlert: number | null;
  validityOfAlertName: string | null;
  alertMeOn: string | null; // Email / Phone / Both
  status: string | null;
  createdDatetime: string | null;
}

/** Add/update payload (recordID = 0 → add). */
export interface SaveRateAlert {
  recordID: number;
  currency: string;
  alertMeWhen: string | null;
  rate: number | null;
  validityOfAlert: number | null;
  alertMeOn: string | null;
  status: string | null;
}

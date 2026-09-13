/** Lead Master domain models (TPO_Mast_Lead). */

/** A Lead row. */
export interface Lead {
  recordID: number;
  name: string | null;
  emailId: string | null;
  phoneNo: string | null;
  companyName: string | null;
  message: string | null;
  pageName: string | null; // "Request From"
  type: string | null;
  createdDate: string | null; // "Request On"
  status: string | null; // Pending / Done
  remarks: string | null;
}

/** Edit payload — only Status + Remarks are updatable. */
export interface UpdateLead {
  recordID: number;
  status: string | null;
  remarks: string | null;
}

/** A Research Report Permission grant (TPO_Mast_ResearchReportPermission). */
export interface ResearchPermissionRow {
  id: number;
  clientID: number;
  clientName: string | null;
  researchType: string | null; // code, 'P' = Premium
  researchTypeText: string | null;
  validityFrom: string | null;
  validityTo: string | null;
  createdBy: string | null;
  createdDateTime: string | null;
  updatedBy: string | null;
  updatedDateTime: string | null;
}

/** Add/update payload (id = 0 → add). */
export interface SaveResearchPermission {
  id: number;
  clientID: number;
  researchType: string;
  validityFrom: string;
  validityTo: string;
}

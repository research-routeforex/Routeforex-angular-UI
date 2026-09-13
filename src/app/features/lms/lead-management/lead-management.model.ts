/** LMS — Lead Management models (TPO_LMS_LeadManagement). */

/** A lead row (with joined client name). */
export interface LmsLead {
  id: number;
  clientID: number | null;
  clientName: string | null;
  levelofMeeting: string | null;
  agenda: string | null;
  attendedBy: string | null;
  attendedWith: string | null;
  auditDone: string | null;
  auditOutcome: string | null;
  category: string | null;
  leadSource: string | null;
  callReport: string | null;
  nextLevelofMeeting: string | null;
  nlmDate: string | null;
}

/** Add/update payload (id = 0 → add). */
export interface SaveLmsLead {
  id: number;
  clientID: number | null;
  levelofMeeting: string | null;
  agenda: string | null;
  attendedBy: string | null;
  attendedWith: string | null;
  auditDone: string | null;
  auditOutcome: string | null;
  category: string | null;
  leadSource: string | null;
  callReport: string | null;
  nextLevelofMeeting: string | null;
  nlmDate: string | null;
}

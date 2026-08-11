/** A Broadcast Group row (TPO_Txn_BroadcastGroup). ClientIDs is a CSV of client ids. */
export interface BroadcastGroup {
  recordID: number;
  groupName: string;
  clientIDs: string;
  activeStatus: string | null;
  createdBy: string | null;
  createdDateTime: string | null;
  updatedBy: string | null;
  updatedDateTime: string | null;
}

/** Add/update payload (recordID = 0 → add). clientIDs is comma-separated. */
export interface SaveBroadcastGroup {
  recordID: number;
  groupName: string;
  clientIDs: string;
  activeStatus: string;
}

/** Broadcast message type (maps to the SourceName column). */
export type BroadcastType = 'Normal' | 'TradingCalls' | 'SiteNews';

/** A sent broadcast row (TFTPO_Mast_BroadCast_Message). */
export interface BroadcastMessage {
  id: number;
  sourceName: string | null;
  /** '1' when clientIDs are broadcast-group ids, '0' when they are client ids. */
  isGroup: string | null;
  clientIDs: string | null;
  subject: string | null;
  siteName: string | null;
  toEmail: string | null;
  status: string | null;
  /** Derived send state from the mail queue: 'SENT' or 'PENDING'. */
  msgStatus: string | null;
  buySell: string | null;
  currency: string | null;
  expiry: string | null;
  entryPrice: number | null;
  targetPrice: number | null;
  stopClose: number | null;
  exitRate: number | null;
  exitType: string | null;
  fileHeader: string | null;
  fileFooter: string | null;
  requestedDate: string | null;
  createdBy: string | null;
}

/** Send payload. Only the fields relevant to the chosen type need be filled. */
export interface SaveBroadcastMessage {
  sourceName: BroadcastType;
  /** '1' = group-wise, '0' = client-wise. */
  isGroup: string;
  clientIDs: string;
  subject: string | null;
  /** Notification description body (-> mail queue MailBody). */
  text: string | null;
  siteName: string | null;
  buySell: string | null;
  currency: string | null;
  expiry: string | null;
  entryPrice: number | null;
  targetPrice: number | null;
  stopClose: number | null;
  fileHeader: string | null;
  fileFooter: string | null;
}

/** Close / update a trading call (recordId = the broadcast row id). */
export interface UpdateBroadcastMessage {
  recordId: number;
  status: string | null;
  exitType: string | null;
  exitRate: number | null;
  subject: string | null;
}

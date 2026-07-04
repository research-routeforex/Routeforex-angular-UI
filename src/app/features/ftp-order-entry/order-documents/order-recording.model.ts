/** Upload type for an order document. */
export type RecordingType = 'Voice' | 'Screenshot';

/** One stored order file as returned by the API. */
export interface OrderRecording {
  recordId: number;
  documentType: string;
  clientId: number;
  orderNumber: string;
  /** Relative path of the stored file (used as the playback/delete key). */
  fileName: string;
  createdDate: string;
}

/** Upload payload (base64 / data-URL file + order metadata). */
export interface UploadOrderRecording {
  recordId: number;
  documentType: RecordingType;
  clientId: number;
  orderNumber: string;
  fileName: string;
  fileBase64: string;
}

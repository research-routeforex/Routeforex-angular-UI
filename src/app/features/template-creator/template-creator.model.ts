/** A Template row (Template_Details). activeStatus: 1 = Active, 0 = Inactive. */
export interface Template {
  templateId: number;
  displayName: string | null;
  fileName: string;
  filePath: string;
  activeStatus: number;
  researchType: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
}

/** A template plus its HTML body (read back from the .txt file) for the editor. */
export interface TemplateDetail extends Template {
  content: string;
}

/** Save payload (templateId = 0 → add). content is the HTML body. */
export interface SaveTemplate {
  templateId: number;
  displayName: string | null;
  content: string;
  activeStatus: number;
  researchType: string | null;
}

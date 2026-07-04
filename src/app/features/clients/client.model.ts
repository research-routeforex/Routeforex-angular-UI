/** Client Master domain models — mirror the backend DTOs (tpo_mast_client). */

export interface LookupItem {
  id: number;
  name: string;
}

export interface ClientLookups {
  clientGroups: LookupItem[];
  subscribedServices: LookupItem[];
  regions: LookupItem[];
  countries: LookupItem[];
  cities: LookupItem[];
  clientZones: LookupItem[];
  statuses: LookupItem[];
}

/** Per-column filters sent to the server for full-dataset search. */
export interface ClientListFilter {
  clientName?: string;
  group?: string;
  location?: string;
  status?: string;
  onBoardDate?: string;
}

export interface ClientListItem {
  clientId: number;
  clientName: string;
  clientGroupName?: string | null;
  statusName?: string | null;
  locationName?: string | null;
  onBoardDate?: string | null;
  isActive: boolean;
}

export interface ClientContact {
  contactId?: number;
  contactName?: string | null;
  email?: string | null;
  contactNumber?: string | null;
}

/** Dropdown fields are stored as text (the chosen option name). */
export interface ClientDetail {
  clientId: number;
  clientCode?: string | null;
  clientName: string;
  clientGroup?: string | null;
  locationName?: string | null;
  region?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  clientZone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  pincode?: string | null;
  industry?: string | null;
  pan?: string | null;
  gsStateCode?: string | null;
  gstn?: string | null;
  website?: string | null;
  exportFigure?: number | null;
  importFigure?: number | null;
  onBoardDate?: string | null;
  status?: string | null;
  isActive: boolean;
  slaFileName?: string | null;
  authLetterFileName?: string | null;
  hasSla: boolean;
  hasAuthLetter: boolean;
  contacts: ClientContact[];
}

export interface SaveClientContact {
  contactName?: string | null;
  email?: string | null;
  contactNumber?: string | null;
}

export interface SaveClientRequest {
  clientId: number;
  clientCode?: string | null;
  clientName: string;
  clientGroup?: string | null;
  locationName?: string | null;
  region?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  clientZone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  pincode?: string | null;
  industry?: string | null;
  pan?: string | null;
  gsStateCode?: string | null;
  gstn?: string | null;
  website?: string | null;
  exportFigure?: number | null;
  importFigure?: number | null;
  onBoardDate?: string | null;
  status?: string | null;
  slaFileName?: string | null;
  slaFileBase64?: string | null;
  authLetterFileName?: string | null;
  authLetterFileBase64?: string | null;
  contacts: SaveClientContact[];
}

export interface SaveClientResult {
  success: boolean;
  message: string;
  clientId: number;
}

// ----- Client Bank (TPO_Mast_ClientBank) ------------------------------------
export interface ClientBank {
  clientBankId: number;
  clientId: number;
  bankId?: number | null;
  bankName?: string | null;
  accountNo?: string | null;
  ifscCode?: string | null;
  swiftCode?: string | null;
  bankBranch?: string | null;
  branchCode?: string | null;
  bankMargin?: number | null;
  address1?: string | null;
  address2?: string | null;
  region?: string | null;
  city?: string | null;
  state?: string | null;
  pin?: number | null;
  country?: string | null;
  rmName?: string | null;
  rmContactNo?: string | null;
  rmEmail?: string | null;
  activeStatus?: string | null;
  isActive: boolean;
}

export interface SaveBankRequest {
  clientBankId: number;
  bankId?: number | null;
  accountNo?: string | null;
  ifscCode?: string | null;
  swiftCode?: string | null;
  bankBranch?: string | null;
  branchCode?: string | null;
  bankMargin?: number | null;
  address1?: string | null;
  address2?: string | null;
  region?: string | null;
  city?: string | null;
  state?: string | null;
  pin?: number | null;
  country?: string | null;
  rmName?: string | null;
  rmContactNo?: string | null;
  rmEmail?: string | null;
}

// ----- Client Contract (tpo_mast_clientContract) ----------------------------
export interface ContractLookups {
  services: LookupItem[];
  chargesTypes: LookupItem[];
  chargesDetails: LookupItem[];
  statuses: LookupItem[];
}

export interface ClientContract {
  contractId: number;
  clientId: number;
  serviceID?: number | null;
  serviceName?: string | null;
  chargesType?: string | null; // ChargesTypeID stored as text
  chargesTypeName?: string | null;
  chargesDetail?: string | null; // CSV of transaction ids
  chargesValue?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  status?: string | null;
}

export interface SaveContractRequest {
  contractId: number;
  serviceID?: number | null;
  chargesType?: string | null;
  chargesDetail?: string | null; // CSV of transaction ids
  chargesValue?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  status?: string | null;
}

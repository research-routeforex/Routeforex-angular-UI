/** A Company row (TPO_Mast_CompanyMaster). */
export interface Company {
  companyId: number;
  companyName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  gsStateCode: string | null;
  pin: number | null;
  contact1: string | null;
  contact2: string | null;
  emailId: string | null;
  website: string | null;
  gstn: string | null;
  pan: string | null;
  cin: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactNumber: string | null;
  activeStatus: string | null;
  // Resolved display names (from GetAll/GetById joins); the id is in city/state/country.
  cityName: string | null;
  stateName: string | null;
  countryName: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
}

/** Add/update payload (companyId = 0 → add). */
export interface SaveCompany {
  companyId: number;
  companyName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  gsStateCode: string | null;
  pin: number | null;
  contact1: string | null;
  contact2: string | null;
  emailId: string | null;
  website: string | null;
  gstn: string | null;
  pan: string | null;
  cin: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactNumber: string | null;
  activeStatus: string;
}

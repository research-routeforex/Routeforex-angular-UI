/** A contact person for a head office (TPO_Mast_HeadOfficeContactPerson). */
export interface HeadOfficeContact {
  id: number;
  headOfficeId: number;
  contactName: string;
  contactNumber: string | null;
}

/**
 * A Head Office row (TPO_Mast_HeadOffice). headOfficeName holds the selected BANK NAME;
 * regionCode / countryCode / cityCode hold the numeric ids (CountryRegionID / CountryID /
 * CityID) as strings. The *Name fields are resolved server-side for display; `contacts`
 * is populated only by getHeadOffice().
 */
export interface HeadOffice {
  recordID: number;
  headOfficeName: string;
  regionCode: string | null;
  regionName: string | null;
  countryCode: string | null;
  countryName: string | null;
  cityCode: string | null;
  cityName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  pin: number | null;
  landLineNo: string | null;
  activeStatus: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
  contacts: HeadOfficeContact[];
}

/** A contact person in a save payload (id = 0 → new). */
export interface SaveHeadOfficeContact {
  id: number;
  contactName: string;
  contactNumber: string | null;
}

/** Add/update payload for a head office + its contacts (recordID = 0 → add). */
export interface SaveHeadOffice {
  recordID: number;
  headOfficeName: string;
  regionCode: string | null;
  countryCode: string | null;
  cityCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  pin: number | null;
  landLineNo: string | null;
  activeStatus: string;
  contacts: SaveHeadOfficeContact[];
}

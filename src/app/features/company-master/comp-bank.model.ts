/**
 * A Company Bank row (TPO_Mast_CompBank). bankId holds the bank id; city / state /
 * countryId hold the numeric location ids (CityID / StateId / CountryID) as strings.
 * The *Name fields (incl. bankName) are resolved server-side for display.
 */
export interface CompBank {
  compBankId: number;
  bankId: number | null;
  bankName: string | null;
  accountNo: string | null;
  ifscCode: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  cityName: string | null;
  state: string | null;
  stateName: string | null;
  pin: number | null;
  countryId: string | null;
  countryName: string | null;
  swiftCode: string | null;
  activeStatus: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
}

/** Add/update payload (compBankId = 0 → add). */
export interface SaveCompBank {
  compBankId: number;
  bankId: number | null;
  accountNo: string | null;
  ifscCode: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  pin: number | null;
  countryId: string | null;
  swiftCode: string | null;
  activeStatus: string;
}

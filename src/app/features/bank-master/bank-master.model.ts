/** An RM (Relationship Manager) contact for a bank (TPO_Mast_RMContactDetail). */
export interface BankContact {
  rmContactDetailID: number;
  bankId: number;
  rmName: string;
  rmContactNo: string | null;
  rmEmail: string | null;
  rmLandLine: string | null;
}

/**
 * A Bank row (TPO_Mast_Bank). regionId / countryCode / cityCode hold the numeric
 * identifiers (CountryRegionID / CountryID / CityID) as strings; the *Name fields
 * are resolved server-side for display. `contacts` is populated only by getBank().
 */
export interface Bank {
  bankID: number;
  bankName: string;
  bankCategory: string | null;
  regionId: string | null;
  regionName: string | null;
  countryCode: string | null;
  countryName: string | null;
  cityCode: string | null;
  cityName: string | null;
  activeStatus: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
  contacts: BankContact[];
}

/** An RM contact in a save payload (rmContactDetailID = 0 → new). */
export interface SaveBankContact {
  rmContactDetailID: number;
  rmName: string;
  rmContactNo: string | null;
  rmEmail: string | null;
  rmLandLine: string | null;
}

/** Add/update payload for a bank + its contacts (bankID = 0 → add). */
export interface SaveBank {
  bankID: number;
  bankName: string;
  bankCategory: string | null;
  regionId: string | null;
  countryCode: string | null;
  cityCode: string | null;
  activeStatus: string;
  contacts: SaveBankContact[];
}

/** Bank category options (fixed list). */
export const BANK_CATEGORIES = ['Private Bank LOU', 'PSU Bank LOU'] as const;

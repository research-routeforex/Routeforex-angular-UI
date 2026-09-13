/** Money Exchange — Client Information models (MoneyChanging_ClientInformation). */

/** A client row (with joined City/Country names for the composed address). */
export interface MeClient {
  id: number;
  name: string | null;
  contactNo: string | null;
  alternateNo: string | null;
  emailID: string | null;
  regionID: number | null;
  countryID: number | null;
  cityID: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  pinCode: string | null;
  status: string | null;
  cityName: string | null;
  countryDescription: string | null;
}

/** Add/update payload (id = 0 → add). */
export interface SaveMeClient {
  id: number;
  name: string;
  contactNo: string | null;
  alternateNo: string | null;
  emailID: string | null;
  regionID: number | null;
  countryID: number | null;
  cityID: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  pinCode: string | null;
  status: string | null;
}

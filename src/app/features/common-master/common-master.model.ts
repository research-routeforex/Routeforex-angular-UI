/** A Country Region row (TPO_Mast_CountryRegion). */
export interface CountryRegion {
  countryRegionID: number;
  regionCode: string;
  regionDescription: string;
  activeStatus: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
}

/** Add/update payload (CountryRegionID = 0 → add). */
export interface SaveCountryRegion {
  countryRegionID: number;
  regionCode: string;
  regionDescription: string;
  activeStatus: string;
}

/** A Country row (TPO_Mast_Country). */
export interface Country {
  countryID: number;
  countryCode: string;
  countryDescription: string;
  countryRegion: string | null;
  activeStatus: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
}

/** Add/update payload (CountryID = 0 → add). */
export interface SaveCountry {
  countryID: number;
  countryCode: string;
  countryDescription: string;
  countryRegion: string;
  activeStatus: string;
}

/** A State row (TPO_Mast_State). */
export interface State {
  stateId: number;
  countryCode: string | null;
  stateCode: string;
  stateName: string;
  statezone: number | null;
  activeStatus: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
}

/** Add/update payload (StateId = 0 → add). */
export interface SaveState {
  stateId: number;
  countryCode: string;
  stateCode: string;
  stateName: string;
  statezone: number | null;
  activeStatus: string;
}

/** A City row (TPO_Mast_City). */
export interface CityMaster {
  cityID: number;
  cityCode: string;
  cityName: string;
  countryCode: string | null;
  regionCode: string | null;
  zone: number | null;
  activeStatus: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
}

/** Add/update payload (CityID = 0 → add). */
export interface SaveCityMaster {
  cityID: number;
  cityCode: string;
  cityName: string;
  countryCode: string;
  regionCode: string;
  zone: number | null;
  activeStatus: string;
}

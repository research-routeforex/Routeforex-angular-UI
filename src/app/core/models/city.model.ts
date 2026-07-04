/** @see RouteForex.Application.Features.Cities.DTOs.CityDto */
export interface City {
  id: number;
  code: string;
  name: string;
  stateName?: string | null;
  countryName?: string | null;
  isActive: boolean;
  createdDate: string;
}

export interface CreateCityRequest {
  code: string;
  name: string;
  stateName?: string | null;
  countryName?: string | null;
}

export interface UpdateCityRequest {
  code: string;
  name: string;
  stateName?: string | null;
  countryName?: string | null;
  isActive: boolean;
}

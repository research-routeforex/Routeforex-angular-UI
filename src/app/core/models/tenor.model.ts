/** @see RouteForex.Application.Features.Tenors.DTOs.TenorDto */
export interface Tenor {
  id: number;
  code: string;
  name: string;
  daysToMaturity: number;
  sortOrder: number;
  isActive: boolean;
  createdDate: string;
}

export interface CreateTenorRequest {
  code: string;
  name: string;
  daysToMaturity: number;
  sortOrder: number;
}

export interface UpdateTenorRequest {
  code: string;
  name: string;
  daysToMaturity: number;
  sortOrder: number;
  isActive: boolean;
}

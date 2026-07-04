/** @see RouteForex.Application.Features.Roles.DTOs.RoleDto */
export interface Role {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface CreateRoleRequest {
  name: string;
  description?: string | null;
}

export interface UpdateRoleRequest {
  name: string;
  description?: string | null;
  isActive: boolean;
}

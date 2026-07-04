/** @see RouteForex.Application.Features.Users.DTOs.UserDto */
export interface User {
  id: number;
  userName: string;
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
  isLockedOut: boolean;
  lastLoginDate?: string | null;
  roles: string[];
}

export interface CreateUserRequest {
  userName: string;
  email: string;
  password: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  roleIds: number[];
  /** Set only when the selected role is "Client". */
  clientId?: number | null;
}

export interface UpdateUserRequest {
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
  isLockedOut: boolean;
}

export interface AssignRolesRequest {
  roleIds: number[];
}

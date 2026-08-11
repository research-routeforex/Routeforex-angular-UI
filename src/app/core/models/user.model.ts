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
  /** Selected role id (RF_Users.UserCategoryID). */
  roleId?: number | null;
  /** Selected client id (RF_Users.ClientCode) — set for the Client role. */
  clientId?: number | null;
}

export interface CreateUserRequest {
  userName: string;
  email: string;
  password: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  /** Selected role (category) → RF_Users.UserCategoryID. */
  roleId?: number | null;
  /** Set only when the selected role is "Client" → RF_Users.ClientCode. */
  clientId?: number | null;
}

export interface UpdateUserRequest {
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
  isLockedOut: boolean;
  /** Selected role → RF_Users.UserCategoryID. */
  roleId?: number | null;
  /** Selected client (Client role only) → RF_Users.ClientCode. */
  clientId?: number | null;
}

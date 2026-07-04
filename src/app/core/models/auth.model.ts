/** Credentials posted to /auth/login. */
export interface LoginRequest {
  userName: string;
  password: string;
}

/** Posted to /auth/refresh and /auth/logout. */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** Posted to /auth/forgot-password — username or email. */
export interface ForgotPasswordRequest {
  login: string;
}

/** Posted to /auth/reset-password — token from the emailed link + new password. */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/** Posted to /auth/change-password (authenticated) — current + new password. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Authenticated user identity carried in the auth result. */
export interface AuthUserInfo {
  id: number;
  userName: string;
  email: string;
  fullName?: string | null;
  roles: string[];
}

/**
 * Returned by /auth/login and /auth/refresh.
 * @see RouteForex.Application.Features.Authentication.DTOs.AuthResult
 */
export interface AuthResult {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  user: AuthUserInfo;
}

/** Shape persisted to storage between sessions. */
export interface StoredSession {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  user: AuthUserInfo;
}

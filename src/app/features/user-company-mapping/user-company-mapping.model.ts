/** User Company Mapping domain models (Tpo_Mast_UserCompanyMapping). */

/** A grouped mapping row: one user + their comma-joined client (company) names. */
export interface UserCompanyMapping {
  userId: string;
  userName: string | null;
  clientNames: string | null;
}

/** Save payload — replaces the user's whole set of mapped clients. */
export interface SaveUserCompanyMapping {
  userId: string;
  clientIds: number[];
}

/**
 * Application roles — mirror of the backend `AppConstants.Roles`.
 * Authorization in RouteForex is role-based (the API issues role claims, not
 * granular permissions), so guards and the dynamic menu key off these.
 */
export enum AppRole {
  Admin = 'Admin',
  Dealer = 'Dealer',
  RelationshipManager = 'RM',
  SalesUser = 'SalesUser',
  Client = 'Client',
  Auditor = 'Auditor',
}

/** Human-friendly labels for display. */
export const ROLE_LABELS: Record<string, string> = {
  [AppRole.Admin]: 'Administrator',
  [AppRole.Dealer]: 'Dealer',
  [AppRole.RelationshipManager]: 'Relationship Manager',
  [AppRole.SalesUser]: 'Sales User',
  [AppRole.Client]: 'Client',
  [AppRole.Auditor]: 'Auditor',
};

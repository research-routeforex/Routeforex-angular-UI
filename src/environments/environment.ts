/**
 * Production environment configuration.
 * `apiBaseUrl` is empty so requests hit the same origin and can be terminated
 * by a reverse proxy / API gateway in front of the SPA.
 */
export const environment = {
  production: true,
  appName: 'RouteForex',
  /** Hosted RouteForex API. Empty => same origin (proxied). */
  apiBaseUrl: 'https://routeforexapi.azurewebsites.net',
  apiPrefix: '/api/v1',
  /** Refresh the access token this many seconds before it actually expires. */
  tokenRefreshSkewSeconds: 60,
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
};

export type AppEnvironment = typeof environment;

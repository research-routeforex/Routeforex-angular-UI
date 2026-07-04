/**
 * Development environment configuration (used by `ng serve` and
 * `--configuration development` via the fileReplacements in angular.json).
 *
 * `apiBaseUrl` points directly at the local RouteForex API. Calls therefore go
 * to https://localhost:7080/api/v1/... — make sure the API's
 * `Cors:AllowedOrigins` includes this app's origin (e.g. http://localhost:4300).
 * Leave `apiBaseUrl` empty instead to route through the dev proxy (proxy.conf.json).
 */
export const environment = {
  production: false,
  appName: 'RouteForex',
  //apiBaseUrl:'https://routeforexapi.azurewebsites.net',
  apiBaseUrl: 'https://localhost:7080',
  apiPrefix: '/api/v1',
  tokenRefreshSkewSeconds: 60,
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
};

export type AppEnvironment = typeof environment;

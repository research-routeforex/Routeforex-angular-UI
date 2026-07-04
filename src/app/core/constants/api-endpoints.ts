/**
 * Centralized, type-safe API route builders. Paths are relative to the
 * configured `apiPrefix` (`/api/v1`) — the ApiService prepends base URL + prefix.
 */
export const API = {
  auth: {
    login: 'Auth/login',
    refresh: 'Auth/refresh',
    logout: 'Auth/logout',
    forgotPassword: 'Auth/forgot-password',
    resetPassword: 'Auth/reset-password',
    changePassword: 'Auth/change-password',
  },
  users: {
    base: 'Users',
    byId: (id: number) => `Users/${id}`,
    roles: (id: number) => `Users/${id}/roles`,
  },
  roles: {
    base: 'Roles',
    byId: (id: number) => `Roles/${id}`,
  },
  cities: {
    base: 'Cities',
    byId: (id: number) => `Cities/${id}`,
  },
  commonMaster: {
    countryRegion: 'CountryRegion',
    countryRegionById: (id: number) => `CountryRegion/${id}`,
    country: 'Country',
    countryById: (id: number) => `Country/${id}`,
    state: 'State',
    stateById: (id: number) => `State/${id}`,
    city: 'CityMaster',
    cityById: (id: number) => `CityMaster/${id}`,
    currency: 'CurrencyMaster',
    currencyById: (id: number) => `CurrencyMaster/${id}`,
  },
  bank: {
    base: 'Bank',
    byId: (id: number) => `Bank/${id}`,
  },
  headOffice: {
    base: 'HeadOffice',
    byId: (id: number) => `HeadOffice/${id}`,
  },
  company: {
    base: 'CompanyMaster',
    byId: (id: number) => `CompanyMaster/${id}`,
  },
  tenors: {
    base: 'Tenors',
    byId: (id: number) => `Tenors/${id}`,
  },
  forex: {
    liveRates: 'LiveRates',
    dealerPadOrders: 'DealerPadOrders',
    dropdowns: 'Dropdowns',
  },
  transaction: {
    ftpOrders: 'FtpOrderEntry',
    ftpOrderBooking: 'FtpOrderEntry/booking',
    // Order recordings/documents (Voice / Screenshot)
    orderRecordings: 'OrderRecordings',
    orderRecordingFile: 'OrderRecordings/file',
    // Generate Invoice — GET ?clientId=&fromDate=&toDate=
    invoice: 'Invoice',
    // POST { clientId, fromDate, toDate } — mark orders as InvoiceGenerated
    invoiceGenerate: 'Invoice/generate',
  },
  managementDashboard: {
    // GET ?clientId=&type=Import|Export
    transactions: 'ManagementDashboard',
    // GET — client list for the picker (scoped to the signed-in user)
    clients: 'ManagementDashboard/clients',
  },
  screenAccess: {
    // GET ?route=/ticker — daily allowance + used seconds
    base: 'ScreenAccess',
    // POST { route, seconds } — accumulate usage
    heartbeat: 'ScreenAccess/heartbeat',
  },
} as const;

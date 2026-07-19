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
  compBank: {
    base: 'CompBank',
    byId: (id: number) => `CompBank/${id}`,
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
    // GET ?clientId=&recordId= — parent Forward deals for the Cancellation/Utilization picker
    ftpForwardDeals: 'FtpOrderEntry/forward-deals',
    // Order recordings/documents (Voice / Screenshot)
    orderRecordings: 'OrderRecordings',
    orderRecordingFile: 'OrderRecordings/file',
    // Generate Invoice — GET ?clientId=&fromDate=&toDate=
    invoice: 'Invoice',
    // POST { clientId, fromDate, toDate } — mark orders as InvoiceGenerated
    invoiceGenerate: 'Invoice/generate',
    // POST — persist the invoice (header + details); returns the new InvoiceHdrID
    invoiceSave: 'Invoice/save',
    // GET — bank + contact details for the invoice footer
    invoiceFooter: 'Invoice/footer',
    // GET ?fromDate=&toDate=&clientId= — already-generated invoices (history grid)
    invoiceGenerated: 'Invoice/generated',
    // GET — rebuild a saved invoice (header + lines) for re-print
    invoiceById: (id: number) => `Invoice/${id}`,
    // POST — e-mail a saved invoice to the client
    invoiceEmail: (id: number) => `Invoice/${id}/email`,
  },
  reports: {
    // GET ?faYear=2025-2026 — client-wise revenue pivot
    clientWiseRevenue: 'Reports/client-wise-revenue',
    // GET ?clientId=&transactionType=&importExport= — Executive Dashboard UC report
    executiveDashboardUc: 'Reports/executive-dashboard-uc',
    // GET ?toDate=YYYY-MM-DD — PNL MIS zone report (As-on / MTD / YTD)
    pnlMis: 'Reports/pnl-zone',
  },
  managementDashboard: {
    // GET ?clientId=&type=Import|Export
    transactions: 'ManagementDashboard',
    // GET — client list for the picker (scoped to the signed-in user)
    clients: 'ManagementDashboard/clients',
  },
  executiveDashboard: {
    // GET ?clientId=&type=Import|Export — deal-level positions for a client.
    // POST (same path) — add a new Import / Export deal.
    // (Client picker is bound via the common Dropdowns endpoint, @type='Client'.)
    transactions: 'ExecutiveDashboard',
    // GET {id} — one deal's editable fields for the View / Edit form
    byId: (id: number | string) => `ExecutiveDashboard/${id}`,
    // POST — record a Utilization / Cancellation (UC) against a deal
    uc: 'ExecutiveDashboard/uc',
    // GET ?clientId=&type=Import|Export — read-only expiry-transaction grid rows
    expiry: 'ExecutiveDashboard/expiry',
  },
  screenAccess: {
    // GET ?route=/ticker — daily allowance + used seconds
    base: 'ScreenAccess',
    // POST { route, seconds } — accumulate usage
    heartbeat: 'ScreenAccess/heartbeat',
  },
} as const;

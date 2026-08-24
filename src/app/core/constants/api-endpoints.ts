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
    profileImage: 'Auth/profile-image',
  },
  users: {
    base: 'Users',
    byId: (id: number) => `Users/${id}`,
  },
  roles: {
    base: 'Roles',
    byId: (id: number) => `Roles/${id}`,
  },
  rolePermission: {
    // GET /tree — modules + screens; GET /{roleId} — granted screen ids; POST — save
    base: 'RolePermission',
    tree: 'RolePermission/tree',
    byRole: (roleId: number) => `RolePermission/${roleId}`,
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
  rbiRate: {
    // GET ?date=&rate= — search; POST — insert/update a rate
    base: 'RbiRate',
  },
  historicalRate: {
    // GET ?date=&currency= — search the list
    base: 'HistoricalRate',
    // POST { fileName, fileBase64 } — bulk-upload rows from an Excel (.xlsx)
    upload: 'HistoricalRate/upload',
  },
  tickerLiveScreenRight: {
    // GET ?clientId=&validityFrom=&validityTo= — search (admin); POST — insert/update (admin)
    base: 'TickerLiveScreen',
    // GET — the signed-in user's effective Ticker access (mode + free budget)
    access: 'TickerLiveScreen/access',
    // POST { seconds } — accumulate free-trial seconds
    heartbeat: 'TickerLiveScreen/access/heartbeat',
  },
  otherServices: {
    // GET ?clientId=&date= — list; POST — insert/update; DELETE {id}
    base: 'OtherServices',
    // GET — service dropdown options (add form)
    services: 'OtherServices/services',
    byId: (id: number) => `OtherServices/${id}`,
  },
  serviceOffered: {
    // GET ?serviceName=&serviceDescription=&status= — list; POST — insert/update
    base: 'ServiceOffered',
  },
  userCompanyMapping: {
    // GET ?userId=&clientId= — list; POST — save (replace user's client set)
    base: 'UserCompanyMapping',
    users: 'UserCompanyMapping/users',
    clients: 'UserCompanyMapping/clients',
    mappedClients: (userId: string) => `UserCompanyMapping/${encodeURIComponent(userId)}/clients`,
  },
  rateAlert: {
    // GET ?search=&status= — list; POST — insert/update
    base: 'RateAlert',
    currencies: 'RateAlert/currencies',
    validities: 'RateAlert/validities',
  },
  lead: {
    // GET ?type=&status= — list; POST — update Status + Remarks (edit-only)
    base: 'Lead',
    types: 'Lead/types',
  },
  forexAdvisory: {
    // GET ?currency=&status= — list; POST — insert/update (optional base64 image)
    base: 'ForexAdvisory',
    currencies: 'ForexAdvisory/currencies',
  },
  orderTracking: {
    // GET ?search= — tracked orders; POST — replace one order's timeline
    base: 'OrderTracking',
    orders: 'OrderTracking/orders',
    deliveryBoys: 'OrderTracking/delivery-boys',
    byOrder: (orderId: number) => `OrderTracking/${orderId}`,
  },
  promoCode: {
    // GET ?promoCode= — list; POST — insert/update
    base: 'PromoCode',
  },
  moneyExchangeClient: {
    // GET ?search=&status= — list; POST — insert/update; cascading lookups
    base: 'MoneyExchangeClient',
    regions: 'MoneyExchangeClient/regions',
    countries: 'MoneyExchangeClient/countries',
    cities: 'MoneyExchangeClient/cities',
  },
  moneyExchangeOrder: {
    // GET ?search=&status= — list; POST — insert/update (client resolved from contact no.)
    base: 'MoneyExchangeOrder',
  },
  lmsClient: {
    // GET ?search=&status= — list; POST — insert/update; cascading lookups
    base: 'LmsClient',
    regions: 'LmsClient/regions',
    countries: 'LmsClient/countries',
    cities: 'LmsClient/cities',
  },
  lmsLead: {
    // GET ?search= — list; POST — insert/update
    base: 'LmsLead',
    clients: 'LmsLead/clients',
  },
  broadcastGroup: {
    // GET — all groups; POST — insert/update a group (clientIDs = CSV)
    base: 'BroadcastGroup',
  },
  broadcastMessage: {
    // GET ?search= — sent broadcasts (newest first); POST — send a broadcast
    base: 'BroadcastMessage',
  },
  template: {
    // GET — all templates; GET {id} — one template + HTML body; POST — insert/update
    base: 'Template',
    byId: (id: number) => `Template/${id}`,
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
    // Ticker Live Rate screen feeds (usp_RF_Mast_ForexLiveScreen).
    // GET ?description= — spot-rate board / forward premium / currency futures.
    tickerForex: 'LiveRates/forex',
    tickerPremium: 'LiveRates/premium',
    // GET — distinct currencies for the Forward Premium dropdown (TPO_Mast_ForexPremium)
    tickerPremiumCurrencies: 'LiveRates/premium-currencies',
    // GET ?monthEndDate=&currencyFrom=&currencyTo= — forward rate for a Broken Rate row
    tickerForwardRate: 'LiveRates/forward-rate',
    tickerCurrencyFuture: 'LiveRates/currency-future',
    // Forex News for the signed-in user (@Action='selectNEWS', @CreatedBy=login name).
    tickerNews: 'LiveRates/news',
    dealerPadOrders: 'DealerPadOrders',
    dropdowns: 'Dropdowns',
  },
  transaction: {
    ftpOrders: 'FtpOrderEntry',
    ftpOrderBooking: 'FtpOrderEntry/booking',
    // GET ?clientId=&recordId= — parent Forward deals for the Cancellation/Utilization picker
    ftpForwardDeals: 'FtpOrderEntry/forward-deals',
    // GET ?clientId= — all live orders for a client (Deal Coverage order dropdown)
    ftpOrdersByClient: 'FtpOrderEntry/orders-by-client',
    // GET ?date= — next working day (skips weekends + holidays); defaults to today. ISO yyyy-MM-dd.
    ftpWorkingDate: 'FtpOrderEntry/working-date',
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
    // GET ?fromDate=&toDate=&clientId= — MIS / Deal-Coverage report (@TYPE=2)
    mis: 'Reports/mis',
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
  favourites: {
    // GET — the user's favourite screens; POST { route } — star; DELETE ?route= — un-star
    base: 'Favourites',
  },
} as const;

/** Service Offered Master domain models (TPO_Mast_ServiceOffered). */

/** A Service Offered row. */
export interface ServiceOffered {
  serviceID: number;
  serviceName: string | null;
  serviceDescription: string | null;
  status: string | null; // ActiveStatus — Active / Inactive / Mobile
  serviceIcon: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
}

/** Add/update payload (serviceID = 0 → add). */
export interface SaveServiceOffered {
  serviceID: number;
  serviceName: string;
  serviceDescription: string | null;
  status: string | null;
  serviceIcon: string | null;
}

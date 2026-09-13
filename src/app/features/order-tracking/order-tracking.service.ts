import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SelectOption } from '../../shared/components/select/select';
import { SaveOrderTracking, TrackingOrder, TrackingStep } from './order-tracking.model';

interface DeliveryBoyApi {
  id: number;
  name: string;
}

/** Order Tracking data — orders + delivery-boy lookups, timeline load & save. */
@Injectable({ providedIn: 'root' })
export class OrderTrackingService {
  private readonly api = inject(ApiService);

  /** Every active FTP order (Add-New dropdown). */
  getOrders(): Observable<TrackingOrder[]> {
    return this.api.get<TrackingOrder[]>(API.orderTracking.orders).pipe(map((r) => r ?? []));
  }

  /** Tracked orders (list grid), filtered by optional search text. */
  search(searchText?: string | null): Observable<TrackingOrder[]> {
    return this.api
      .get<TrackingOrder[]>(API.orderTracking.base, {
        params: { search: searchText || undefined },
      })
      .pipe(map((r) => r ?? []));
  }

  /** Delivery-boy dropdown options. */
  getDeliveryBoyOptions(): Observable<SelectOption[]> {
    return this.api
      .get<DeliveryBoyApi[]>(API.orderTracking.deliveryBoys)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }))));
  }

  /** One order's saved timeline (steps + current status + delivery boy). */
  getByOrder(orderId: number): Observable<TrackingStep[]> {
    return this.api
      .get<TrackingStep[]>(API.orderTracking.byOrder(orderId))
      .pipe(map((r) => r ?? []));
  }

  /** Replace an order's whole timeline. Returns rows written. */
  save(payload: SaveOrderTracking): Observable<number> {
    return this.api.post<number>(API.orderTracking.base, payload);
  }
}

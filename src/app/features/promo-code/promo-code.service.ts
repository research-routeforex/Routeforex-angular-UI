import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { PromoCode, SavePromoCode } from './promo-code.model';

/** Promo Code data — list search, save. */
@Injectable({ providedIn: 'root' })
export class PromoCodeService {
  private readonly api = inject(ApiService);

  /** List / search by optional promo code. */
  search(promoCode?: string | null): Observable<PromoCode[]> {
    return this.api
      .get<PromoCode[]>(API.promoCode.base, {
        params: { promoCode: promoCode || undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  /** Add or update a promo code (id = 0 → add). */
  save(payload: SavePromoCode): Observable<number> {
    return this.api.post<number>(API.promoCode.base, payload);
  }
}

import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import {
  BroadcastMessage,
  SaveBroadcastMessage,
  UpdateBroadcastMessage,
} from './broadcast-message.model';

/** Broadcast Message data — list/search + send over the BroadcastMessage endpoints. */
@Injectable({ providedIn: 'root' })
export class BroadcastMessageService {
  private readonly api = inject(ApiService);

  search(term?: string): Observable<BroadcastMessage[]> {
    return this.api
      .get<BroadcastMessage[]>(API.broadcastMessage.base, {
        params: term ? { search: term } : {},
      })
      .pipe(map((rows) => rows ?? []));
  }

  send(payload: SaveBroadcastMessage): Observable<number> {
    return this.api.post<number>(API.broadcastMessage.base, payload);
  }

  /** Update / close a trading call (status + exit). */
  update(payload: UpdateBroadcastMessage): Observable<number> {
    return this.api.put<number>(API.broadcastMessage.base, payload);
  }
}

import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { BroadcastGroup, SaveBroadcastGroup } from './broadcast-group-master.model';

/** Broadcast Group Master data — list + insert/update over the BroadcastGroup endpoints. */
@Injectable({ providedIn: 'root' })
export class BroadcastGroupMasterService {
  private readonly api = inject(ApiService);

  getGroups(): Observable<BroadcastGroup[]> {
    return this.api.get<BroadcastGroup[]>(API.broadcastGroup.base).pipe(map((rows) => rows ?? []));
  }

  save(payload: SaveBroadcastGroup): Observable<number> {
    return this.api.post<number>(API.broadcastGroup.base, payload);
  }
}

import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SKIP_ERROR_TOAST } from '../../core/interceptors/http-context.tokens';
import { environment } from '../../../environments/environment';
import {
  BroadcastMessage,
  SaveBroadcastMessage,
  UpdateBroadcastMessage,
} from './broadcast-message.model';

/** Broadcast Message data — list/search + send over the BroadcastMessage endpoints. */
@Injectable({ providedIn: 'root' })
export class BroadcastMessageService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

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

  /**
   * Fetches a stored header/footer image (authenticated blob) by its relative path.
   * Returns an empty blob when there is no file (endpoint yields 204). Suppresses the
   * global error toast — a missing attachment is a normal, silent outcome.
   */
  fileBlob(path: string): Observable<Blob> {
    const url = `${environment.apiBaseUrl}${environment.apiPrefix}/${API.broadcastMessage.file}`;
    return this.http.get(url, {
      params: { path },
      responseType: 'blob',
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}

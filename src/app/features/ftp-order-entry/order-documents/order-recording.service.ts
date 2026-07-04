import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../../core/constants/api-endpoints';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../core/services/api.service';
import { OrderRecording, UploadOrderRecording } from './order-recording.model';

/** Order recordings/documents: list, upload, stream (blob), soft-delete. */
@Injectable({ providedIn: 'root' })
export class OrderRecordingService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  /** Files on file for an order. */
  list(recordId: number): Observable<OrderRecording[]> {
    return this.api
      .get<OrderRecording[]>(API.transaction.orderRecordings, { params: { recordId } })
      .pipe(map((rows) => rows ?? []));
  }

  /** Upload a Voice/Screenshot file (base64 / data-URL). */
  upload(payload: UploadOrderRecording): Observable<void> {
    return this.api.post<void>(API.transaction.orderRecordings, payload);
  }

  /** Soft-delete a stored file. */
  remove(recordId: number, fileName: string): Observable<void> {
    return this.api.delete<void>(API.transaction.orderRecordings, {
      params: { recordId, fileName },
    });
  }

  /** Fetch a stored file as a Blob for playback/preview (auth header added by the interceptor). */
  getFile(recordId: number, fileName: string): Observable<Blob> {
    const url = `${environment.apiBaseUrl}${environment.apiPrefix}/${API.transaction.orderRecordingFile}`;
    return this.http.get(url, { params: { recordId, fileName }, responseType: 'blob' });
  }
}

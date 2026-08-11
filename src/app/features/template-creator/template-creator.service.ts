import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SaveTemplate, Template, TemplateDetail } from './template-creator.model';

/** Template Creator data — list, load and save over the Template endpoints. */
@Injectable({ providedIn: 'root' })
export class TemplateCreatorService {
  private readonly api = inject(ApiService);

  getTemplates(): Observable<Template[]> {
    return this.api.get<Template[]>(API.template.base).pipe(map((rows) => rows ?? []));
  }

  /** Loads a template with its HTML body (for editing). */
  getTemplate(id: number): Observable<TemplateDetail> {
    return this.api.get<TemplateDetail>(API.template.byId(id));
  }

  save(payload: SaveTemplate): Observable<number> {
    return this.api.post<number>(API.template.base, payload);
  }
}

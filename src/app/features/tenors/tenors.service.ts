import { Injectable } from '@angular/core';
import { CrudService } from '../../core/services/crud.service';
import { CreateTenorRequest, Tenor, UpdateTenorRequest } from '../../core/models/tenor.model';

/** Tenors master CRUD (paged) — backed by the /Tenors controller. */
@Injectable({ providedIn: 'root' })
export class TenorsService extends CrudService<Tenor, CreateTenorRequest, UpdateTenorRequest> {
  protected readonly basePath = 'Tenors';
}

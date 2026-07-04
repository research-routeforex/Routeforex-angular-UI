import { Injectable } from '@angular/core';
import { CrudService } from '../../core/services/crud.service';
import { City, CreateCityRequest, UpdateCityRequest } from '../../core/models/city.model';

/** Cities master CRUD (paged) — backed by the /Cities controller. */
@Injectable({ providedIn: 'root' })
export class CitiesService extends CrudService<City, CreateCityRequest, UpdateCityRequest> {
  protected readonly basePath = 'Cities';
}

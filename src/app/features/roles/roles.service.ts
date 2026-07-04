import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { CreateRoleRequest, Role, UpdateRoleRequest } from '../../core/models/role.model';
import { ApiService } from '../../core/services/api.service';

/**
 * Roles administration. The /Roles controller exposes a (cached) full list
 * rather than a paged endpoint, so this service does not extend CrudService.
 */
@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly api = inject(ApiService);

  getAll(): Observable<Role[]> {
    return this.api.get<Role[]>(API.roles.base);
  }

  getById(id: number): Observable<Role> {
    return this.api.get<Role>(API.roles.byId(id));
  }

  create(payload: CreateRoleRequest): Observable<number> {
    return this.api.post<number>(API.roles.base, payload);
  }

  update(id: number, payload: UpdateRoleRequest): Observable<void> {
    return this.api.put<void>(API.roles.byId(id), payload);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(API.roles.byId(id));
  }
}

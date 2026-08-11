import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { RolePermissionTree, SaveRolePermission } from './role-permissions.model';

/** Role-wise screen permissions — read the tree, a role's grants, and save. */
@Injectable({ providedIn: 'root' })
export class RolePermissionService {
  private readonly api = inject(ApiService);

  getTree(): Observable<RolePermissionTree> {
    return this.api
      .get<RolePermissionTree>(API.rolePermission.tree)
      .pipe(map((t) => t ?? { modules: [], screens: [] }));
  }

  getByRole(roleId: number): Observable<number[]> {
    return this.api.get<number[]>(API.rolePermission.byRole(roleId)).pipe(map((ids) => ids ?? []));
  }

  save(payload: SaveRolePermission): Observable<void> {
    return this.api.post<void>(API.rolePermission.base, payload);
  }
}

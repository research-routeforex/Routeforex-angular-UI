import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import {
  AssignRolesRequest,
  CreateUserRequest,
  UpdateUserRequest,
  User,
} from '../../core/models/user.model';
import { ApiService } from '../../core/services/api.service';
import { CrudService } from '../../core/services/crud.service';

/** User management CRUD plus role assignment — backed by the /Users controller. */
@Injectable({ providedIn: 'root' })
export class UsersService extends CrudService<User, CreateUserRequest, UpdateUserRequest> {
  protected readonly basePath = 'Users';
  private readonly apiService = inject(ApiService);

  /** Replaces the set of roles assigned to a user. */
  assignRoles(id: number, request: AssignRolesRequest): Observable<void> {
    return this.apiService.put<void>(API.users.roles(id), request);
  }
}

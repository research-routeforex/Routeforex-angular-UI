import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
} from '../../core/models/user.model';
import { PagedResult } from '../../core/models/pagination.model';
import { CrudService } from '../../core/services/crud.service';

/** User management CRUD — backed by the /Users controller. */
@Injectable({ providedIn: 'root' })
export class UsersService extends CrudService<User, CreateUserRequest, UpdateUserRequest> {
  protected readonly basePath = 'Users';

  /**
   * Server-paged list with a free-text search (UserName / Email / Full Name)
   * and an optional role (UserCategoryID) filter. Paging + filtering happen on
   * the server so every page hits the DB.
   */
  getPagedUsers(opts: {
    pageNumber: number;
    pageSize: number;
    search?: string | null;
    roleId?: number | null;
  }): Observable<PagedResult<User>> {
    return this.api.getPaged<User>(this.basePath, {
      params: {
        pageNumber: opts.pageNumber,
        pageSize: opts.pageSize,
        search: opts.search || undefined,
        roleId: opts.roleId ?? undefined,
      },
    });
  }
}

import { Injectable } from '@angular/core';
import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
} from '../../core/models/user.model';
import { CrudService } from '../../core/services/crud.service';

/** User management CRUD — backed by the /Users controller. */
@Injectable({ providedIn: 'root' })
export class UsersService extends CrudService<User, CreateUserRequest, UpdateUserRequest> {
  protected readonly basePath = 'Users';
}

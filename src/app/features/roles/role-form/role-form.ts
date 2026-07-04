import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { finalize, Observable } from 'rxjs';
import { Role } from '../../../core/models/role.model';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { RolesService } from '../roles.service';

export interface RoleFormData {
  mode: 'create' | 'edit';
  role?: Role;
}

@Component({
  selector: 'app-role-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSlideToggleModule,
    FieldComponent,
  ],
  templateUrl: './role-form.html',
})
export class RoleFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RolesService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<RoleFormComponent, boolean>);
  protected readonly data = inject<RoleFormData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);
  protected readonly isEdit = this.data.mode === 'edit';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, CustomValidators.notBlank, Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(250)]],
    isActive: [true],
  });

  constructor() {
    if (this.isEdit && this.data.role) {
      const r = this.data.role;
      this.form.patchValue({
        name: r.name,
        description: r.description ?? '',
        isActive: r.isActive,
      });
    }
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);

    const request$: Observable<unknown> =
      this.isEdit && this.data.role
        ? this.service.update(this.data.role.id, {
            name: v.name,
            description: v.description || null,
            isActive: v.isActive,
          })
        : this.service.create({ name: v.name, description: v.description || null });

    request$.pipe(finalize(() => this.saving.set(false))).subscribe(() => {
      this.notify.success(`Role ${this.isEdit ? 'updated' : 'created'} successfully.`);
      this.ref.close(true);
    });
  }
}

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
import { Tenor } from '../../../core/models/tenor.model';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { TenorsService } from '../tenors.service';

export interface TenorFormData {
  mode: 'create' | 'edit';
  tenor?: Tenor;
}

@Component({
  selector: 'app-tenor-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSlideToggleModule,
    FieldComponent,
  ],
  templateUrl: './tenor-form.html',
})
export class TenorFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TenorsService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<TenorFormComponent, boolean>);
  protected readonly data = inject<TenorFormData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);
  protected readonly isEdit = this.data.mode === 'edit';

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20), CustomValidators.code]],
    name: ['', [Validators.required, CustomValidators.notBlank, Validators.maxLength(100)]],
    daysToMaturity: [0, [Validators.required, Validators.min(0), Validators.max(36500)]],
    sortOrder: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  constructor() {
    if (this.isEdit && this.data.tenor) {
      const t = this.data.tenor;
      this.form.patchValue({
        code: t.code,
        name: t.name,
        daysToMaturity: t.daysToMaturity,
        sortOrder: t.sortOrder,
        isActive: t.isActive,
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
      this.isEdit && this.data.tenor
        ? this.service.update(this.data.tenor.id, {
            code: v.code,
            name: v.name,
            daysToMaturity: v.daysToMaturity,
            sortOrder: v.sortOrder,
            isActive: v.isActive,
          })
        : this.service.create({
            code: v.code,
            name: v.name,
            daysToMaturity: v.daysToMaturity,
            sortOrder: v.sortOrder,
          });

    request$.pipe(finalize(() => this.saving.set(false))).subscribe(() => {
      this.notify.success(`Tenor ${this.isEdit ? 'updated' : 'created'} successfully.`);
      this.ref.close(true);
    });
  }
}

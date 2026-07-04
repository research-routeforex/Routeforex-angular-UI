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
import { City } from '../../../core/models/city.model';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { CitiesService } from '../cities.service';

export interface CityFormData {
  mode: 'create' | 'edit';
  city?: City;
}

@Component({
  selector: 'app-city-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSlideToggleModule,
    FieldComponent,
  ],
  templateUrl: './city-form.html',
})
export class CityFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CitiesService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<CityFormComponent, boolean>);
  protected readonly data = inject<CityFormData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);
  protected readonly isEdit = this.data.mode === 'edit';

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20), CustomValidators.code]],
    name: ['', [Validators.required, CustomValidators.notBlank, Validators.maxLength(100)]],
    stateName: ['', [Validators.maxLength(100)]],
    countryName: ['', [Validators.maxLength(100)]],
    isActive: [true],
  });

  constructor() {
    if (this.isEdit && this.data.city) {
      const c = this.data.city;
      this.form.patchValue({
        code: c.code,
        name: c.name,
        stateName: c.stateName ?? '',
        countryName: c.countryName ?? '',
        isActive: c.isActive,
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
      this.isEdit && this.data.city
        ? this.service.update(this.data.city.id, {
            code: v.code,
            name: v.name,
            stateName: v.stateName || null,
            countryName: v.countryName || null,
            isActive: v.isActive,
          })
        : this.service.create({
            code: v.code,
            name: v.name,
            stateName: v.stateName || null,
            countryName: v.countryName || null,
          });

    request$.pipe(finalize(() => this.saving.set(false))).subscribe(() => {
      this.notify.success(`City ${this.isEdit ? 'updated' : 'created'} successfully.`);
      this.ref.close(true);
    });
  }
}

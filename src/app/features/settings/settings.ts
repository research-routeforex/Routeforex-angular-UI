import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { finalize } from 'rxjs';
import { ROLE_LABELS } from '../../core/enums/role.enum';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ChangePasswordDialogComponent } from './change-password/change-password-dialog';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    UpperCasePipe,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  protected readonly user = this.auth.user;
  protected readonly uploading = signal(false);
  protected readonly roleLabels = computed(() =>
    this.auth.roles().map((r) => ROLE_LABELS[r] ?? r),
  );

  /** Reads the chosen image as a base64 data URL and uploads it as the profile photo. */
  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // let the same file be re-selected later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notify.error('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notify.error('The image must be 5 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.uploading.set(true);
      this.auth
        .uploadProfileImage(reader.result as string, file.name)
        .pipe(finalize(() => this.uploading.set(false)))
        .subscribe({
          next: () => this.notify.success('Profile photo updated.'),
          error: () => this.notify.error('Could not upload the photo. Please try again.'),
        });
    };
    reader.onerror = () => this.notify.error('Could not read the selected file.');
    reader.readAsDataURL(file);
  }

  protected changePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, {
      width: '480px',
      autoFocus: 'first-tabbable',
    });
  }
}

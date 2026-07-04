import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ROLE_LABELS } from '../../core/enums/role.enum';
import { AuthService } from '../../core/services/auth.service';
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

  protected readonly user = this.auth.user;
  protected readonly roleLabels = computed(() =>
    this.auth.roles().map((r) => ROLE_LABELS[r] ?? r),
  );

  protected changePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, {
      width: '480px',
      autoFocus: 'first-tabbable',
    });
  }
}

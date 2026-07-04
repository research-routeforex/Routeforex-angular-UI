import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { OrderRecording, RecordingType } from './order-recording.model';
import { OrderRecordingService } from './order-recording.service';

/**
 * "Upload Document" tab for an FTP order: upload a Voice recording or a
 * Screenshot, and play / view / remove files already on file.
 */
@Component({
  selector: 'app-order-documents',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, DatePipe],
  templateUrl: './order-documents.html',
  styleUrl: './order-documents.scss',
})
export class OrderDocumentsComponent implements OnDestroy {
  private readonly service = inject(OrderRecordingService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  /** The order this panel belongs to. */
  readonly recordId = input.required<number>();
  readonly clientId = input<number | null>(null);
  readonly orderNumber = input<string>('');

  protected readonly types: RecordingType[] = ['Voice', 'Screenshot'];
  protected readonly type = signal<RecordingType>('Voice');

  protected readonly recordings = signal<OrderRecording[]>([]);
  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);

  /** Selected (not-yet-uploaded) file. */
  protected readonly pickedName = signal<string>('');
  private pickedBase64: string | null = null;

  /** Currently-playing voice file (object URL + label). */
  protected readonly playingUrl = signal<string | null>(null);
  protected readonly playingName = signal<string>('');

  /** Accept filter for the file input, by selected type. */
  protected readonly accept = computed(() =>
    this.type() === 'Voice' ? 'audio/*,.mp3,.wav,.m4a,.ogg' : 'image/*',
  );

  constructor() {
    // (Re)load the file list whenever the order changes.
    effect(() => {
      const id = this.recordId();
      if (id > 0) this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service.list(this.recordId()).subscribe({
      next: (rows) => {
        this.recordings.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected selectType(t: RecordingType): void {
    this.type.set(t);
    this.clearPicked();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.pickedBase64 = reader.result as string;
      this.pickedName.set(file.name);
    };
    reader.onerror = () => this.notify.error('Could not read the selected file.');
    reader.readAsDataURL(file);
  }

  protected upload(): void {
    if (!this.pickedBase64 || this.uploading()) {
      this.notify.error('Choose a file to upload first.');
      return;
    }
    this.uploading.set(true);
    this.service
      .upload({
        recordId: this.recordId(),
        documentType: this.type(),
        clientId: this.clientId() ?? 0,
        orderNumber: this.orderNumber() ?? '',
        fileName: this.pickedName(),
        fileBase64: this.pickedBase64,
      })
      .subscribe({
        next: () => {
          this.notify.success(`${this.type()} uploaded.`);
          this.clearPicked();
          this.uploading.set(false);
          this.load();
        },
        error: () => this.uploading.set(false),
      });
  }

  /** Play a voice file inline, or open a screenshot in a new tab. */
  protected open(rec: OrderRecording): void {
    this.service.getFile(rec.recordId, rec.fileName).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (this.isVoice(rec)) {
          this.revokePlaying();
          this.playingUrl.set(url);
          this.playingName.set(this.displayName(rec.fileName));
        } else {
          window.open(url, '_blank');
          // Give the new tab time to load before revoking.
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      },
      error: () => this.notify.error('Could not open the file.'),
    });
  }

  protected remove(rec: OrderRecording): void {
    this.confirm
      .confirm({
        title: 'Remove file?',
        message: `${this.displayName(rec.fileName)} will be removed from this order.`,
        confirmText: 'Remove',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.remove(rec.recordId, rec.fileName).subscribe({
          next: () => {
            this.notify.success('File removed.');
            this.load();
          },
        });
      });
  }

  protected isVoice(rec: OrderRecording): boolean {
    return (rec.documentType ?? '').toLowerCase().startsWith('voice');
  }

  protected iconFor(rec: OrderRecording): string {
    return this.isVoice(rec) ? 'graphic_eq' : 'image';
  }

  /** Recover the original file name from the stored "{guid}_{name}" path. */
  protected displayName(fileName: string): string {
    const base = (fileName ?? '').split('/').pop() ?? fileName ?? '';
    const underscore = base.indexOf('_');
    return underscore >= 0 && underscore < base.length - 1 ? base.slice(underscore + 1) : base;
  }

  protected closePlayer(): void {
    this.revokePlaying();
  }

  private clearPicked(): void {
    this.pickedBase64 = null;
    this.pickedName.set('');
  }

  private revokePlaying(): void {
    const url = this.playingUrl();
    if (url) URL.revokeObjectURL(url);
    this.playingUrl.set(null);
    this.playingName.set('');
  }

  ngOnDestroy(): void {
    this.revokePlaying();
  }
}

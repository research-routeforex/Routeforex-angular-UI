import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { ClientBanksComponent } from '../client-banks/client-banks';
import { ClientContractsComponent } from '../client-contracts/client-contracts';
import { ClientLookups, SaveClientRequest } from '../client.model';
import { ClientsService } from '../clients.service';

type EditTab = 'profile' | 'banks' | 'contracts';

@Component({
  selector: 'app-client-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ClientBanksComponent,
    ClientContractsComponent,
  ],
  templateUrl: './client-form.html',
  styleUrl: './client-form.scss',
})
export class ClientFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ClientsService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected readonly clientId = signal(0);
  protected readonly isEdit = computed(() => this.clientId() > 0);

  /** Left-hand vertical tab: profile / banks / contracts. */
  protected readonly tab = signal<EditTab>('profile');
  protected setTab(tab: EditTab): void {
    if (tab !== 'profile' && !this.isEdit()) return; // sub-records need a saved client
    this.tab.set(tab);
  }

  private readonly lookups = signal<ClientLookups | null>(null);

  // Selected document files (only the name is persisted to tpo_mast_client).
  protected readonly slaFile = signal<File | null>(null);
  protected readonly authFile = signal<File | null>(null);
  protected readonly existingSla = signal<string | null>(null);
  protected readonly existingAuth = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    clientName: ['', [Validators.required, Validators.maxLength(200)]],
    clientGroup: this.fb.control<number | null>(null),
    locationName: [''],
    region: this.fb.control<number | null>(null),
    country: this.fb.control<number | null>(null),
    city: this.fb.control<number | null>(null),
    clientZone: this.fb.control<number | null>(null),
    addressLine1: [''],
    addressLine2: [''],
    pincode: [''],
    industry: [''],
    pan: [''],
    gsStateCode: [''],
    gstn: [''],
    website: [''],
    exportFigure: this.fb.control<number | null>(null),
    importFigure: this.fb.control<number | null>(null),
    onBoardDate: [''],
    status: this.fb.control<string | null>(null),
    contacts: this.fb.array<ReturnType<ClientFormComponent['newContact']>>([]),
  });

  // Group/Zone/Country/City/Region store the option VALUE (id); Status stores its text.
  protected readonly groupOptions = computed(() => this.toIdOptions(this.lookups()?.clientGroups));
  protected readonly regionOptions = computed(() => this.toIdOptions(this.lookups()?.regions));
  protected readonly zoneOptions = computed(() => this.toIdOptions(this.lookups()?.clientZones));
  protected readonly statusOptions = computed(() => this.toNameOptions(this.lookups()?.statuses));

  // Country + City are loaded by the cascade (Region → Country → City).
  protected readonly countryOptions = signal<SelectOption[]>([]);
  protected readonly cityOptions = signal<SelectOption[]>([]);
  /** Selected city id — passed to the Client Bank tab to filter banks. */
  protected readonly selectedCity = signal<number | null>(null);

  get contacts(): FormArray {
    return this.form.controls.contacts;
  }

  constructor() {
    // Cascade: Region → Country → City. A user change resets the children.
    this.form.controls.region.valueChanges.pipe(takeUntilDestroyed()).subscribe((regionId) => {
      this.form.controls.country.setValue(null, { emitEvent: false });
      this.form.controls.city.setValue(null, { emitEvent: false });
      this.cityOptions.set([]);
      this.selectedCity.set(null);
      this.loadCountries(regionId);
    });
    this.form.controls.country.valueChanges.pipe(takeUntilDestroyed()).subscribe((countryId) => {
      this.form.controls.city.setValue(null, { emitEvent: false });
      this.selectedCity.set(null);
      this.loadCities(countryId);
    });
    this.form.controls.city.valueChanges.pipe(takeUntilDestroyed()).subscribe((cityId) => {
      this.selectedCity.set(cityId);
    });
  }

  private loadCountries(regionId: number | null): void {
    if (!regionId) {
      this.countryOptions.set([]);
      return;
    }
    this.service.getCountries(regionId).subscribe((list) => this.countryOptions.set(this.toIdOptions(list)));
  }

  private loadCities(countryId: number | null): void {
    if (!countryId) {
      this.cityOptions.set([]);
      return;
    }
    this.service.getCities(countryId).subscribe((list) => this.cityOptions.set(this.toIdOptions(list)));
  }

  ngOnInit(): void {
    this.service.getLookups().subscribe((l) => this.lookups.set(l));

    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : 0;
    if (id > 0) {
      this.clientId.set(id);
      this.loadClient(id);
    } else {
      this.addContact();
    }
  }

  private newContact(c?: { contactName?: string | null; email?: string | null; contactNumber?: string | null }) {
    return this.fb.nonNullable.group({
      contactName: [c?.contactName ?? ''],
      email: [c?.email ?? '', [Validators.email]],
      contactNumber: [c?.contactNumber ?? ''],
    });
  }

  protected addContact(): void {
    this.contacts.push(this.newContact());
  }

  protected removeContact(i: number): void {
    this.contacts.removeAt(i);
  }

  private loadClient(id: number): void {
    this.loading.set(true);
    this.service
      .getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((c) => {
        this.form.patchValue({
          clientName: c.clientName,
          clientGroup: toId(c.clientGroup),
          locationName: c.locationName ?? '',
          clientZone: toId(c.clientZone),
          addressLine1: c.addressLine1 ?? '',
          addressLine2: c.addressLine2 ?? '',
          pincode: c.pincode ?? '',
          industry: c.industry ?? '',
          pan: c.pan ?? '',
          gsStateCode: c.gsStateCode ?? '',
          gstn: c.gstn ?? '',
          website: c.website ?? '',
          exportFigure: c.exportFigure ?? null,
          importFigure: c.importFigure ?? null,
          onBoardDate: c.onBoardDate ? c.onBoardDate.slice(0, 10) : '',
          status: c.status ?? null,
        });
        this.existingSla.set(c.hasSla ? (c.slaFileName ?? 'SLA document') : null);
        this.existingAuth.set(c.hasAuthLetter ? (c.authLetterFileName ?? 'Authorized letter') : null);

        this.contacts.clear();
        const list = c.contacts?.length ? c.contacts : [{}];
        for (const ct of list) this.contacts.push(this.newContact(ct));

        // Restore Region → Country → City in order without firing the reset cascade.
        const regionId = toId(c.region);
        const countryId = toId(c.country);
        const cityId = toId(c.city);
        this.form.controls.region.setValue(regionId, { emitEvent: false });
        if (regionId) {
          this.service.getCountries(regionId).subscribe((countries) => {
            this.countryOptions.set(this.toIdOptions(countries));
            this.form.controls.country.setValue(countryId, { emitEvent: false });
            if (countryId) {
              this.service.getCities(countryId).subscribe((cities) => {
                this.cityOptions.set(this.toIdOptions(cities));
                this.form.controls.city.setValue(cityId, { emitEvent: false });
                this.selectedCity.set(cityId);
              });
            }
          });
        }
      });
  }

  protected onSlaChange(event: Event): void {
    this.slaFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }
  protected onAuthChange(event: Event): void {
    this.authFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Please fix the highlighted fields.');
      return;
    }
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      const [slaB64, authB64] = await Promise.all([
        this.readBase64(this.slaFile()),
        this.readBase64(this.authFile()),
      ]);

      const payload: SaveClientRequest = {
        clientId: this.clientId(),
        clientName: v.clientName,
        clientGroup: toText(v.clientGroup),
        locationName: v.locationName || null,
        region: toText(v.region),
        country: toText(v.country),
        city: toText(v.city),
        clientZone: toText(v.clientZone),
        addressLine1: v.addressLine1 || null,
        addressLine2: v.addressLine2 || null,
        pincode: v.pincode || null,
        industry: v.industry || null,
        pan: v.pan || null,
        gsStateCode: v.gsStateCode || null,
        gstn: v.gstn || null,
        website: v.website || null,
        exportFigure: v.exportFigure,
        importFigure: v.importFigure,
        onBoardDate: v.onBoardDate || null,
        status: v.status,
        slaFileName: this.slaFile()?.name ?? null,
        slaFileBase64: slaB64,
        authLetterFileName: this.authFile()?.name ?? null,
        authLetterFileBase64: authB64,
        contacts: v.contacts.map((c) => ({
          contactName: c.contactName || null,
          email: c.email || null,
          contactNumber: c.contactNumber || null,
        })),
      };

      this.service
        .save(payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe((res) => {
          if (res.success) {
            this.notify.success(res.message || 'Client saved.');
            this.router.navigate(['/clients']);
          } else {
            this.notify.error(res.message || 'Could not save the client.');
          }
        });
    } catch {
      this.saving.set(false);
      this.notify.error('Could not read the selected document.');
    }
  }

  /** Open a stored document (SLA / Authorized Letter) — preview inline, else download. */
  protected viewDoc(which: 'sla' | 'auth'): void {
    const path = which === 'sla' ? this.existingSla() : this.existingAuth();
    const filename = this.docName(path, which);
    const ext = (filename.split('.').pop() ?? '').toLowerCase();
    const viewable = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'txt'].includes(ext);

    this.service.getDocument(this.clientId(), which).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (viewable) {
          window.open(url, '_blank');
        } else {
          // Non-previewable (e.g. .docx/.xlsx) — download with the real name + extension.
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      },
      error: () => this.notify.error('Document not available.'),
    });
  }

  /** Recover the original file name (strip folder + the stored GUID prefix). */
  private docName(path: string | null, which: string): string {
    if (!path) return `${which}-document`;
    const file = path.split(/[\\/]/).pop() ?? path; // "{guid}_original.ext"
    const us = file.indexOf('_');
    return us >= 0 && us < file.length - 1 ? file.substring(us + 1) : file;
  }

  protected cancel(): void {
    this.router.navigate(['/clients']);
  }

  private readBase64(file: File | null): Promise<string | null> {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /** Options whose value is the lookup id (stored as id-text in the DB). */
  private toIdOptions(items?: { id: number; name: string }[]): SelectOption[] {
    return (items ?? []).map((i) => ({ value: i.id, label: i.name }));
  }

  /** Options whose value is the lookup name (used for Status → ActiveStatus). */
  private toNameOptions(items?: { id: number; name: string }[]): SelectOption[] {
    return (items ?? []).map((i) => ({ value: i.name, label: i.name }));
  }
}

/** Stored id-text → numeric control value (null when blank/non-numeric). */
function toId(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Numeric control value → id-text for the payload (varchar columns). */
function toText(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}

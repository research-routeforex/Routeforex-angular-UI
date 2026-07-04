import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { CityComponent } from './city/city';
import { CountryComponent } from './country/country';
import { CountryRegionComponent } from './country-region/country-region';
import { StateComponent } from './state/state';

type MasterTab = 'country-region' | 'country' | 'state' | 'city';

interface TabDef {
  key: MasterTab;
  label: string;
  icon: string;
  ready: boolean;
}

@Component({
  selector: 'app-common-master',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    MatIconModule,
    CountryRegionComponent,
    CountryComponent,
    StateComponent,
    CityComponent,
  ],
  templateUrl: './common-master.html',
  styleUrl: './common-master.scss',
})
export class CommonMasterComponent {
  protected readonly tabs: TabDef[] = [
    { key: 'country-region', label: 'Country Region', icon: 'public', ready: true },
    { key: 'country', label: 'Country', icon: 'flag', ready: true },
    { key: 'state', label: 'State', icon: 'map', ready: true },
    { key: 'city', label: 'City', icon: 'location_city', ready: true },
  ];

  protected readonly active = signal<MasterTab>('country-region');
  protected readonly activeTab = computed(
    () => this.tabs.find((t) => t.key === this.active()) ?? this.tabs[0],
  );

  protected select(key: MasterTab): void {
    this.active.set(key);
  }
}

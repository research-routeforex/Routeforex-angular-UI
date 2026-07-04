import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import {
  CityMaster,
  Country,
  CountryRegion,
  SaveCityMaster,
  SaveCountry,
  SaveCountryRegion,
  SaveState,
  State,
} from './common-master.model';

/** Common Master data — Country Region CRUD (Country/State/City to follow). */
@Injectable({ providedIn: 'root' })
export class CommonMasterService {
  private readonly api = inject(ApiService);

  getCountryRegions(): Observable<CountryRegion[]> {
    return this.api
      .get<CountryRegion[]>(API.commonMaster.countryRegion)
      .pipe(map((rows) => rows ?? []));
  }

  saveCountryRegion(payload: SaveCountryRegion): Observable<number> {
    return this.api.post<number>(API.commonMaster.countryRegion, payload);
  }

  deleteCountryRegion(id: number): Observable<void> {
    return this.api.delete<void>(API.commonMaster.countryRegionById(id));
  }

  getCountries(): Observable<Country[]> {
    return this.api.get<Country[]>(API.commonMaster.country).pipe(map((rows) => rows ?? []));
  }

  saveCountry(payload: SaveCountry): Observable<number> {
    return this.api.post<number>(API.commonMaster.country, payload);
  }

  deleteCountry(id: number): Observable<void> {
    return this.api.delete<void>(API.commonMaster.countryById(id));
  }

  getStates(): Observable<State[]> {
    return this.api.get<State[]>(API.commonMaster.state).pipe(map((rows) => rows ?? []));
  }

  saveState(payload: SaveState): Observable<number> {
    return this.api.post<number>(API.commonMaster.state, payload);
  }

  deleteState(id: number): Observable<void> {
    return this.api.delete<void>(API.commonMaster.stateById(id));
  }

  getCities(): Observable<CityMaster[]> {
    return this.api.get<CityMaster[]>(API.commonMaster.city).pipe(map((rows) => rows ?? []));
  }

  saveCity(payload: SaveCityMaster): Observable<number> {
    return this.api.post<number>(API.commonMaster.city, payload);
  }

  deleteCity(id: number): Observable<void> {
    return this.api.delete<void>(API.commonMaster.cityById(id));
  }
}

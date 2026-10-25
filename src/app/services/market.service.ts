import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { API_BASE } from '../config';
import { Auto } from '../interfaces/auto';
import { MarketStats } from '../interfaces/market';


@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly http = inject(HttpClient);

  getStats(car: Auto): Observable<MarketStats> {
    const params = new HttpParams().set('brand', car.brand).set('model', car.model);
    return this.http
      .get<MarketStats>(`${API_BASE}/market`, { params })
      .pipe(timeout(12_000)); // sans timeout, un serveur muet laisserait le loader tourner à l'infini
  }
}

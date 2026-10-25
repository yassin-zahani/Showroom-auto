import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Observable, ReplaySubject, Subject, combineLatest, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { Auto } from '../../interfaces/auto';
import { MarketState } from '../../interfaces/market';
import { MarketService } from '../../services/market.service';

@Component({
  imports: [AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe],
  selector: 'app-market-price',
  styleUrl: './market-price.css',
  templateUrl: './market-price.html',
})
export class MarketPrice {
  private readonly market = inject(MarketService);

  private readonly car$ = new ReplaySubject<Auto>(1);
  private readonly retry$ = new Subject<void>();

  @Input({ required: true }) set car(value: Auto) {
    this.car$.next(value);
  }

  
  readonly state$: Observable<MarketState> = combineLatest([
    this.car$.pipe(distinctUntilChanged((a, b) => a.id === b.id)),
    this.retry$.pipe(startWith(undefined)),
  ]).pipe(
    switchMap(([car]) =>
      this.market.getStats(car).pipe(
        map((stats): MarketState =>
          stats.count > 0 && stats.median !== undefined
            ? { status: 'ready', stats, showroomPriceTnd: car.price * 1000 }
            : { status: 'empty', stats },
        ),
        startWith<MarketState>({ status: 'loading' }),
        catchError(() => of<MarketState>({ status: 'error' })),
      ),
    ),
  );

  retry(): void {
    this.retry$.next();
  }

  gapPercent(showroomTnd: number, medianTnd: number): number {
    return Math.round(((showroomTnd - medianTnd) / medianTnd) * 100);
  }
}

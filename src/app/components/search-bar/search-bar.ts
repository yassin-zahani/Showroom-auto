import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { AutoFilters, DEFAULT_FILTERS, SortKey } from '../../interfaces/auto-filters';

@Component({
  imports: [FontAwesomeModule, ReactiveFormsModule],
  selector: 'app-search-bar',
  styleUrl: './search-bar.css',
  templateUrl: './search-bar.html',
})
export class SearchBar implements OnInit, OnDestroy {
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faRotateLeft = faRotateLeft;

  @Input() resultCount = 0;
  @Input() totalCount = 0;

  @Output() filtersChange = new EventEmitter<AutoFilters>();

  readonly budgetOptions = [
    { label: 'Any budget', value: 0 },
    { label: 'Up to 200 000 DT', value: 200 },
    { label: 'Up to 300 000 DT', value: 300 },
    { label: 'Up to 400 000 DT', value: 400 },
    { label: 'Up to 500 000 DT', value: 500 },
  ];
  readonly powerOptions = [
    { label: 'Any power', value: 0 },
    { label: '9 CV and more', value: 9 },
    { label: '12 CV and more', value: 12 },
    { label: '16 CV and more', value: 16 },
    { label: '20 CV and more', value: 20 },
  ];
  readonly sortOptions: { label: string; value: SortKey }[] = [
    { label: 'Featured', value: 'default' },
    { label: 'Price: low to high', value: 'price-asc' },
    { label: 'Price: high to low', value: 'price-desc' },
    { label: 'Most powerful', value: 'power-desc' },
  ];

  readonly form = new FormGroup({
    query: new FormControl(DEFAULT_FILTERS.query, { nonNullable: true }),
    maxPrice: new FormControl(DEFAULT_FILTERS.maxPrice, { nonNullable: true }),
    minPower: new FormControl(DEFAULT_FILTERS.minPower, { nonNullable: true }),
    sort: new FormControl<SortKey>(DEFAULT_FILTERS.sort, { nonNullable: true }),
  });

  /** Sert à désabonner proprement tous les flux quand le composant disparaît. */
  private readonly destroy$ = new Subject<void>();

  get hasActiveFilters(): boolean {
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(DEFAULT_FILTERS);
  }

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(
        debounceTime(200),
        map(() => this.form.getRawValue()),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$),
      )
      .subscribe((filters) => this.filtersChange.emit(filters));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  reset(): void {
    this.form.reset(DEFAULT_FILTERS);
  }
}

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CarCard } from './components/car-card/car-card';
import { CarDetail } from './components/car-detail/car-detail';
import { HeadBar } from './components/head-bar/head-bar';
import { SearchBar } from './components/search-bar/search-bar';
import { Auto } from './interfaces/auto';
import { AutoFilters, DEFAULT_FILTERS } from './interfaces/auto-filters';
import { AutoService } from './services/auto.service';
import { FavoritesService } from './services/favorites.service';
import { applyFilters } from './utils/auto-filters';

/**
 * Composant « conteneur » (le patron du showroom) :
 * il possède l'état, appelle les services et distribue les données aux enfants.
 * Les enfants, eux, ne font que recevoir (@Input) et signaler (@Output).
 */
@Component({
  selector: 'app-root',
  imports: [AsyncPipe, HeadBar, SearchBar, CarCard, CarDetail],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly autoService = inject(AutoService);
  private readonly favorites = inject(FavoritesService);

  // Les « ardoises » : chaque changement écrit dessus relance le calcul de la vue.
  private readonly filters$ = new BehaviorSubject<AutoFilters>(DEFAULT_FILTERS);
  private readonly garageOnly$ = new BehaviorSubject<boolean>(false);

  /** La voiture ouverte dans la fenêtre de détails (undefined = fenêtre fermée). */
  selectedCar?: Auto;

  /**
   * « View-model » : UN seul flux qui contient tout ce dont la page a besoin.
   * combineLatest = le tableau de la station de louage 🚐 : il se réaffiche dès que
   * l'une de ses sources change (catalogue, critères, favoris, mode garage).
   */
  readonly vm$ = combineLatest([
    this.autoService.getAll(),
    this.filters$,
    this.favorites.ids$,
    this.garageOnly$,
  ]).pipe(
    map(([autos, filters, favoriteIds, garageOnly]) => {
      const pool = garageOnly ? autos.filter((auto) => favoriteIds.includes(auto.id)) : autos;
      return {
        cars: applyFilters(pool, filters),
        total: pool.length,
        favoriteIds,
        garageOnly,
      };
    }),
  );

  onFiltersChange(filters: AutoFilters): void {
    this.filters$.next(filters);
  }

  toggleGarage(): void {
    this.garageOnly$.next(!this.garageOnly$.value);
  }

  toggleFavorite(car: Auto): void {
    this.favorites.toggle(car.id);
  }

  openDetails(car: Auto): void {
    this.selectedCar = car;
  }

  closeDetails(): void {
    this.selectedCar = undefined;
  }
}

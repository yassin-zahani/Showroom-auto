import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

const STORAGE_KEY = 'showroom.favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly idsSubject = new BehaviorSubject<number[]>(this.load());

  readonly ids$: Observable<number[]> = this.idsSubject.asObservable();
  readonly count$: Observable<number> = this.ids$.pipe(
    map((ids) => ids.length),
    distinctUntilChanged(),
  );

  isFavorite(id: number): boolean {
    return this.idsSubject.value.includes(id);
  }

  toggle(id: number): void {
    const current = this.idsSubject.value;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    this.idsSubject.next(next); // nouveau tableau : on ne modifie jamais l'ancien
    this.save(next);
  }

  private load(): number[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === 'number') : [];
    } catch {
      return []; // stockage indisponible ou JSON corrompu : on repart de zéro
    }
  }

  private save(ids: number[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* navigation privée / quota : le garage fonctionne quand même en mémoire */
    }
  }
}

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { AUTOS } from '../data/autos.data';
import { Auto } from '../interfaces/auto';


@Injectable({ providedIn: 'root' })
export class AutoService {
  private readonly autos$ = of(AUTOS).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  getAll(): Observable<Auto[]> {
    return this.autos$;
  }
}

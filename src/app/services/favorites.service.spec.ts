import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('starts empty', async () => {
    const service = TestBed.inject(FavoritesService);
    expect(await firstValueFrom(service.ids$)).toEqual([]);
    expect(await firstValueFrom(service.count$)).toBe(0);
  });

  it('toggles a car on and off and keeps the count in sync', async () => {
    const service = TestBed.inject(FavoritesService);

    service.toggle(3);
    service.toggle(7);
    expect(await firstValueFrom(service.ids$)).toEqual([3, 7]);
    expect(await firstValueFrom(service.count$)).toBe(2);
    expect(service.isFavorite(3)).toBe(true);

    service.toggle(3);
    expect(await firstValueFrom(service.ids$)).toEqual([7]);
    expect(service.isFavorite(3)).toBe(false);
  });

  it('never mutates a previously emitted array', async () => {
    const service = TestBed.inject(FavoritesService);
    service.toggle(1);
    const before = await firstValueFrom(service.ids$);
    service.toggle(2);
    expect(before).toEqual([1]);
  });

  it('persists to localStorage and restores on the next start', () => {
    TestBed.inject(FavoritesService).toggle(5);
    expect(JSON.parse(localStorage.getItem('showroom.favorites') ?? '[]')).toEqual([5]);

    TestBed.resetTestingModule();
    expect(TestBed.inject(FavoritesService).isFavorite(5)).toBe(true);
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('showroom.favorites', '{not json');
    expect(TestBed.inject(FavoritesService).isFavorite(1)).toBe(false);
  });
});

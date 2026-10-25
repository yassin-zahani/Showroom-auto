import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TestDriveRequest, TestDriveReservation } from '../interfaces/test-drive';

const STORAGE_KEY = 'showroom.testDrives';


@Injectable({ providedIn: 'root' })
export class TestDriveService {
  reserve(request: TestDriveRequest): Observable<TestDriveReservation> {
    const reservation: TestDriveReservation = {
      ...request,
      reference: `TD-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const all = this.readAll();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...all, reservation]));
    } catch {
      return throwError(() => new Error('Storage unavailable'));
    }

    return of(reservation).pipe(delay(700)); // latence simulée d'un vrai serveur
  }

  readAll(): TestDriveReservation[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? (parsed as TestDriveReservation[]) : [];
    } catch {
      return [];
    }
  }
}

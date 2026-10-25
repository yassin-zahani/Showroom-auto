import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Auto } from '../../interfaces/auto';
import { TestDriveReservation } from '../../interfaces/test-drive';
import { TestDriveService } from '../../services/test-drive.service';
import { tomorrowIso } from '../../utils/date';


const TN_MOBILE = /^(?:\+216|00216)?[2459]\d{7}$/;

export function tunisianPhone(control: AbstractControl<string>): ValidationErrors | null {
  const compact = (control.value ?? '').replace(/[\s.-]/g, '');
  return compact === '' || TN_MOBILE.test(compact) ? null : { tunisianPhone: true };
}

export function notBefore(minIso: string) {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    !control.value || control.value >= minIso ? null : { tooEarly: true };
}

type FieldName = 'fullName' | 'phone' | 'email' | 'date' | 'slot' | 'licence';

type FormStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'error' }
  | { kind: 'done'; reservation: TestDriveReservation };

@Component({
  imports: [AsyncPipe, ReactiveFormsModule],
  selector: 'app-test-drive-form',
  styleUrl: './test-drive-form.css',
  templateUrl: './test-drive-form.html',
})
export class TestDriveForm implements OnDestroy {
  private readonly service = inject(TestDriveService);
  private readonly destroy$ = new Subject<void>();
  private readonly status = new BehaviorSubject<FormStatus>({ kind: 'idle' });

  @Input({ required: true }) car!: Auto;

  @Output() closed = new EventEmitter<void>();

  readonly status$ = this.status.asObservable();
  readonly minDate = tomorrowIso();
  readonly slots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, tunisianPhone],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    date: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, notBefore(this.minDate)],
    }),
    slot: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    licence: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  showError(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); 
      return;
    }

    const { licence: _licence, ...values } = this.form.getRawValue();
    this.status.next({ kind: 'saving' });

    this.service
      .reserve({ ...values, carId: this.car.id, carLabel: `${this.car.brand} ${this.car.model}` })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reservation) => this.status.next({ kind: 'done', reservation }),
        error: () => this.status.next({ kind: 'error' }),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

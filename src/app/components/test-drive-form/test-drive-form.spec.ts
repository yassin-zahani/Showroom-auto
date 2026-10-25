import { FormControl } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auto } from '../../interfaces/auto';
import { notBefore, tunisianPhone, TestDriveForm } from './test-drive-form';

const CAR: Auto = {
  id: 2, brand: 'Audi', model: 'Q5', price: 350, power: 16, photo: '', availability: 1, description: '',
};

describe('tunisianPhone validator', () => {
  const check = (value: string) => tunisianPhone(new FormControl(value, { nonNullable: true }));

  it('accepts Tunisian mobile numbers with or without prefix and spaces', () => {
    for (const ok of ['98123456', '98 123 456', '+216 98 123 456', '0021622123456', '55.123.456', '42123456']) {
      expect(check(ok)).toBeNull();
    }
  });

  it('rejects numbers that cannot be a Tunisian mobile', () => {
    for (const bad of ['12345678', '9812345', '981234567', 'abcdefgh', '+33612345678']) {
      expect(check(bad)).toEqual({ tunisianPhone: true });
    }
  });
});

describe('notBefore validator', () => {
  const check = (value: string) => notBefore('2026-10-25')(new FormControl(value, { nonNullable: true }));

  it('accepts the minimum date and later', () => {
    expect(check('2026-10-25')).toBeNull();
    expect(check('2027-01-01')).toBeNull();
  });

  it('rejects earlier dates', () => {
    expect(check('2026-10-24')).toEqual({ tooEarly: true });
  });
});

describe('TestDriveForm', () => {
  let fixture: ComponentFixture<TestDriveForm>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [TestDriveForm] }).compileComponents();
    fixture = TestBed.createComponent(TestDriveForm);
    fixture.componentRef.setInput('car', CAR);
    await fixture.whenStable();
  });

  it('refuses an empty submission and shows the errors, without saving anything', async () => {
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('small.error').length).toBeGreaterThanOrEqual(4);
    expect(localStorage.getItem('showroom.testDrives')).toBeNull();
  });

  it('emits closed when the user cancels', () => {
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => (closed += 1));
    (fixture.nativeElement.querySelector('.ghost') as HTMLButtonElement).click();
    expect(closed).toBe(1);
  });
});

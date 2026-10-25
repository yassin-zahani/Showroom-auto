import { registerLocaleData } from '@angular/common';
import localeFrTN from '@angular/common/locales/fr-TN';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auto } from '../../interfaces/auto';
import { CarCard } from './car-card';

const CAR: Auto = {
  id: 2, brand: 'Audi', model: 'Q5', price: 350, power: 16, photo: 'Q5.webp', availability: 2, description: '',
};

describe('CarCard', () => {
  let fixture: ComponentFixture<CarCard>;
  let root: HTMLElement;

  beforeEach(async () => {
    registerLocaleData(localeFrTN); 
    await TestBed.configureTestingModule({
      imports: [CarCard],
      providers: [{ provide: LOCALE_ID, useValue: 'fr-TN' }],
    }).compileComponents();
    fixture = TestBed.createComponent(CarCard);
    fixture.componentRef.setInput('car', CAR);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('displays the car, its power and its price in dinars', () => {
    const text = root.textContent ?? '';
    expect(text).toContain('Audi');
    expect(text).toContain('Q5');
    expect(text).toContain('16 CV');
    expect(text.replace(/\s/g, '')).toContain('350000DT');
  });

  it('flags a low stock', () => {
    expect(root.querySelector('.specs li.low')?.textContent).toContain('2 in stock');
  });

  it('reflects the favourite state it is given', async () => {
    expect(root.querySelector('.fav')?.classList.contains('on')).toBe(false);
    fixture.componentRef.setInput('isFavorite', true);
    await fixture.whenStable();
    expect(root.querySelector('.fav')?.classList.contains('on')).toBe(true);
  });

  it('emits the car (not an id) when the heart or the details button is clicked', () => {
    const toggled: Auto[] = [];
    const opened: Auto[] = [];
    fixture.componentInstance.favoriteToggle.subscribe((c) => toggled.push(c));
    fixture.componentInstance.detailsOpen.subscribe((c) => opened.push(c));

    (root.querySelector('.fav') as HTMLButtonElement).click();
    (root.querySelector('.more') as HTMLButtonElement).click();

    expect(toggled).toEqual([CAR]);
    expect(opened).toEqual([CAR]);
  });
});
